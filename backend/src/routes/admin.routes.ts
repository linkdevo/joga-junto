import { Router } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { getCollections, type AdminUser, type Court } from "../database";
import {
  authenticateAdmin,
  type AuthenticatedAdminRequest,
} from "../middlewares/authenticate-admin";

import { getRouteParam } from "../utils/route-params";

const router = Router();

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-admin-secret";

type AdminTokenPayload = {
  adminId: string;
  complexId: string;
  role: "COMPLEX_ADMIN";
};

const createAdminSchema = z.object({
  name: z.string().trim().min(2, {
    message: "O nome deve possuir pelo menos 2 caracteres.",
  }),

  email: z.string().trim().email({
    message: "Informe um e-mail válido.",
  }),

  phone: z.string().trim().min(8, {
    message: "Informe um telefone válido.",
  }),

  password: z.string().min(6, {
    message: "A senha deve possuir pelo menos 6 caracteres.",
  }),

  complexId: z.string().trim().min(1, {
    message: "Informe o ID do complexo.",
  }),
});

const adminLoginSchema = z.object({
  email: z.string().trim().email({
    message: "Informe um e-mail válido.",
  }),

  password: z.string().min(6, {
    message: "A senha deve possuir pelo menos 6 caracteres.",
  }),
});

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "O horário deve estar no formato HH:mm.",
  });

const adminCourtSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, {
      message: "O slug deve possuir pelo menos 2 caracteres.",
    })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        "O slug deve possuir apenas letras minúsculas, números e hífens.",
    }),

  name: z.string().trim().min(2, {
    message: "Informe o nome da quadra.",
  }),

  type: z.string().trim().min(2, {
    message: "Informe o tipo da quadra.",
  }),

  surface: z.string().trim().min(2, {
    message: "Informe a superfície da quadra.",
  }),

  priceInCents: z.number().int().positive({
    message: "O preço deve ser um número inteiro positivo em centavos.",
  }),

  players: z.number().int().positive({
    message: "A quantidade de jogadores deve ser positiva.",
  }),

  highlight: z.string().trim().optional().default(""),

  description: z.string().trim().min(2, {
    message: "Informe a descrição da quadra.",
  }),

  imageUrl: z.string().trim().url({
    message: "Informe uma URL válida para a imagem.",
  }),

  times: z.array(timeSchema).min(1, {
    message: "Informe pelo menos um horário disponível.",
  }),

  isActive: z.boolean().optional().default(true),
});

const adminCourtUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, {
        message: "Informe o nome da quadra.",
      })
      .optional(),

    type: z
      .string()
      .trim()
      .min(2, {
        message: "Informe o tipo da quadra.",
      })
      .optional(),

    surface: z
      .string()
      .trim()
      .min(2, {
        message: "Informe a superfície da quadra.",
      })
      .optional(),

    priceInCents: z
      .number()
      .int()
      .positive({
        message: "O preço deve ser um número inteiro positivo em centavos.",
      })
      .optional(),

    players: z
      .number()
      .int()
      .positive({
        message: "A quantidade de jogadores deve ser positiva.",
      })
      .optional(),

    highlight: z.string().trim().optional(),

    description: z
      .string()
      .trim()
      .min(2, {
        message: "Informe a descrição da quadra.",
      })
      .optional(),

    imageUrl: z
      .string()
      .trim()
      .url({
        message: "Informe uma URL válida para a imagem.",
      })
      .optional(),

    times: z
      .array(timeSchema)
      .min(1, {
        message: "Informe pelo menos um horário disponível.",
      })
      .optional(),

    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualizar.",
  });

function signAdminToken(admin: AdminUser) {
  const payload: AdminTokenPayload = {
    adminId: admin.id,
    complexId: admin.complexId,
    role: admin.role,
  };

  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    expiresIn: "8h",
  });
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

router.post("/admin/dev/create-admin", async (request, response) => {
  /*
   * Esta rota deve existir apenas durante o desenvolvimento.
   */
  if (process.env.NODE_ENV === "production") {
    return response.status(404).json({
      message: "Rota não encontrada.",
    });
  }

  const creationSecret = request.headers["x-admin-creation-secret"];

  if (!creationSecret || creationSecret !== process.env.ADMIN_CREATION_SECRET) {
    return response.status(401).json({
      message: "Chave de criação administrativa inválida.",
    });
  }

  const parsedBody = createAdminSchema.safeParse(request.body);

  if (!parsedBody.success) {
    return response.status(400).json({
      message: "Dados inválidos para criar o administrador.",
      errors: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { name, email, phone, password, complexId } = parsedBody.data;

  const normalizedEmail = email.toLowerCase();

  try {
    const { adminUsers, complexes } = await getCollections();

    const complex = await complexes.findOne({
      id: complexId,
    });

    if (!complex) {
      return response.status(404).json({
        message: "Complexo não encontrado.",
      });
    }

    const existingAdmin = await adminUsers.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      return response.status(409).json({
        message: "Já existe um administrador com este e-mail.",
      });
    }

    const now = new Date();

    const adminUser: AdminUser = {
      id: randomUUID(),
      name,
      email: normalizedEmail,
      phone,
      passwordHash: await bcrypt.hash(password, 10),

      role: "COMPLEX_ADMIN",
      complexId: complex.id,

      isActive: true,

      createdAt: now,
      updatedAt: now,
    };

    await adminUsers.insertOne(adminUser);

    return response.status(201).json({
      message: "Administrador criado com sucesso.",

      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
        complexId: adminUser.complexId,
        isActive: adminUser.isActive,
      },

      complex: {
        id: complex.id,
        name: complex.name,
        slug: complex.slug,
      },
    });
  } catch (error) {
    console.error("Erro ao criar administrador:", error);

    if (isDuplicateKeyError(error)) {
      return response.status(409).json({
        message: "Já existe um administrador com este e-mail.",
      });
    }

    return response.status(500).json({
      message: "Erro interno ao criar administrador.",
    });
  }
});

router.post("/admin/auth/login", async (request, response) => {
  const parsedBody = adminLoginSchema.safeParse(request.body);

  if (!parsedBody.success) {
    return response.status(400).json({
      message: "Dados inválidos para realizar o login.",
      errors: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { email, password } = parsedBody.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const { adminUsers, complexes } = await getCollections();

    const admin = await adminUsers.findOne({
      email: normalizedEmail,
    });

    /*
     * Não informa se foi o e-mail ou a senha que estava incorreto.
     * Isso evita expor quais e-mails administrativos existem no sistema.
     */
    if (!admin) {
      return response.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordMatches) {
      return response.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    if (!admin.isActive) {
      return response.status(403).json({
        message: "Esta conta administrativa está desativada.",
      });
    }

    if (admin.role !== "COMPLEX_ADMIN") {
      return response.status(403).json({
        message: "Este usuário não possui acesso administrativo.",
      });
    }

    const complex = await complexes.findOne({
      id: admin.complexId,
    });

    if (!complex) {
      return response.status(403).json({
        message:
          "O complexo vinculado a este administrador não foi encontrado.",
      });
    }

    if (!complex.isActive) {
      return response.status(403).json({
        message: "O complexo vinculado a esta conta está desativado.",
      });
    }

    const token = signAdminToken(admin);

    return response.status(200).json({
      message: "Login administrativo realizado com sucesso.",

      token,

      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        complexId: admin.complexId,
      },

      complex: {
        id: complex.id,
        slug: complex.slug,
        name: complex.name,
        description: complex.description,
        location: complex.location,
        phone: complex.phone,
        whatsapp: complex.whatsapp,
        address: complex.address,
        isActive: complex.isActive,
      },
    });
  } catch (error) {
    console.error("Erro ao realizar login administrativo:", error);

    return response.status(500).json({
      message: "Erro interno ao realizar login administrativo.",
    });
  }
});

router.get(
  "/admin/me",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin || !request.adminComplex) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    return response.status(200).json({
      admin: request.admin,
      complex: request.adminComplex,
    });
  },
);

router.get(
  "/admin/courts",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const { courts } = await getCollections();

      const courtDocuments = await courts
        .find({
          complexId: request.admin.complexId,
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

      const formattedCourts = courtDocuments.map((court) => ({
        id: court.id,
        complexId: court.complexId,
        complexSlug: court.complexSlug,

        slug: court.slug,
        name: court.name,
        type: court.type,
        surface: court.surface,
        location: court.location,

        priceInCents: court.priceInCents,
        players: court.players,

        highlight: court.highlight,
        description: court.description,
        imageUrl: court.imageUrl,

        times: Array.isArray(court.times) ? court.times : [],

        isActive: court.isActive,
        createdAt: court.createdAt,
        updatedAt: court.updatedAt,
      }));

      return response.status(200).json({
        complex: {
          id: request.admin.complexId,
          name: request.adminComplex?.name ?? null,
        },

        total: formattedCourts.length,
        courts: formattedCourts,
      });
    } catch (error) {
      console.error("Erro ao buscar quadras administrativas:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar as quadras do complexo.",
      });
    }
  },
);

router.get(
  "/admin/courts/:courtId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const courtId = getRouteParam(request.params.courtId);

    if (!courtId) {
      return response.status(400).json({
        message: "O ID da quadra não foi informado.",
      });
    }

    try {
      const { courts } = await getCollections();

      const court = await courts.findOne({
        id: courtId,
        complexId: request.admin.complexId,
      });

      if (!court) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      return response.status(200).json({
        court: {
          id: court.id,
          complexId: court.complexId,
          complexSlug: court.complexSlug,

          slug: court.slug,
          name: court.name,
          type: court.type,
          surface: court.surface,
          location: court.location,

          priceInCents: court.priceInCents,
          players: court.players,

          highlight: court.highlight,
          description: court.description,
          imageUrl: court.imageUrl,

          times: Array.isArray(court.times) ? court.times : [],

          isActive: court.isActive,
          createdAt: court.createdAt,
          updatedAt: court.updatedAt,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar quadra administrativa:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar a quadra.",
      });
    }
  },
);

router.post(
  "/admin/courts",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin || !request.adminComplex) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = adminCourtSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para cadastrar a quadra.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = parsedBody.data;

    try {
      const { courts, complexes } = await getCollections();

      const existingCourt = await courts.findOne({
        slug: data.slug,
      });

      if (existingCourt) {
        return response.status(409).json({
          message: `Já existe uma quadra com o slug "${data.slug}".`,
        });
      }

      const now = new Date();

      const court: Court = {
        id: randomUUID(),

        /*
         * Estes dados vêm do administrador autenticado.
         * O frontend não pode escolher outro complexo.
         */
        complexId: request.admin.complexId,
        complexSlug: request.adminComplex.slug,

        slug: data.slug,
        name: data.name,
        type: data.type,
        surface: data.surface,

        /*
         * A localização da quadra é herdada do complexo.
         */
        location: request.adminComplex.location,

        priceInCents: data.priceInCents,
        players: data.players,

        highlight: data.highlight,
        description: data.description,
        imageUrl: data.imageUrl,

        /*
         * Remove horários repetidos e ordena.
         */
        times: [...new Set(data.times)].sort(),

        isActive: data.isActive,

        createdAt: now,
        updatedAt: now,
      };

      let courtInserted = false;

      try {
        await courts.insertOne(court);
        courtInserted = true;

        const complexUpdateResult = await complexes.updateOne(
          {
            id: request.admin.complexId,
          },
          {
            $push: {
              courts: {
                id: court.id,
                slug: court.slug,
                name: court.name,
                type: court.type,
              },
            },

            $set: {
              updatedAt: now,
            },
          },
        );

        if (complexUpdateResult.matchedCount === 0) {
          await courts.deleteOne({
            id: court.id,
          });

          return response.status(404).json({
            message: "Complexo vinculado ao administrador não encontrado.",
          });
        }

        return response.status(201).json({
          message: "Quadra cadastrada com sucesso.",
          court,
        });
      } catch (error) {
        /*
         * Rollback compensatório:
         * se a referência no complexo falhar, remove a quadra criada.
         */
        if (courtInserted) {
          await courts.deleteOne({
            id: court.id,
          });
        }

        throw error;
      }
    } catch (error) {
      console.error("Erro ao cadastrar quadra administrativa:", error);

      if (isDuplicateKeyError(error)) {
        return response.status(409).json({
          message: "Já existe uma quadra com o slug informado.",
        });
      }

      return response.status(500).json({
        message: "Erro interno ao cadastrar a quadra.",
      });
    }
  },
);

router.patch(
  "/admin/courts/:courtId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const courtId = getRouteParam(request.params.courtId);

    if (!courtId) {
      return response.status(400).json({
        message: "O ID da quadra não foi informado.",
      });
    }

    const parsedBody = adminCourtUpdateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para atualizar a quadra.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = parsedBody.data;

    try {
      const { courts, complexes } = await getCollections();

      const existingCourt = await courts.findOne({
        id: courtId,
        complexId: request.admin.complexId,
      });

      if (!existingCourt) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      const now = new Date();

      const updateFields = {
        ...(data.name !== undefined
          ? {
              name: data.name,
            }
          : {}),

        ...(data.type !== undefined
          ? {
              type: data.type,
            }
          : {}),

        ...(data.surface !== undefined
          ? {
              surface: data.surface,
            }
          : {}),

        ...(data.priceInCents !== undefined
          ? {
              priceInCents: data.priceInCents,
            }
          : {}),

        ...(data.players !== undefined
          ? {
              players: data.players,
            }
          : {}),

        ...(data.highlight !== undefined
          ? {
              highlight: data.highlight,
            }
          : {}),

        ...(data.description !== undefined
          ? {
              description: data.description,
            }
          : {}),

        ...(data.imageUrl !== undefined
          ? {
              imageUrl: data.imageUrl,
            }
          : {}),

        ...(data.times !== undefined
          ? {
              times: [...new Set(data.times)].sort(),
            }
          : {}),

        ...(data.isActive !== undefined
          ? {
              isActive: data.isActive,
            }
          : {}),

        updatedAt: now,
      };

      const updatedCourt = await courts.findOneAndUpdate(
        {
          id: courtId,
          complexId: request.admin.complexId,
        },
        {
          $set: updateFields,
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedCourt) {
        return response.status(404).json({
          message: "Quadra não encontrada.",
        });
      }

      /*
       * O complexo possui uma referência resumida da quadra.
       * Nome e tipo precisam ser mantidos sincronizados.
       */
      if (data.name !== undefined || data.type !== undefined) {
        const referenceUpdate = await complexes.updateOne(
          {
            id: request.admin.complexId,
            "courts.id": courtId,
          },
          {
            $set: {
              "courts.$.name": updatedCourt.name,
              "courts.$.type": updatedCourt.type,
              updatedAt: now,
            },
          },
        );

        /*
         * Caso a referência não exista, recria no complexo.
         */
        if (referenceUpdate.matchedCount === 0) {
          const referenceInsert = await complexes.updateOne(
            {
              id: request.admin.complexId,
            },
            {
              $push: {
                courts: {
                  id: updatedCourt.id,
                  slug: updatedCourt.slug,
                  name: updatedCourt.name,
                  type: updatedCourt.type,
                },
              },
              $set: {
                updatedAt: now,
              },
            },
          );

          if (referenceInsert.matchedCount === 0) {
            /*
             * Rollback dos dados da quadra caso o complexo
             * tenha desaparecido durante a operação.
             */
            await courts.updateOne(
              {
                id: courtId,
                complexId: request.admin.complexId,
              },
              {
                $set: {
                  name: existingCourt.name,
                  type: existingCourt.type,
                  surface: existingCourt.surface,
                  priceInCents: existingCourt.priceInCents,
                  players: existingCourt.players,
                  highlight: existingCourt.highlight,
                  description: existingCourt.description,
                  imageUrl: existingCourt.imageUrl,
                  times: existingCourt.times,
                  isActive: existingCourt.isActive,
                  updatedAt: existingCourt.updatedAt,
                },
              },
            );

            return response.status(404).json({
              message: "Complexo vinculado à quadra não encontrado.",
            });
          }
        }
      }

      return response.status(200).json({
        message: "Quadra atualizada com sucesso.",
        court: updatedCourt,
      });
    } catch (error) {
      console.error("Erro ao atualizar quadra administrativa:", error);

      return response.status(500).json({
        message: "Erro interno ao atualizar a quadra.",
      });
    }
  },
);

export default router;
