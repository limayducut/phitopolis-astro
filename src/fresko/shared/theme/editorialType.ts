/**
 * The editorial type scale — for every rebuilt page (everything except home
 * and blog). A 1.250 ratio from a 1rem base, per the approved plan
 * (`so-there-are-existing-synchronous-tome.md`, "System decisions" → Type).
 *
 * `TYPE_SCALE` in `./theme.ts` is NOT this scale: it stays as-is for the blog
 * and any other legacy surface and is marked `@deprecated` for new work
 * there. Nothing here replaces it; this is a parallel scale scoped to the
 * editorial kit (`src/shared/components/editorial/`) and the pages it
 * rebuilds.
 */

// Ported: MUI sx types replaced by a plain style-object type.
type SxProps<_T = unknown> = Record<string, unknown>;
type Theme = unknown;
import { DISPLAY_FONT, BODY_FONT, MONO } from "./theme";
import { NOIR } from "./palette";

/** The 1.250 (major third) scale, from a 1rem base. */
export const EDITORIAL_TYPE = {
  small: "0.8rem",
  body: "1rem",
  lead: "1.25rem",
  h4: "1.5625rem",
  h3: "1.953rem",
  h2: "2.441rem",
  h1: "3.052rem",
  /** Fluid, for the page-opening display headline only. */
  display: "clamp(2.441rem, 5vw, 3.815rem)",
} as const;

export const EDITORIAL_LINE_HEIGHT = {
  body: 1.6,
  heading: 1.3,
  display: 1.1,
} as const;

/** Optical tracking corrections. `heading` applies at `h3` (1.953rem) and up. */
export const EDITORIAL_TRACKING = {
  heading: "-0.02em",
  eyebrow: "0.06em",
} as const;

export const editorialDisplay: SxProps<Theme> = {
  fontFamily: DISPLAY_FONT,
  fontSize: EDITORIAL_TYPE.display,
  lineHeight: EDITORIAL_LINE_HEIGHT.display,
  letterSpacing: EDITORIAL_TRACKING.heading,
  fontWeight: 600,
};

export const editorialH2: SxProps<Theme> = {
  fontFamily: DISPLAY_FONT,
  fontSize: EDITORIAL_TYPE.h2,
  lineHeight: EDITORIAL_LINE_HEIGHT.heading,
  letterSpacing: EDITORIAL_TRACKING.heading,
  fontWeight: 600,
};

export const editorialH3: SxProps<Theme> = {
  fontFamily: DISPLAY_FONT,
  fontSize: EDITORIAL_TYPE.h3,
  lineHeight: EDITORIAL_LINE_HEIGHT.heading,
  letterSpacing: EDITORIAL_TRACKING.heading,
  fontWeight: 600,
};

export const editorialLead: SxProps<Theme> = {
  fontFamily: BODY_FONT,
  fontSize: EDITORIAL_TYPE.lead,
  lineHeight: EDITORIAL_LINE_HEIGHT.body,
  fontWeight: 400,
};

export const editorialBody: SxProps<Theme> = {
  fontFamily: BODY_FONT,
  fontSize: EDITORIAL_TYPE.body,
  lineHeight: EDITORIAL_LINE_HEIGHT.body,
  fontWeight: 400,
};

/** Outfit, uppercase, +0.06em — the one eyebrow per page. */
export const editorialEyebrow: SxProps<Theme> = {
  fontFamily: DISPLAY_FONT,
  fontSize: EDITORIAL_TYPE.small,
  lineHeight: EDITORIAL_LINE_HEIGHT.heading,
  letterSpacing: EDITORIAL_TRACKING.eyebrow,
  textTransform: "uppercase",
  fontWeight: 600,
};

/**
 * The inner-page hero voice, promoted from `features/about/editorial/aboutTokens.ts`
 * (`ABOUT_TYPE.display` / `lead` / `eyebrow`) so the shared `InnerHero` and
 * `MetaLabel` can use it without a shared → feature import. `ABOUT_TYPE`
 * re-exports these same objects, so /about's values did not change.
 */
export const EDITORIAL_HERO_TYPE = {
  display: {
    fontFamily: DISPLAY_FONT,
    fontSize: "clamp(2.75rem, 6vw, 5.5rem)",
    lineHeight: 1.02,
    letterSpacing: "-0.035em",
    fontWeight: 600,
    textWrap: "balance",
  },
  lead: {
    fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)",
    lineHeight: 1.6,
    maxWidth: "60ch",
    fontWeight: 400,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: "0.75rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontWeight: 600,
  },
} as const satisfies Record<string, SxProps<Theme>>;

const rgba = (triplet: string, alpha: number) => `rgba(${triplet}, ${alpha})`;

/** Text-ink roles by ground, promoted from `ABOUT_INK` (same values; it now
 *  re-exports this object). */
export const EDITORIAL_INK = {
  light: {
    // User 2026-09-24: no near-black text; navyField is the light-ground
    // text token (glass.css --text-1).
    primary: NOIR.navyField,
    secondary: rgba(NOIR.navyFieldRgb, 0.8),
    tertiary: rgba(NOIR.navyFieldRgb, 0.64),
  },
  dark: {
    primary: NOIR.white,
    secondary: rgba(NOIR.whiteRgb, 0.78),
    tertiary: rgba(NOIR.whiteRgb, 0.56),
  },
} as const;
