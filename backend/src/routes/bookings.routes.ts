import { Router } from "express";

import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  getCollections,
  getRequiredPlayers,
  withoutMongoId,
  withoutMongoIds,
  type Address,
  type Booking,
  type BookingLeisureArea,
  type BookingPlayer,
  type BookingStatus,
  type PlayerStatus,
} from "../database";

import { selectNextBooking } from "../utils/player-dashboard";

import {
  buildAvailabilitySlots,
  getCurrentDateTimeKey,
  isSlotInPast,
  isValidBookingDate,
} from "../utils/court-availability";

import {
  publishAvailabilityEvent,
  subscribeAvailability,
} from "../realtime/availability-events";
import {
  authenticateAdmin,
  type AuthenticatedAdminRequest,
} from "../middlewares/authenticate-admin";
import { getRouteParam } from "../utils/route-params";

import { withBookingLock } from "../utils/keyed-lock";

import { finalizeBookingPricing } from "../services/finalize-booking-pricing";
import { ensureComplexesGeocoded } from "../services/ensure-complex-coordinates";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const PLAYER_PLATFORM_FEE_IN_CENTS = 100;
const LEISURE_PLATFORM_FEE_IN_CENTS = 100;

type AuthenticatedRequest = Request & {
  userId?: string;
};

/**
 * Gera código público da reserva.
 */
function generateShareCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Gera token do jogador.
 */
function signToken(userId: string) {
  return jwt.sign(
    {
      userId,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

/**
 * Middleware de autenticação do jogador.
 */
function authenticate(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return response.status(401).json({
      message: "Token não informado.",
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({
      message: "Token inválido.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId?: unknown;
    };

    if (typeof decoded.userId !== "string" || !decoded.userId) {
      return response.status(401).json({
        message: "Token inválido.",
      });
    }

    request.userId = decoded.userId;

    return next();
  } catch {
    return response.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }
}

/**
 * Busca os jogadores vinculados à reserva.
 */
async function getBookingPlayers(bookingId: string) {
  const { bookingPlayers } = await getCollections();

  const players = await bookingPlayers
    .find({
      bookingId,
    })
    .sort({
      createdAt: 1,
    })
    .toArray();

  return withoutMongoIds(players);
}

/**
 * Adiciona os jogadores à estrutura da reserva.
 */
async function buildBookingWithPlayers(
  booking: Booking,
): Promise<Booking & { players: BookingPlayer[] }> {
  const players = await getBookingPlayers(booking.id);

  return {
    ...booking,
    players,
  };
}

/**
 * Verifica erro de índice UNIQUE do MongoDB.
 */
function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function isLeisureSlotDuplicateError(error: unknown) {
  if (!isDuplicateKeyError(error)) {
    return false;
  }

  const duplicateError = error as {
    keyPattern?: Record<string, unknown>;
    message?: string;
  };

  if (duplicateError.keyPattern?.["leisureArea.areaId"]) {
    return true;
  }

  return duplicateError.message?.includes("uniq_active_leisure_slot") ?? false;
}

/**
 * Normaliza número positivo.
 */
function normalizePositiveNumber(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

/**
 * ============================================================
 * DASHBOARD DO JOGADOR
 * ============================================================
 */

router.get(
  "/player/me/dashboard",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { users, bookings, bookingPlayers } = await getCollections();

      const user = await users.findOne({
        id: userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      const playerEntries = await bookingPlayers
        .find({
          userId,
          status: {
            $ne: "CANCELLED",
          },
        })
        .toArray();

      const bookingIds = [
        ...new Set(playerEntries.map((player) => player.bookingId)),
      ];

      let nextGame = null;

      if (bookingIds.length > 0) {
        const bookingDocuments = await bookings
          .find({
            id: {
              $in: bookingIds,
            },
          })
          .toArray();

        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hour = String(now.getHours()).padStart(2, "0");
        const minute = String(now.getMinutes()).padStart(2, "0");

        const currentDateTime = `${year}-${month}-${day} ${hour}:${minute}`;

        const booking = selectNextBooking(bookingDocuments, currentDateTime);

        if (booking) {
          const playerEntry = playerEntries.find(
            (entry) => entry.bookingId === booking.id,
          );

          nextGame = {
            id: booking.id,
            shareCode: booking.shareCode,
            courtSlug: booking.courtSlug,
            courtName: booking.courtName,
            courtType: booking.courtType,
            location: booking.location,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            bookingStatus: booking.bookingStatus,
            paymentStatus: playerEntry?.status ?? null,
            amountToPayInCents: playerEntry?.amountToPayInCents ?? null,
          };
        }
      }

      return response.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        nextGame,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard do jogador:", error);

      return response.status(500).json({
        message: "Erro ao carregar dashboard do jogador.",
      });
    }
  },
);

/**
 * ============================================================
 * PERFIL DO JOGADOR
 * ============================================================
 */

router.get(
  "/player/me",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { users } = await getCollections();

      const user = await users.findOne({
        id: userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      return response.json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        },
      });
    } catch (error) {
      console.error("Erro ao carregar perfil do jogador:", error);

      return response.status(500).json({
        message: "Erro ao carregar perfil do jogador.",
      });
    }
  },
);

const updatePlayerProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, {
        message: "Informe um nome válido.",
      })
      .optional(),

    avatarUrl: z
      .string()
      .trim()
      .url({
        message: "Informe uma URL válida para a imagem.",
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      return Object.keys(data).length > 0;
    },
    {
      message: "Informe pelo menos um campo para atualização.",
    },
  );

router.patch(
  "/player/me",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const parsedBody = updatePlayerProfileSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return response.status(400).json({
          message: "Dados inválidos para atualizar o perfil.",
          errors: parsedBody.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      const data = parsedBody.data;

      const { users } = await getCollections();

      const updatedUser = await users.findOneAndUpdate(
        {
          id: userId,
        },
        {
          $set: {
            ...(data.name !== undefined
              ? {
                  name: data.name,
                }
              : {}),

            ...(data.avatarUrl !== undefined
              ? {
                  avatarUrl: data.avatarUrl,
                }
              : {}),

            updatedAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedUser) {
        return response.status(404).json({
          message: "Usuário não encontrado.",
        });
      }

      return response.json({
        message: "Perfil atualizado com sucesso.",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          phone: updatedUser.phone,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl ?? null,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil do jogador:", error);

      return response.status(500).json({
        message: "Erro ao atualizar o perfil do jogador.",
      });
    }
  },
);

/**
 * ============================================================
 * JOGOS DO JOGADOR (PRÓXIMOS E HISTÓRICO)
 * ============================================================
 */

router.get(
  "/player/me/games",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { bookings, bookingPlayers } = await getCollections();

      const playerEntries = await bookingPlayers
        .find({
          userId,
        })
        .toArray();

      const bookingIds = [
        ...new Set(playerEntries.map((entry) => entry.bookingId)),
      ];

      if (bookingIds.length === 0) {
        return response.json({
          upcoming: [],
          history: [],
        });
      }

      const bookingDocuments = await bookings
        .find({
          id: {
            $in: bookingIds,
          },
        })
        .toArray();

      const bookingsById = new Map(
        bookingDocuments.map((booking) => [booking.id, booking]),
      );

      const currentDateTime = getCurrentDateTimeKey();

      const games = playerEntries
        .map((entry) => {
          const booking = bookingsById.get(entry.bookingId);

          if (!booking) {
            return null;
          }

          return {
            id: booking.id,
            shareCode: booking.shareCode,
            courtName: booking.courtName,
            courtType: booking.courtType,
            location: booking.location,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            bookingStatus: booking.bookingStatus,
            paymentStatus: entry.status,
            amountToPayInCents: entry.amountToPayInCents,
            teamNumber: entry.teamNumber,
          };
        })
        .filter((game): game is NonNullable<typeof game> => game !== null);

      const upcoming = games
        .filter((game) => {
          return (
            game.bookingStatus !== "CANCELLED" &&
            `${game.bookingDate} ${game.startTime}` >= currentDateTime
          );
        })
        .sort((first, second) => {
          return `${first.bookingDate} ${first.startTime}`.localeCompare(
            `${second.bookingDate} ${second.startTime}`,
          );
        });

      const history = games
        .filter((game) => {
          return (
            game.bookingStatus === "CANCELLED" ||
            `${game.bookingDate} ${game.startTime}` < currentDateTime
          );
        })
        .sort((first, second) => {
          return `${second.bookingDate} ${second.startTime}`.localeCompare(
            `${first.bookingDate} ${first.startTime}`,
          );
        });

      return response.json({
        upcoming,
        history,
      });
    } catch (error) {
      console.error("Erro ao carregar os jogos do jogador:", error);

      return response.status(500).json({
        message: "Erro ao carregar os jogos do jogador.",
      });
    }
  },
);

/**
 * ============================================================
 * AUTENTICAÇÃO
 * ============================================================
 */

router.post("/auth/register", async (request, response) => {
  try {
    const { name, phone, email, password } = request.body;

    if (!name || String(name).trim().length < 2) {
      return response.status(400).json({
        message: "Informe seu nome.",
      });
    }

    if (!phone || String(phone).trim().length < 8) {
      return response.status(400).json({
        message: "Informe um telefone válido.",
      });
    }

    if (!email || !String(email).includes("@")) {
      return response.status(400).json({
        message: "Informe um e-mail válido.",
      });
    }

    if (!password || String(password).length < 6) {
      return response.status(400).json({
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
    }

    const { users } = await getCollections();

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await users.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return response.status(400).json({
        message: "Já existe uma conta com este e-mail.",
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const now = new Date();

    const user = {
      id: randomUUID(),

      name: String(name).trim(),
      phone: String(phone).trim(),
      email: normalizedEmail,

      passwordHash,
      avatarUrl: null,

      createdAt: now,
      updatedAt: now,
    };

    await users.insertOne(user);

    const token = signToken(user.id);

    return response.status(201).json({
      token,

      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Erro ao cadastrar jogador:", error);

    if (isDuplicateKeyError(error)) {
      return response.status(400).json({
        message: "Já existe uma conta com este e-mail.",
      });
    }

    return response.status(500).json({
      message: "Erro ao criar usuário.",
    });
  }
});

router.post("/auth/login", async (request, response) => {
  try {
    const { email, password } = request.body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const { users } = await getCollections();

    const user = await users.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return response.status(400).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      String(password || ""),
      user.passwordHash,
    );

    if (!passwordMatches) {
      return response.status(400).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const token = signToken(user.id);

    return response.json({
      token,

      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return response.status(500).json({
      message: "Erro ao fazer login.",
    });
  }
});

/**
 * ============================================================
 * LANDING PAGE
 * ============================================================
 */

router.get("/courts", async (request, response) => {
  try {
    const { courts } = await getCollections();

    const activeCourts = await courts
      .find({
        isActive: true,
      })
      .sort({
        createdAt: 1,
      })
      .toArray();

    const formattedCourts = activeCourts.map((court) => ({
      id: court.id,
      slug: court.slug,

      name: court.name,
      type: court.type,
      surface: court.surface,
      location: court.location,

      price: court.priceInCents / 100,

      players: court.players,
      minPlayers: court.minPlayers ?? court.players,
      goalkeeperPriceInCents: court.goalkeeperPriceInCents ?? 0,

      highlight: court.highlight,
      description: court.description,
      image: court.imageUrl,

      times: Array.isArray(court.times) ? court.times : [],
    }));

    return response.json(formattedCourts);
  } catch (error) {
    console.error("Erro ao buscar quadras:", error);

    return response.status(500).json({
      message: "Erro ao buscar quadras.",
    });
  }
});

/**
 * ============================================================
 * QUADRAS DO PLAYER
 * ============================================================
 */

type PlayerCourtProjection = {
  id: string;
  slug: string;
  name: string;
  type: string;
  surface: string;

  priceInCents: number;
  players: number;

  highlight: string;
  description: string;
  imageUrl: string;
  times: string[];

  complex: {
    id: string;
    slug: string;
    name: string;
    description: string;
    location: string;

    address: Address;

    leisureAreas: {
      available: boolean;
      count: number;
    };
  };
};

router.get("/player/courts", async (request, response) => {
  try {
    const { courts } = await getCollections();

    const playerCourts = await courts
      .aggregate<PlayerCourtProjection>([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $lookup: {
            from: "complexes",
            localField: "complexId",
            foreignField: "id",
            as: "complex",
          },
        },

        {
          $unwind: "$complex",
        },

        {
          $match: {
            "complex.isActive": true,
          },
        },

        /*
         * Busca quantas áreas de lazer ativas existem
         * no complexo da quadra.
         */
        {
          $lookup: {
            from: "leisureAreas",

            let: {
              currentComplexId: "$complexId",
            },

            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$complexId", "$$currentComplexId"],
                      },
                      {
                        $eq: ["$isActive", true],
                      },
                    ],
                  },
                },
              },

              /*
               * A área precisa possuir ao menos
               * um bloco de horário ativo.
               */
              {
                $match: {
                  blocks: {
                    $elemMatch: {
                      isActive: true,
                    },
                  },
                },
              },

              {
                $count: "total",
              },
            ],

            as: "leisureAreaSummary",
          },
        },

        {
          $set: {
            leisureAreaCount: {
              $ifNull: [
                {
                  $arrayElemAt: ["$leisureAreaSummary.total", 0],
                },
                0,
              ],
            },
          },
        },

        {
          $sort: {
            "complex.name": 1,
            createdAt: 1,
          },
        },

        {
          $project: {
            _id: 0,

            id: 1,
            slug: 1,
            name: 1,
            type: 1,
            surface: 1,

            priceInCents: 1,
            players: 1,

            highlight: 1,
            description: 1,
            imageUrl: 1,
            times: 1,

            complex: {
              id: "$complex.id",
              slug: "$complex.slug",
              name: "$complex.name",
              description: "$complex.description",
              location: "$complex.location",

              address: {
                street: "$complex.address.street",
                number: "$complex.address.number",
                complement: "$complex.address.complement",
                neighborhood: "$complex.address.neighborhood",
                city: "$complex.address.city",
                state: "$complex.address.state",
                zipCode: "$complex.address.zipCode",
                latitude: "$complex.address.latitude",
                longitude: "$complex.address.longitude",
              },

              leisureAreas: {
                available: {
                  $gt: ["$leisureAreaCount", 0],
                },
                count: "$leisureAreaCount",
              },
            },
          },
        },
      ])
      .toArray();

    /*
     * Complexos que ainda não têm latitude/longitude são
     * geocodificados aqui (uma única vez, o resultado fica
     * salvo no banco) para o filtro de "mais próximos" do
     * app do jogador funcionar.
     */
    await ensureComplexesGeocoded(playerCourts);

    return response.json(playerCourts);
  } catch (error) {
    console.error("Erro ao buscar quadras do player:", error);

    return response.status(500).json({
      message: "Erro ao buscar quadras disponíveis.",
    });
  }
});

/**
 * ============================================================
 * DISPONIBILIDADE DA QUADRA
 * ============================================================
 */

router.get(
  "/player/courts/:courtSlug/availability",
  async (request, response) => {
    try {
      const { courtSlug } = request.params;

      const date =
        typeof request.query.date === "string" ? request.query.date : "";

      if (!isValidBookingDate(date)) {
        return response.status(400).json({
          message: "Informe uma data válida no formato YYYY-MM-DD.",
        });
      }

      const { courts, bookings } = await getCollections();

      const court = await courts.findOne({
        slug: courtSlug,
        isActive: true,
      });

      if (!court) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      const bookingDocuments = await bookings
        .find({
          courtSlug: court.slug,
          bookingDate: date,
          slotActive: true,
        })
        .toArray();

      const reservedTimes = new Set(
        bookingDocuments.map((booking) => booking.startTime),
      );

      const slots = buildAvailabilitySlots({
        times: Array.isArray(court.times) ? court.times : [],

        reservedTimes,

        date,

        currentDateTime: getCurrentDateTimeKey(),
      });

      return response.json({
        court: {
          id: court.id,
          slug: court.slug,

          name: court.name,
          type: court.type,
          surface: court.surface,

          priceInCents: court.priceInCents,

          players: court.players,
          minPlayers: court.minPlayers ?? court.players,
          goalkeeperPriceInCents: court.goalkeeperPriceInCents ?? 0,
        },

        date,

        slots,
      });
    } catch (error) {
      console.error("Erro ao buscar disponibilidade:", error);

      return response.status(500).json({
        message: "Erro ao buscar disponibilidade da quadra.",
      });
    }
  },
);

/**
 * ============================================================
 * OPÇÕES DE RESERVA DA QUADRA E DAS ÁREAS DE LAZER
 * ============================================================
 */

router.get(
  "/player/courts/:courtSlug/booking-options",
  async (request, response) => {
    try {
      const { courtSlug } = request.params;

      const date =
        typeof request.query.date === "string" ? request.query.date : "";

      if (!isValidBookingDate(date)) {
        return response.status(400).json({
          message: "Informe uma data válida no formato YYYY-MM-DD.",
        });
      }

      const { courts, complexes, leisureAreas, bookings } =
        await getCollections();

      /**
       * ======================================================
       * QUADRA
       * ======================================================
       */

      const court = await courts.findOne({
        slug: courtSlug,
        isActive: true,
      });

      if (!court) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      /**
       * Confere se o complexo também está ativo.
       */

      const complex = await complexes.findOne({
        id: court.complexId,
        isActive: true,
      });

      if (!complex) {
        return response.status(404).json({
          message: "Complexo da quadra não encontrado ou desativado.",
        });
      }

      /**
       * Reservas ativas da quadra na data.
       */

      const courtBookingDocuments = await bookings
        .find({
          courtSlug: court.slug,
          bookingDate: date,
          slotActive: true,
        })
        .toArray();

      const reservedCourtTimes = new Set(
        courtBookingDocuments.map((booking) => booking.startTime),
      );

      const currentDateTime = getCurrentDateTimeKey();

      const courtSlots = buildAvailabilitySlots({
        times: Array.isArray(court.times) ? court.times : [],

        reservedTimes: reservedCourtTimes,

        date,

        currentDateTime,
      });

      /**
       * ======================================================
       * ÁREAS DE LAZER
       * ======================================================
       */

      const leisureAreaDocuments = await leisureAreas
        .find({
          complexId: court.complexId,
          isActive: true,

          blocks: {
            $elemMatch: {
              isActive: true,
            },
          },
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

      const leisureAreaIds = leisureAreaDocuments.map((area) => area.id);

      /**
       * Busca reservas de qualquer churrasqueira
       * do complexo na data selecionada.
       */

      const leisureBookingDocuments =
        leisureAreaIds.length > 0
          ? await bookings
              .find({
                bookingDate: date,
                leisureSlotActive: true,

                "leisureArea.areaId": {
                  $in: leisureAreaIds,
                },
              })
              .toArray()
          : [];

      /**
       * Gera chaves no formato:
       *
       * areaId:blockId
       */
      const reservedLeisureBlocks = new Set(
        leisureBookingDocuments
          .filter(
            (booking) =>
              booking.leisureArea?.areaId && booking.leisureArea?.blockId,
          )
          .map(
            (booking) =>
              `${booking.leisureArea?.areaId}:${booking.leisureArea?.blockId}`,
          ),
      );

      const formattedLeisureAreas = leisureAreaDocuments.map((area) => {
        const activeBlocks = Array.isArray(area.blocks)
          ? area.blocks.filter((block) => block.isActive)
          : [];

        const blocks = activeBlocks.map((block) => {
          const reservationKey = `${area.id}:${block.id}`;

          if (reservedLeisureBlocks.has(reservationKey)) {
            return {
              id: block.id,
              startTime: block.startTime,
              endTime: block.endTime,
              priceInCents: block.priceInCents,
              status: "RESERVED" as const,
            };
          }

          if (isSlotInPast(date, block.startTime, currentDateTime)) {
            return {
              id: block.id,
              startTime: block.startTime,
              endTime: block.endTime,
              priceInCents: block.priceInCents,
              status: "UNAVAILABLE" as const,
            };
          }

          return {
            id: block.id,
            startTime: block.startTime,
            endTime: block.endTime,
            priceInCents: block.priceInCents,
            status: "AVAILABLE" as const,
          };
        });

        return {
          id: area.id,
          slug: area.slug,
          name: area.name,
          description: area.description,
          imageUrl: area.imageUrl,
          blocks,
        };
      });

      return response.status(200).json({
        date,

        complex: {
          id: complex.id,
          slug: complex.slug,
          name: complex.name,
        },

        court: {
          id: court.id,
          slug: court.slug,
          name: court.name,
          type: court.type,
          surface: court.surface,
          priceInCents: court.priceInCents,
          players: court.players,
          minPlayers: court.minPlayers ?? court.players,
          goalkeeperPriceInCents: court.goalkeeperPriceInCents ?? 0,
          slots: courtSlots,
        },

        leisureAreas: formattedLeisureAreas,
      });
    } catch (error) {
      console.error("Erro ao buscar opções da reserva:", error);

      return response.status(500).json({
        message:
          "Erro interno ao buscar os horários da quadra e das áreas de lazer.",
      });
    }
  },
);

/**
 * ============================================================
 * SSE - DISPONIBILIDADE EM TEMPO REAL
 * ============================================================
 */

router.get(
  "/player/courts/:courtSlug/availability/events",
  async (request, response) => {
    try {
      const { courtSlug } = request.params;

      const date =
        typeof request.query.date === "string" ? request.query.date : "";

      if (!isValidBookingDate(date)) {
        return response.status(400).json({
          message: "Informe uma data válida no formato YYYY-MM-DD.",
        });
      }

      const { courts } = await getCollections();

      const court = await courts.findOne({
        slug: courtSlug,
        isActive: true,
      });

      if (!court) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      response.status(200);

      response.setHeader("Content-Type", "text/event-stream");

      response.setHeader("Cache-Control", "no-cache, no-transform");

      response.setHeader("Connection", "keep-alive");

      response.setHeader("X-Accel-Buffering", "no");

      response.flushHeaders();

      /*
       * Caso a conexão caia, o EventSource
       * tenta reconectar após 3 segundos.
       */
      response.write("retry: 3000\n\n");

      response.write("event: connected\n");

      response.write(
        `data: ${JSON.stringify({
          connected: true,
          courtSlug,
          date,
        })}\n\n`,
      );

      const unsubscribe = subscribeAvailability(courtSlug, date, (event) => {
        response.write("event: availability\n");

        response.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      /*
       * Heartbeat para manter a conexão
       * aberta em proxies.
       */
      const heartbeat = setInterval(() => {
        response.write(": ping\n\n");
      }, 25_000);

      let cleaned = false;

      function cleanup() {
        if (cleaned) {
          return;
        }

        cleaned = true;

        clearInterval(heartbeat);

        unsubscribe();
      }

      request.on("close", cleanup);

      request.on("error", cleanup);
    } catch (error) {
      console.error("Erro na conexão SSE:", error);

      if (!response.headersSent) {
        return response.status(500).json({
          message: "Erro ao iniciar atualização em tempo real.",
        });
      }

      response.end();
    }
  },
);

/**
 * ============================================================
 * LANDING - JOGADORES
 * ============================================================
 */

router.get("/landing/players", async (request, response) => {
  try {
    const { users, bookingPlayers } = await getCollections();

    const totalUsers = await users.countDocuments();

    const recentUsers = await users
      .find()
      .sort({
        createdAt: -1,
      })
      .limit(6)
      .toArray();

    const recentPlayers = await Promise.all(
      recentUsers.map(async (user) => {
        const games = await bookingPlayers.countDocuments({
          userId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          games,
        };
      }),
    );

    const topPlayers = await bookingPlayers
      .aggregate<{
        _id: {
          userId: string;
          name: string;
        };

        games: number;
      }>([
        {
          $group: {
            _id: {
              userId: "$userId",
              name: "$name",
            },

            games: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            games: -1,
          },
        },

        {
          $limit: 10,
        },
      ])
      .toArray();

    return response.json({
      totalUsers,

      recentPlayers,

      topPlayers: topPlayers.map((player) => ({
        userId: player._id.userId,

        name: player._id.name,

        games: player.games,
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar jogadores da landing:", error);

    return response.status(500).json({
      message: "Erro ao buscar jogadores da landing.",
    });
  }
});

/**
 * ============================================================
 * CRIAÇÃO DE RESERVA
 * ============================================================
 */

router.post(
  "/bookings",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const {
        courtSlug,
        bookingDate,
        startTime,

        includeGoalkeeper = false,

        expectedPlayers,

        teamOneName = "Time A",
        teamTwoName = "Time B",

        /*
         * Churrasqueira opcional:
         *
         * {
         *   areaId: string,
         *   blockId: string,
         *   captainParticipates: boolean
         * }
         */
        leisure = null,
      } = request.body;

      /**
       * ======================================================
       * VALIDAÇÕES BÁSICAS
       * ======================================================
       */

      if (!courtSlug) {
        return response.status(400).json({
          message: "Informe a quadra.",
        });
      }

      if (!bookingDate) {
        return response.status(400).json({
          message: "Informe a data da reserva.",
        });
      }

      if (!startTime) {
        return response.status(400).json({
          message: "Informe o horário da reserva.",
        });
      }

      if (!isValidBookingDate(String(bookingDate))) {
        return response.status(400).json({
          message: "Data da reserva inválida.",
        });
      }

      if (isSlotInPast(String(bookingDate), String(startTime))) {
        return response.status(400).json({
          message: "Não é possível reservar um horário que já passou.",
        });
      }

      const expectedPlayersNumber = normalizePositiveNumber(expectedPlayers);

      if (!expectedPlayersNumber || !Number.isInteger(expectedPlayersNumber)) {
        return response.status(400).json({
          message: "Informe uma quantidade inteira e positiva de jogadores.",
        });
      }

      if (typeof includeGoalkeeper !== "boolean") {
        return response.status(400).json({
          message: "Informe se a reserva inclui goleiro.",
        });
      }

      /**
       * Valida a estrutura enviada para a churrasqueira.
       */

      if (
        leisure !== null &&
        (typeof leisure !== "object" ||
          typeof leisure.areaId !== "string" ||
          !leisure.areaId.trim() ||
          typeof leisure.blockId !== "string" ||
          !leisure.blockId.trim() ||
          typeof leisure.captainParticipates !== "boolean")
      ) {
        return response.status(400).json({
          message: "Dados inválidos para reservar a área de lazer.",
        });
      }

      const { users, courts, leisureAreas, bookings, bookingPlayers } =
        await getCollections();

      /**
       * ======================================================
       * JOGADOR AUTENTICADO
       * ======================================================
       */

      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const user = await users.findOne({
        id: userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      /**
       * ======================================================
       * QUADRA
       * ======================================================
       */

      const court = await courts.findOne({
        slug: String(courtSlug),
        isActive: true,
      });

      if (!court) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      const courtTimes = Array.isArray(court.times) ? court.times : [];

      if (courtTimes.length > 0 && !courtTimes.includes(String(startTime))) {
        return response.status(400).json({
          message: "Horário não disponível para esta quadra.",
        });
      }

      /*
       * Mínimo que libera o pagamento: definido pelo admin
       * por quadra, nunca acima da capacidade informada.
       */
      const requiredPlayers = getRequiredPlayers({
        expectedPlayers: expectedPlayersNumber,
        minPlayers: court.minPlayers,
      });

      /*
       * O valor do goleiro vem da quadra, nunca do cliente.
       */
      const goalkeeperPriceNumber = includeGoalkeeper
        ? (court.goalkeeperPriceInCents ?? 0)
        : 0;

      /**
       * Verificação amigável da quadra.
       *
       * O índice UNIQUE continua sendo a proteção
       * definitiva contra concorrência.
       */

      const existingCourtBooking = await bookings.findOne({
        courtSlug: court.slug,
        bookingDate: String(bookingDate),
        startTime: String(startTime),
        slotActive: true,
      });

      if (existingCourtBooking) {
        return response.status(409).json({
          message: "Este horário da quadra já possui uma reserva.",
        });
      }

      /**
       * ======================================================
       * CHURRASQUEIRA / ÁREA DE LAZER
       * ======================================================
       */

      let selectedLeisureArea: BookingLeisureArea | null = null;

      let captainParticipatesInLeisure = false;

      if (leisure !== null) {
        const area = await leisureAreas.findOne({
          id: leisure.areaId.trim(),

          /*
           * Impede reservar uma churrasqueira
           * pertencente a outro complexo.
           */
          complexId: court.complexId,

          isActive: true,
        });

        if (!area) {
          return response.status(404).json({
            message: "Área de lazer não encontrada neste complexo.",
          });
        }

        const selectedBlock = area.blocks.find(
          (block) => block.id === leisure.blockId.trim() && block.isActive,
        );

        if (!selectedBlock) {
          return response.status(404).json({
            message:
              "Bloco de horário da área de lazer não encontrado ou desativado.",
          });
        }

        if (isSlotInPast(String(bookingDate), selectedBlock.startTime)) {
          return response.status(400).json({
            message:
              "Não é possível reservar um bloco de horário que já passou.",
          });
        }

        /**
         * Verificação amigável antes do INSERT.
         */

        const existingLeisureBooking = await bookings.findOne({
          bookingDate: String(bookingDate),

          "leisureArea.areaId": area.id,
          "leisureArea.blockId": selectedBlock.id,

          leisureSlotActive: true,
        });

        if (existingLeisureBooking) {
          return response.status(409).json({
            message: "Este bloco da churrasqueira já possui uma reserva.",
          });
        }

        /**
         * Snapshot dos dados da churrasqueira.
         *
         * Alterações futuras no cadastro não modificam
         * reservas que já foram criadas.
         */

        selectedLeisureArea = {
          areaId: area.id,
          areaSlug: area.slug,
          areaName: area.name,

          blockId: selectedBlock.id,

          startTime: selectedBlock.startTime,
          endTime: selectedBlock.endTime,

          priceInCents: selectedBlock.priceInCents,
        };

        captainParticipatesInLeisure = leisure.captainParticipates;
      }

      /**
       * ======================================================
       * VALORES INICIAIS
       * ======================================================
       */

      const now = new Date();

      /*
       * Este total continua representando somente:
       *
       * quadra + goleiros
       *
       * O valor da churrasqueira permanece separado.
       */
      const totalPriceInCents = court.priceInCents + goalkeeperPriceNumber;

      const provisionalCourtShareInCents = Math.ceil(
        totalPriceInCents / requiredPlayers,
      );

      let captainCourtShareInCents = provisionalCourtShareInCents;

      let captainLeisureShareInCents = 0;

      let captainCourtFeeInCents = PLAYER_PLATFORM_FEE_IN_CENTS;

      let captainLeisureFeeInCents = 0;

      let bookingStatus: BookingStatus =
        requiredPlayers <= 1 ? "PAYMENT_AVAILABLE" : "WAITING_PLAYERS";

      let pricingFrozenAt: Date | null = requiredPlayers <= 1 ? now : null;

      let leisureStatus: "ACTIVE" | "CANCELLED_NO_PARTICIPANTS" | null =
        selectedLeisureArea ? "ACTIVE" : null;

      let leisureSlotActive = selectedLeisureArea !== null;

      /**
       * Caso exista apenas um jogador, o valor já pode
       * ser fechado durante a criação.
       */

      if (requiredPlayers === 1) {
        captainCourtShareInCents = totalPriceInCents;

        if (selectedLeisureArea && captainParticipatesInLeisure) {
          captainLeisureShareInCents = selectedLeisureArea.priceInCents;

          captainLeisureFeeInCents = LEISURE_PLATFORM_FEE_IN_CENTS;
        }

        /**
         * Se o único jogador não participar,
         * libera imediatamente a churrasqueira.
         */
        if (selectedLeisureArea && !captainParticipatesInLeisure) {
          leisureStatus = "CANCELLED_NO_PARTICIPANTS";

          leisureSlotActive = false;
        }
      }

      const captainAmountToPayInCents =
        captainCourtShareInCents +
        captainLeisureShareInCents +
        captainCourtFeeInCents +
        captainLeisureFeeInCents;

      /**
       * ======================================================
       * DOCUMENTO DA RESERVA
       * ======================================================
       */

      const booking: Booking = {
        id: randomUUID(),

        shareCode: generateShareCode(),

        captainUserId: user.id,
        captainName: user.name,

        /*
         * O complexo vem da quadra consultada no banco.
         */
        complexId: court.complexId,

        courtSlug: court.slug,
        courtName: court.name,
        courtType: court.type,

        location: court.location,

        bookingDate: String(bookingDate),
        startTime: String(startTime),

        courtPriceInCents: court.priceInCents,
        goalkeeperPriceInCents: goalkeeperPriceNumber,

        totalPriceInCents,

        expectedPlayers: expectedPlayersNumber,

        minPlayers: requiredPlayers,

        includeGoalkeeper,

        teamOneName: String(teamOneName || "Time A").trim(),

        teamTwoName: String(teamTwoName || "Time B").trim(),

        /*
         * Mantido por compatibilidade.
         * Representa a taxa da quadra.
         */
        platformFeeInCents: PLAYER_PLATFORM_FEE_IN_CENTS,

        bookingStatus,

        slotActive: true,

        leisureArea: selectedLeisureArea,
        leisureStatus,
        leisureSlotActive,

        pricingFrozenAt,

        createdAt: now,
        updatedAt: now,
      };

      /**
       * ======================================================
       * CAPITÃO DA RESERVA
       * ======================================================
       */

      const captainPlayer: BookingPlayer = {
        id: randomUUID(),

        bookingId: booking.id,

        userId: user.id,

        name: user.name,
        phone: user.phone,
        email: user.email,

        teamNumber: 1,

        status: "WAITING_PAYMENT",

        participatesInLeisure:
          selectedLeisureArea !== null && captainParticipatesInLeisure,

        courtShareInCents: captainCourtShareInCents,

        leisureShareInCents: captainLeisureShareInCents,

        courtPlatformFeeInCents: captainCourtFeeInCents,

        leisurePlatformFeeInCents: captainLeisureFeeInCents,

        amountToPayInCents: captainAmountToPayInCents,

        pixCopyPaste:
          `PIX-PLACEHOLDER-` +
          `${booking.shareCode}-` +
          `${user.id}-` +
          `${captainAmountToPayInCents}`,

        paidAt: null,

        createdAt: now,
        updatedAt: now,
      };

      /**
       * ======================================================
       * INSERT E ROLLBACK COMPENSATÓRIO
       * ======================================================
       */

      let bookingInserted = false;

      try {
        /*
         * Este único INSERT disputa os dois índices:
         *
         * 1. horário da quadra;
         * 2. bloco da churrasqueira.
         *
         * Se qualquer recurso já estiver ocupado,
         * o documento não será inserido.
         */
        await bookings.insertOne(booking);

        bookingInserted = true;

        await bookingPlayers.insertOne(captainPlayer);
      } catch (error) {
        /*
         * Se a reserva foi criada, mas a criação
         * do capitão falhou, remove a reserva.
         *
         * Isso também libera os dois horários.
         */
        if (bookingInserted) {
          await bookings.deleteOne({
            id: booking.id,
          });
        }

        throw error;
      }

      /**
       * Atualiza a disponibilidade da quadra
       * pelo SSE já existente.
       *
       * O evento específico da churrasqueira
       * será adicionado junto do frontend em
       * tempo real.
       */

      publishAvailabilityEvent({
        type: "BOOKING_CREATED",

        courtSlug: booking.courtSlug,

        bookingDate: booking.bookingDate,

        startTime: booking.startTime,
      });

      return response.status(201).json({
        ...booking,
        players: [captainPlayer],
      });
    } catch (error) {
      console.error("Erro ao criar reserva:", error);

      /**
       * O índice da churrasqueira foi violado.
       */

      if (isLeisureSlotDuplicateError(error)) {
        return response.status(409).json({
          message:
            "Este bloco da churrasqueira acabou de ser reservado por outro usuário.",
        });
      }

      /**
       * Outro índice UNIQUE foi violado.
       *
       * Na criação da reserva, normalmente será
       * o índice do horário da quadra.
       */

      if (isDuplicateKeyError(error)) {
        return response.status(409).json({
          message:
            "Este horário da quadra acabou de ser reservado por outro usuário.",
        });
      }

      return response.status(500).json({
        message: "Erro interno ao criar a reserva.",
      });
    }
  },
);

/**
 * ============================================================
 * BUSCAR RESERVA PELO CÓDIGO PÚBLICO
 * ============================================================
 */

router.get("/bookings/share/:shareCode", async (request, response) => {
  try {
    const shareCode = getRouteParam(request.params.shareCode);

    if (!shareCode) {
      return response.status(400).json({
        message: "O código da reserva não foi informado.",
      });
    }

    const { bookings } = await getCollections();

    const bookingDocument = await bookings.findOne({
      shareCode,
    });

    if (!bookingDocument) {
      return response.status(404).json({
        message: "Reserva não encontrada.",
      });
    }

    const booking = withoutMongoId(bookingDocument);

    const bookingWithPlayers = await buildBookingWithPlayers(booking);

    return response.json(bookingWithPlayers);
  } catch (error) {
    console.error("Erro ao buscar reserva:", error);

    return response.status(500).json({
      message: "Erro ao buscar reserva.",
    });
  }
});

/**
 * ============================================================
 * ALTERAR NOMES DOS TIMES
 * ============================================================
 */

router.patch(
  "/bookings/:id/teams",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const id = getRouteParam(request.params.id);

      if (!id) {
        return response.status(400).json({
          message: "O ID da reserva não foi informado.",
        });
      }

      const { teamOneName, teamTwoName } = request.body;

      if (!request.userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { bookings } = await getCollections();

      /*
       * Somente o capitão da reserva pode renomear os times.
       */
      const updatedBookingDocument = await bookings.findOneAndUpdate(
        {
          id,
          captainUserId: request.userId,
        },

        {
          $set: {
            teamOneName: String(teamOneName || "Time A").trim(),

            teamTwoName: String(teamTwoName || "Time B").trim(),

            updatedAt: new Date(),
          },
        },

        {
          returnDocument: "after",
        },
      );

      if (!updatedBookingDocument) {
        return response.status(404).json({
          message: "Reserva não encontrada ou você não é o capitão dela.",
        });
      }

      const booking = withoutMongoId(updatedBookingDocument);

      const bookingWithPlayers = await buildBookingWithPlayers(booking);

      return response.json(bookingWithPlayers);
    } catch (error) {
      console.error("Erro ao atualizar nomes dos times:", error);

      return response.status(500).json({
        message: "Erro ao atualizar nomes dos times.",
      });
    }
  },
);

/**
 * ============================================================
 * JOGADOR ENTRA EM UMA RESERVA
 * ============================================================
 */

router.post(
  "/bookings/share/:shareCode/players",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const shareCode = getRouteParam(request.params.shareCode);

      if (!shareCode) {
        return response.status(400).json({
          message: "O código da reserva não foi informado.",
        });
      }

      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { users, bookings, bookingPlayers } = await getCollections();

      const user = await users.findOne({
        id: userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      const initialBookingDocument = await bookings.findOne({
        shareCode,
      });

      if (!initialBookingDocument) {
        return response.status(404).json({
          message: "Reserva não encontrada.",
        });
      }

      const initialBooking = withoutMongoId(initialBookingDocument);

      return withBookingLock(initialBooking.id, async () => {
        /*
         * Busca novamente dentro do bloqueio.
         * O estado pode ter mudado enquanto
         * a requisição aguardava.
         */
        const currentBookingDocument = await bookings.findOne({
          id: initialBooking.id,
        });

        if (!currentBookingDocument) {
          return response.status(404).json({
            message: "Reserva não encontrada.",
          });
        }

        const booking = withoutMongoId(currentBookingDocument);

        if (
          booking.bookingStatus !== "WAITING_PLAYERS" ||
          booking.pricingFrozenAt
        ) {
          return response.status(409).json({
            message: "Esta reserva não está mais aceitando jogadores.",
          });
        }

        const hasActiveLeisure =
          booking.leisureArea !== null &&
          booking.leisureArea !== undefined &&
          booking.leisureStatus === "ACTIVE" &&
          booking.leisureSlotActive !== false;

        const receivedParticipation = request.body?.participatesInLeisure;

        /*
         * Quando existe churrasqueira, o jogador
         * precisa responder sim ou não.
         */
        if (hasActiveLeisure && typeof receivedParticipation !== "boolean") {
          return response.status(400).json({
            message: "Informe se você participará do churrasco.",
          });
        }

        /*
         * Quando não existe churrasqueira,
         * sempre força false.
         */
        const participatesInLeisure = hasActiveLeisure
          ? receivedParticipation
          : false;

        const activePlayers = await bookingPlayers
          .find({
            bookingId: booking.id,

            status: {
              $ne: "CANCELLED",
            },
          })
          .toArray();

        const alreadyJoined = activePlayers.some(
          (player) => player.userId === user.id,
        );

        if (alreadyJoined) {
          return response.status(409).json({
            message: "Você já está confirmado nesta reserva.",
          });
        }

        if (activePlayers.length >= booking.expectedPlayers) {
          return response.status(409).json({
            message: "A reserva já atingiu o número máximo de jogadores.",
          });
        }

        const now = new Date();

        /*
         * Os valores ficam zerados enquanto
         * o grupo não estiver completo.
         *
         * O serviço de finalização preencherá
         * os valores definitivos.
         */
        const player: BookingPlayer = {
          id: randomUUID(),

          bookingId: booking.id,

          userId: user.id,

          name: user.name,
          phone: user.phone,
          email: user.email,

          teamNumber: 1,

          status: "WAITING_PAYMENT",

          participatesInLeisure,

          courtShareInCents: 0,
          leisureShareInCents: 0,

          courtPlatformFeeInCents: 0,
          leisurePlatformFeeInCents: 0,

          amountToPayInCents: 0,

          pixCopyPaste: "",

          paidAt: null,

          createdAt: now,
          updatedAt: now,
        };

        await bookingPlayers.insertOne(player);

        const totalActivePlayers = await bookingPlayers.countDocuments({
          bookingId: booking.id,

          status: {
            $ne: "CANCELLED",
          },
        });

        let updatedBooking = booking;

        /*
         * O último jogador fecha o grupo e
         * dispara o rateio definitivo.
         */
        if (totalActivePlayers >= getRequiredPlayers(booking)) {
          updatedBooking = await finalizeBookingPricing(booking.id);
        }

        const savedPlayerDocument = await bookingPlayers.findOne({
          id: player.id,
        });

        const savedPlayer = savedPlayerDocument
          ? withoutMongoId(savedPlayerDocument)
          : player;

        return response.status(201).json({
          message: "Você entrou na reserva com sucesso.",

          player: savedPlayer,

          totalPlayers: totalActivePlayers,

          expectedPlayers: booking.expectedPlayers,

          minPlayers: getRequiredPlayers(booking),

          bookingStatus: updatedBooking.bookingStatus,

          pricingFrozenAt: updatedBooking.pricingFrozenAt ?? null,
        });
      });
    } catch (error) {
      console.error("Erro ao entrar na reserva:", error);

      if (isDuplicateKeyError(error)) {
        return response.status(409).json({
          message: "Você já está confirmado nesta reserva.",
        });
      }

      return response.status(500).json({
        message: "Erro interno ao entrar na reserva.",
      });
    }
  },
);

/**
 * ============================================================
 * ALTERAR PARTICIPAÇÃO NA CHURRASQUEIRA
 * ============================================================
 */

router.patch(
  "/bookings/share/:shareCode/leisure-participation",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const shareCode = getRouteParam(request.params.shareCode);

      if (!shareCode) {
        return response.status(400).json({
          message: "O código da reserva não foi informado.",
        });
      }

      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { participatesInLeisure } = request.body;

      if (typeof participatesInLeisure !== "boolean") {
        return response.status(400).json({
          message: "Informe se você participará do churrasco.",
        });
      }

      const { bookings, bookingPlayers } = await getCollections();

      const initialBookingDocument = await bookings.findOne({
        shareCode,
      });

      if (!initialBookingDocument) {
        return response.status(404).json({
          message: "Reserva não encontrada.",
        });
      }

      const initialBooking = withoutMongoId(initialBookingDocument);

      return withBookingLock(initialBooking.id, async () => {
        const currentBookingDocument = await bookings.findOne({
          id: initialBooking.id,
        });

        if (!currentBookingDocument) {
          return response.status(404).json({
            message: "Reserva não encontrada.",
          });
        }

        const booking = withoutMongoId(currentBookingDocument);

        const hasActiveLeisure =
          booking.leisureArea !== null &&
          booking.leisureArea !== undefined &&
          booking.leisureStatus === "ACTIVE" &&
          booking.leisureSlotActive !== false;

        if (!hasActiveLeisure) {
          return response.status(400).json({
            message: "Esta reserva não possui uma churrasqueira ativa.",
          });
        }

        if (
          booking.bookingStatus !== "WAITING_PLAYERS" ||
          booking.pricingFrozenAt
        ) {
          return response.status(409).json({
            message:
              "A participação não pode mais ser alterada porque os valores já foram calculados.",
          });
        }

        const updatedPlayerDocument = await bookingPlayers.findOneAndUpdate(
          {
            bookingId: booking.id,
            userId,

            status: {
              $ne: "CANCELLED",
            },
          },

          {
            $set: {
              participatesInLeisure,

              /*
               * Os valores definitivos serão
               * calculados somente no fechamento.
               */
              leisureShareInCents: 0,
              leisurePlatformFeeInCents: 0,

              updatedAt: new Date(),
            },
          },

          {
            returnDocument: "after",
          },
        );

        if (!updatedPlayerDocument) {
          return response.status(404).json({
            message: "Você ainda não participa desta reserva.",
          });
        }

        return response.status(200).json({
          message: "Participação no churrasco atualizada com sucesso.",

          player: withoutMongoId(updatedPlayerDocument),
        });
      });
    } catch (error) {
      console.error("Erro ao alterar participação:", error);

      return response.status(500).json({
        message: "Erro interno ao alterar a participação no churrasco.",
      });
    }
  },
);

/**
 * ============================================================
 * STATUS DE PAGAMENTO
 * ============================================================
 */

router.patch(
  "/booking-players/:playerId/payment-status",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    try {
      if (!request.admin) {
        return response.status(401).json({
          message: "Contexto administrativo não encontrado.",
        });
      }

      const playerId = getRouteParam(request.params.playerId);

      if (!playerId) {
        return response.status(400).json({
          message: "O ID do jogador não foi informado.",
        });
      }

      const { status } = request.body;

      const allowedStatuses: PlayerStatus[] = [
        "WAITING_PAYMENT",
        "PAID",
        "CANCELLED",
      ];

      if (!allowedStatuses.includes(status)) {
        return response.status(400).json({
          message: "Status inválido.",
        });
      }

      const { bookings, bookingPlayers } = await getCollections();

      /*
       * O admin só altera pagamentos de reservas do próprio complexo.
       */
      const targetPlayer = await bookingPlayers.findOne({ id: playerId });

      const targetBooking = targetPlayer
        ? await bookings.findOne({
            id: targetPlayer.bookingId,
            complexId: request.admin.complexId,
          })
        : null;

      if (!targetPlayer || !targetBooking) {
        return response.status(404).json({
          message: "Jogador da reserva não encontrado.",
        });
      }

      const updatedPlayerDocument = await bookingPlayers.findOneAndUpdate(
        {
          id: playerId,
        },

        {
          $set: {
            status,

            paidAt: status === "PAID" ? new Date() : null,

            updatedAt: new Date(),
          },
        },

        {
          returnDocument: "after",
        },
      );

      if (!updatedPlayerDocument) {
        return response.status(404).json({
          message: "Jogador da reserva não encontrado.",
        });
      }

      const player = withoutMongoId(updatedPlayerDocument);

      const unpaidPlayers = await bookingPlayers.countDocuments({
        bookingId: player.bookingId,

        status: {
          $ne: "PAID",
        },
      });

      if (unpaidPlayers === 0) {
        await bookings.updateOne(
          {
            id: player.bookingId,
          },

          {
            $set: {
              bookingStatus: "COMPLETED",

              updatedAt: new Date(),
            },
          },
        );
      }

      return response.json(player);
    } catch (error) {
      console.error("Erro ao atualizar status de pagamento:", error);

      return response.status(500).json({
        message: "Erro ao atualizar status de pagamento.",
      });
    }
  },
);

/**
 * ============================================================
 * PAGAMENTO DA RESERVA
 * ============================================================
 */

router.get(
  "/bookings/share/:shareCode/payment",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const shareCode = getRouteParam(request.params.shareCode);

      if (!shareCode) {
        return response.status(400).json({
          message: "O código da reserva não foi informado.",
        });
      }

      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { bookings, bookingPlayers } = await getCollections();

      const bookingDocument = await bookings.findOne({
        shareCode,
      });

      if (!bookingDocument) {
        return response.status(404).json({
          message: "Reserva não encontrada.",
        });
      }

      const booking = withoutMongoId(bookingDocument);

      const playerDocument = await bookingPlayers.findOne({
        bookingId: booking.id,
        userId,

        status: {
          $ne: "CANCELLED",
        },
      });

      if (!playerDocument) {
        return response.status(400).json({
          message: "Você ainda não entrou nesta reserva.",
        });
      }

      const player = withoutMongoId(playerDocument);

      if (booking.bookingStatus === "CANCELLED") {
        return response.json({
          available: false,

          playerId: player.id,
          status: player.status,

          amountToPayInCents: 0,
          pixCopyPaste: "",

          paidAt: player.paidAt ?? null,

          message: "Esta reserva foi cancelada.",
        });
      }

      /*
       * Reserva antiga:
       *
       * não possuía leisureArea nem
       * pricingFrozenAt.
       */
      const isLegacyBooking =
        booking.leisureArea === undefined &&
        booking.pricingFrozenAt === undefined;

      const paymentAvailable =
        booking.bookingStatus !== "WAITING_PLAYERS" &&
        (isLegacyBooking || Boolean(booking.pricingFrozenAt));

      if (!paymentAvailable) {
        return response.json({
          available: false,

          playerId: player.id,
          status: player.status,

          courtShareInCents: 0,
          leisureShareInCents: 0,

          courtPlatformFeeInCents: 0,
          leisurePlatformFeeInCents: 0,

          amountToPayInCents: 0,
          pixCopyPaste: "",

          paidAt: player.paidAt ?? null,

          message:
            "O pagamento será liberado quando todos os jogadores confirmarem presença.",
        });
      }

      /*
       * Compatibilidade com jogadores antigos.
       */

      const courtPlatformFeeInCents =
        player.courtPlatformFeeInCents ?? booking.platformFeeInCents ?? 0;

      const leisurePlatformFeeInCents = player.leisurePlatformFeeInCents ?? 0;

      const leisureShareInCents = player.leisureShareInCents ?? 0;

      const courtShareInCents =
        player.courtShareInCents ??
        Math.max(player.amountToPayInCents - courtPlatformFeeInCents, 0);

      return response.json({
        available: true,

        playerId: player.id,
        status: player.status,

        participatesInLeisure: player.participatesInLeisure ?? false,

        courtShareInCents,
        leisureShareInCents,

        courtPlatformFeeInCents,
        leisurePlatformFeeInCents,

        amountToPayInCents: player.amountToPayInCents,

        pixCopyPaste: player.pixCopyPaste,

        paidAt: player.paidAt ?? null,

        message:
          "Pagamento ainda está em modo mock. O QR Code exibido é ilustrativo.",
      });
    } catch (error) {
      console.error("Erro ao buscar pagamento:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar o pagamento.",
      });
    }
  },
);

/**
 * ============================================================
 * PERFIL DO USUÁRIO
 *
 * Lista todas as reservas das quais
 * o usuário participa.
 * ============================================================
 */

router.get(
  "/users/me/bookings",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    try {
      const userId = request.userId;

      if (!userId) {
        return response.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const { bookings, bookingPlayers } = await getCollections();

      const userBookingPlayers = await bookingPlayers
        .find({
          userId,
        })
        .toArray();

      const bookingIds = [
        ...new Set(userBookingPlayers.map((player) => player.bookingId)),
      ];

      if (bookingIds.length === 0) {
        return response.json([]);
      }

      const bookingDocuments = await bookings
        .find({
          id: {
            $in: bookingIds,
          },
        })
        .sort({
          bookingDate: -1,
          startTime: -1,
        })
        .toArray();

      const userBookings = await Promise.all(
        bookingDocuments.map(async (document) => {
          const booking = withoutMongoId(document);

          const bookingWithPlayers = await buildBookingWithPlayers(booking);

          return {
            ...bookingWithPlayers,

            isCaptain: booking.captainUserId === userId,
          };
        }),
      );

      return response.json(userBookings);
    } catch (error) {
      console.error("Erro ao buscar reservas do perfil:", error);

      return response.status(500).json({
        message: "Erro ao buscar reservas do perfil.",
      });
    }
  },
);

export default router;
