export type LeisureAreaBlockInput = {
  id: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
  isActive: boolean;
};

type ValidBlocksResult = {
  valid: true;
  blocks: LeisureAreaBlockInput[];
};

type InvalidBlocksResult = {
  valid: false;
  message: string;
};

export type ValidateLeisureBlocksResult =
  ValidBlocksResult | InvalidBlocksResult;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(value: string) {
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));

  return hours * 60 + minutes;
}

export function validateLeisureBlocks(
  blocks: LeisureAreaBlockInput[],
): ValidateLeisureBlocksResult {
  if (blocks.length === 0) {
    return {
      valid: false,
      message: "Informe pelo menos um bloco de horário.",
    };
  }

  const sortedBlocks = [...blocks].sort((first, second) => {
    return first.startTime.localeCompare(second.startTime);
  });

  const receivedIds = new Set<string>();

  for (let index = 0; index < sortedBlocks.length; index += 1) {
    const currentBlock = sortedBlocks[index];

    if (!currentBlock) {
      continue;
    }

    if (receivedIds.has(currentBlock.id)) {
      return {
        valid: false,
        message: "Existem blocos com o mesmo identificador.",
      };
    }

    receivedIds.add(currentBlock.id);

    const startInMinutes = timeToMinutes(currentBlock.startTime);
    const endInMinutes = timeToMinutes(currentBlock.endTime);

    if (startInMinutes === null || endInMinutes === null) {
      return {
        valid: false,
        message: "Os horários devem estar no formato HH:mm.",
      };
    }

    if (endInMinutes <= startInMinutes) {
      return {
        valid: false,
        message: "O horário final deve ser posterior ao horário inicial.",
      };
    }

    if (
      !Number.isInteger(currentBlock.priceInCents) ||
      currentBlock.priceInCents <= 0
    ) {
      return {
        valid: false,
        message: "O preço do bloco deve ser um inteiro positivo em centavos.",
      };
    }

    const previousBlock = sortedBlocks[index - 1];

    if (!previousBlock) {
      continue;
    }

    const previousEndInMinutes = timeToMinutes(previousBlock.endTime);

    if (
      previousBlock.isActive &&
      currentBlock.isActive &&
      previousEndInMinutes !== null &&
      startInMinutes < previousEndInMinutes
    ) {
      return {
        valid: false,
        message: "Blocos de horário ativos não podem se sobrepor.",
      };
    }
  }

  return {
    valid: true,
    blocks: sortedBlocks,
  };
}
