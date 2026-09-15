export type AvailabilityStatus = "AVAILABLE" | "RESERVED" | "UNAVAILABLE";

export type AvailabilitySlot = {
  time: string;
  status: AvailabilityStatus;
};

export type CourtAvailability = {
  court: {
    id: string;
    slug: string;
    name: string;
    type: string;
    surface: string;
    priceInCents: number;
    players: number;
  };

  date: string;

  slots: AvailabilitySlot[];
};

export type AvailabilityEvent = {
  type: "BOOKING_CREATED" | "BOOKING_CANCELLED";

  courtSlug: string;
  bookingDate: string;
  startTime: string;
};

export type CreateBookingInput = {
  courtSlug: string;
  bookingDate: string;
  startTime: string;
  expectedPlayers: number;
};

export type BookingStatus =
  "WAITING_PLAYERS" | "PAYMENT_AVAILABLE" | "COMPLETED" | "CANCELLED";

export type BookingPlayerStatus = "WAITING_PAYMENT" | "PAID" | "CANCELLED";

export type BookingPlayer = {
  id: string;

  bookingId: string;
  userId: string;

  name: string;
  phone: string;
  email: string;

  teamNumber: number;

  status: BookingPlayerStatus;

  amountToPayInCents: number;

  pixCopyPaste: string;

  paidAt?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type CreatedBooking = {
  id: string;

  shareCode: string;

  captainUserId: string;
  captainName: string;

  courtSlug: string;
  courtName: string;
  courtType: string;
  location: string;

  bookingDate: string;
  startTime: string;

  courtPriceInCents: number;

  goalkeeperPriceInCents: number;

  totalPriceInCents: number;

  expectedPlayers: number;

  teamOneName: string;
  teamTwoName: string;

  platformFeeInCents: number;

  bookingStatus: BookingStatus;

  slotActive?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type BookingDetails = CreatedBooking & {
  players: BookingPlayer[];
};

export type JoinBookingResponse = {
  message: string;

  player: BookingPlayer;

  totalPlayers: number;

  expectedPlayers: number;
};

export type BookingPaymentInfo = {
  available: boolean;

  playerId: string;

  status: BookingPlayerStatus;

  amountToPayInCents: number;

  pixCopyPaste: string;

  paidAt: string | null;

  message?: string;
};
