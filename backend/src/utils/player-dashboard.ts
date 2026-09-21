import type { BookingStatus } from "../database";

type BookingCandidate = {
  id: string;
  bookingDate: string;
  startTime: string;
  bookingStatus: BookingStatus;
};

function getBookingKey(booking: BookingCandidate) {
  return `${booking.bookingDate} ${booking.startTime}`;
}

export function selectNextBooking<T extends BookingCandidate>(
  bookings: T[],
  currentDateTime: string,
): T | null {
  const futureBookings = bookings
    .filter((booking) => booking.bookingStatus !== "CANCELLED")
    .filter((booking) => getBookingKey(booking) >= currentDateTime)
    .sort((a, b) => {
      return getBookingKey(a).localeCompare(getBookingKey(b));
    });

  return futureBookings[0] ?? null;
}
