/**
 * Home's type roles on one scale (T-043). The hero keeps the site's display
 * size (DESIGN.md "Display") and stays the largest line at every width; the
 * other display lines step down to the inner-page h1 size, and running lines
 * sit on the 1.250 editorial steps. Type switches at the same 768px width as
 * the home choreography (`HOME_DESKTOP_QUERY`), not at MUI `md` (900px), so
 * type and motion change together.
 */

import { DISPLAY_FONT } from "@/shared/theme/theme";
import { EDITORIAL_TYPE } from "@/shared/theme/editorialType";

/** Width-only twin of `HOME_DESKTOP_QUERY` for type and layout. */
export const HOME_WIDE_MQ = "@media (min-width: 768px)";

type Role = {
  xs: string;
  wide: string;
  weight: number;
  lineHeight: number;
  tracking: string;
};

const { lead, h4, h3, h2, h1, body } = EDITORIAL_TYPE;

export const HOME_TYPE = {
  /** Hero h1 only. */
  display: {
    xs: "clamp(2.5rem, 10.5vw, 3.5rem)",
    wide: "clamp(3rem, 5.4vw, 6rem)",
    weight: 700,
    lineHeight: 1.02,
    tracking: "-0.03em",
  },
  /** Chapter titles, the team statement and the closing line. */
  displayInner: {
    xs: "2.25rem",
    wide: "clamp(2.25rem, 4vw, 3.75rem)",
    weight: 600,
    lineHeight: 1.02,
    tracking: "-0.035em",
  },
  /** The Vision line. */
  statement: {
    xs: h3,
    wide: `clamp(${h3}, 3.6vw, ${h1})`,
    weight: 400,
    lineHeight: 1.15,
    tracking: "-0.025em",
  },
  /** Chapter beat lines. */
  beat: {
    xs: lead,
    wide: `clamp(${h4}, 2.7vw, ${h2})`,
    weight: 500,
    lineHeight: 1.16,
    tracking: "-0.025em",
  },
  /** Chapter decks under the titles. */
  deck: {
    xs: lead,
    wide: `clamp(${lead}, 2.25vw, ${h4})`,
    weight: 500,
    lineHeight: 1.2,
    tracking: "-0.02em",
  },
  /** Small section labels ("Our vision"). Same words and case as the source. */
  label: {
    xs: body,
    wide: body,
    weight: 600,
    lineHeight: 1.3,
    tracking: "0.02em",
  },
} as const satisfies Record<string, Role>;

export type HomeTypeRole = keyof typeof HOME_TYPE;

/** Font family, size (with the 768px switch), weight, leading and tracking for a role.
 *  A plain object (not `SxProps<Theme>`) so call sites can spread it into their own sx. */
export function homeTypeSx(role: HomeTypeRole) {
  const r = HOME_TYPE[role];
  return {
    fontFamily: DISPLAY_FONT,
    fontSize: r.xs,
    fontWeight: r.weight,
    lineHeight: r.lineHeight,
    letterSpacing: r.tracking,
    [HOME_WIDE_MQ]: { fontSize: r.wide },
  };
}
