import { TEAM_CARDS } from "../pipelineCopy";
import { GLOBE_SVG, viewVector, type LonLat } from "@/features/home/rebuild/globe/globeData";
import { frontStartAngle, orbitHalfPoints, type OrbitPoint } from "./orbitGeometry";
import { CHIP_H, STAGE_PAD, chipWidth, type Point, type Rect } from "./visualKit";

export const SUPPORT_TEAM = TEAM_CARDS.find((team) => team.chapter === "support")!;
/** Ring nodes carry the first three chips (AWS, GCP, Azure). */
export const NODE_LABELS = SUPPORT_TEAM.chips.slice(0, 3);

/** One ring, not two. A pair of crossing orbits read as clutter rather than
 *  as a path round the world (owner, 2026-10-12). */
export const ORBIT_PLANES = [{ x: 0.95, y: 0.16 }] as const;

/**
 * The Support globe's view centre: the North Atlantic, so North America and
 * the British Isles both sit well inside the disc. It used to be lon 0 / lat 0
 * — the Gulf of Guinea — which put Africa and open ocean under the pins
 * (owner, 2026-10-12).
 */
export const SUPPORT_VIEW: LonLat = { lon: -45, lat: 40 };

/**
 * Where the three nodes sit, as real coordinates **on land**. They used to be
 * parked at fixed positions along the decorative orbit rings, which had
 * nothing to do with the map underneath, so they landed in the sea. Each one
 * is now projected from its lon/lat like any point on the globe.
 *
 * `tests/pipeline-visual-layout.test.ts` checks each against the globe's own
 * land-dot matrix, so a site that drifts into water fails the suite.
 */
const NODE_SITES: readonly LonLat[] = [
  { lon: -120.5, lat: 45.5 },
  { lon: -77.5, lat: 38.9 },
  { lon: -0.5, lat: 51.5 },
];
const RING_RADIUS = 1.04;
/** Nodes sit on the surface itself, not out on the rings. */
const NODE_RADIUS = 1;
const DIAL_RADIUS = 1.1;
const LABEL_RADIUS = 1.22;
/** The stack list's inset from the stage's top-left corner. */
const STACK_INSET = 10;
const STACK_PITCH = CHIP_H + 8;

export interface RingGeometry {
  tiltX: number;
  tiltY: number;
  /** Half-ring polylines in stage px (front: z >= 0). */
  front: Point[];
  back: Point[];
  frontD: string;
  backD: string;
}
export interface SupportNode {
  label: string;
  /** The node on its ring, in stage px; `z` > 0 is the front half. */
  point: Point;
  z: number;
  unit: OrbitPoint;
  ring: number;
  anchor: Point;
}
export interface StackItem {
  text: string;
  rect: Rect;
}
export interface SupportLayout {
  w: number;
  h: number;
  compact: boolean;
  cx: number;
  cy: number;
  R: number;
  dialR: number;
  /** The GlobeStatic box: its disc has radius R. */
  globeBox: Rect;
  rings: RingGeometry[];
  nodes: SupportNode[];
  /** The platform names, listed at the stage's top-left rather than pinned to
   *  the map: naming the regions themselves said more than the site means. */
  stack: StackItem[];
  zones: { name: string; rect: Rect }[];
}

const toD = (pts: readonly Point[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("");

export function supportLayout(w: number, h: number, compact = false): SupportLayout {
  const R = Math.max(40, Math.min(0.4 * w, 0.3 * h, (0.5 * w - 12) / DIAL_RADIUS));
  const cx = w / 2;
  const cy = compact ? h / 2 : 0.47 * h;
  const ringR = R * RING_RADIUS;
  const globeSide = (2 * R * GLOBE_SVG.view) / GLOBE_SVG.r;
  const globeBox: Rect = {
    x: cx - globeSide / 2,
    y: cy - globeSide / 2,
    w: globeSide,
    h: globeSide,
  };

  const rings: RingGeometry[] = ORBIT_PLANES.map((plane) => {
    const start = frontStartAngle(plane.x, plane.y);
    const place = (from: number) =>
      orbitHalfPoints(plane.x, plane.y, from, ringR).map((p) => ({ x: cx + p.x, y: cy + p.y }));
    const front = place(start);
    const back = place(start + Math.PI);
    return { tiltX: plane.x, tiltY: plane.y, front, back, frontD: toD(front), backD: toD(back) };
  });

  const nodeR = R * NODE_RADIUS;
  const nodes: SupportNode[] = NODE_SITES.map((site, i) => {
    const v = viewVector(site.lon, site.lat, SUPPORT_VIEW.lon, SUPPORT_VIEW.lat);
    // `viewVector` is +y up; the stage draws +y down.
    const p = { x: v.x, y: -v.y, z: v.z };
    const point = { x: cx + p.x * nodeR, y: cy + p.y * nodeR };
    const len = Math.hypot(p.x, p.y) || 1;
    const dir = { x: p.x / len, y: p.y / len };
    const anchor = { x: cx + dir.x * R * LABEL_RADIUS, y: cy + dir.y * R * LABEL_RADIUS };
    const label = NODE_LABELS[i]!;
    return { label, point, z: p.z, unit: p, ring: 0, anchor };
  });

  /* The platforms, listed at the stage's top-left: they say what the sites run
     on without the map claiming each region is one of them. */
  const stack: StackItem[] = NODE_LABELS.map((text, i) => ({
    text,
    rect: {
      x: w * STAGE_PAD + STACK_INSET,
      y: h * STAGE_PAD + STACK_INSET + i * STACK_PITCH,
      w: chipWidth(text),
      h: CHIP_H,
    },
  }));

  const zones = stack.map((item) => ({ name: `stack-${item.text}`, rect: item.rect }));

  return {
    w,
    h,
    compact,
    cx,
    cy,
    R,
    dialR: R * DIAL_RADIUS,
    globeBox,
    rings,
    nodes,
    stack,
    zones,
  };
}
