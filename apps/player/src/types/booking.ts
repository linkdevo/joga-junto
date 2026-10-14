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

  participatesInLeisure?: boolean;

  courtShareInCents?: number;
  leisureShareInCents?: number;

  courtPlatformFeeInCents?: number;
  leisurePlatformFeeInCents?: number;
};

export type CreateBookingInput = {
  courtSlug: string;
  bookingDate: string;
  startTime: string;
  expectedPlayers: number;

  includeGoalkeeper?: boolean;

  teamOneName?: string;
  teamTwoName?: string;

  leisure?: {
    areaId: string;
    blockId: string;
    captainParticipates: boolean;
  };
};

/**
 * Reserva criada, no formato devolvido pelo backend
 * (mesmos campos de `Booking`, com datas serializadas
 * como string via JSON).
 */
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
  minPlayers?: number;
  includeGoalkeeper?: boolean;

  teamOneName: string;
  teamTwoName: string;

  platformFeeInCents: number;
  bookingStatus: BookingStatus;

  slotActive: boolean;

  createdAt: string;
  updatedAt: string;

  complexId?: string;

  leisureArea?: BookingLeisureArea | null;
  leisureStatus?: BookingLeisureStatus | null;
  leisureSlotActive?: boolean;

  pricingFrozenAt?: string | null;
};

export type BookingDetails = CreatedBooking & {
  players: BookingPlayer[];
};

export type JoinBookingResponse = {
  message: string;

  player: BookingPlayer;

  totalPlayers: number;
  expectedPlayers: number;
  minPlayers: number;

  bookingStatus: BookingStatus;
  pricingFrozenAt: string | null;
};

export type BookingPaymentInfo = {
  available: boolean;

  playerId: string;
  status: BookingPlayerStatus;

  participatesInLeisure?: boolean;

  courtShareInCents: number;
  leisureShareInCents: number;

  courtPlatformFeeInCents: number;
  leisurePlatformFeeInCents: number;

  amountToPayInCents: number;
  pixCopyPaste: string;

  paidAt: string | null;

  message?: string;
};

export type LeisureBlockAvailability = {
  id: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
  status: AvailabilityStatus;
};

export type LeisureAreaAvailability = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  blocks: LeisureBlockAvailability[];
};

export type BookingOptions = {
  date: string;

  complex: {
    id: string;
    slug: string;
    name: string;
  };

  court: {
    id: string;
    slug: string;
    name: string;
    type: string;
    surface: string;
    priceInCents: number;
    players: number;
    minPlayers: number;
    goalkeeperPriceInCents: number;
    slots: AvailabilitySlot[];
  };

  leisureAreas: LeisureAreaAvailability[];
};

export type BookingLeisureStatus =
  "ACTIVE" | "CANCELLED_NO_PARTICIPANTS" | "CANCELLED_WITH_BOOKING";

export type BookingLeisureArea = {
  areaId: string;
  areaSlug: string;
  areaName: string;
  blockId: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
};
