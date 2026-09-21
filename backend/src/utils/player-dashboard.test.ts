import { describe, expect, it } from "vitest";

import { selectNextBooking } from "./player-dashboard";

describe("selectNextBooking", () => {
  it("retorna a reserva futura mais próxima", () => {
    const bookings = [
      {
        id: "3",
        bookingDate: "2026-09-15",
        startTime: "19:00",
        bookingStatus: "WAITING_PLAYERS" as const,
      },
      {
        id: "1",
        bookingDate: "2026-09-03",
        startTime: "20:00",
        bookingStatus: "WAITING_PLAYERS" as const,
      },
      {
        id: "2",
        bookingDate: "2026-09-06",
        startTime: "20:00",
        bookingStatus: "WAITING_PLAYERS" as const,
      },
    ];

    const result = selectNextBooking(bookings, "2026-09-04 13:00");

    expect(result?.id).toBe("2");
  });

  it("ignora reservas canceladas", () => {
    const bookings = [
      {
        id: "1",
        bookingDate: "2026-09-05",
        startTime: "18:00",
        bookingStatus: "CANCELLED" as const,
      },
      {
        id: "2",
        bookingDate: "2026-09-06",
        startTime: "20:00",
        bookingStatus: "WAITING_PLAYERS" as const,
      },
    ];

    const result = selectNextBooking(bookings, "2026-09-04 13:00");

    expect(result?.id).toBe("2");
  });

  it("retorna null quando não existe jogo futuro", () => {
    const bookings = [
      {
        id: "1",
        bookingDate: "2026-09-01",
        startTime: "20:00",
        bookingStatus: "COMPLETED" as const,
      },
    ];

    const result = selectNextBooking(bookings, "2026-09-04 13:00");

    expect(result).toBeNull();
  });
});
