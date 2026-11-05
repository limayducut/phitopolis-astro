import { NOIR } from "./palette";

/**
 * The film-behind-copy hero treatment, shared by home (`HomeOpening`) and
 * the /about hero (its smaller, 70svh sibling — user 2026-09-24: "immersive
 * almost similar to home … almost like a baby version of it").
 */

/** Feathered window onto the film, centred right-of-middle so it never sits
 *  under the headline column. Single stop each → safe to hand `sx` directly
 *  (no `mask-composite`). */
export const HERO_FILM_MASK =
  "radial-gradient(ellipse 62% 78% at 76% 46%, #000 42%, transparent 92%)";

/** Strongest over the text column (left), clear by mid-frame, with a faint
 *  re-darken at the far right so the film never runs to full brightness at
 *  the edge. `navyPanel` (user 2026-09-24: "slightly darker navy" than the
 *  earlier `duskNavy`), still short of the near-black `navyInk`, so it reads
 *  as tinted glass over the film instead of a hard light/dark cutoff.
 *  Deliberately shallow (owner, 2026-10-11): the original ramp's dark-to-clear
 *  swing (0.94 → 0.12) read as too pronounced over the footage; this ramp
 *  keeps the same five stops but halves the swing (0.88 → 0.34), still dark
 *  enough over the text column to carry the heading at AA. */
export const HERO_NAVY_SCRIM = `linear-gradient(90deg,
  rgba(${NOIR.navyPanelRgb}, 0.88) 0%,
  rgba(${NOIR.navyPanelRgb}, 0.76) 26%,
  rgba(${NOIR.navyPanelRgb}, 0.5) 55%,
  rgba(${NOIR.navyPanelRgb}, 0.34) 78%,
  rgba(${NOIR.navyPanelRgb}, 0.38) 100%)`;

/** How strongly the film shows through the scrim. */
export const HERO_FILM_OPACITY = 0.7;

/** Home only (user 2026-09-25): the film runs full-bleed (no mask) under a
 *  medium navy vignette — clear centre, darker edges — plus a soft
 *  bottom-left weight behind the message and a thin top band behind the
 *  navbar and the headline under it. Same navyPanel as the shared scrim. */
export const HOME_HERO_SCRIM = [
  `linear-gradient(180deg, rgba(${NOIR.navyPanelRgb}, 0.8) 0%, rgba(${NOIR.navyPanelRgb}, 0.6) 22%, rgba(${NOIR.navyPanelRgb}, 0.25) 42%, rgba(${NOIR.navyPanelRgb}, 0) 54%)`,
  `linear-gradient(20deg, rgba(${NOIR.navyPanelRgb}, 0.62) 0%, rgba(${NOIR.navyPanelRgb}, 0.34) 34%, rgba(${NOIR.navyPanelRgb}, 0) 62%)`,
  `radial-gradient(ellipse 85% 80% at 50% 45%, rgba(${NOIR.navyPanelRgb}, 0.1) 35%, rgba(${NOIR.navyPanelRgb}, 0.45) 70%, rgba(${NOIR.navyPanelRgb}, 0.78) 100%)`,
].join(", ");
export const HOME_HERO_FILM_OPACITY = 0.9;
