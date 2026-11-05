export interface OrbitArcPair {
  /** One contiguous path: the half of the ring behind the globe. */
  back: string;
  /** One contiguous path: the half in front. */
  front: string;
}
export interface OrbitPoint {
  x: number;
  y: number;
  z: number;
}

const HALF_SAMPLES = 90;

/** A point on the unit orbit of the plane tilted by (tiltX, tiltY); `z > 0` is in front of the globe. */
export function orbitPoint(tiltX: number, tiltY: number, angle: number): OrbitPoint {
  const x = Math.cos(angle);
  const y = Math.sin(angle) * Math.cos(tiltX);
  const z = Math.sin(angle) * Math.sin(tiltX);
  return {
    x: x * Math.cos(tiltY) + z * Math.sin(tiltY),
    y,
    z: -x * Math.sin(tiltY) + z * Math.cos(tiltY),
  };
}

/** The angle where the orbit crosses from behind the globe to the front. The front half is [start, start + PI]. */
export function frontStartAngle(tiltX: number, tiltY: number): number {
  const a = Math.sin(tiltX) * Math.cos(tiltY);
  const b = -Math.sin(tiltY);
  return -Math.atan2(b, a);
}

/** Sample the half-ring that starts at `from` (angle) and runs half a turn. */
export function orbitHalfPoints(
  tiltX: number,
  tiltY: number,
  from: number,
  radius: number,
): { x: number; y: number }[] {
  return Array.from({ length: HALF_SAMPLES + 1 }, (_, i) => {
    const p = orbitPoint(tiltX, tiltY, from + (i / HALF_SAMPLES) * Math.PI);
    return { x: p.x * radius, y: p.y * radius };
  });
}

const serialize = (points: readonly { x: number; y: number }[]): string =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("");

/**
 * The front and back halves of a tilted orbit, each a single contiguous path,
 * so the ring closes exactly where the halves meet (no arc fragments).
 */
export function orbitArcPair(tiltX: number, tiltY: number, radius = 88): OrbitArcPair {
  const start = frontStartAngle(tiltX, tiltY);
  return {
    front: serialize(orbitHalfPoints(tiltX, tiltY, start, radius)),
    back: serialize(orbitHalfPoints(tiltX, tiltY, start + Math.PI, radius)),
  };
}
