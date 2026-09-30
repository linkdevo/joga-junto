import {
  getCollections,
  withoutMongoId,
  withoutMongoIds,
  type Booking,
} from "../database";

import { buildPlayerPaymentBreakdowns } from "../utils/booking-pricing";

const COURT_PLATFORM_FEE_IN_CENTS = 100;
const LEISURE_PLATFORM_FEE_IN_CENTS = 100;

export async function finalizeBookingPricing(
  bookingId: string,
): Promise<Booking> {
  const { bookings, bookingPlayers } = await getCollections();

  const bookingDocument = await bookings.findOne({
    id: bookingId,
  });

  if (!bookingDocument) {
    throw new Error("Reserva não encontrada.");
  }

  const booking = withoutMongoId(bookingDocument);

  /*
   * Se os valores já foram congelados,
   * não recalcula novamente.
   */
  if (booking.pricingFrozenAt) {
    return booking;
  }

  const playerDocuments = await bookingPlayers
    .find({
      bookingId: booking.id,

      status: {
        $ne: "CANCELLED",
      },
    })
    .sort({
      createdAt: 1,
      id: 1,
    })
    .toArray();

  const players = withoutMongoIds(playerDocuments);

  /*
   * O pagamento somente é liberado depois
   * que o grupo estiver completo.
   */
  if (players.length < booking.expectedPlayers) {
    return booking;
  }

  /*
   * Por segurança, não deve haver mais jogadores
   * ativos do que a quantidade esperada.
   */
  if (players.length > booking.expectedPlayers) {
    throw new Error("A reserva possui mais jogadores do que o permitido.");
  }

  const hasActiveLeisure =
    booking.leisureArea !== null &&
    booking.leisureArea !== undefined &&
    booking.leisureStatus === "ACTIVE" &&
    booking.leisureSlotActive !== false;

  const pricingPlayers = players.map((player) => ({
    id: player.id,
    createdAt: player.createdAt,

    /*
     * Mesmo que um documento antigo possua true,
     * não considera churrasqueira quando a reserva
     * não possui uma área ativa.
     */
    participatesInLeisure:
      hasActiveLeisure && player.participatesInLeisure === true,
  }));

  const leisureParticipants = pricingPlayers.filter(
    (player) => player.participatesInLeisure,
  );

  const shouldCancelLeisure =
    hasActiveLeisure && leisureParticipants.length === 0;

  const leisureTotalInCents =
    hasActiveLeisure && !shouldCancelLeisure && booking.leisureArea
      ? booking.leisureArea.priceInCents
      : 0;

  const paymentBreakdowns = buildPlayerPaymentBreakdowns({
    players: pricingPlayers,

    /*
     * totalPriceInCents continua sendo:
     * quadra + goleiros.
     */
    sportTotalInCents: booking.totalPriceInCents,

    leisureTotalInCents,

    courtFeeInCents: booking.platformFeeInCents || COURT_PLATFORM_FEE_IN_CENTS,

    leisureFeeInCents: LEISURE_PLATFORM_FEE_IN_CENTS,
  });

  const now = new Date();

  /*
   * Atualiza todos os jogadores com os valores
   * definitivos calculados em centavos.
   */
  await bookingPlayers.bulkWrite(
    players.map((player) => {
      const breakdown = paymentBreakdowns.get(player.id);

      if (!breakdown) {
        throw new Error(
          `Não foi possível calcular o valor do jogador ${player.id}.`,
        );
      }

      const participatesInLeisure =
        hasActiveLeisure &&
        !shouldCancelLeisure &&
        player.participatesInLeisure === true;

      return {
        updateOne: {
          filter: {
            id: player.id,
            bookingId: booking.id,
          },

          update: {
            $set: {
              participatesInLeisure,

              courtShareInCents: breakdown.courtShareInCents,

              leisureShareInCents: breakdown.leisureShareInCents,

              courtPlatformFeeInCents: breakdown.courtPlatformFeeInCents,

              leisurePlatformFeeInCents: breakdown.leisurePlatformFeeInCents,

              amountToPayInCents: breakdown.amountToPayInCents,

              pixCopyPaste:
                `PIX-PLACEHOLDER-` +
                `${booking.shareCode}-` +
                `${player.userId}-` +
                `${breakdown.amountToPayInCents}`,

              updatedAt: now,
            },
          },
        },
      };
    }),
  );

  const updatedBookingDocument = await bookings.findOneAndUpdate(
    {
      id: booking.id,
      bookingStatus: "WAITING_PLAYERS",

      /*
       * Compatibilidade com documentos antigos,
       * nos quais o campo ainda não existia.
       */
      $or: [
        {
          pricingFrozenAt: null,
        },
        {
          pricingFrozenAt: {
            $exists: false,
          },
        },
      ],
    },

    {
      $set: {
        bookingStatus: "PAYMENT_AVAILABLE",
        pricingFrozenAt: now,

        ...(shouldCancelLeisure
          ? {
              leisureStatus: "CANCELLED_NO_PARTICIPANTS" as const,

              leisureSlotActive: false,
            }
          : {}),

        updatedAt: now,
      },
    },

    {
      returnDocument: "after",
    },
  );

  if (updatedBookingDocument) {
    return withoutMongoId(updatedBookingDocument);
  }

  /*
   * Outra execução pode ter concluído antes.
   * Retorna a versão atual sem recalcular.
   */
  const currentBookingDocument = await bookings.findOne({
    id: booking.id,
  });

  if (!currentBookingDocument) {
    throw new Error("Reserva não encontrada após o fechamento.");
  }

  return withoutMongoId(currentBookingDocument);
}
