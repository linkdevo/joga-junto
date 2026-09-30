import { describe, expect, it } from "vitest";

import {
  buildAvailabilitySlots,
  isSlotInPast,
  isValidBookingDate,
} from "./court-availability";

describe("court availability", () => {
  it("marca horário reservado", () => {
    const slots = buildAvailabilitySlots({
      times: ["18:00", "19:00", "20:00"],
      reservedTimes: new Set(["20:00"]),
      date: "2026-09-10",
      currentDateTime: "2026-09-08 12:00",
    });

    expect(slots).toEqual([
      {
        time: "18:00",
        status: "AVAILABLE",
      },
      {
        time: "19:00",
        status: "AVAILABLE",
      },
      {
        time: "20:00",
        status: "RESERVED",
      },
    ]);
  });

  it("marca horário passado como indisponível", () => {
    const slots = buildAvailabilitySlots({
      times: ["10:00", "13:00"],
      reservedTimes: new Set(),
      date: "2026-09-08",
      currentDateTime: "2026-09-08 12:00",
    });

    expect(slots[0]?.status).toBe("UNAVAILABLE");
    expect(slots[1]?.status).toBe("AVAILABLE");
  });

  it("identifica slot passado", () => {
    expect(isSlotInPast("2026-09-08", "11:00", "2026-09-08 12:00")).toBe(true);
  });

  it("valida uma data real", () => {
    expect(isValidBookingDate("2026-09-10")).toBe(true);
    expect(isValidBookingDate("2026-02-31")).toBe(false);
  });
});
