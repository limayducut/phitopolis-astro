import { cubicBezier } from "motion";

import {
  EASE_IN_OUT_QUART,
  EASE_IN_OUT_SINE,
  EASE_OUT_EXPO,
  EASE_OUT_SOFT,
} from "@/shared/motion/easing";
import {
  ACCENT_AT_S,
  ACCENT_FROM_SCALE,
  ACCENT_S,
  BARS_AT_S,
  BARS_END_S,
  BAR_COUNT,
  BAR_END_DEG,
  BAR_FLIP_S,
  BAR_PERSPECTIVE_PX,
  BAR_STAGGER_S,
  CONTENT_OUT_AT_S,
  CONTENT_OUT_S,
  DIVE_AT_S,
  DIVE_S,
  DOTS_APPEAR_AT_S,
  DOTS_APPEAR_S,
  DOTS_APPEAR_STAGGER_S,
  DOTS_BREATHE_AT_S,
  DOTS_BREATHE_END_S,
  DOTS_GROW_AT_S,
  DOTS_GROW_END_S,
  DOTS_OUT_AT_S,
  DOTS_OUT_S,
  DOTS_TRAVEL_AT_S,
  DOTS_TRAVEL_S,
  DOTS_TRAVEL_STAGGER_S,
  DOT_BREATHE_PEAK,
  DOT_COUNT,
  LINE_TRACK_AT_S,
  LINE_TRACK_S,
  LOCKUP_BREATHE_AT_S,
  LOCKUP_BREATHE_END_S,
  LOCKUP_BREATHE_PEAK,
  MARK_OUT_S,
  MOTTO_AT_S,
  MOTTO_REVEAL_S,
  P_FROM_SCALE,
  P_IN_AT_S,
  P_IN_S,
  SKIP_AT_S,
  SKIP_FADE_S,
  VIGNETTE_AT_S,
  VIGNETTE_S,
  WORDMARK_AT_S,
  WORDMARK_REVEAL_S,
} from "../preloaderChoreo";

type Ease = readonly [number, number, number, number];

/**
 * One value over time, as keyframes. A key's `ease` shapes the segment that
 * ENDS at that key. The same keys drive the live tween (`keysToTween`) and
 * the DEV freeze pose (`sampleKeys`), so the two cannot drift apart.
 */
export interface Key {
  t: number;
  v: number;
  ease?: Ease;
}

const bezierCache = new Map<string, (u: number) => number>();
const bezier = (e: Ease): ((u: number) => number) => {
  const id = e.join(",");
  let fn = bezierCache.get(id);
  if (!fn) {
    fn = cubicBezier(...e);
    bezierCache.set(id, fn);
  }
  return fn;
};

/** Drop a key that repeats the previous key's time and value (a zero-length segment). */
const compact = (keys: Key[]): Key[] =>
  keys.filter((k, i) => i === 0 || Math.abs(k.t - keys[i - 1]!.t) > 1e-9 || k.v !== keys[i - 1]!.v);

/** The value of `keys` at `t` seconds (clamped to the first / last key). */
export function sampleKeys(keys: readonly Key[], t: number): number {
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (t <= first.t) return first.v;
  if (t >= last.t) return last.v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    if (t <= k.t) {
      const p = keys[i - 1]!;
      const span = k.t - p.t;
      if (span <= 0) return k.v;
      const u = (t - p.t) / span;
      return p.v + (k.v - p.v) * (k.ease ? bezier(k.ease)(u) : u);
    }
  }
  return last.v;
}

/** What `animate()` needs to play `keys`: values, a delay of the first key's time, `times` and per-segment easing. */
export function keysToTween(keys: readonly Key[], format: (v: number) => string | number) {
  const t0 = keys[0]!.t;
  const duration = keys[keys.length - 1]!.t - t0;
  return {
    values: keys.map((k) => format(k.v)),
    options: {
      delay: t0,
      duration,
      times: keys.map((k) => (k.t - t0) / duration),
      ease: keys.slice(1).map((k) => k.ease ?? ("linear" as const)),
    },
  };
}

/* ── the opening bars ── */

/** The curve of a bar's flip — the site's curtain curve. */
export const BAR_EASE = EASE_IN_OUT_QUART;

/** When bar `i` (0 = top) starts flipping. */
export const barStartS = (i: number): number => BARS_AT_S + i * BAR_STAGGER_S;

/**
 * A bar's transform at flip progress `p` (0 = flat and white, 1 = edge-on):
 * its own perspective, so it foreshortens about its OWN centre, then rotateX.
 * Both ends use the same function list, so the tween interpolates cleanly.
 */
export const barTransform = (p: number): string =>
  `perspective(${BAR_PERSPECTIVE_PX}px) rotateX(${Math.round(BAR_END_DEG * p * 1000) / 1000}deg)`;

/* ── the wordmark / motto reveal ── */

/** The emergence's easing (owner, 2026-10-13: "use easing"): the site's expo-out, a
 *  quick rise that settles softly, instead of the old constant-speed wipe. */
export const REVEAL_EASE = EASE_OUT_EXPO;

/**
 * The clip that has uncovered `p` (0..1) of a text line from its BOTTOM edge: the top
 * inset shrinks 100% -> 0%, so the line emerges upward (owner, 2026-10-13: bottom to
 * top, not left to right). Percent insets on both ends (the same function list), so
 * the live tween interpolates cleanly and the DEV freeze poses the same string.
 */
export const revealClip = (p: number): string =>
  `inset(${Math.round((1 - Math.min(1, Math.max(0, p))) * 100000) / 1000}% 0% 0% 0%)`;

/** How far below its place a line (or the P) starts as it emerges, percent of its own height. */
export const EMERGE_FROM_PCT = 40;
/** The rise that goes with the bottom-up reveal: `EMERGE_FROM_PCT`% below -> in place. */
export const riseTransform = (p: number): string =>
  `translateY(${Math.round((1 - Math.min(1, Math.max(0, p))) * EMERGE_FROM_PCT * 1000) / 1000}%)`;

/* ── the keyframe tracks ── */

const dotAppearAt = (i: number) => DOTS_APPEAR_AT_S + i * DOTS_APPEAR_STAGGER_S;
const dotTravelAt = (i: number) => DOTS_TRAVEL_AT_S + i * DOTS_TRAVEL_STAGGER_S;

/**
 * Dot `i`'s scale: in from nothing to its resting size `s0` (a fraction of the
 * terminal's), a breath, then — after the travel — the grow to 1, the terminal's
 * own size. `s0` is the resting radius over the terminal's radius.
 */
export function dotScaleKeys(i: number, s0: number): Key[] {
  const appearEnd = dotAppearAt(i) + DOTS_APPEAR_S;
  const breathMid = (DOTS_BREATHE_AT_S + DOTS_BREATHE_END_S) / 2;
  return compact([
    { t: dotAppearAt(i), v: 0 },
    { t: appearEnd, v: s0, ease: EASE_OUT_SOFT },
    { t: DOTS_BREATHE_AT_S, v: s0 },
    { t: breathMid, v: s0 * DOT_BREATHE_PEAK, ease: EASE_OUT_SOFT },
    { t: DOTS_BREATHE_END_S, v: s0, ease: EASE_OUT_SOFT },
    { t: DOTS_GROW_AT_S, v: s0 },
    { t: DOTS_GROW_END_S, v: 1, ease: EASE_OUT_SOFT },
  ]);
}

/** The shared dots layer: present, then gone under the terminals' identical shapes. */
export const DOTS_LAYER_KEYS: Key[] = [
  { t: 0, v: 1 },
  { t: DOTS_OUT_AT_S, v: 1 },
  { t: DOTS_OUT_AT_S + DOTS_OUT_S, v: 0, ease: EASE_OUT_SOFT },
];

/** The lockup's one breath (1 -> 1.01 -> 1). */
export const LOCKUP_BREATHE_KEYS: Key[] = [
  { t: LOCKUP_BREATHE_AT_S, v: 1 },
  {
    t: (LOCKUP_BREATHE_AT_S + LOCKUP_BREATHE_END_S) / 2,
    v: LOCKUP_BREATHE_PEAK,
    ease: EASE_OUT_SOFT,
  },
  { t: LOCKUP_BREATHE_END_S, v: 1, ease: EASE_OUT_SOFT },
];

/* ── the pose ── */

/** One dot at time `t`. `travel` is the EASED path progress (0 = at its corner, 1 = landed). */
export interface DotPose {
  travel: number;
  opacity: number;
  /** Its scale as a multiple of the terminal's size (1 = exactly the terminal). */
  scale: number;
}

/**
 * Where every intro element is at time `t` (seconds from mount) on the warm,
 * unskipped path — the same beats and curves the live tweens use, as a pure
 * function. It backs the DEV-only `?intro=<s>` freeze tool, which poses the
 * DOM from this with no timers and no rAF.
 *
 * Entrance values are 0..1 eased progress (0 = hidden/low, 1 = landed) unless
 * a field says otherwise. `dive` is the dive's raw 0..1 progress, or `null`
 * before it starts.
 */
export interface IntroPose {
  /** Each opening bar's EASED flip progress, top to bottom (0 = flat white, 1 = edge-on). */
  bars: number[];
  /** The bars are gone (the flips are over and they have been removed). */
  barsGone: boolean;
  /** The faint radial vignette, 0..1. */
  vignette: number;
  /** The loading line's track, 0..1. */
  track: number;
  dots: DotPose[];
  /** 1 -> 0 as the dots are removed under the terminals. */
  dotsLayer: number;
  /** The white P's draw-in, 0..1 (opacity; scale runs `P_FROM_SCALE` -> 1). */
  p: number;
  pScale: number;
  /** The gold accent's ignition, 0..1 (opacity; scale runs `ACCENT_FROM_SCALE` -> 1). */
  accent: number;
  accentScale: number;
  /** The lockup's breath, a scale around 1. */
  breathe: number;
  /** The wordmark's left-to-right reveal, 0..1 LINEAR (0 = fully clipped, 1 = uncovered). */
  wordmark: number;
  /** The motto's left-to-right reveal, 0..1 linear. */
  motto: number;
  /** The Skip button's fade-in, 0..1. */
  skip: number;
  /** 1 -> 0 as the wordmark, motto, line, vignette and Skip leave (ease-out, alongside the mark). */
  contentOpacity: number;
  /** 1 -> 0 as the P glyph (white + gold) fades over the hole, BEFORE the zoom. */
  markOpacity: number;
  /** The dive's hole is mounted (under the fading mark) from the leave's start. */
  hole: boolean;
  /** The zoom's raw 0..1 progress, or `null` before the zoom starts. */
  dive: number | null;
}

const outSoft = cubicBezier(...EASE_OUT_SOFT);
const inOutSine = cubicBezier(...EASE_IN_OUT_SINE);
const inOutQuart = cubicBezier(...BAR_EASE);

/** 0..1 progress of a `dur`-long beat starting at `at`. Snapped to 1e-9 so the derived (summed) start times never leave a beat at 0.9999999999. */
const unit = (t: number, at: number, dur: number): number =>
  dur <= 0 ? (t >= at ? 1 : 0) : Math.min(1, Math.max(0, Math.round(((t - at) / dur) * 1e9) / 1e9));

/** Dot `i` at `t`; `s0` is its resting radius over the terminal's (see `dotScaleKeys`). */
export function dotPoseAt(i: number, t: number, s0: number): DotPose {
  return {
    travel: inOutSine(unit(t, dotTravelAt(i), DOTS_TRAVEL_S)),
    opacity: outSoft(unit(t, dotAppearAt(i), DOTS_APPEAR_S)),
    scale: sampleKeys(dotScaleKeys(i, s0), t),
  };
}

/** The start time of dot `i`'s travel, for the live tween. */
export const dotTravelStartS = dotTravelAt;
/** The start time of dot `i`'s appearance, for the live tween. */
export const dotAppearStartS = dotAppearAt;
/** The EASED travel progress at raw progress `u` — what the live path samples. */
export const travelEase = (u: number): number => inOutSine(u);

export function poseAt(t: number, s0 = 0.3): IntroPose {
  const diving = t >= DIVE_AT_S;
  const leaving = t >= CONTENT_OUT_AT_S;
  const p = outSoft(unit(t, P_IN_AT_S, P_IN_S));
  const accent = outSoft(unit(t, ACCENT_AT_S, ACCENT_S));
  return {
    bars: Array.from({ length: BAR_COUNT }, (_, i) =>
      inOutQuart(unit(t, barStartS(i), BAR_FLIP_S)),
    ),
    barsGone: t >= BARS_END_S,
    vignette: outSoft(unit(t, VIGNETTE_AT_S, VIGNETTE_S)),
    track: outSoft(unit(t, LINE_TRACK_AT_S, LINE_TRACK_S)),
    dots: Array.from({ length: DOT_COUNT }, (_, i) => dotPoseAt(i, t, s0)),
    dotsLayer: sampleKeys(DOTS_LAYER_KEYS, t),
    p,
    pScale: P_FROM_SCALE + (1 - P_FROM_SCALE) * p,
    accent,
    accentScale: ACCENT_FROM_SCALE + (1 - ACCENT_FROM_SCALE) * accent,
    breathe: sampleKeys(LOCKUP_BREATHE_KEYS, t),
    // Linear: the wipe moves at a constant pace (EASE_LINEAR is y = x).
    wordmark: unit(t, WORDMARK_AT_S, WORDMARK_REVEAL_S),
    motto: unit(t, MOTTO_AT_S, MOTTO_REVEAL_S),
    skip: outSoft(unit(t, SKIP_AT_S, SKIP_FADE_S)),
    contentOpacity: leaving ? 1 - outSoft(unit(t, CONTENT_OUT_AT_S, CONTENT_OUT_S)) : 1,
    markOpacity: leaving ? 1 - outSoft(unit(t, CONTENT_OUT_AT_S, MARK_OUT_S)) : 1,
    hole: leaving,
    dive: diving ? unit(t, DIVE_AT_S, DIVE_S) : null,
  };
}

/** One tween of the loading line: `from` -> `to` from `startS`, over `durationS`. */
export interface BarSegment {
  from: number;
  to: number;
  startS: number;
  durationS: number;
}

/** The line's fill (0..1) `tS` seconds from mount — what is on screen mid-segment. Linear: an honest pace. */
export function barValueAt(seg: BarSegment, tS: number): number {
  return seg.from + (seg.to - seg.from) * unit(tS, seg.startS, seg.durationS);
}
