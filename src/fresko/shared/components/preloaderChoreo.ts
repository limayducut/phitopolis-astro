/**
 * Choreography data for the Preloader intro — "Corner dots become the P's
 * terminals, the lockup forms, P-window dive".
 *
 * Pure data + math. **No DOM, React, `motion` or MUI imports**, so
 * `tests/motion/preloader-choreo.test.ts` can pin the timeline's requirements
 * without mounting anything, and so this stays cheap on the critical path.
 *
 * THE BEATS (seconds from mount, warm cache; the owner-approved storyboard).
 * Every START and END below is a literal from the storyboard; durations that
 * contain a stagger are DERIVED so the whole staggered group still fits its
 * window (the last bar / dot lands exactly at the window's end).
 * The lockup's beats are written on the LOCKUP CLOCK (`L(s)`: seconds after
 * `LOCKUP_ORIGIN_S`), so the opening beats can change without retiming them.
 *
 *   0.00 - 0.40  beat 1: the whole screen is WHITE (frost).
 *   0.40 - 1.25  beat 2: SIX full-width bars flip vertically (rotateX about
 *                their own centre, 70 ms stagger, top to bottom), the white
 *                face rotating away to show the navy ground; then removed.
 *   lockup clock 0 = 0.95 (the old "void" overlaps the last flips):
 *   +0.0 - 0.3   a faint radial vignette fades in; the loading readout's
 *                track appears at +0.3.
 *   +0.3 - 0.7   four dots appear in the four viewport corners (scale 0 -> 1,
 *                fade; 60 ms stagger).
 *   +0.7 - 1.0   rest: the dots breathe (1 -> 1.08 -> 1).
 *   +1.0 - 2.0   the dots travel on gentle CURVED paths (a slight arc, ease in
 *                and out; 80 ms stagger) to the P's four outer WHITE terminals.
 *   +2.0 - 2.3   rest.
 *   ROUND 5 (owner: "the seam and onwards are too fast"): every beat from the
 *   P draw-in onward, and the rest after it, is ~1.35x its round-4 length.
 *   +2.3 - 3.25  the dots grow to the terminals' exact size while the white P
 *                draws in from them (opacity + a slight scale-in), so the dots
 *                read as the P's own ends; at +3.25 they are removed under the
 *                identical shapes.
 *   +3.25 - 3.8  the gold accent ignites (opacity + a 1.03 -> 1 settle).
 *   +3.8 - 4.2   rest: the lockup breathes (1 -> 1.01 -> 1).
 *   +4.2 - 5.15  PHITOPOLIS is uncovered left to right by ONE linear clip wipe
 *                (gold IT), not letter by letter.
 *   +5.15 - 5.45 rest.
 *   +5.45 - 6.35 the motto is uncovered by the same linear wipe; the loading
 *                readout (a bar and a mono percentage, filling with REAL
 *                progress since +0.3) reads 100 at +6.25, inside the same window.
 *   +6.35 - 6.95 rest: the finished lockup sits, fully loaded, until the
 *                readout has read 100 for `LOADED_HOLD_S` (0.7 s; owner: "a
 *                buffer after 100% loaded").
 *   +6.95 - 7.4  the leave: wordmark, motto, readout AND the P mark fade to 0
 *                (0.45 s, ease-out). The P-window hole is already in place
 *                under the mark, so the P dissolves INTO the window; nothing
 *                zooms yet.
 *   +7.4 - 8.6   the P-window dive (ease in-out, 1.2 s). `onStartExit` fires as
 *                the zoom starts: the hero cascade overlaps it AND the home
 *                hero film starts playing. (Warm total: 9.55 s from mount.)
 *
 * GATES. The leave (and so the dive) never starts before the blocking assets
 * are in AND the readout is visibly full AND has sat at 100 for
 * `LOADED_HOLD_S`: late assets leave the formed lockup holding, gently
 * breathing, with the readout still updating honestly, and the leave follows
 * `PROGRESS_FILL_S + LOADED_HOLD_S` after the last asset, the zoom
 * `MARK_OUT_S` after that. Stalled signals:
 * `CHOREO_END_S + SIGNAL_CAP_AFTER_CHOREO_MS` forces the short path
 * (`SKIP_CONTENT_OUT_S` fade, then `SKIP_DIVE_S`), the same path Escape / click /
 * the Skip button take. `FAILSAFE_MS` stays the unconditional ceiling above
 * every path.
 *
 * DETERMINISM. Literals and arithmetic on literals only. No `Math.random()`.
 */

/* ── the statement copy ── */

/**
 * The site's single tagline (IDENTITY §3). `SiteFooter`, the home hero and the
 * Preloader's motto all read it from here; the choreo test pins it, so brand
 * copy on the first frame fails CI on a typo rather than shipping.
 */
export const TAGLINE = "Making tomorrow's technology available today";

export const STATEMENT_LINES = [{ id: "tagline", text: TAGLINE, delayS: 0 }] as const;

export const WORDMARK = "PHITOPOLIS";
export const WORDMARK_GOLD = [2, 3] as const; // "IT"

/** Rounds away float noise (1.25 - 0.3 is not 0.95 in binary) so derived times stay exact literals. */
const r = (v: number): number => Math.round(v * 1e6) / 1e6;

/* ── 0.0 - 0.4  beat 1: the white page ── */

export const WHITE_S = 0.4;

/* ── 0.4 - 1.25  beat 2: six bars flip to show the navy ── */

export const BAR_COUNT = 6;
export const BARS_AT_S = WHITE_S;
/** Each bar starts this much after the one above it (top to bottom). */
export const BAR_STAGGER_S = 0.07;
/** One bar's flip, so the LAST bar lands exactly at `BARS_END_S`. */
export const BAR_FLIP_S = 0.5;
export const BARS_END_S = r(BARS_AT_S + (BAR_COUNT - 1) * BAR_STAGGER_S + BAR_FLIP_S);
/** A bar's rotateX at the end of its flip: edge-on, so its white face is gone. */
export const BAR_END_DEG = -90;
/** Per-bar perspective (px), so each bar foreshortens about its OWN centre. */
export const BAR_PERSPECTIVE_PX = 1100;

/**
 * The lockup's clock starts here: its first 0.3 s (the vignette) overlap the
 * last 0.3 s of the flips, so the dots begin the moment the navy is fully clear.
 */
export const LOCKUP_OVERLAP_S = 0.3;
export const LOCKUP_ORIGIN_S = r(BARS_END_S - LOCKUP_OVERLAP_S);
/** A time on the lockup clock, as seconds from mount. */
const L = (lockupS: number): number => r(LOCKUP_ORIGIN_S + lockupS);

/* ── +0.0 - 0.3  the navy void ── */

/** The faint radial vignette fades in over the void. */
export const VIGNETTE_AT_S = L(0);
export const VIGNETTE_S = 0.3;
/** The loading readout's faint track appears. */
export const LINE_TRACK_AT_S = L(0.3);
export const LINE_TRACK_S = 0.4;

/* ── +0.3 - 0.7  four dots appear in the viewport corners ── */

export const DOT_COUNT = 4;
export const DOTS_APPEAR_AT_S = L(0.3);
export const DOTS_APPEAR_END_S = L(0.7);
export const DOTS_APPEAR_STAGGER_S = 0.06;
/** One dot's scale-in + fade, so the LAST dot lands exactly at the window's end. */
export const DOTS_APPEAR_S = r(
  DOTS_APPEAR_END_S - DOTS_APPEAR_AT_S - (DOT_COUNT - 1) * DOTS_APPEAR_STAGGER_S,
);

/* ── +0.7 - 1.0  rest: the dots breathe ── */

export const DOTS_BREATHE_AT_S = L(0.7);
export const DOTS_BREATHE_END_S = L(1.0);
/** The dots swell to this multiple of their size at the breath's peak. */
export const DOT_BREATHE_PEAK = 1.08;

/* ── +1.0 - 2.0  the dots travel, curved, to the P's four white terminals ── */

export const DOTS_TRAVEL_AT_S = L(1.0);
export const DOTS_TRAVEL_END_S = L(2.0);
export const DOTS_TRAVEL_STAGGER_S = 0.08;
/** One dot's corner -> terminal travel, so the LAST dot lands exactly at the window's end. */
export const DOTS_TRAVEL_S = r(
  DOTS_TRAVEL_END_S - DOTS_TRAVEL_AT_S - (DOT_COUNT - 1) * DOTS_TRAVEL_STAGGER_S,
);
/** How far each path bows away from the straight line, as a fraction of its length. */
export const DOT_ARC_BEND = 0.14;

/* ── +2.0 - 2.3 rest; +2.3 - 3.25  the dots become the terminals, the P draws in ── */

export const DOTS_GROW_AT_S = L(2.3);
export const DOTS_GROW_END_S = L(3.25);
export const P_IN_AT_S = DOTS_GROW_AT_S;
export const P_IN_S = r(DOTS_GROW_END_S - DOTS_GROW_AT_S);
/** The white P scales in from this (a slight scale-in) as it fades in. */
export const P_FROM_SCALE = 0.97;
/** The dots are removed under the identical node shapes (a hair of fade hides a sub-pixel edge). */
export const DOTS_OUT_AT_S = DOTS_GROW_END_S;
export const DOTS_OUT_S = 0.12;

/* ── +3.25 - 3.8  the gold accent ignites ── */

export const ACCENT_AT_S = L(3.25);
export const ACCENT_END_S = L(3.8);
export const ACCENT_S = r(ACCENT_END_S - ACCENT_AT_S);
/** The accent settles in around its own centre from this scale. */
export const ACCENT_FROM_SCALE = 1.03;

/* ── +3.8 - 4.2  rest: the lockup breathes ── */

export const LOCKUP_BREATHE_AT_S = L(3.8);
export const LOCKUP_BREATHE_END_S = L(4.2);
export const LOCKUP_BREATHE_PEAK = 1.01;

/* ── +4.2 - 5.15  the wordmark: one linear horizontal reveal ── */

export const WORDMARK_AT_S = L(4.2);
export const WORDMARK_END_S = L(5.15);
export const WORDMARK_REVEAL_S = r(WORDMARK_END_S - WORDMARK_AT_S);

/* ── +5.15 - 5.45 rest; +5.45 - 6.35  the motto (same wipe) and the loading readout ── */

export const MOTTO_AT_S = L(5.45);
export const MOTTO_END_S = L(6.35);
export const MOTTO_REVEAL_S = r(MOTTO_END_S - MOTTO_AT_S);
/** On a warm load the readout paces itself to be full here, inside the motto's window. */
export const LINE_DONE_S = L(6.25);

/** When the lockup's last element has landed. */
export const LOCKUP_LANDED_S = MOTTO_END_S;

/* ── +6.35 - 6.95 the loaded rest; +6.95 - 7.4  the leave (the mark fades over the hole), then the dive ── */

/**
 * The buffer after the readout reads 100: the finished lockup sits, fully
 * loaded, for this long before anything leaves (owner, 2026-10-06: "create a
 * buffer after 100% loaded"). Also the gate after a late last asset.
 */
export const LOADED_HOLD_S = 0.7;
/** The leave starts once the motto has landed AND the readout has sat at 100 for `LOADED_HOLD_S`. */
export const CONTENT_OUT_AT_S = r(Math.max(L(6.35), LINE_DONE_S + LOADED_HOLD_S));
/**
 * The leave: wordmark, motto, readout, Skip, vignette AND the P mark all fade
 * to 0 over this long (ease-out) BEFORE the zoom. The dive's hole is mounted
 * under the mark when the leave begins, so the mark dissolves into the window
 * exactly where it will open.
 */
export const CONTENT_OUT_S = 0.45;
/** The P mark's own fade (white + gold): the same stage, 0.4 - 0.5 s, ease-out. */
export const MARK_OUT_S = CONTENT_OUT_S;
/** The zoom begins here (warm cache): once the mark is gone. `onStartExit` fires now. */
export const DIVE_AT_S = r(CONTENT_OUT_AT_S + MARK_OUT_S);
/** The P-window dive. */
export const DIVE_S = 1.2;
/** Skip / stall: the short dive. */
export const SKIP_DIVE_S = 0.55;
/** Skip / stall: the lockup (mark included) leaves faster, then the short dive follows. */
export const SKIP_CONTENT_OUT_S = 0.2;

/** Warm-cache total, mount -> `onDone`. */
export const WARM_TOTAL_S = r(DIVE_AT_S + DIVE_S);

/**
 * "The composition has played" — the moment the stall cap is measured from.
 * Equal to the earliest zoom: a warm load never waits on it.
 */
export const CHOREO_END_S = DIVE_AT_S;
/** No buffer after the composition: the intro ends when it ends. */
export const POST_HOLD_S = 0;

/* ── the Skip button ── */

/** Visible from here: one second after the bars have cleared, well before the dive. */
export const SKIP_AT_S = r(BARS_END_S + 1.0);
export const SKIP_FADE_S = 0.4;
/** Its resting opacity: quiet, still readable. */
export const SKIP_OPACITY = 0.7;

/* ── the hold (assets late) ── */

/** Past this, with the assets still out, the formed lockup holds. */
export const HOLD_AT_S = CONTENT_OUT_AT_S;
/** One slow breath of the held lockup (1 -> 1.01 -> 1), looping. */
export const HOLD_BREATH_S = 2.4;

/* ── the loading readout ── */

/** The fastest the readout completes once the last blocking asset lands. */
export const PROGRESS_FILL_S = 0.35;
/** On a warm load the readout paces itself to complete inside the motto's window. */
export const PROGRESS_DONE_S = LINE_DONE_S;

/**
 * How long the readout takes to travel `from` -> `to` (0..1) when started
 * `elapsedS` into the intro. Real progress sets the TARGET; this sets the
 * PACE: while the intro still has time to run, the readout spreads its
 * remaining distance over it (so a cache-warm load does not snap to full in a
 * blink and sit there), but it is never slower than `PROGRESS_FILL_S` to
 * finish once the intro itself is waiting on the assets. Bounded above by
 * `PROGRESS_DONE_S`, so it always completes before the content leaves.
 */
export function progressTweenS(elapsedS: number, from: number, to: number): number {
  // The time left, scaled by the SHARE of the remaining distance this step covers
  // (not by its absolute length): successive steps then add up to finishing at
  // `PROGRESS_DONE_S` however the blocking signals are spaced.
  const share = Math.max(0, to - from) / Math.max(1e-6, 1 - from);
  return Math.max(PROGRESS_FILL_S, (PROGRESS_DONE_S - elapsedS) * share);
}

/* ── safety ── */

/** How long past `CHOREO_END_S` the intro waits on stalled blocking signals. */
export const SIGNAL_CAP_AFTER_CHOREO_MS = 1500;
/** Unconditional unmount ceiling. Nothing may leave the overlay mounted. */
export const FAILSAFE_MS = 14000;

/** The dive's belt-and-braces timer: `onDone` fires this long after the dive's own duration at the latest. */
export const DIVE_BACKUP_S = 0.15;

/**
 * The slowest non-forced path: the blocking assets land a hair before the
 * stall cap, the readout then takes `PROGRESS_FILL_S` to complete, the lockup
 * sits at 100 for `LOADED_HOLD_S`, the mark fades
 * (`MARK_OUT_S`), the full dive plays, and `onDone` fires on the backup timer
 * at the latest.
 */
export const WORST_CASE_MS =
  (CHOREO_END_S + PROGRESS_FILL_S + LOADED_HOLD_S + MARK_OUT_S + DIVE_S + DIVE_BACKUP_S) * 1000 +
  SIGNAL_CAP_AFTER_CHOREO_MS;

/* ── the storyboard as data (tests and docs read it) ── */

export interface Beat {
  id: string;
  at: number;
  end: number;
  /** A rest slot: nothing but a gentle breath may move in it. */
  rest?: boolean;
}

/** The beats in order, exactly as the storyboard lists them. */
export const BEATS: readonly Beat[] = [
  { id: "white", at: 0, end: WHITE_S },
  { id: "bars-flip", at: BARS_AT_S, end: BARS_END_S },
  { id: "void", at: LOCKUP_ORIGIN_S, end: DOTS_APPEAR_AT_S },
  { id: "dots-appear", at: DOTS_APPEAR_AT_S, end: DOTS_APPEAR_END_S },
  { id: "dots-breathe", at: DOTS_BREATHE_AT_S, end: DOTS_BREATHE_END_S, rest: true },
  { id: "dots-travel", at: DOTS_TRAVEL_AT_S, end: DOTS_TRAVEL_END_S },
  { id: "rest", at: DOTS_TRAVEL_END_S, end: DOTS_GROW_AT_S, rest: true },
  { id: "dots-become-terminals", at: DOTS_GROW_AT_S, end: DOTS_GROW_END_S },
  { id: "accent", at: ACCENT_AT_S, end: ACCENT_END_S },
  { id: "lockup-breathe", at: LOCKUP_BREATHE_AT_S, end: LOCKUP_BREATHE_END_S, rest: true },
  { id: "wordmark", at: WORDMARK_AT_S, end: WORDMARK_END_S },
  { id: "rest", at: WORDMARK_END_S, end: MOTTO_AT_S, rest: true },
  { id: "motto", at: MOTTO_AT_S, end: MOTTO_END_S },
  { id: "loaded-hold", at: MOTTO_END_S, end: CONTENT_OUT_AT_S, rest: true },
  { id: "content-out", at: CONTENT_OUT_AT_S, end: DIVE_AT_S },
  { id: "dive", at: DIVE_AT_S, end: WARM_TOTAL_S },
];
