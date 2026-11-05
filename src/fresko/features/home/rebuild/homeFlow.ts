/** Home sections whose motion follows the page's shared scroll position. */
export const HOME_FLOW_IDS = [
  "hero-sequence",
  "home-narration",
  "home-research",
  "home-development",
  "home-support",
  "closing",
] as const;

export type HomeFlowId = (typeof HOME_FLOW_IDS)[number];

/** Home hero hold, svh: the static box whose sticky plate sticks across it (HomeOpening). */
export const HOME_HERO_HOLD_SVH = 200;
/** The narration is pulled up over the hero's last viewport, svh (HomeOpening's negative bottom margin). */
export const HOME_HERO_OVERLAP_SVH = 100;

export const HOME_MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
/**
 * Gate for Home's scroll-driven motion (pins, scrubs, word light, thread draw,
 * plate arrival). Owner, 2026-10-13: "dismiss the minimal motion and go on full
 * immersive storytelling", so desktop with motion allowed runs it all; phones and
 * reduced motion keep the calm, lit, in-flow layout. The closing has its own query.
 */
export const HOME_DESKTOP_QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
/** CSS twin of HOME_DESKTOP_QUERY; desktop-only progress states use this. */
export const HOME_DESKTOP_MQ = `@media ${HOME_DESKTOP_QUERY}`;

export const HOME_PHASES = {
  closing: { screens: 3, holdScreens: 1, videoEnd: 0.75 },
} as const;

export const CLOSING_MEDIA = {
  video: "/videos/we-build-the-future-delivery.mp4",
  poster: "/videos/we-build-the-future-poster.jpg",
} as const;

export function phaseProgress(progress: number, start: number, end: number): number {
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

export function closingProgress(progress: number) {
  return {
    video: phaseProgress(progress, 0, HOME_PHASES.closing.videoEnd),
    cta: phaseProgress(progress, HOME_PHASES.closing.videoEnd, 1),
  };
}
