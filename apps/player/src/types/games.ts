export type PlayerGameStatus =
  "WAITING_PLAYERS" | "PAYMENT_AVAILABLE" | "COMPLETED" | "CANCELLED";

export type PlayerGamePaymentStatus =
  "WAITING_PAYMENT" | "PAID" | "CANCELLED";

export type PlayerGame = {
  id: string;
  shareCode: string;
  courtName: string;
  courtType: string;
  location: string;
  bookingDate: string;
  startTime: string;
  bookingStatus: PlayerGameStatus;
  paymentStatus: PlayerGamePaymentStatus;
  amountToPayInCents: number;
  teamNumber: number;
};

export type PlayerGamesResponse = {
  upcoming: PlayerGame[];
  history: PlayerGame[];
};
