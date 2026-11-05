/**
 * The intro lockup's layout — the single source of its sizes.
 *
 * One centred GROUP (mark, wordmark, motto, loading readout), vertically
 * centred as a group, sized from the mark's height `H` (`--mark-h`). Compact
 * on purpose (round 4: "too spread apart"):
 *
 *   wordmark cap height  = 18% of H   (font-size = cap / Outfit's 0.7em cap height)
 *   wordmark top         = 0.32 H below the mark
 *   motto size           = 0.42 x the wordmark's size
 *   motto top            = 0.20 H below the wordmark
 *   loading readout      = a 180 px x 2 px bar, centred 0.25 H under the motto,
 *                          with a mono percentage hung to its right (out of
 *                          the flow, so the bar stays centred and the group's
 *                          height is the bar's)
 *
 * The CSS strings feed the overlay's custom properties; the plain-TS twins
 * (`markHeightPx`, `fallbackMarkRect`) evaluate the same rules where there is
 * no layout (jsdom, a hidden tab), so the dots' travel and the dive's hole
 * are still computed against the same box. No DOM, React or MUI here.
 */

import { MARK_ASPECT, type Rect } from "./diveGeometry";

/** Mark height. `svh`, not `vh`: on iOS the lockup is centred in the small viewport. */
export const MARK_H = "clamp(88px, min(28svh, 52vw), 440px)";
/** Phones in portrait: a touch smaller, a touch wider. */
export const NARROW_VIEWPORT = "@media (max-width: 599.95px)";
export const MARK_H_NARROW = "clamp(88px, min(24svh, 56vw), 440px)";
/** Short landscape screens (phones on their side): a smaller mark leaves room for the type. */
export const SHORT_VIEWPORT = "@media (max-height: 500px)";
export const MARK_H_SHORT = "clamp(72px, min(26svh, 52vw), 440px)";

/** Outfit's cap height, in em. */
export const CAP_HEIGHT_EM = 0.7;
/** The wordmark's cap height, as a fraction of the mark's height. */
export const WORD_CAP_RATIO = 0.18;
/** Hence its font size, as a fraction of the mark's height. */
export const WORD_SIZE_RATIO = WORD_CAP_RATIO / CAP_HEIGHT_EM;
/**
 * The wordmark is ~8.6em wide (10 letters at 0.32em tracking); 9vw keeps it
 * inside a phone. The only place the 18% cap rule gives way to the width.
 */
export const WORD_SIZE_MAX_VW = 9;
/** The motto's size, as a fraction of the wordmark's. */
export const MOTTO_SIZE_RATIO = 0.42;
/** ...but never smaller than this, so it stays legible on short landscape screens. */
export const MOTTO_MIN_PX = 12;

/** The vertical gaps, as fractions of the mark's height: [mark -> wordmark, wordmark -> motto, motto -> readout]. */
export const GAPS = { word: 0.32, motto: 0.2, line: 0.25 } as const;
/** Short landscape tightens them so the group still fits. */
export const GAPS_SHORT = { word: 0.26, motto: 0.16, line: 0.2 } as const;

/** The readout's bar. Wide enough to read as a loader, thin enough to stay quiet. */
export const LINE_W_PX = 180;
export const LINE_H_PX = 2;
/** The percentage hangs this far right of the bar's end. */
export const PERCENT_GAP_PX = 14;
/**
 * The percentage's width: three tabular mono digits at 11px with 0.12em
 * tracking. The bar + number pair is optically centred by shifting the bar
 * left by half of (gap + this), so the PAIR sits on the centre line.
 */
export const PERCENT_W_PX = 24;
/** How far the bar is pulled left of the centre line so bar + percentage read as one centred unit. */
export const READOUT_SHIFT_PX = (PERCENT_GAP_PX + PERCENT_W_PX) / 2;

/** The wordmark's font-size as CSS (needs `--mark-h` in scope). */
export const WORD_SIZE_CSS = `min(calc(var(--mark-h) * ${WORD_SIZE_RATIO.toFixed(5)}), ${WORD_SIZE_MAX_VW}vw)`;
/** The motto's font-size as CSS (needs `--word-size` in scope). */
export const MOTTO_SIZE_CSS = `max(${MOTTO_MIN_PX}px, calc(var(--word-size) * ${MOTTO_SIZE_RATIO}))`;

/* ── the same rules in plain TS ── */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The mark's height in px for a `vw` x `vh` viewport — what `--mark-h` resolves to. */
export function markHeightPx(vw: number, vh: number): number {
  if (vh <= 500) return clamp(Math.min(0.26 * vh, 0.52 * vw), 72, 440);
  if (vw <= 599.95) return clamp(Math.min(0.24 * vh, 0.56 * vw), 88, 440);
  return clamp(Math.min(0.28 * vh, 0.52 * vw), 88, 440);
}

/** The wordmark's font size in px for mark height `h` in a `vw`-wide viewport. */
export function wordSizePx(h: number, vw: number): number {
  return Math.min(h * WORD_SIZE_RATIO, (WORD_SIZE_MAX_VW * vw) / 100);
}

/** The motto's font size in px for a wordmark of `word` px. */
export function mottoSizePx(word: number): number {
  return Math.max(MOTTO_MIN_PX, word * MOTTO_SIZE_RATIO);
}

/** The motto is ~44 characters; only the no-layout fallback needs to know. */
export const MOTTO_CHARS_ESTIMATE = 44;
/** A typical glyph advance of the motto's face, in em, plus its 0.02em tracking. */
const MOTTO_ADVANCE_EM = 0.56 + 0.02;

/**
 * How many lines the motto sets on at `vw` wide, estimated (it wraps on a
 * phone: ~14.7px type in ~311px). Its box is `min(92vw, 60ch)` inside 24px
 * side padding, so the narrower of those bounds the line.
 */
export function mottoLineCount(
  word: number,
  vw: number,
  chars: number = MOTTO_CHARS_ESTIMATE,
): number {
  const size = mottoSizePx(word);
  const available = Math.max(1, Math.min(0.92 * vw, 60 * 0.55 * size, vw - 48));
  return Math.max(1, Math.ceil((chars * size * MOTTO_ADVANCE_EM) / available));
}

/**
 * Where the mark's box sits when nothing can be measured. The whole group is
 * centred, so the mark's top is half of what is left over above it; the
 * motto's line count is estimated (see {@link mottoLineCount}).
 */
export function fallbackMarkRect(vw: number, vh: number): Rect {
  const h = markHeightPx(vw, vh);
  const gaps = vh <= 500 ? GAPS_SHORT : GAPS;
  const word = wordSizePx(h, vw);
  const groupH =
    h * (1 + gaps.word + gaps.motto + gaps.line) +
    word * 1.1 +
    mottoSizePx(word) * 1.4 * mottoLineCount(word, vw) +
    LINE_H_PX;
  const w = h * MARK_ASPECT;
  return { left: (vw - w) / 2, top: (vh - groupH) / 2, height: h, width: w };
}
