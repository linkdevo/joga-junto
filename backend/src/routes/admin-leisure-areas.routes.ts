import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  getCollections,
  type LeisureArea,
  type LeisureAreaBlock,
} from "../database";

import {
  authenticateAdmin,
  type AuthenticatedAdminRequest,
} from "../middlewares/authenticate-admin";

import { validateLeisureBlocks } from "../utils/leisure-area-blocks";

import { getRouteParam } from "../utils/route-params";

const router = Router();

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "O horário deve estar no formato HH:mm.",
  });

const leisureBlockSchema = z.object({
  id: z.string().trim().min(1).optional(),

  startTime: timeSchema,

  endTime: timeSchema,

  priceInCents: z.number().int().positive({
    message: "O preço deve ser um número inteiro positivo em centavos.",
  }),

  isActive: z.boolean().optional().default(true),
});

const createLeisureAreaSchema = z.object({
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
    message: "Informe o nome da área de lazer.",
  }),

  description: z.string().trim().min(2, {
    message: "Informe a descrição da área de lazer.",
  }),

  imageUrl: z
    .string()
    .trim()
    .url({
      message: "Informe uma URL válida para a imagem.",
    })
    .nullable()
    .optional()
    .default(null),

  blocks: z.array(leisureBlockSchema).min(1, {
    message: "Informe pelo menos um bloco de horário.",
  }),

  isActive: z.boolean().optional().default(true),
});

const updateLeisureAreaSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, {
        message: "Informe o nome da área de lazer.",
      })
      .optional(),

    description: z
      .string()
      .trim()
      .min(2, {
        message: "Informe a descrição da área de lazer.",
      })
      .optional(),

    imageUrl: z
      .string()
      .trim()
      .url({
        message: "Informe uma URL válida para a imagem.",
      })
      .nullable()
      .optional(),

    blocks: z
      .array(leisureBlockSchema)
      .min(1, {
        message: "Informe pelo menos um bloco de horário.",
      })
      .optional(),

    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return Object.keys(data).length > 0;
    },
    {
      message: "Informe pelo menos um campo para atualização.",
    },
  );

const updateLeisureAreaStatusSchema = z.object({
  isActive: z.boolean(),
});

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function normalizeBlocks(
  blocks: Array<z.infer<typeof leisureBlockSchema>>,
): LeisureAreaBlock[] {
  return blocks.map((block) => ({
    id: block.id || randomUUID(),
    startTime: block.startTime,
    endTime: block.endTime,
    priceInCents: block.priceInCents,
    isActive: block.isActive,
  }));
}

function formatLeisureArea(area: LeisureArea) {
  return {
    id: area.id,
    complexId: area.complexId,
    slug: area.slug,
    name: area.name,
    description: area.description,
    imageUrl: area.imageUrl,
    blocks: Array.isArray(area.blocks) ? area.blocks : [],
    isActive: area.isActive,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
  };
}

/**
 * ============================================================
 * LISTAR ÁREAS DE LAZER DO COMPLEXO
 * ============================================================
 */

router.get(
  "/admin/leisure-areas",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin || !request.adminComplex) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const { leisureAreas } = await getCollections();

      const documents = await leisureAreas
        .find({
          complexId: request.admin.complexId,
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

      const areas = documents.map((document) => formatLeisureArea(document));

      return response.status(200).json({
        complex: {
          id: request.adminComplex.id,
          name: request.adminComplex.name,
        },
        total: areas.length,
        areas,
      });
    } catch (error) {
      console.error("Erro ao buscar áreas de lazer:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar as áreas de lazer.",
      });
    }
  },
);

/**
 * ============================================================
 * BUSCAR UMA ÁREA DE LAZER
 * ============================================================
 */

router.get(
  "/admin/leisure-areas/:areaId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const areaId = getRouteParam(request.params.areaId);

    if (!areaId) {
      return response.status(400).json({
        message: "O ID da área de lazer não foi informado.",
      });
    }

    try {
      const { leisureAreas } = await getCollections();

      const area = await leisureAreas.findOne({
        id: areaId,
        complexId: request.admin.complexId,
      });

      if (!area) {
        return response.status(404).json({
          message: "Área de lazer não encontrada.",
        });
      }

      return response.status(200).json({
        area: formatLeisureArea(area),
      });
    } catch (error) {
      console.error("Erro ao buscar área de lazer:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar a área de lazer.",
      });
    }
  },
);

/**
 * ============================================================
 * CADASTRAR ÁREA DE LAZER
 * ============================================================
 */

router.post(
  "/admin/leisure-areas",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin || !request.adminComplex) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = createLeisureAreaSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para cadastrar a área de lazer.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = parsedBody.data;
    const normalizedBlocks = normalizeBlocks(data.blocks);

    const blocksValidation = validateLeisureBlocks(normalizedBlocks);

    if (!blocksValidation.valid) {
      return response.status(400).json({
        message: blocksValidation.message,
      });
    }

    try {
      const { leisureAreas } = await getCollections();

      const existingArea = await leisureAreas.findOne({
        complexId: request.admin.complexId,
        slug: data.slug,
      });

      if (existingArea) {
        return response.status(409).json({
          message: `Já existe uma área de lazer com o slug "${data.slug}" neste complexo.`,
        });
      }

      const now = new Date();

      const area: LeisureArea = {
        id: randomUUID(),

        /*
         * O complexo vem do administrador autenticado.
         * O frontend não pode escolher outro complexo.
         */
        complexId: request.admin.complexId,

        slug: data.slug,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,

        blocks: blocksValidation.blocks,

        isActive: data.isActive,

        createdAt: now,
        updatedAt: now,
      };

      await leisureAreas.insertOne(area);

      return response.status(201).json({
        message: "Área de lazer cadastrada com sucesso.",
        area: formatLeisureArea(area),
      });
    } catch (error) {
      console.error("Erro ao cadastrar área de lazer:", error);

      if (isDuplicateKeyError(error)) {
        return response.status(409).json({
          message: "Já existe uma área de lazer com este slug no complexo.",
        });
      }

      return response.status(500).json({
        message: "Erro interno ao cadastrar a área de lazer.",
      });
    }
  },
);

/**
 * ============================================================
 * ATUALIZAR ÁREA DE LAZER E BLOCOS
 * ============================================================
 */

router.patch(
  "/admin/leisure-areas/:areaId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = updateLeisureAreaSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para atualizar a área de lazer.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = parsedBody.data;

    let normalizedBlocks: LeisureAreaBlock[] | undefined;

    if (data.blocks) {
      const receivedBlocks = normalizeBlocks(data.blocks);
      const blocksValidation = validateLeisureBlocks(receivedBlocks);

      if (!blocksValidation.valid) {
        return response.status(400).json({
          message: blocksValidation.message,
        });
      }

      normalizedBlocks = blocksValidation.blocks;
    }

    const areaId = getRouteParam(request.params.areaId);

    if (!areaId) {
      return response.status(400).json({
        message: "O ID da área de lazer não foi informado.",
      });
    }

    try {
      const { leisureAreas } = await getCollections();

      const existingArea = await leisureAreas.findOne({
        id: areaId,
        complexId: request.admin.complexId,
      });

      if (!existingArea) {
        return response.status(404).json({
          message: "Área de lazer não encontrada.",
        });
      }

      const updateFields = {
        ...(data.name !== undefined
          ? {
              name: data.name,
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

        ...(normalizedBlocks !== undefined
          ? {
              blocks: normalizedBlocks,
            }
          : {}),

        ...(data.isActive !== undefined
          ? {
              isActive: data.isActive,
            }
          : {}),

        updatedAt: new Date(),
      };

      const updatedArea = await leisureAreas.findOneAndUpdate(
        {
          id: areaId,
          complexId: request.admin.complexId,
        },
        {
          $set: updateFields,
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedArea) {
        return response.status(404).json({
          message: "Área de lazer não encontrada.",
        });
      }

      return response.status(200).json({
        message: "Área de lazer atualizada com sucesso.",
        area: formatLeisureArea(updatedArea),
      });
    } catch (error) {
      console.error("Erro ao atualizar área de lazer:", error);

      return response.status(500).json({
        message: "Erro interno ao atualizar a área de lazer.",
      });
    }
  },
);

/**
 * ============================================================
 * ATIVAR OU DESATIVAR ÁREA DE LAZER
 * ============================================================
 */

router.patch(
  "/admin/leisure-areas/:areaId/status",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const areaId = getRouteParam(request.params.areaId);

    if (!areaId) {
      return response.status(400).json({
        message: "O ID da área de lazer não foi informado.",
      });
    }

    const parsedBody = updateLeisureAreaStatusSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Informe um status válido.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const { leisureAreas } = await getCollections();

      const updatedArea = await leisureAreas.findOneAndUpdate(
        {
          id: areaId,
          complexId: request.admin.complexId,
        },
        {
          $set: {
            isActive: parsedBody.data.isActive,
            updatedAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedArea) {
        return response.status(404).json({
          message: "Área de lazer não encontrada.",
        });
      }

      return response.status(200).json({
        message: parsedBody.data.isActive
          ? "Área de lazer ativada com sucesso."
          : "Área de lazer desativada com sucesso.",
        area: formatLeisureArea(updatedArea),
      });
    } catch (error) {
      console.error("Erro ao alterar status da área de lazer:", error);

      return response.status(500).json({
        message: "Erro interno ao alterar o status da área de lazer.",
      });
    }
  },
);

export default router;
