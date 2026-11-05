/**
 * The site's two shared easing curves.
 *
 * Before this module the expo-out tuple [0.16, 1, 0.3, 1] appeared at nineteen
 * call sites in eleven files, and was independently declared as a local const
 * named EASE_OUT_EXPO in three of them (Reveal, CapabilityRack, ServiceDrawer).
 * The quart-in-out curtain curve [0.76, 0, 0.24, 1] appeared at four. Motion
 * wants the tuple; CSS `transition` wants the cubic-bezier() string, so both
 * shapes are exported from one source rather than being retyped per call site.
 *
 * These are decorative choreography, deliberately separate from SCROLL_SPEED in
 * ./scrollSpeed — that one governs scroll navigation and ScrollTrigger scrub
 * lag. Don't merge them.
 */

type CubicBezier = readonly [number, number, number, number];

const css = (e: CubicBezier) => `cubic-bezier(${e.join(", ")})`;

/** Fast out, long settle. The default for reveals, hovers and drawer motion. */
export const EASE_OUT_EXPO: CubicBezier = [0.16, 1, 0.3, 1];
export const EASE_OUT_EXPO_CSS = css(EASE_OUT_EXPO);

/**
 * Slow start, hard finish — the exit counterpart to EASE_OUT_EXPO.
 *
 * Added so the preloader's exits stop reaching for Motion's `"easeIn"` string.
 * The string curve is a plain quadratic and reads soft against an expo-out
 * entrance; departures should accelerate away as decisively as arrivals settle.
 */
export const EASE_IN_EXPO: CubicBezier = [0.7, 0, 0.84, 0];
export const EASE_IN_EXPO_CSS = css(EASE_IN_EXPO);

/**
 * The site's narrative entrance curve — GSAP `power2.out`, the same curve as
 * `REVEAL_EASE_CSS` in ./entranceSpec (pinned equal by tests/motion/easing.test.ts).
 *
 * Added for the web intro (user, 2026-09-24: "the same curve as the rest of the
 * site"): a gentle settle rather than EASE_OUT_EXPO's snap, so the intro's
 * entrances read like the page's own reveals.
 */
export const EASE_OUT_SOFT: CubicBezier = [0.33, 1, 0.68, 1];
export const EASE_OUT_SOFT_CSS = css(EASE_OUT_SOFT);

/** The mirror of EASE_OUT_SOFT — GSAP `power2.in`. The intro's exits. */
export const EASE_IN_SOFT: CubicBezier = [0.32, 0, 0.67, 0];
export const EASE_IN_SOFT_CSS = css(EASE_IN_SOFT);

/** Symmetric and heavy at both ends — the page-curtain and preloader wipe. */
export const EASE_IN_OUT_QUART: CubicBezier = [0.76, 0, 0.24, 1];
export const EASE_IN_OUT_QUART_CSS = css(EASE_IN_OUT_QUART);

/**
 * A gentle, symmetric ease — CSS-spec `easeInOutSine`. Peak speed is only ~1.6x
 * the average (EASE_IN_OUT_QUART's is ~4x), so a long travel drifts rather than
 * dashes. Added for the intro's dots, which swoop in from the viewport corners.
 */
export const EASE_IN_OUT_SINE: CubicBezier = [0.37, 0, 0.63, 1];
export const EASE_IN_OUT_SINE_CSS = css(EASE_IN_OUT_SINE);

/**
 * Constant speed - the identity curve, written as the bezier that is exactly y = x
 * (the polynomial 3t^2 - 2t^3 on both axes). Added for the intro's wordmark and motto,
 * which are uncovered left to right by a clip wipe: any easing on a wipe reads as the
 * text accelerating, so it has to be linear. Not for anything with a natural weight.
 */
export const EASE_LINEAR: CubicBezier = [0, 0, 1, 1];
export const EASE_LINEAR_CSS = css(EASE_LINEAR);

/**
 * Overshoot-then-settle — the only curve here that leaves the 0..1 range.
 *
 * Added for the glass toggle, whose spec asks for a "spring-like" thumb. MUI's
 * SwitchBase is not a `motion` component, so the spring has to be a CSS timing
 * function rather than a physics simulation; a bezier with a control point above 1
 * gives the same read — the thumb passes its mark and comes back — in one
 * declaration and on the compositor.
 *
 * Reserved for small, discrete state flips (a thumb, a checkmark). Do not use it on
 * anything large or scroll-driven: an overshoot on a big surface reads as a bounce,
 * which is the opposite of what this design is after.
 */
export const EASE_SPRING_SOFT: CubicBezier = [0.34, 1.56, 0.64, 1];
export const EASE_SPRING_SOFT_CSS = css(EASE_SPRING_SOFT);

/** Subtle overshoot for interactive transforms. */
export const EASE_SPRING_SUBTLE: CubicBezier = [0.175, 0.885, 0.32, 1.275];
export const EASE_SPRING_SUBTLE_CSS = css(EASE_SPRING_SUBTLE);
