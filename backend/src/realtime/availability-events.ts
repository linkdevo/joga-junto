export type AvailabilityEvent = {
  type: "BOOKING_CREATED" | "BOOKING_CANCELLED";

  courtSlug: string;
  bookingDate: string;
  startTime: string;
};

type AvailabilityListener = (event: AvailabilityEvent) => void;

const listeners = new Map<string, Set<AvailabilityListener>>();

function createChannelKey(courtSlug: string, bookingDate: string) {
  return `${courtSlug}:${bookingDate}`;
}

export function subscribeAvailability(
  courtSlug: string,
  bookingDate: string,
  listener: AvailabilityListener,
) {
  const key = createChannelKey(courtSlug, bookingDate);

  let channel = listeners.get(key);

  if (!channel) {
    channel = new Set();
    listeners.set(key, channel);
  }

  channel.add(listener);

  return function unsubscribe() {
    const currentChannel = listeners.get(key);

    if (!currentChannel) {
      return;
    }

    currentChannel.delete(listener);

    if (currentChannel.size === 0) {
      listeners.delete(key);
    }
  };
}

export function publishAvailabilityEvent(event: AvailabilityEvent) {
  const key = createChannelKey(event.courtSlug, event.bookingDate);

  const channel = listeners.get(key);

  if (!channel) {
    return;
  }

  for (const listener of channel) {
    listener(event);
  }
}
