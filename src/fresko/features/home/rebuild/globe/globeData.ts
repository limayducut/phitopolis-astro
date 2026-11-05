import { WORLD_DOTS_PATH, WORLD_MAP } from "@/shared/components/worldMap";

/**
 * Land dots for the home globe act, derived once at module load from the
 * ReachMap's baked equirectangular dot matrix (`worldMap.ts`: 1,655 dots on a
 * 13-unit grid across lat -60..78). Each dot is inverted back to lon/lat and
 * the rows are thinned by `round(1 / cos(lat))` so the dots sit at an even
 * density on the sphere instead of bunching towards the poles (on a flat map
 * every row has the same dot spacing; on a sphere a high-latitude row is a
 * much shorter circle).
 */
export interface LonLat {
  lon: number;
  lat: number;
}

/** Grid pitch and first-cell offset of the baked dot matrix. */
const GRID_STEP = 13;
const GRID_ORIGIN = 7;
const DEG = Math.PI / 180;

function parseDots(path: string): LonLat[] {
  const dots: LonLat[] = [];
  const pattern = /M(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)h/g;
  for (const match of path.matchAll(pattern)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const lon = WORLD_MAP.lonMin + (x / WORLD_MAP.width) * (WORLD_MAP.lonMax - WORLD_MAP.lonMin);
    const lat = WORLD_MAP.latMax - (y / WORLD_MAP.height) * (WORLD_MAP.latMax - WORLD_MAP.latMin);
    const column = Math.round((x - GRID_ORIGIN) / GRID_STEP);
    const keepEvery = Math.max(1, Math.round(1 / Math.cos(lat * DEG)));
    if (column % keepEvery === 0) dots.push({ lon, lat });
  }
  return dots;
}

/** Every land dot the baked matrix holds, before thinning. */
export const RAW_LAND_DOT_COUNT = [...WORLD_DOTS_PATH.matchAll(/M\d/g)].length;

/** Land dots (lon/lat, degrees), thinned for even density on the sphere. */
export const LAND_DOTS: readonly LonLat[] = parseDots(WORLD_DOTS_PATH);

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Unit vector for a lon/lat, in the globe's view frame for a given centre:
 *  +x right, +y up, +z towards the viewer. */
export function viewVector(lon: number, lat: number, centerLon: number, centerLat: number): Vec3 {
  const phi = lat * DEG;
  const phi0 = centerLat * DEG;
  const dLambda = (lon - centerLon) * DEG;
  return {
    x: Math.cos(phi) * Math.sin(dLambda),
    y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLambda),
    z: Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda),
  };
}

/**
 * Orthographic projection onto a unit disc centred on (centerLon, centerLat).
 * `x`/`y` are in the -1..1 range with +y UP (flip it for SVG); `visible` is
 * false for points on the far hemisphere.
 */
export function projectOrtho(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
): { x: number; y: number; visible: boolean } {
  const v = viewVector(lon, lat, centerLon, centerLat);
  return { x: v.x, y: v.y, visible: v.z >= 0 };
}

/** Normalised dot product of two lon/lat directions (cosine of the angle
 *  between them). Used for the day/night split: a dot is lit when its
 *  direction faces the subsolar point. */
export function cosAngleBetween(a: LonLat, b: LonLat): number {
  const pa = a.lat * DEG;
  const pb = b.lat * DEG;
  return (
    Math.sin(pa) * Math.sin(pb) + Math.cos(pa) * Math.cos(pb) * Math.cos((a.lon - b.lon) * DEG)
  );
}

/** Arc altitude factor: a sample at arc parameter `t` is lifted off the
 *  surface by `ARC_ALTITUDE_K * sin(PI * t) * angularDistance` (fraction of
 *  the radius), so long hauls climb higher than short hops. 0.2 puts the
 *  highest arc on the default view (Manila -> New York) at ~1.09 r above the
 *  centre, under the static globe's arc ceiling (`GLOBE_SVG.arcCeiling`). */
export const ARC_ALTITUDE_K = 0.2;

/**
 * The default view centre of the globe act: Manila sits low and left of the
 * centre instead of on it. With the HQ at the exact centre of an orthographic
 * view every great circle through it projects as a straight line through the
 * origin, so every arc from Manila drew as a straight radial spike however it
 * was lifted. Offsetting the view (north-east, over the Pacific) turns the
 * same great circles into visible curves that climb over the northern limb.
 */
export const GLOBE_VIEW: LonLat = { lon: 150, lat: 35 };

/** The static globe's SVG geometry: disc radius and half-size of the
 *  viewBox, in viewBox units. The box leaves a margin for arcs that lift over
 *  the limb (the highest default arc peaks at ~1.16 r). */
export const GLOBE_SVG = {
  r: 100,
  view: 124,
  /** Hard ceiling for the arcs, in radii above the disc centre: the static
   *  globe clips its arc group to it, so the globe's whole footprint (disc +
   *  arcs) never reaches higher than this. The globe act places the
   *  Operations globe so this ceiling sits below the reach copy. */
  arcCeiling: 1.1,
  /** Land-dot stroke opacity on the day / night side of the terminator. */
  dayDotOpacity: 0.82,
  nightDotOpacity: 0.26,
} as const;
/** The hub marker's dot radius, in the static globe's viewBox units. */
export const HQ_DOT_R = 2.6;
/** Share of the static globe's width the disc covers: the globe act scales
 *  its handoff and release against the disc, not the box. */
export const GLOBE_DISC_FRACTION = GLOBE_SVG.r / GLOBE_SVG.view;

export type ArcPoint = Vec3 & { t: number; visible: boolean };

/**
 * Samples of the elevated great-circle arc from `from` to `to`, in the view
 * frame of the given centre: each sample is the spherical interpolation
 * (slerp) of the two endpoints, lifted radially by
 * `k * sin(PI * t) * angularDistance`. A sample is visible when it is on the
 * near hemisphere (z >= 0) OR outside the disc's silhouette (a lifted part
 * arching over the limb); samples behind the globe AND inside its silhouette
 * are hidden, so they must never be drawn.
 */
export function arcPoints(
  from: LonLat,
  to: LonLat,
  centerLon: number,
  centerLat: number,
  k = ARC_ALTITUDE_K,
  segments = 64,
): ArcPoint[] {
  const a = viewVector(from.lon, from.lat, centerLon, centerLat);
  const b = viewVector(to.lon, to.lat, centerLon, centerLat);
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const points: ArcPoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const wa = sinOmega < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / sinOmega;
    const wb = sinOmega < 1e-6 ? t : Math.sin(t * omega) / sinOmega;
    const r = 1 + k * Math.sin(Math.PI * t) * omega;
    const x = (wa * a.x + wb * b.x) * r;
    const y = (wa * a.y + wb * b.y) * r;
    const z = (wa * a.z + wb * b.z) * r;
    points.push({ x, y, z, t, visible: z >= 0 || x * x + y * y > 1 });
  }
  return points;
}

/** The most a drawn hub arc lifts off the surface, in radii: with it every arc
 *  stays inside the static globe's viewBox (1 + 0.16 < view / r = 1.24), so
 *  none is ever cut flat at the edge of the box. */
export const ARC_LIFT_MAX = 0.16;

export interface HubArc {
  /** The drawn samples: one contiguous run that starts at the hub. */
  points: ArcPoint[];
  /** The run reaches its city (it ends on the city's marker); otherwise it
   *  goes over the horizon and is drawn fading out toward its end. */
  landed: boolean;
}

/**
 * The arcs from the hub to each city as the turning globe shows them: only
 * the run that leaves the hub is drawn (no arc ever starts in mid-air), its
 * lift capped at `ARC_LIFT_MAX`, and it either lands on its city's marker or
 * is flagged to fade out where it goes behind the globe. `null` for a city
 * whose arc has no visible run from the hub (the hub itself is out of view).
 */
export function hubArcs(
  hub: LonLat,
  cities: readonly LonLat[],
  centerLon: number,
  centerLat: number,
): Array<HubArc | null> {
  return cities.map((city) => {
    const omega = Math.acos(Math.max(-1, Math.min(1, cosAngleBetween(hub, city))));
    const k = omega > 0 ? Math.min(ARC_ALTITUDE_K, ARC_LIFT_MAX / omega) : ARC_ALTITUDE_K;
    const all = arcPoints(hub, city, centerLon, centerLat, k);
    const first = visibleArcRuns(all)[0];
    if (!first || first[0] !== all[0]) return null;
    const end = all.at(-1);
    return { points: first, landed: end !== undefined && first.at(-1) === end && end.z >= 0 };
  });
}

/** Consecutive runs of visible samples (each run at least two samples): the
 *  polylines to draw. A hidden sample always breaks a run, so no drawn
 *  segment ever joins two samples across a stretch hidden behind the globe. */
export function visibleArcRuns(points: readonly ArcPoint[]): ArcPoint[][] {
  const runs: ArcPoint[][] = [];
  let current: ArcPoint[] = [];
  for (const p of points) {
    if (p.visible) {
      current.push(p);
    } else {
      if (current.length > 1) runs.push(current);
      current = [];
    }
  }
  if (current.length > 1) runs.push(current);
  return runs;
}
