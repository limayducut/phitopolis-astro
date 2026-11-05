import { cubicBezier } from "motion";
import { EASE_IN_OUT_QUART } from "@/shared/motion/easing";
import { phaseProgress } from "./homeFlow";

/**
 * The aperture: a plate opens from a band of photo to its full height as two navy shutters
 * slide apart. Transform only. The band is the stretch of the photo that holds every face
 * (a per-photo value, like its object-position), never the plate's middle, so a shutter's
 * edge is never seen crossing a face.
 */

/**
 * The least share of the plate's height that is open while the arrival's shutters are
 * closed: a wide band, not a slit. Where the faces need more (several rows of people) the
 * band is taller; `closedBand` never lets it be shorter than the faces plus their margin.
 */
export const ARRIVAL_BAND = 0.37;

/**
 * The room kept above the highest forehead and below the lowest chin, as a share of the
 * plate's height, so a face is never grazed by the band's edge.
 */
export const FACES_MARGIN = 0.02;

/** The photo's own scale at the start of the arrival (it settles to 1, about the plate's centre). */
export const ARRIVAL_PHOTO_SCALE = 1.08;

export const SHUTTER_TOP_CLASS = "home-aperture-top";
export const SHUTTER_BOTTOM_CLASS = "home-aperture-bottom";

/** The chapter arrival's share by which its shutters are fully apart. */
export const ARRIVAL_APERTURE_END = 0.85;

/** The shutters always get at least this share of the arrival to move in. */
const ARRIVAL_APERTURE_MIN_SPAN = 0.1;

/**
 * The curve the intro opened with: the preloader's bar flip and the P-window dive are
 * both quart in-out (`EASE_IN_OUT_QUART`), so the page reopens the way the intro did.
 */
export const APERTURE_EASE: (progress: number) => number = cubicBezier(...EASE_IN_OUT_QUART);

/** Where a photo's faces sit, as fractions that are set per photo, like its object-position. */
export interface PlateFocus {
  /** The highest forehead, as a share of the image's own height (0 top, 1 bottom). */
  facesTop: number;
  /** The lowest chin, on the same scale. */
  facesBottom: number;
  /**
   * The photo's preferred vertical `object-position` as a share (0 shows the top, 1 the
   * bottom): the resting CSS crop, which the desktop arrival refits on refresh (`fitPositionY`).
   */
  positionY: number;
}

/** A plate's measured box and its photo's intrinsic size, in px. */
export interface PlateLayout {
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hasLayout = ({ width, height, imageWidth, imageHeight }: PlateLayout) =>
  width > 0 && height > 0 && imageWidth > 0 && imageHeight > 0;

/** The photo's height after `object-fit: cover` scales it to fill the plate. */
const coverHeight = ({ width, height, imageWidth, imageHeight }: PlateLayout) =>
  imageHeight * Math.max(width / imageWidth, height / imageHeight);

/** A line of the photo as a share of the plate's height, with the photo at rest (scale 1). */
function coverLineShare(layout: PlateLayout, imageY: number, positionY: number): number {
  if (!hasLayout(layout)) return 0.5;
  const scaledHeight = coverHeight(layout);
  const y = imageY * scaledHeight - (scaledHeight - layout.height) * positionY;
  return clamp(y / layout.height, 0, 1);
}

/**
 * The vertical `object-position` that keeps the faces' stretch on the plate and clear of its
 * top `topClearPx` (the strip the floating navbar covers when it reappears on scroll-up),
 * as near to `focus.positionY` as that allows. Of the positions that keep the highest
 * forehead below the strip and the lowest chin above the plate's bottom edge, it takes the
 * one nearest the preferred crop; when the plate is too short for both it splits the
 * shortfall evenly between the two edges. A photo with no vertical overflow, or no layout,
 * keeps the preferred crop.
 */
export function fitPositionY(layout: PlateLayout, focus: PlateFocus, topClearPx: number): number {
  if (!hasLayout(layout)) return focus.positionY;
  const scaledHeight = coverHeight(layout);
  const overflow = scaledHeight - layout.height;
  if (!(overflow > 0)) return focus.positionY;
  // A line at `share` of the photo sits at `share * scaledHeight - overflow * position` px.
  const highest = (focus.facesTop * scaledHeight - topClearPx) / overflow;
  const lowest = (focus.facesBottom * scaledHeight - layout.height) / overflow;
  const wanted =
    lowest <= highest ? clamp(focus.positionY, lowest, highest) : (lowest + highest) / 2;
  return clamp(wanted, 0, 1);
}

/** The stretch of the plate that holds every face, as shares of the plate's height (0 top, 1 bottom). */
export interface FacesShares {
  top: number;
  bottom: number;
}

/**
 * Where the faces' stretch lands in the plate. `object-fit: cover` scales the image to fill
 * the plate and `object-position` decides which part of the overflow is cropped, so a line
 * lands at `y * scaledHeight - (scaledHeight - plateHeight) * positionY`. Held inside the
 * plate (a forehead cropped off the top is the plate's top edge); the plate's middle when
 * there is no layout to measure.
 */
export function facesShares(layout: PlateLayout, focus: PlateFocus): FacesShares {
  return {
    top: coverLineShare(layout, focus.facesTop, focus.positionY),
    bottom: coverLineShare(layout, focus.facesBottom, focus.positionY),
  };
}

/** The photo's scale at arrival `progress`: `ARRIVAL_PHOTO_SCALE` settling linearly to 1. */
export function photoScaleAt(progress: number): number {
  return ARRIVAL_PHOTO_SCALE + (1 - ARRIVAL_PHOTO_SCALE) * clamp(progress, 0, 1);
}

/**
 * The closed band's edges at arrival `progress`, as shares of the plate's height. The photo
 * is scaled about the plate's centre, so a point `d` from the centre at rest sits `d * scale`
 * from it; the band follows the faces' stretch through that settle. It holds the whole
 * stretch plus `FACES_MARGIN` above and below (kept on the plate), is at least `ARRIVAL_BAND`
 * tall, and is centred on the stretch, shifted back onto the plate where that pushes it
 * past an edge.
 */
export function closedBand(faces: FacesShares, progress: number): { top: number; bottom: number } {
  const scale = photoScaleAt(progress);
  const at = (share: number) => 0.5 + (share - 0.5) * scale;
  const low = clamp(at(faces.top) - FACES_MARGIN, 0, 1);
  const high = clamp(at(faces.bottom) + FACES_MARGIN, 0, 1);
  const height = Math.max(ARRIVAL_BAND, high - low);
  const top = clamp((low + high - height) / 2, 0, 1 - height);
  return { top, bottom: top + height };
}

/**
 * Where in the arrival the shutters start to move: the progress at which the closed band's
 * top edge crosses the bottom of the viewport (before that there is no photo on screen to
 * open). `bandTopPx` is that edge's distance below the top of the arrival's trigger;
 * `distancePx` is the scroll the arrival spans. A zero measurement (no layout) means "from
 * the start"; the shutters always keep a span to move in.
 */
export function apertureStart(bandTopPx: number, distancePx: number): number {
  if (!(bandTopPx > 0) || !(distancePx > 0)) return 0;
  return Math.min(bandTopPx / distancePx, ARRIVAL_APERTURE_END - ARRIVAL_APERTURE_MIN_SPAN);
}

/**
 * The shutters' `yPercent` at arrival `progress`, for full-height shutters (each as tall as
 * the plate, so one percent is one percent of the plate). Closed, the top shutter has moved
 * down to the band's top edge and the bottom one up to its bottom edge; they open on the
 * intro's curve from `start` and rest outside the plate from `ARRIVAL_APERTURE_END`. Both
 * edges only move away from the band, so the open photo always contains the closed one.
 */
export function shutterPercents(
  progress: number,
  start: number,
  faces: FacesShares,
): { top: number; bottom: number } {
  if (progress >= ARRIVAL_APERTURE_END) return { top: 0, bottom: 0 };
  const open = APERTURE_EASE(phaseProgress(progress, start, ARRIVAL_APERTURE_END));
  const band = closedBand(faces, progress);
  const topEdge = band.top * (1 - open);
  const bottomEdge = band.bottom + (1 - band.bottom) * open;
  // `+ 0` turns a negative zero into a plain 0.
  return { top: 100 * topEdge + 0, bottom: -100 * (1 - bottomEdge) + 0 };
}

/**
 * Hints the compositor only while `property` can move: a gate the caller drives (on while an
 * animation is running, off once it has landed or is still ahead). `release` clears it for
 * good (the matchMedia branch reverting).
 */
export function createMotionHint(
  elements: readonly HTMLElement[],
  property: "transform" | "opacity" = "transform",
): {
  set: (active: boolean) => void;
  release: () => void;
} {
  let active = false;
  const apply = (next: boolean) => {
    active = next;
    for (const element of elements) {
      if (next) element.style.willChange = property;
      else element.style.removeProperty("will-change");
    }
  };
  return {
    set: (next) => {
      if (next !== active) apply(next);
    },
    release: () => {
      apply(false);
    },
  };
}
