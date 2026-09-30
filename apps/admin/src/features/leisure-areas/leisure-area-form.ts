import {
  formatPriceInput,
  normalizeSlug,
  priceInputToCents,
} from "@/features/courts/court-form";
import type {
  AdminLeisureArea,
  CreateAdminLeisureAreaPayload,
  LeisureAreaBlockPayload,
  UpdateAdminLeisureAreaPayload,
} from "@/types/admin";

export { normalizeSlug };

export type LeisureBlockFormValues = {
  /**
   * Chave usada apenas para renderizar a lista no React.
   */
  key: string;

  /**
   * Id do bloco já salvo. Blocos novos não possuem id.
   */
  id?: string;

  startTime: string;
  endTime: string;
  price: string;
  isActive: boolean;
};

export type LeisureAreaFormValues = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  blocks: LeisureBlockFormValues[];
  isActive: boolean;
};

type LeisureAreaBasePayload = Omit<CreateAdminLeisureAreaPayload, "slug">;

let blockKeyCounter = 0;

function nextBlockKey() {
  blockKeyCounter += 1;

  return `block-${blockKeyCounter}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function createEmptyBlock(): LeisureBlockFormValues {
  return {
    key: nextBlockKey(),
    startTime: "12:00",
    endTime: "16:00",
    price: "",
    isActive: true,
  };
}

export function createLeisureAreaFormValues(
  area?: AdminLeisureArea | null,
): LeisureAreaFormValues {
  if (!area) {
    return {
      slug: "",
      name: "",
      description: "",
      imageUrl: "",
      blocks: [createEmptyBlock()],
      isActive: true,
    };
  }

  return {
    slug: area.slug,
    name: area.name,
    description: area.description,
    imageUrl: area.imageUrl ?? "",

    blocks: area.blocks.map((block) => ({
      key: nextBlockKey(),
      id: block.id,
      startTime: block.startTime,
      endTime: block.endTime,
      price: formatPriceInput(block.priceInCents),
      isActive: block.isActive,
    })),

    isActive: area.isActive,
  };
}

/**
 * Retorna uma mensagem de erro ou null quando os blocos são válidos.
 * O backend valida novamente; aqui o objetivo é dar retorno imediato.
 */
export function validateBlockValues(
  blocks: LeisureBlockFormValues[],
): string | null {
  if (blocks.length === 0) {
    return "Adicione pelo menos um horário para a área de lazer.";
  }

  for (const block of blocks) {
    if (!block.startTime || !block.endTime) {
      return "Informe o horário inicial e final de todos os blocos.";
    }

    if (timeToMinutes(block.endTime) <= timeToMinutes(block.startTime)) {
      return "O horário final precisa ser depois do horário inicial.";
    }

    if (!priceInputToCents(block.price)) {
      return "Informe um preço válido para todos os blocos.";
    }
  }

  const activeBlocks = blocks
    .filter((block) => block.isActive)
    .sort((first, second) => first.startTime.localeCompare(second.startTime));

  for (let index = 1; index < activeBlocks.length; index += 1) {
    const previous = activeBlocks[index - 1];
    const current = activeBlocks[index];

    if (
      previous &&
      current &&
      timeToMinutes(current.startTime) < timeToMinutes(previous.endTime)
    ) {
      return "Blocos de horário ativos não podem se sobrepor.";
    }
  }

  return null;
}

function blocksPayload(
  blocks: LeisureBlockFormValues[],
): LeisureAreaBlockPayload[] | null {
  const payload: LeisureAreaBlockPayload[] = [];

  for (const block of blocks) {
    const priceInCents = priceInputToCents(block.price);

    if (!priceInCents) {
      return null;
    }

    payload.push({
      ...(block.id ? { id: block.id } : {}),
      startTime: block.startTime,
      endTime: block.endTime,
      priceInCents,
      isActive: block.isActive,
    });
  }

  return payload;
}

function basePayload(
  values: LeisureAreaFormValues,
): LeisureAreaBasePayload | null {
  const blocks = blocksPayload(values.blocks);

  if (
    !values.name.trim() ||
    !values.description.trim() ||
    !blocks ||
    blocks.length === 0
  ) {
    return null;
  }

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    imageUrl: values.imageUrl.trim() || null,
    blocks,
    isActive: values.isActive,
  };
}

export function createLeisureAreaPayload(
  values: LeisureAreaFormValues,
): CreateAdminLeisureAreaPayload | null {
  const payload = basePayload(values);
  const slug = normalizeSlug(values.slug);

  if (!payload || !slug) {
    return null;
  }

  return {
    slug,
    ...payload,
  };
}

export function updateLeisureAreaPayload(
  values: LeisureAreaFormValues,
): UpdateAdminLeisureAreaPayload | null {
  return basePayload(values);
}
