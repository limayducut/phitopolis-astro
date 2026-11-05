// PWindowDive.tsx, ported to the DOM.
//
// A full-viewport SVG: one even-odd path — a viewport rect with the mark cut
// out of it, baked into px at the logo's box — filled with the intro's own
// radial navy ground (same stops and geometry as the CSS radial-gradient it
// replaces on the swap frame, so the swap is invisible except for the hole).
// The group is scaled around DIVE_ORIGIN geometrically (`scale = S^p`) with
// the site's curtain curve. A CSS transform on an SVG <g> re-rasterises the
// vector each frame, so the window edge stays sharp (no will-change, on purpose).

import { animate, cubicBezier } from "motion";

import { EASE_IN_OUT_QUART } from "@/shared/motion/easing";
import { NOIR } from "@/shared/theme/palette";
import { buildDivePathD, diveGeometry, type Rect } from "../intro/diveGeometry";

const DIVE_EASE = EASE_IN_OUT_QUART;
const SVG_NS = "http://www.w3.org/2000/svg";

export interface DiveController {
  /** Change the duration the zoom will run at (a skip during the fade shortens it). */
  setDuration(durationS: number): void;
  /** Run the zoom (the mark has faded). */
  go(): void;
  /** Stop any running zoom. */
  stop(): void;
}

/**
 * Mounts the dive as the overlay's first child, held at rest (scale 1) under
 * the fading mark. `go()` runs the zoom; `onDone` fires when it lands.
 * `frozenProgress` (DEV `?intro=` only) holds it at that progress.
 */
export function mountPWindowDive(
  root: HTMLElement,
  rect: Rect,
  initialDurationS: number,
  onDone: () => void,
  frozenProgress?: number,
): DiveController {
  // The layout viewport (excludes a classic scrollbar) — what the fixed overlay covers.
  const de = document.documentElement;
  const vw = de.clientWidth || window.innerWidth;
  const vh = de.clientHeight || window.innerHeight;
  const geo = { vw, vh, d: buildDivePathD(rect, vw, vh), ...diveGeometry(rect, vw, vh) };

  // CSS `ellipse at 50% 42%` (farthest-corner): radii are √2 x the farthest sides.
  const cx = geo.vw * 0.5;
  const cy = geo.vh * 0.42;
  const rx = Math.SQRT2 * Math.max(cx, geo.vw - cx);
  const ry = Math.SQRT2 * Math.max(cy, geo.vh - cy);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", `0 0 ${geo.vw} ${geo.vh}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("data-intro-dive", "");
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    display: "block",
    overflow: "visible",
    maxWidth: "none",
  });
  svg.innerHTML =
    `<defs><radialGradient id="phit-intro-ground" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" ` +
    `gradientTransform="translate(${cx} ${cy}) scale(${rx} ${ry})">` +
    `<stop offset="0" stop-color="${NOIR.navyDeep}"></stop>` +
    `<stop offset="0.78" stop-color="${NOIR.navyInk}"></stop>` +
    `<stop offset="1" stop-color="${NOIR.navyInk}"></stop>` +
    `</radialGradient></defs>`;
  const g = document.createElementNS(SVG_NS, "g");
  g.style.transformBox = "view-box";
  g.style.transformOrigin = `${geo.ox}px ${geo.oy}px`;
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", geo.d);
  path.setAttribute("fill", "url(#phit-intro-ground)");
  path.setAttribute("fill-rule", "evenodd");
  g.appendChild(path);
  svg.appendChild(g);
  root.insertBefore(svg, root.firstChild);

  const logS = Math.log(Math.max(geo.scale, 1));
  let durationS = initialDurationS;
  let controls: { stop: () => void } | null = null;

  if (frozenProgress !== undefined) {
    const p = cubicBezier(...DIVE_EASE)(Math.min(1, Math.max(0, frozenProgress)));
    g.style.transform = `scale(${Math.exp(logS * p)})`;
  } else {
    // Held: the hole sits at rest under the mark while it fades.
    g.style.transform = "scale(1)";
  }

  return {
    setDuration(next) {
      durationS = next;
    },
    go() {
      if (controls || frozenProgress !== undefined) return;
      g.style.transform = "scale(1)";
      const run = animate(0, 1, {
        duration: durationS,
        ease: DIVE_EASE,
        onUpdate: (p: number) => {
          g.style.transform = `scale(${Math.exp(logS * p)})`;
        },
      });
      controls = run;
      void run.then(() => onDone());
    },
    stop() {
      controls?.stop();
    },
  };
}
