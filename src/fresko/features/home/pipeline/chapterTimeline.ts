/**
 * Shared contract between the chapter mechanics and the chapter visuals. Pure:
 * no React, no GSAP, no DOM.
 *
 * Two clocks live here, and they are not the same thing:
 *  - the VISUAL clock `t` (the `ChapterClock`): each visual's own story, from
 *    `VISUAL_START_T` (first state) to `VISUAL_END_T` (finished). The visuals'
 *    channels are written against it. The driver maps the chapter's scroll
 *    onto it so the story plays whole, start to finish, across the pin.
 *  - the SCRIPT position `s` (see scriptLight.ts): where the pinned stage is in
 *    its sentences, 0 at the pin's start, `beatCount` at its end.
 */
export type PillarName = "research" | "development" | "support";

/** The visual clock's pace the channels were written for: one unit is this much of the old teleprompter pitch. */
const VISUAL_PITCH_SVH = 45;
/** A beat's visual change starts this many units before its centre… */
export const BEAT_LEAD = 0.65;
/** …and lands this many units after. Windows of consecutive beats are contiguous. */
export const BEAT_TRAIL = 0.35;
export const entryTime = (): number => -100 / VISUAL_PITCH_SVH;
/** Beat 0 also owns the stage entry: its window opens a quarter unit after the body starts rising. */
export const ENTRY_WINDOW_START = entryTime() + 0.25;
/** The earliest visual channel starts here: the first state of every visual. */
export const VISUAL_START_T = -1.6;
/** The longest visual channel of any pillar ends here: every visual is finished at or past it. */
export const VISUAL_END_T = 4.35;
/**
 * Where each visual's own story ends on the visual clock (its last channel lands). The driver
 * stretches [VISUAL_START_T, end] over the pin, so a short story (Support's) is not left idling.
 */
export const VISUAL_END: Record<PillarName, number> = {
  research: 4.35,
  development: 4.35,
  support: 3.05,
};
/** A clock time at which every visual is finished (kept for callers that think in beats). */
export const exitTime = (beatCount: number): number => beatCount - 1 + 0.5;

/** Scroll the pin spends on each sentence, svh. */
export const BEAT_SVH = 90;
/** The body's rise into the viewport, svh: one viewport. */
export const RISE_SVH = 100;
/** Desktop body height, svh: the rise plus one sentence's worth of pin per beat. */
export const bodyHeightSvh = (beatCount: number): number => RISE_SVH + beatCount * BEAT_SVH;
/** Where the pin begins within the body trigger's progress: the end of the rise. */
export const pinStart = (beatCount: number): number => RISE_SVH / bodyHeightSvh(beatCount);
/** Share of the pin at which every visual has landed; the rest is reading time for the last sentence. */
export const VISUAL_DONE_AT = 0.92;
/**
 * Desktop opener run, svh: the arrival (the run rising into view, 100svh of
 * scroll) plus a further 100svh over which the opener rests while the body,
 * which overlaps the run's last viewport, rises over it. 200 makes the body
 * start covering exactly when the arrival lands, so the photo is full-bleed
 * at rest (the owner's 2026-10-09 call). A shorter run lets the opaque body
 * cover the photo before its arrival is done.
 */
export const OPENER_RUN_SVH = 200;
/** Desktop narration box, svh: one sticky viewport + the word-light hold. */
export const NARRATION_SVH = 140;
/** One chapter's scroll length, svh: the opener run plus the body, which overlaps it by one viewport. */
const chapterSvh = (beatCount: number): number => OPENER_RUN_SVH + bodyHeightSvh(beatCount) - 100;
/** Top of #home-narration to the bottom of the last chapter (the closing's top) on desktop, svh. */
export const narrationToClosingSvh = (beatCounts: readonly number[]): number =>
  NARRATION_SVH + beatCounts.reduce((sum, count) => sum + chapterSvh(count), 0);

export const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);
export const smoothstep = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - clamp01(x), 3);
export const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

/** Body trigger progress `p` ("top bottom" → "bottom bottom") → how far the body has risen, 0..1. */
export const riseProgress = (p: number, beatCount: number): number =>
  clamp01(p / pinStart(beatCount));
/**
 * Body trigger progress → the script position `s`: 0 when the pin starts, `beatCount` when it
 * ends. Negative during the rise (the first sentence arrives in its last stretch).
 */
export const scriptPosition = (p: number, beatCount: number): number => {
  const start = pinStart(beatCount);
  return ((clamp01(p) - start) / (1 - start)) * beatCount;
};
/*
 * Handoffs (owner, 2026-10-14): at the end of a chapter's pin its diagram condenses into one
 * gold point, which a fixed carrier takes across the next chapter's opener and lands on the
 * next diagram. The collapse is part of the visual clock; the carrier itself is scroll-driven
 * (HandoffCarrier). Only with motion on a desktop that is not low-power; everywhere else the
 * mapping below is the plain one and no visual ever collapses.
 */
/** The visual clock time of every static (finished, never collapsed) frame. */
export const STATIC_T = 5;
/** Chapters whose diagram condenses into the carrier at the end of their pin. */
export const HANDS_OFF: Record<PillarName, boolean> = {
  research: true,
  development: true,
  // Support hands its point to the closing's film (owner, 2026-10-14).
  support: true,
};
/** Scroll at the end of a handing-off chapter's pin over which its diagram condenses, svh. */
export const COLLAPSE_SVH = 40;
/** Scroll between the story's last channel and the collapse (the last sentence on a still picture), svh. */
export const COLLAPSE_HOLD_SVH = 8;
/** The collapse on the visual clock: past STATIC_T, so no static or finished frame ever shows it. */
export const COLLAPSE_T0 = 6;
export const COLLAPSE_T1 = 7;
/** The collapse's last share, over which the diagram's point gives way to the carrier. */
export const HANDOFF_CROSSFADE = 0.25;
/** Once the next pin starts, the point grows out of its landing ring over this much scroll, svh. */
export const EMERGE_GROW_SVH = 8;
/** Then it rests on its landing anchor this long while it fades into the diagram, svh. */
export const LANDING_SVH = 12;

/**
 * Body trigger progress → the pillar's visual clock: first state at the start, finished at
 * `VISUAL_DONE_AT` of the pin. With `handoff`, a handing-off chapter's story finishes earlier
 * (COLLAPSE_HOLD_SVH + COLLAPSE_SVH before the body's end), holds, and its last COLLAPSE_SVH
 * run the collapse [COLLAPSE_T0, COLLAPSE_T1], linear in scroll. Continuous and monotone.
 */
export function visualTime(
  p: number,
  beatCount: number,
  pillar: PillarName,
  handoff = false,
): number {
  const start = pinStart(beatCount);
  const x = clamp01(p);
  if (!handoff || !HANDS_OFF[pillar]) {
    const done = start + (1 - start) * VISUAL_DONE_AT;
    return mix(VISUAL_START_T, VISUAL_END[pillar], clamp01(x / done));
  }
  const body = bodyHeightSvh(beatCount);
  const collapseAt = 1 - COLLAPSE_SVH / body;
  const done = collapseAt - COLLAPSE_HOLD_SVH / body;
  if (x <= done) return mix(VISUAL_START_T, VISUAL_END[pillar], x / done);
  if (x <= collapseAt)
    return mix(VISUAL_END[pillar], COLLAPSE_T0, (x - done) / (collapseAt - done));
  return mix(COLLAPSE_T0, COLLAPSE_T1, (x - collapseAt) / (1 - collapseAt));
}

/**
 * The carrier's landing on this chapter's visual clock (handoff mapping): its pin starts at
 * `arrive` and the point grows out of its ring; from `land` (EMERGE_GROW_SVH later) it fades
 * into the diagram, which has taken it in by `settled` (LANDING_SVH after that).
 */
export function landingWindow(
  beatCount: number,
  pillar: PillarName,
): { arrive: number; land: number; settled: number } {
  const start = pinStart(beatCount);
  const body = bodyHeightSvh(beatCount);
  const at = (svh: number): number => visualTime(start + svh / body, beatCount, pillar, true);
  return {
    arrive: at(0),
    land: at(EMERGE_GROW_SVH),
    settled: at(EMERGE_GROW_SVH + LANDING_SVH),
  };
}

/** 0→1 over [from, to] in chapter time, eased. Continuous everywhere. */
export function channel(
  t: number,
  from: number,
  to: number,
  ease: (x: number) => number = easeOutCubic,
): number {
  if (to <= from) return t >= to ? 1 : 0;
  return ease((t - from) / (to - from));
}
/** Beat k's own window: [k − BEAT_LEAD, k + BEAT_TRAIL] (beat 0 opens at ENTRY_WINDOW_START). */
export function beatWindow(k: number): readonly [number, number] {
  return [k === 0 ? ENTRY_WINDOW_START : k - BEAT_LEAD, k + BEAT_TRAIL];
}
/** A sub-window inside beat k's window: `a`/`b` are 0..1 shares of that window. */
export function beatSpan(k: number, a: number, b: number): readonly [number, number] {
  const [from, to] = beatWindow(k);
  return [mix(from, to, a), mix(from, to, b)];
}

export type ChapterListener = (t: number) => void;
export interface ChapterClock {
  readonly beatCount: number;
  /** Current visual time. Starts at VISUAL_END_T (lit-by-default = the finished state). */
  t: number;
  /** Calls `listener` immediately with the current t; returns the unsubscribe. */
  subscribe: (listener: ChapterListener) => () => void;
  /** Sets t and notifies listeners (no-op when unchanged). */
  set: (t: number) => void;
}
export function createChapterClock(beatCount: number): ChapterClock {
  const listeners = new Set<ChapterListener>();
  const clock: ChapterClock = {
    beatCount,
    t: VISUAL_END_T,
    subscribe(listener) {
      listeners.add(listener);
      listener(clock.t);
      return () => {
        listeners.delete(listener);
      };
    },
    set(t) {
      if (t === clock.t) return;
      clock.t = t;
      listeners.forEach((listener) => listener(t));
    },
  };
  return clock;
}

/** "scrub": follow the clock (desktop, motion allowed). "static": render exitTime once, no loops. */
export type VisualMode = "scrub" | "static";
export interface ChapterVisualProps {
  clock: ChapterClock;
  mode: VisualMode;
  /** The cross-chapter handoff is on (desktop, motion, not low-power): collapse and emerge run. */
  handoff?: boolean;
}
