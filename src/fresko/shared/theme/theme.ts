// Ported from fresko theme.ts: the font and type-scale constants only (no MUI theme).



/** The display font — headings and interactive elements. */
export const DISPLAY_FONT = "'Outfit', -apple-system, 'Helvetica Neue', Arial, sans-serif";

/** The body font — sitewide default for text and paragraphs. */
export const BODY_FONT = "'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif";

/** Legacy export — maps to the body font for backward compatibility. */
export const FONT = BODY_FONT;

/** The mono meta rail — exported for sx use on meta-labels and data readouts. */
export const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/**
 * The type scale — the whole ramp, as raw values.
 *
 * ## Why this exists
 *
 * The variants below are the preferred way to set type (`<Typography
 * variant="caption">`), but a large share of the site's text is not a
 * `Typography`: labels inside buttons, chips, spans, `component="span"` bits
 * of a larger sentence. Those reach for `sx={{ fontSize }}`, and with no token
 * to reach for they reached for a literal — which is how the codebase ended up
 * with **57 distinct literal `fontSize` values plus 76 responsive
 * `fontSize:{}` objects** (measured 2026-08-23).
 *
 * Most of that is not variety, it is noise: 0.68 / 0.6875 / 0.7rem are the
 * same size to the eye, as are 0.72 / 0.74 / 0.75 / 0.76 / 0.78. Eight steps
 * cover every real typographic need on the site; the rest were accidents.
 *
 * ## Using it
 *
 * Prefer `variant` on a `Typography`. Reach for `TYPE_SCALE` when the element
 * is not a `Typography` and a variant would mean wrapping content in one just
 * to get a size. **Do not add a step** without deciding it is genuinely a new
 * tier rather than a nudge of an existing one — the nudges are what this
 * replaces.
 *
 * @deprecated Stays for the blog and the shared MUI variant overrides below,
 * which still key off it. New (non-blog) work should reach for
 * `src/shared/theme/editorialType.ts`'s 1.250 ratio scale instead — see the
 * editorial rebuild plan's "Type" system decision.
 */
export const TYPE_SCALE = {
  /** Mono meta-rail labels. Pairs with `MONO` + uppercase + wide tracking. */
  micro: "0.6875rem",
  /** Small UI text: captions, helper text, dense table cells. */
  caption: "0.75rem",
  /** Secondary body text. */
  body2: "0.875rem",
  /** Default body text. */
  body1: "1rem",
  /** Lead paragraphs and section ledes. */
  subtitle1: "1.125rem",
  /** Small headings. */
  h4: "1.25rem",
  /** Section headings. */
  h3: "1.75rem",
  /** Page headings. */
  h2: "2.5rem",
} as const;

/**
 * Line heights, tied to the scale rather than chosen per call site (16 distinct
 * values were in use). Inverse to size: display type is set tight, body copy
 * open enough to read at a 65ch measure.
 */
export const LINE_HEIGHT = {
  /** Display/headline. */
  tight: 1.15,
  /** Headings and short UI strings. */
  snug: 1.4,
  /** Body copy. */
  relaxed: 1.65,
} as const;

/**
 * Letter spacing. Three intents, replacing the 20+ ad-hoc values:
 * display type is optically tightened, body sits at the font's own metrics,
 * and the mono meta-rail is deliberately opened up.
 */
export const TRACKING = {
  /** Large display type — negative, because big type sets loose optically. */
  display: "-0.03em",
  /** Body and UI. */
  normal: "0",
  /** Uppercase mono labels. */
  meta: "0.16em",
} as const;

