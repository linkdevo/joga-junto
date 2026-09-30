const lockTails = new Map<string, Promise<void>>();

export async function withBookingLock<T>(
  bookingId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previousOperation = lockTails.get(bookingId) ?? Promise.resolve();

  let releaseCurrentOperation!: () => void;

  const currentOperation = new Promise<void>((resolve) => {
    releaseCurrentOperation = resolve;
  });

  const queuedOperation = previousOperation.then(() => currentOperation);

  lockTails.set(bookingId, queuedOperation);

  await previousOperation;

  try {
    return await operation();
  } finally {
    releaseCurrentOperation();

    if (lockTails.get(bookingId) === queuedOperation) {
      lockTails.delete(bookingId);
    }
  }
}
