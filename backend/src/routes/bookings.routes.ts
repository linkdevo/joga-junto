import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import {
  getCollections,
  withoutMongoId,
  withoutMongoIds,
  type Booking,
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

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const PLAYER_PLATFORM_FEE_IN_CENTS = 100;

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
      userId: string;
    };

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
      const { users, bookings, bookingPlayers } = await getCollections();

      const user = await users.findOne({
        id: request.userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      const playerEntries = await bookingPlayers
        .find({
          userId: request.userId,
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

router.get("/player/courts", async (request, response) => {
  try {
    const { courts } = await getCollections();

    const playerCourts = await courts
      .aggregate([
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
              },
            },
          },
        },
      ])
      .toArray();

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

        goalkeeperPriceInCents = 0,

        expectedPlayers,

        teamOneName = "Time A",
        teamTwoName = "Time B",
      } = request.body;

      /**
       * Validações básicas.
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

      /**
       * IMPORTANTE:
       * Estas validações precisam ficar DENTRO
       * da rota /bookings.
       */

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

      if (!expectedPlayersNumber) {
        return response.status(400).json({
          message: "Informe a quantidade de jogadores.",
        });
      }

      const goalkeeperPriceNumber = Number(goalkeeperPriceInCents || 0);

      if (
        !Number.isFinite(goalkeeperPriceNumber) ||
        goalkeeperPriceNumber < 0
      ) {
        return response.status(400).json({
          message: "Valor dos goleiros inválido.",
        });
      }

      const { users, courts, bookings, bookingPlayers } =
        await getCollections();

      /**
       * Jogador autenticado.
       */

      const user = await users.findOne({
        id: request.userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      /**
       * Quadra.
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
       * Verifica se o horário pertence
       * aos horários configurados da quadra.
       */

      const courtTimes = Array.isArray(court.times) ? court.times : [];

      if (courtTimes.length > 0 && !courtTimes.includes(String(startTime))) {
        return response.status(400).json({
          message: "Horário não disponível para esta quadra.",
        });
      }

      /**
       * Verificação amigável antes do INSERT.
       *
       * O índice UNIQUE do banco continua sendo
       * a proteção real contra concorrência.
       */

      const existingBooking = await bookings.findOne({
        courtSlug: String(courtSlug),

        bookingDate: String(bookingDate),

        startTime: String(startTime),

        slotActive: true,
      });

      if (existingBooking) {
        return response.status(409).json({
          message: "Este horário já possui uma reserva.",
        });
      }

      const now = new Date();

      const totalPriceInCents = court.priceInCents + goalkeeperPriceNumber;

      const amountToPayInCents =
        Math.ceil(totalPriceInCents / expectedPlayersNumber) +
        PLAYER_PLATFORM_FEE_IN_CENTS;

      const bookingStatus: BookingStatus =
        expectedPlayersNumber <= 1 ? "PAYMENT_AVAILABLE" : "WAITING_PLAYERS";

      /**
       * Reserva.
       */

      const booking: Booking = {
        id: randomUUID(),

        shareCode: generateShareCode(),

        captainUserId: user.id,
        captainName: user.name,

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

        teamOneName: String(teamOneName || "Time A").trim(),

        teamTwoName: String(teamTwoName || "Time B").trim(),

        platformFeeInCents: PLAYER_PLATFORM_FEE_IN_CENTS,

        bookingStatus,

        /**
         * Reserva ocupa o horário.
         */
        slotActive: true,

        createdAt: now,
        updatedAt: now,
      };

      /**
       * Capitão também participa da reserva.
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

        amountToPayInCents,

        pixCopyPaste: `PIX-PLACEHOLDER-${booking.shareCode}-${user.id}-${amountToPayInCents}`,

        paidAt: null,

        createdAt: now,
        updatedAt: now,
      };

      /**
       * Rollback compensatório.
       *
       * Se criar a reserva mas falhar ao
       * criar o capitão, remove a reserva.
       */

      let bookingInserted = false;

      try {
        await bookings.insertOne(booking);

        bookingInserted = true;

        await bookingPlayers.insertOne(captainPlayer);
      } catch (error) {
        if (bookingInserted) {
          await bookings.deleteOne({
            id: booking.id,
          });
        }

        throw error;
      }

      /**
       * Informa via SSE que o horário
       * acabou de ser reservado.
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
       * Caso duas pessoas reservem no
       * mesmo instante, o índice UNIQUE
       * será a proteção final.
       */

      if (isDuplicateKeyError(error)) {
        return response.status(409).json({
          message: "Este horário já possui uma reserva.",
        });
      }

      return response.status(500).json({
        message: "Erro ao criar reserva.",
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
    const { shareCode } = request.params;

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

router.patch("/bookings/:id/teams", async (request, response) => {
  try {
    const { id } = request.params;

    const { teamOneName, teamTwoName } = request.body;

    const { bookings } = await getCollections();

    const updatedBookingDocument = await bookings.findOneAndUpdate(
      {
        id,
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
        message: "Reserva não encontrada.",
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
});

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
      const { shareCode } = request.params;

      const { users, bookings, bookingPlayers } = await getCollections();

      const user = await users.findOne({
        id: request.userId,
      });

      if (!user) {
        return response.status(401).json({
          message: "Usuário não encontrado.",
        });
      }

      const bookingDocument = await bookings.findOne({
        shareCode,
      });

      if (!bookingDocument) {
        return response.status(404).json({
          message: "Reserva não encontrada.",
        });
      }

      const booking = withoutMongoId(bookingDocument);

      /*
       * Depois que todos os jogadores entram,
       * a reserva muda para PAYMENT_AVAILABLE.
       */
      if (booking.bookingStatus !== "WAITING_PLAYERS") {
        return response.status(400).json({
          message: "Esta reserva não está mais aceitando jogadores.",
        });
      }

      const players = await getBookingPlayers(booking.id);

      const activePlayers = players.filter(
        (player) => player.status !== "CANCELLED",
      );

      /*
       * Evita o mesmo usuário entrar
       * duas vezes na reserva.
       */
      const alreadyJoined = activePlayers.some(
        (player) => player.userId === user.id,
      );

      if (alreadyJoined) {
        return response.status(409).json({
          message: "Você já está confirmado nesta reserva.",
        });
      }

      /*
       * Verifica lotação.
       */
      if (activePlayers.length >= booking.expectedPlayers) {
        return response.status(409).json({
          message: "A reserva já atingiu o número máximo de jogadores.",
        });
      }

      const amountToPayInCents =
        Math.ceil(booking.totalPriceInCents / booking.expectedPlayers) +
        booking.platformFeeInCents;

      const now = new Date();

      const player: BookingPlayer = {
        id: randomUUID(),

        bookingId: booking.id,

        userId: user.id,

        name: user.name,
        phone: user.phone,
        email: user.email,

        /*
         * O campo continua existindo no banco
         * por compatibilidade, mas não será mais
         * usado visualmente nesta tela.
         */
        teamNumber: 1,

        status: "WAITING_PAYMENT",

        amountToPayInCents,

        pixCopyPaste: `PIX-PLACEHOLDER-${booking.shareCode}-${user.id}-${amountToPayInCents}`,

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

      /*
       * Quando completar a quantidade esperada,
       * libera a próxima etapa.
       */
      if (totalActivePlayers >= booking.expectedPlayers) {
        await bookings.updateOne(
          {
            id: booking.id,
          },
          {
            $set: {
              bookingStatus: "PAYMENT_AVAILABLE",

              updatedAt: new Date(),
            },
          },
        );
      }

      return response.status(201).json({
        message: "Você entrou na reserva com sucesso.",

        player,

        totalPlayers: totalActivePlayers,

        expectedPlayers: booking.expectedPlayers,
      });
    } catch (error) {
      console.error("Erro ao entrar na reserva:", error);

      if (isDuplicateKeyError(error)) {
        return response.status(409).json({
          message: "Você já está confirmado nesta reserva.",
        });
      }

      return response.status(500).json({
        message: "Erro ao entrar na reserva.",
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
  async (request, response) => {
    try {
      const { playerId } = request.params;

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
      const { shareCode } = request.params;

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
      const players = await getBookingPlayers(booking.id);

      const player = players.find(
        (bookingPlayer) => bookingPlayer.userId === request.userId,
      );

      if (!player) {
        return response.status(400).json({
          message: "Você ainda não entrou nesta reserva.",
        });
      }

      return response.json({
        available: true,
        playerId: player.id,
        status: player.status,
        amountToPayInCents: player.amountToPayInCents,
        pixCopyPaste: player.pixCopyPaste,
        paidAt: player.paidAt ?? null,
        message:
          "Pagamento ainda está em modo mock. O QR Code exibido é ilustrativo.",
      });
    } catch (error) {
      console.error(error);

      return response.status(500).json({
        message: "Erro ao buscar pagamento.",
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
      const { bookings, bookingPlayers } = await getCollections();

      const userBookingPlayers = await bookingPlayers
        .find({
          userId: request.userId,
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

            isCaptain: booking.captainUserId === request.userId,
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
