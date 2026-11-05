import { channel } from "../chapterTimeline";
import { linearTo, softOut } from "./visualKit";

export type SupportState = {
  globe: number;
  rings: number;
  ringNodes: number;
  /** The round-the-clock mark running the ring. */
  cycle: number;
  dial: number;
};

/** Ring halves are items 0..3 (ring j: front 2j, back 2j+1), so the rings close one after another. */
export const RING_ITEMS = 4;
export const RING_SHARE = 0.4;
export const DIAL_TICKS = 24;
/** Each tick fades in over this much of the dial sweep. */
export const TICK_FADE = 0.05;

/**
 * Tick `i` is lit when `dial * (1 + TICK_FADE) > i / 24`, fading over TICK_FADE:
 * expressed as `popAt(dial, at, share)` so the sweep ends exactly at dial = 1.
 */
export const tickAt = (i: number): number => i / (DIAL_TICKS * (1 + TICK_FADE));
export const TICK_SHARE = TICK_FADE / (1 + TICK_FADE);

/** Every channel as a pure function of chapter time `t` (MOTION-SPEC §5.3). */
export function supportState(t: number): SupportState {
  return {
    globe: channel(t, -1.6, -0.4, softOut),
    rings: channel(t, -1.0, 0.35, softOut),
    ringNodes: channel(t, 0.35, 1.35, softOut),
    // The great-circle links between the sites were cut (owner, 2026-10-12);
    // the cycle mark takes their window, so nothing sits idle here.
    cycle: channel(t, 1.35, 2.35, softOut),
    // Constant pace, reaching 1 at 82% of the window: tick-by-tick, clockwise, and settled by the clause.
    dial: channel(t, 2.35, 3.2, linearTo(0.82)),
  };
}

export const SUPPORT_SIG = ["rings", "ringNodes", "cycle", "dial"] as const;
