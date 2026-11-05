import { NOIR } from "@/shared/theme/palette";

export const homeInset = { px: { xs: 3, sm: 5, md: 8 }, py: { xs: 8, md: 12 } };

/** x of the process band's gold gutter thread, in px from the page edge.
 *  Inside the page's left inset (24 / 40 / 64px): at 40px on desktop the
 *  14px node rings span 33-47px, 17px clear of the panel copy's 64px inset,
 *  and the line sits well off the viewport edge. */
export const GUTTER_LINE_X = { xs: 12, sm: 20, md: 40 } as const;
/** Width of the drawn gutter line (and its faint track), px. */
export const THREAD_LINE_PX = 2;
/** The thread's bright tip rides the drawing gutter line. */
export const THREAD_TIP_PX = 10;
export const THREAD_TIP_SX = {
  width: THREAD_TIP_PX,
  height: THREAD_TIP_PX,
  borderRadius: "50%",
  bgcolor: NOIR.gold,
  boxShadow: `0 0 0 3px ${NOIR.gold}33, 0 0 14px 4px ${NOIR.gold}73`,
} as const;
/** The faint full-length track under the gutter line: gold at ~20% alpha. */
export const THREAD_TRACK_COLOR = `${NOIR.gold}33`;
