import { describe, expect, it } from "vitest";
import {
  FRESH_EYES_DELIVERY_MS,
  FRESH_EYES_TOTAL_MS,
  getFreshEyesProgress,
} from "./freshEyes";

describe("fresh-eyes pause", () => {
  const started = "2026-05-16T12:00:00.000Z";

  it("blocks delivery before 2 minutes", () => {
    const now = new Date(started).getTime() + 60_000;
    const p = getFreshEyesProgress(started, now);
    expect(p.canStartDelivery).toBe(false);
    expect(p.complete).toBe(false);
  });

  it("enables delivery at 2 minutes", () => {
    const now = new Date(started).getTime() + FRESH_EYES_DELIVERY_MS;
    const p = getFreshEyesProgress(started, now);
    expect(p.canStartDelivery).toBe(true);
    expect(p.complete).toBe(false);
  });

  it("completes at 5 minutes", () => {
    const now = new Date(started).getTime() + FRESH_EYES_TOTAL_MS;
    const p = getFreshEyesProgress(started, now);
    expect(p.complete).toBe(true);
    expect(p.remainingMs).toBe(0);
  });
});
