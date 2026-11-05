/**
 * Navbar anchor ids: the sections that trigger the navbar to switch between dark
 * and light modes, and bind `:focus-visible` to a named element on the page.
 *
 * Two separate registries existed before this export: section ids (from
 * sections.ts, used by SectionBeat and beat-reveal) and anchor ids (used by
 * useNavbarAnchor only, tracked by a separate Set). They were independently
 * managed as side effects of the `setActiveSection()` call and the anchor's own
 * `useEffect`, and the fact that they mostly aligned was a convention enforced
 * only by names and comments, not by types.
 *
 * What was NOT on purpose is that both took a bare `string`, so nothing stopped
 * someone passing "daily-life" (a section id) where "daily-life-video" (an
 * anchor id) was meant — silently registering an anchor that never intersects.
 * Anchor ids now live here and useNavbarAnchor only accepts one of them.
 */
export const NAV_ANCHORS = {
  // T-009: live home flow, separate from section ids.
  FLOW_HERO_SEQUENCE: "flow-hero-sequence",
  FLOW_HOME_NARRATION: "flow-home-narration",
  FLOW_HOME_RESEARCH: "flow-home-research",
  FLOW_HOME_DEVELOPMENT: "flow-home-development",
  FLOW_HOME_SUPPORT: "flow-home-support",
  FLOW_CLOSING: "flow-closing",
  /** Home closing: the light (frost) CTA panel. A sentinel at the panel's
   *  horizontal centre, so on desktop the navbar turns light once the panel
   *  has slid half-way over the navy film; stacked on mobile it is an
   *  ordinary light section under the navy picture. */
  FLOW_CLOSING_CTA: "flow-closing-cta",

  /** The daily-life film (inside the navy night-film chapter): registered
   *  `dark: true`, so the navbar goes dark-chrome over it. */
  DAILY_LIFE_VIDEO: "daily-life-video",
  /** The About page's opening (heading, handbook paragraph, film). Frost, `dark: false`. */
  ABOUT_OPENING: "about-opening",
  /** The Blog page's hero section. */
  BLOG_HERO: "blog-hero",
  /** The Home page's closing shelf — light (white) ground, so the navbar must go dark-chrome. */
  HOME_CLOSING: "home-closing",
  /** AppShell's footer, on every route. */
  SITE_FOOTER: "site-footer",
  /** Home page: global footprint / reach section. Light ground — sits directly
   *  between two now-dark sections (process, daily-life), so this anchor is
   *  what corrects the navbar back to light between them. */
  HOME_REACH: "home-reach",
  /** About page: the closing stage (`AboutClose`, T-032 "Follow the Sun"
   *  rebuild) — same navy ground as every other chapter on this page, so the
   *  navbar stays dark-chrome all the way to the footer. */
  ABOUT_CLOSE: "about-close",
  /** About page: the soft frost core (`AboutCore`: Who we are, Tech stack,
   *  Core values, Core competencies). Frost — `dark: false`. */
  ABOUT_CORE: "about-core",
  /** About page: the 2019-2026 timeline (`AboutTimeline`, restored T-044).
   *  Navy (`base`) — `dark: true`. */
  ABOUT_TIMELINE: "about-timeline",
  /** The /careers route. One anchor for the whole page — a single uniform
   *  ground throughout, not a SectionBeat/ground-per-section page. Also the
   *  /careers/$jobId frost body (light), below that page's navy header. */
  CAREERS_PAGE: "careers-page",
  /** The /careers route's dark cinematic video band, above the light register
   *  header — the navbar must go light-chrome over it. Also the
   *  /careers/$jobId navy header. */
  CAREERS_HERO: "careers-hero",
  /** The /blog listing page's content area (sidebar + toolbar + post grid),
   *  below BLOG_HERO. Light ground. */
  BLOG_LISTING: "blog-listing",
  /** The /privacy and /terms routes: one deep navy Block for the whole page,
   *  so the navbar must go dark-chrome over it. */
  LEGAL_PAGE: "legal-page",
  /** The not-found page: one
   *  deep navy Block, dark-chrome navbar. */
  NOT_FOUND_PAGE: "not-found-page",
  /** The /contact route. One anchor for the whole page, light ground throughout. */
  CONTACT_PAGE: "contact-page",
  /** The /contact FAQ: a light reading block under the navy form (owner, 2026-10-14). */
  CONTACT_FAQ: "contact-faq",
  /** Page-wide fallback on a navy page (`staticData.pageGround: "base"`):
   *  covers all of `<main>`, so navy sections without their own anchor keep
   *  dark chrome. See `page/PageGroundAnchor.tsx`. */
  PAGE_NAVY: "page-navy",
  /** Home page: the `BarTransitionSection` wipe blocks. Each is a full opaque
   *  viewport between two grounds — without an anchor the navbar lost all
   *  dark/light state whenever one filled the screen. One id per boundary
   *  (they are never both under the navbar at once, but unique ids avoid a
   *  register/deregister race at the handoff). Registered with the DESTINATION
   *  ground's darkness — see BarTransitionSection. */
  HOME_BRIDGE_MARKETS: "home-bridge-markets",
} as const;

export type NavAnchorId = (typeof NAV_ANCHORS)[keyof typeof NAV_ANCHORS];
