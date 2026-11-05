/**
 * Where the intro's four dots start and land. Pure math, no DOM or React.
 *
 * The dots land on the P's four OUTER WHITE TERMINALS — the round ends of its
 * strokes — and then grow to exactly their size, so they read as the P's own
 * ends. The mark is auto-traced vector data with no circle primitives, so the
 * terminals' centres and radius are FITTED (a circle through each end's
 * edge); `tests/motion/dive-geometry.test.ts` re-checks the fit against the
 * flattened outlines.
 *
 * Each dot leaves one viewport corner and lands on the terminal that keeps
 * the four paths from crossing: TL -> top-left, TR -> upper-right,
 * BR -> lower-right, BL -> bottom-left.
 */

import { DOT_ARC_BEND } from "../preloaderChoreo";
import { MARK_VIEWBOX, getMarkPolygons, markToPx, type Rect } from "./diveGeometry";

/**
 * The terminals' fitted centres, in mark (viewBox "533 51 1768 1911") units,
 * in corner order: TL, TR, BR, BL.
 */
export const TERMINALS = [
  { x: 690.0, y: 207.2 }, // top-left
  { x: 2146.4, y: 673.0 }, // upper-right
  { x: 2146.3, y: 1001.7 }, // lower-right
  { x: 688.6, y: 1800.9 }, // bottom-left
] as const;

/** The terminals' fitted radius, in mark units. */
export const TERMINAL_R = 126.5;

/** The viewport corner each dot leaves, as fractions of the viewport: TL, TR, BR, BL. */
export const DOT_CORNERS = [
  { fx: 0, fy: 0 },
  { fx: 1, fy: 0 },
  { fx: 1, fy: 1 },
  { fx: 0, fy: 1 },
] as const;

/** A dot starts this far in from its corner, so the whole dot shows (the overlay clips at the viewport edge). */
export const DOT_CORNER_INSET_PX = 28;

/** The dots' resting radius range, px (before they grow to the terminal's size). */
const DOT_REST_MIN_PX = 4;
const DOT_REST_MAX_PX = 7;

type Point = { x: number; y: number };

/** A terminal as a fraction of the mark's box (the box has the mark's own aspect). */
export function terminalFraction(i: number): { fx: number; fy: number } {
  const a = TERMINALS[i]!;
  return {
    fx: (a.x - MARK_VIEWBOX.x) / MARK_VIEWBOX.w,
    fy: (a.y - MARK_VIEWBOX.y) / MARK_VIEWBOX.h,
  };
}

/** Terminal `i`'s centre in CSS px for a mark box at `rect`. */
export function terminalPx(i: number, rect: Rect): Point {
  const { k, ox, oy } = markToPx(rect);
  const a = TERMINALS[i]!;
  return { x: ox + a.x * k, y: oy + a.y * k };
}

/** The terminals' radius in CSS px for a mark box at `rect`. */
export function terminalRadiusPx(rect: Rect): number {
  return TERMINAL_R * markToPx(rect).k;
}

/** A dot's resting radius, px: a calm fraction of the terminal's, clamped to a readable range. */
export function dotRestRadiusPx(rect: Rect): number {
  return Math.min(DOT_REST_MAX_PX, Math.max(DOT_REST_MIN_PX, 0.3 * terminalRadiusPx(rect)));
}

/** Where dot `i` appears: its viewport corner, inset, in CSS px. */
export function dotCornerPx(i: number, vw: number, vh: number): Point {
  const c = DOT_CORNERS[i]!;
  const inset = Math.min(DOT_CORNER_INSET_PX, vw / 4, vh / 4);
  return { x: c.fx === 0 ? inset : vw - inset, y: c.fy === 0 ? inset : vh - inset };
}

/**
 * Dot `i`'s start offset in px from its landing spot (the terminal's centre):
 * its corner minus the terminal, for a mark box at `rect` in a `vw` x `vh` viewport.
 */
export function dotStartOffset(i: number, rect: Rect, vw: number, vh: number): Point {
  const corner = dotCornerPx(i, vw, vh);
  const t = terminalPx(i, rect);
  return { x: corner.x - t.x, y: corner.y - t.y };
}

/**
 * Dot `i`'s offset from its landing spot at path progress `u` (0 = at its
 * corner, 1 = landed): a quadratic curve whose control point is the midpoint
 * pushed `DOT_ARC_BEND` x the path's length sideways, to whichever side faces
 * away from the viewport centre — a slight arc that swoops in from outside
 * rather than a straight dash. `u` is the EASED progress.
 */
export function dotOffsetAt(i: number, u: number, rect: Rect, vw: number, vh: number): Point {
  const s = dotStartOffset(i, rect, vw, vh);
  const len = Math.hypot(s.x, s.y) || 1;
  const t = terminalPx(i, rect);
  // Perpendicular to the path, flipped to face away from the viewport centre.
  let nx = -s.y / len;
  let ny = s.x / len;
  const mx = s.x / 2;
  const my = s.y / 2;
  const cx = vw / 2 - t.x;
  const cy = vh / 2 - t.y;
  if (nx * (mx - cx) + ny * (my - cy) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const bend = DOT_ARC_BEND * len;
  const px = mx + nx * bend;
  const py = my + ny * bend;
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  return { x: a * s.x + b * px, y: a * s.y + b * py };
}

/** The gold accent's bounding-box centre as a fraction of the mark's box — the origin of its settle. */
export function accentCentreFraction(): { fx: number; fy: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const poly of getMarkPolygons()) {
    if (!poly.accent) continue;
    for (let i = 0; i < poly.pts.length; i += 2) {
      x0 = Math.min(x0, poly.pts[i]!);
      x1 = Math.max(x1, poly.pts[i]!);
      y0 = Math.min(y0, poly.pts[i + 1]!);
      y1 = Math.max(y1, poly.pts[i + 1]!);
    }
  }
  return {
    fx: ((x0 + x1) / 2 - MARK_VIEWBOX.x) / MARK_VIEWBOX.w,
    fy: ((y0 + y1) / 2 - MARK_VIEWBOX.y) / MARK_VIEWBOX.h,
  };
}
