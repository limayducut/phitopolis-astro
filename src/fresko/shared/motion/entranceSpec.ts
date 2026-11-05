/**
 * Shared spec for the `[data-reveal]` entrance choreography, extracted from
 * `useHomeReveal.ts`'s `useHomeEntrance` (the home immersive pass) so inner
 * pages can run the identical entrance without pulling in gsap. Values here
 * are the single source of truth — `useHomeReveal.ts` imports them instead
 * of declaring its own, and `tests/entrance-spec-parity.test.ts` pins them
 * so home and inner pages can't silently drift apart.
 *
 * Two easing shapes are exported per curve: the GSAP ease name (`REVEAL_EASE`,
 * `WIPE_EASE`) for gsap-driven timelines, and the equivalent CSS
 * `cubic-bezier()` string (`REVEAL_EASE_CSS`, `WIPE_EASE_CSS`) for
 * `Element.animate()` (WAAPI), which doesn't understand GSAP's named eases.
 * `power2.out` and `power3.out` are both members of GSAP's built-in power
 * family (https://gsap.com/docs/v3/Eases) — their CSS equivalents below are
 * the standard published approximations.
 */

/** Geometry threshold: an element counts as "below the fold" — and so starts
 *  hidden — when its top is at or past this line. `useHomeReveal.ts`
 *  re-exports this (it used to own the literal) so existing imports of
 *  `REVEAL_START` from there keep working. */
export const REVEAL_START = "top 100%";

export const REVEAL_RISE_PX = 36;
export const REVEAL_DURATION_S = 1.4;
/** GSAP ease name for `useHomeEntrance`'s gsap.fromTo tweens. */
export const REVEAL_EASE = "power2.out";
/** CSS cubic-bezier equivalent of `power2.out`, for `Element.animate()`. */
export const REVEAL_EASE_CSS = "cubic-bezier(0.33, 1, 0.68, 1)";
export const REVEAL_STAGGER_S = 0.12;

export const WIPE_DURATION_S = 1.3;
/** GSAP ease name for the heading clip-path wipe. */
export const WIPE_EASE = "power3.out";
/** CSS cubic-bezier equivalent of `power3.out`, for `Element.animate()`. */
export const WIPE_EASE_CSS = "cubic-bezier(0.215, 0.61, 0.355, 1)";
export const WIPE_DRIFT_PX = 24;

/** Triggers/reveals firing within this window of each other are one burst
 *  and share a stagger index. */
export const REVEAL_BURST_MS = 80;

/**
 * `useEntrance`'s gate query. Deliberately a literal copy of
 * `homeFlow.ts`'s `HOME_MOTION_QUERY`, not an import — `homeFlow.ts` lives
 * under `src/features/home`, and `src/shared` doesn't reach back into
 * feature code for anything gsap-free could otherwise just inline. Keep
 * this string in sync with `HOME_MOTION_QUERY` by hand if either changes.
 */
export const ENTRANCE_MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
