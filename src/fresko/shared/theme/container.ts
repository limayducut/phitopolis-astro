/**
 * Shared "inner page" container width, matching /about's Principles section
 * (`PrinciplesValuesShowcase.tsx`: `<Container maxWidth="xl" sx={{ px: { xs: 3, md: 8 } }}>`).
 *
 * Named container token per the note in `src/shared/theme/theme.ts` (~:106):
 * "If a genuinely wider container is ever needed, add a named container
 * token rather than a breakpoint." Inner pages previously used
 * `maxWidth="lg"` (1200 - 24px padding, ~1152px at desktop), which read
 * noticeably narrower than /about's ~1408px. Use this token instead of a
 * raw `maxWidth="lg"`/`"xl"` literal on any inner-page `Container`.
 */
export const PAGE_CONTAINER = {
  maxWidth: "xl",
  px: { xs: 3, md: 8 },
} as const;

/** The home page's horizontal inset (`homeInset.px` in
 *  features/home/rebuild/homeLayout.ts): home sections run full-bleed, so on
 *  "/" the navbar's logo row uses this instead of PAGE_CONTAINER. Restated
 *  here so the eager navbar does not import the home feature;
 *  tests/site-navbar-home-inset.test.tsx keeps the two equal. */
export const HOME_NAV_PX = { xs: 3, sm: 5, md: 8 } as const;

/** The navbar's height once it floats (scrolled away from the top), in px. The home chapter
 *  openers keep their faces clear of this strip, which the bar covers when it reappears on
 *  scroll-up. */
export const NAVBAR_FLOATING_HEIGHT_PX = 56;
