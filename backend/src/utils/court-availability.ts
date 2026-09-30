export type AvailabilityStatus = "AVAILABLE" | "RESERVED" | "UNAVAILABLE";

export type AvailabilitySlot = {
  time: string;
  status: AvailabilityStatus;
};

type BuildAvailabilitySlotsInput = {
  times: string[];
  reservedTimes: Set<string>;
  date: string;
  currentDateTime: string;
};

export function getCurrentDateTimeKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function isSlotInPast(
  date: string,
  time: string,
  currentDateTime = getCurrentDateTimeKey(),
) {
  return `${date} ${time}` <= currentDateTime;
}

export function isValidBookingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function buildAvailabilitySlots({
  times,
  reservedTimes,
  date,
  currentDateTime,
}: BuildAvailabilitySlotsInput): AvailabilitySlot[] {
  return [...new Set(times)].sort().map((time) => {
    if (reservedTimes.has(time)) {
      return {
        time,
        status: "RESERVED" as const,
      };
    }

    if (isSlotInPast(date, time, currentDateTime)) {
      return {
        time,
        status: "UNAVAILABLE" as const,
      };
    }

    return {
      time,
      status: "AVAILABLE" as const,
    };
  });
}
