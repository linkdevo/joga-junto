import type {
  AvailabilityEvent,
  CourtAvailability,
  CreateBookingInput,
  CreatedBooking,
  BookingDetails,
  JoinBookingResponse,
  BookingPaymentInfo,
} from "@/types/booking";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class BookingApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "BookingApiError";
    this.status = status;
  }
}

export async function getBookingByShareCode(
  shareCode: string,
): Promise<BookingDetails> {
  const response = await fetch(`${API_URL}/bookings/share/${shareCode}`, {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Não foi possível carregar a reserva.");
  }

  return data;
}

export async function joinBooking(
  shareCode: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/bookings/share/${shareCode}/players`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "Não foi possível entrar na reserva.");
  }
}

export async function getMyBookingPayment(
  shareCode: string,
  token: string,
): Promise<BookingPaymentInfo> {
  const response = await fetch(
    `${API_URL}/bookings/share/${shareCode}/payment`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Não foi possível carregar o pagamento.");
  }

  return data;
}

export async function getCourtAvailability(
  courtSlug: string,
  date: string,
): Promise<CourtAvailability> {
  const response = await fetch(
    `${API_URL}/player/courts/${encodeURIComponent(
      courtSlug,
    )}/availability?date=${encodeURIComponent(date)}`,
    {
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new BookingApiError(
      data?.message ?? "Não foi possível carregar os horários.",
      response.status,
    );
  }

  return data;
}

export async function createBooking(
  input: CreateBookingInput,
  token: string,
): Promise<CreatedBooking> {
  const response = await fetch(`${API_URL}/bookings`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new BookingApiError(
      data?.message ?? "Não foi possível criar a reserva.",
      response.status,
    );
  }

  return data;
}

export function subscribeCourtAvailability(
  courtSlug: string,
  date: string,
  onEvent: (event: AvailabilityEvent) => void,
  onConnectionChange?: (connected: boolean) => void,
) {
  const url =
    `${API_URL}/player/courts/` +
    `${encodeURIComponent(courtSlug)}` +
    `/availability/events` +
    `?date=${encodeURIComponent(date)}`;

  const source = new EventSource(url);

  source.addEventListener("connected", () => {
    onConnectionChange?.(true);
  });

  source.addEventListener("availability", (message) => {
    const event = JSON.parse(
      (message as MessageEvent).data,
    ) as AvailabilityEvent;

    onEvent(event);
  });

  source.onerror = () => {
    onConnectionChange?.(false);

    // Não fechamos aqui.
    // O EventSource tenta reconectar
    // automaticamente.
  };

  return () => {
    source.close();

    onConnectionChange?.(false);
  };
}
