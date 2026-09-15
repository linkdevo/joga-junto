export type PlayerDashboardUser = {
  id: string;
  name: string;
  email: string;
};

export type PlayerNextGame = {
  id: string;
  shareCode: string;
  courtSlug: string;
  courtName: string;
  courtType: string;
  location: string;
  bookingDate: string;
  startTime: string;
  bookingStatus:
    "WAITING_PLAYERS" | "PAYMENT_AVAILABLE" | "COMPLETED" | "CANCELLED";
  paymentStatus: "WAITING_PAYMENT" | "PAID" | "CANCELLED" | null;
  amountToPayInCents: number | null;
};

export type PlayerDashboard = {
  user: PlayerDashboardUser;
  nextGame: PlayerNextGame | null;
};
