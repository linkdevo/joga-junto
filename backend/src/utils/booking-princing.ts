export type PricingPlayer = {
  id: string;
  createdAt: Date;
  participatesInLeisure: boolean;
};

export type PlayerPaymentBreakdown = {
  courtShareInCents: number;
  leisureShareInCents: number;
  courtPlatformFeeInCents: number;
  leisurePlatformFeeInCents: number;
  amountToPayInCents: number;
};

type BuildPlayerPaymentBreakdownsInput = {
  players: PricingPlayer[];
  sportTotalInCents: number;
  leisureTotalInCents: number;
  courtFeeInCents: number;
  leisureFeeInCents: number;
};

function allocateValue(totalInCents: number, playerIds: string[]) {
  if (playerIds.length === 0) {
    return new Map<string, number>();
  }

  const baseValue = Math.floor(totalInCents / playerIds.length);
  const remainingCents = totalInCents % playerIds.length;

  return new Map(
    playerIds.map((playerId, index) => [
      playerId,
      baseValue + (index < remainingCents ? 1 : 0),
    ]),
  );
}

export function buildPlayerPaymentBreakdowns({
  players,
  sportTotalInCents,
  leisureTotalInCents,
  courtFeeInCents,
  leisureFeeInCents,
}: BuildPlayerPaymentBreakdownsInput) {
  if (players.length === 0) {
    throw new Error("Não existem jogadores para realizar o rateio.");
  }

  const orderedPlayers = [...players].sort((first, second) => {
    const dateDifference =
      first.createdAt.getTime() - second.createdAt.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return first.id.localeCompare(second.id);
  });

  const courtValues = allocateValue(
    sportTotalInCents,
    orderedPlayers.map((player) => player.id),
  );

  const leisurePlayers = orderedPlayers.filter(
    (player) => player.participatesInLeisure,
  );

  const leisureValues = allocateValue(
    leisureTotalInCents,
    leisurePlayers.map((player) => player.id),
  );

  const result = new Map<string, PlayerPaymentBreakdown>();

  for (const player of orderedPlayers) {
    const courtShareInCents = courtValues.get(player.id) ?? 0;
    const leisureShareInCents = leisureValues.get(player.id) ?? 0;

    const courtPlatformFeeInCents = courtFeeInCents;

    const leisurePlatformFeeInCents = player.participatesInLeisure
      ? leisureFeeInCents
      : 0;

    const amountToPayInCents =
      courtShareInCents +
      leisureShareInCents +
      courtPlatformFeeInCents +
      leisurePlatformFeeInCents;

    result.set(player.id, {
      courtShareInCents,
      leisureShareInCents,
      courtPlatformFeeInCents,
      leisurePlatformFeeInCents,
      amountToPayInCents,
    });
  }

  return result;
}
