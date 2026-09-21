import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getCollections, type Complex, type Court } from "../database";

const router = Router();

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "O horário deve estar no formato HH:mm.",
  });

const addressSchema = z.object({
  street: z.string().trim().min(2),
  number: z.string().trim().min(1),
  complement: z.string().trim().nullable().optional().default(null),
  neighborhood: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().length(2),
  zipCode: z.string().trim().min(8),
});

const courtSchema = z.object({
  slug: z.string().trim().min(2).toLowerCase(),
  name: z.string().trim().min(2),
  type: z.string().trim().min(2),
  surface: z.string().trim().min(2),
  priceInCents: z.number().int().positive(),
  players: z.number().int().positive(),
  highlight: z.string().trim().optional().default(""),
  description: z.string().trim().min(2),
  imageUrl: z.string().trim().url(),
  times: z.array(timeSchema).min(1),
  isActive: z.boolean().optional().default(true),
});

const complexSchema = z.object({
  slug: z.string().trim().min(2).toLowerCase(),
  name: z.string().trim().min(2),
  description: z.string().trim().min(2),
  location: z.string().trim().min(2),
  phone: z.string().trim().nullable().optional().default(null),
  whatsapp: z.string().trim().nullable().optional().default(null),
  address: addressSchema,
  courts: z.array(courtSchema).min(1),
  isActive: z.boolean().optional().default(true),
});

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

router.post("/complexos", async (request, response) => {
  const parsedBody = complexSchema.safeParse(request.body);

  if (!parsedBody.success) {
    return response.status(400).json({
      message: "Dados inválidos para cadastrar o complexo.",
      errors: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const data = parsedBody.data;

  const receivedCourtSlugs = data.courts.map((court) => court.slug);
  const uniqueCourtSlugs = new Set(receivedCourtSlugs);

  if (uniqueCourtSlugs.size !== receivedCourtSlugs.length) {
    return response.status(400).json({
      message:
        "Existem duas ou mais quadras com o mesmo slug no corpo da requisição.",
    });
  }

  const { complexes, courts } = await getCollections();

  const existingComplex = await complexes.findOne({
    slug: data.slug,
  });

  if (existingComplex) {
    return response.status(409).json({
      message: `Já existe um complexo com o slug "${data.slug}".`,
    });
  }

  const existingCourt = await courts.findOne({
    slug: {
      $in: receivedCourtSlugs,
    },
  });

  if (existingCourt) {
    return response.status(409).json({
      message: `Já existe uma quadra com o slug "${existingCourt.slug}".`,
    });
  }

  const now = new Date();
  const complexId = randomUUID();

  const courtDocuments: Court[] = data.courts.map((courtInput) => {
    return {
      id: randomUUID(),

      complexId,
      complexSlug: data.slug,

      slug: courtInput.slug,
      name: courtInput.name,
      type: courtInput.type,
      surface: courtInput.surface,

      // A localização é herdada do complexo.
      location: data.location,

      priceInCents: courtInput.priceInCents,
      players: courtInput.players,
      highlight: courtInput.highlight,
      description: courtInput.description,
      imageUrl: courtInput.imageUrl,

      // Remove horários repetidos.
      times: [...new Set(courtInput.times)].sort(),

      isActive: courtInput.isActive,
      createdAt: now,
      updatedAt: now,
    };
  });

  const complexDocument: Complex = {
    id: complexId,
    slug: data.slug,
    name: data.name,
    description: data.description,
    location: data.location,
    phone: data.phone,
    whatsapp: data.whatsapp,
    address: {
      ...data.address,
      state: data.address.state.toUpperCase(),
      complement: data.address.complement ?? null,
    },

    courts: courtDocuments.map((court) => ({
      id: court.id,
      slug: court.slug,
      name: court.name,
      type: court.type,
    })),

    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  };

  let complexInserted = false;

  try {
    await complexes.insertOne(complexDocument);
    complexInserted = true;

    await courts.insertMany(courtDocuments);

    return response.status(201).json({
      message: "Complexo e quadras cadastrados com sucesso.",
      complex: complexDocument,
      courts: courtDocuments,
    });
  } catch (error) {
    console.error("Erro ao cadastrar complexo:", error);

    /*
     * Rollback compensatório.
     * Caso as quadras falhem, remove o complexo e qualquer quadra
     * que tenha sido inserida parcialmente.
     */
    await courts.deleteMany({
      complexId,
    });

    if (complexInserted) {
      await complexes.deleteOne({
        id: complexId,
      });
    }

    if (isDuplicateKeyError(error)) {
      return response.status(409).json({
        message:
          "Já existe um complexo ou uma quadra com um dos slugs informados.",
      });
    }

    return response.status(500).json({
      message: "Erro interno ao cadastrar complexo e quadras.",
    });
  }
});

export default router;
