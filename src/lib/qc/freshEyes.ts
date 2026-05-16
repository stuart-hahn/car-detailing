export const FRESH_EYES_TOTAL_MS = 5 * 60 * 1000;
export const FRESH_EYES_DELIVERY_MS = 2 * 60 * 1000;

export interface FreshEyesProgress {
  elapsedMs: number;
  remainingMs: number;
  canStartDelivery: boolean;
  complete: boolean;
}

export function getFreshEyesProgress(
  startedAt: string,
  now = Date.now(),
): FreshEyesProgress {
  const elapsedMs = Math.max(0, now - new Date(startedAt).getTime());
  const remainingMs = Math.max(0, FRESH_EYES_TOTAL_MS - elapsedMs);
  return {
    elapsedMs,
    remainingMs,
    canStartDelivery: elapsedMs >= FRESH_EYES_DELIVERY_MS,
    complete: remainingMs === 0,
  };
}
