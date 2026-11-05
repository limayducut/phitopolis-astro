// Hero film asset constants from useBackgroundVideo.ts (HERO_OPENING_FILM,
// HERO_PHONE_QUERY), split out so the eager entrance code needs no video logic.

export const HERO_OPENING_FILM_ASSETS = {
  mp4: "/videos/hero-opening.mp4",
  poster: "/videos/hero-opening-poster.jpg",
  startAt: 5.75,
  phoneStill: "/images/AboutPage1.webp",
} as const;

export const HERO_PHONE_QUERY = "(max-width: 767.95px)";
