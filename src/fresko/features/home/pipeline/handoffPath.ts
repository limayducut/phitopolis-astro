/**
 * The handoff carrier as pure functions of scroll ("dive and emerge", owner, 2026-10-14): the
 * condensed point stays over its own stage, drifts a little way down, and is absorbed by the
 * next chapter's photo as the photo's top edge reaches it (one ripple ring on that edge); it
 * never crosses a photo. When the next pin starts, one matching ring opens on the landing
 * anchor and the point grows out of it. No DOM, no GSAP (HandoffCarrier measures and writes).
 */
import { clamp01, easeOutCubic, mix, smoothstep } from "./chapterTimeline";
import type { PillarName } from "./chapterTimeline";
import type { Point } from "./visuals/visualKit";

/** Where a point goes: the next chapter's diagram, or the closing's film (no landing there). */
export type HandoffTarget = PillarName | "closing";
/** The boundaries, in page order: each pillar's diagram hands off to what follows it. */
export const HANDOFF_PAIRS: ReadonlyArray<{ from: PillarName; to: HandoffTarget }> = [
  { from: "research", to: "development" },
  { from: "development", to: "support" },
  { from: "support", to: "closing" },
];

/** The carrier's shape and pace (see HandoffCarrier for the values). */
export interface HandoffTunables {
  /** The point's diameter, px. */
  dotPx: number;
  /** Where the point drifts to (px, from its source) once its stage lets go: a short fall. */
  drift: Point;
  /** Scroll over which that drift plays, px. */
  driftPx: number;
  /** How far the photo's edge rises past the point while it sinks to nothing, px. */
  absorbPx: number;
  /** The ripple ring's final radius, px. */
  ringMaxPx: number;
  /** How far the photo's edge rises (absorb) / the scroll runs (emerge) while the ring opens and fades, px. */
  ringPx: number;
  /** The ring's peak opacity. */
  ringAlpha: number;
  /** The landing scale's bounds (the point grows to the size of the node it lands on). */
  landingScaleRange: readonly [number, number];
}

/** Leaving a chapter, scroll px: lead-in over the condensing diagram, its pin letting go, the next photo fully in. */
export interface LeavePhases {
  start: number;
  release: number;
  end: number;
}
/** Entering the next chapter, scroll px: its pin starts, the point has grown, it has faded into the diagram. */
export interface EnterPhases {
  start: number;
  grown: number;
  end: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
  opacity: number;
}
/** One frame: the point (r 0 or opacity 0: not drawn) and the ripple ring, if any. */
export interface CarrierFrame {
  dot: Circle;
  ring: Circle | null;
}

interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const HIDDEN_FRAME: CarrierFrame = { dot: { x: 0, y: 0, r: 0, opacity: 0 }, ring: null };

/** The point's scale on landing: the target node's rendered diameter over its own, bounded. */
export function landingScale(
  targetWidth: number,
  dotPx: number,
  [min, max]: readonly [number, number],
): number {
  if (!(targetWidth > 0) || !(dotPx > 0)) return 1;
  return Math.min(max, Math.max(min, targetWidth / dotPx));
}

/**
 * An anchor's centre where it sits while its chapter is pinned (the pin's top at the
 * viewport's top): its live centre minus the pin's live offset. Valid at any scroll, since the
 * anchor and its pin move together.
 */
export function pinnedCentre(anchor: RectLike, pin: RectLike): Point {
  return {
    x: anchor.left + anchor.width / 2,
    y: anchor.top + anchor.height / 2 - pin.top,
  };
}

/**
 * The visible top edge of a photo plate, viewport px: the plate window's top, or the top
 * shutter's lower edge while it is drawn over the plate (the shutter is ground, not photo).
 */
export function photoTopEdge(windowTop: number, shutterBottom: number | null): number {
  return shutterBottom === null ? windowTop : Math.max(windowTop, shutterBottom);
}

/** The ripple ring `k` (0..1) of the way through: it opens from the point's size and fades. */
export function rippleRing(at: Point, k: number, fromR: number, t: HandoffTunables): Circle | null {
  if (!(k > 0) || k >= 1) return null;
  return {
    x: at.x,
    y: at.y,
    r: mix(fromR, t.ringMaxPx, easeOutCubic(k)),
    opacity: t.ringAlpha * Math.min(1, k / 0.15) * (1 - k),
  };
}

/** The point once its stage has let go: a short curve down (and a little aside), eased. */
export function driftPoint(
  from: Point,
  scroll: number,
  release: number,
  t: HandoffTunables,
): Point {
  const k = smoothstep((scroll - release) / t.driftPx);
  const m = 1 - k;
  const control = { x: from.x + t.drift.x, y: from.y };
  const to = { x: from.x + t.drift.x, y: from.y + t.drift.y };
  return {
    x: m * m * from.x + 2 * m * k * control.x + k * k * to.x,
    y: m * m * from.y + 2 * m * k * control.y + k * k * to.y,
  };
}

/**
 * Leaving: hidden outside (start, end). Lead-in: on the source, fading in as the diagram
 * gives way. Once released: drifting; when the photo's edge (`edgeY`, viewport px) reaches the
 * point's lower edge, the point sits on the edge and sinks into it over `absorbPx`, while one
 * ring opens on the edge and fades over `ringPx`. Nothing is ever drawn below the edge.
 */
export function leaveFrame(
  scroll: number,
  phases: LeavePhases,
  from: Point,
  edgeY: number,
  t: HandoffTunables,
): CarrierFrame {
  const r0 = t.dotPx / 2;
  if (!(scroll > phases.start) || !(scroll < phases.end)) return HIDDEN_FRAME;
  if (scroll < phases.release) {
    const opacity = clamp01(
      (scroll - phases.start) / Math.max(phases.release - phases.start, 1e-6),
    );
    return { dot: { ...from, r: r0, opacity }, ring: null };
  }
  const at = driftPoint(from, scroll, phases.release, t);
  const depth = at.y + r0 - edgeY;
  if (!(depth > 0)) return { dot: { ...at, r: r0, opacity: 1 }, ring: null };
  const left = 1 - clamp01(depth / t.absorbPx);
  const r = r0 * left;
  return {
    dot: { x: at.x, y: edgeY - r, r, opacity: left > 0 ? 1 : 0 },
    ring: rippleRing({ x: at.x, y: edgeY }, depth / t.ringPx, r0, t),
  };
}

/**
 * Entering: hidden outside [start, end). One ring opens on the landing anchor while the point
 * grows out of it to its landing size (start..grown), then the point fades into the
 * diagram's own node (grown..end).
 */
export function enterFrame(
  scroll: number,
  phases: EnterPhases,
  to: Point,
  landing: number,
  t: HandoffTunables,
): CarrierFrame {
  if (!(scroll >= phases.start) || !(scroll < phases.end)) return HIDDEN_FRAME;
  const grow = clamp01((scroll - phases.start) / Math.max(phases.grown - phases.start, 1e-6));
  const fade = clamp01((scroll - phases.grown) / Math.max(phases.end - phases.grown, 1e-6));
  const r = (landing * t.dotPx * easeOutCubic(grow)) / 2;
  return {
    dot: { ...to, r, opacity: 1 - fade },
    ring: rippleRing(to, (scroll - phases.start) / t.ringPx, 0, t),
  };
}

/* ── The veil (owner, 2026-10-14): a receiving chapter's photo arrives under a navy veil, and
   the absorbed point clears it, a hole opening from where it struck the photo's top edge. ── */

/** Whether a chapter's opener receives the point (and so carries the veil). */
export const receivesHandoff = (pillar: PillarName): boolean =>
  HANDOFF_PAIRS.some(({ to }) => to === pillar);

/** The veil's tunables (see handoffVeil for the values). */
export interface VeilTunables {
  /** The reveal runs over this share of the strike's depth below the viewport's top, so it is
   *  done just before the photo reaches the top (the end of its arrival). */
  revealShare: number;
  /** The shortest reveal, px (a strike high on the screen). */
  minRevealPx: number;
  /** The soft edge of the hole, px. */
  featherPx: number;
  /** How much of its own opacity the veil gives up as the hole grows (0: none). */
  alphaFade: number;
}

/** Where the point strikes the photo: its lower edge, at its drifted place (the stage's centre if it has no source yet). */
export function veilImpact(
  from: Point | null,
  scroll: number,
  release: number,
  t: HandoffTunables,
  fallback: Point,
): Point {
  if (!from) return fallback;
  const at = driftPoint(from, scroll, release, t);
  return { x: at.x, y: at.y + t.dotPx / 2 };
}

/** The hole's radius that clears the whole plate from (x, its top edge): to the farthest corner. */
export const veilReach = (x: number, plateW: number, plateH: number): number =>
  Math.hypot(Math.max(x, plateW - x), plateH);

/** The reveal's length for a strike `impactY` px below the viewport's top. */
export const veilRevealPx = (impactY: number, v: VeilTunables): number =>
  Math.max(v.minRevealPx, v.revealShare * impactY);

/** How far the photo's edge has risen past the impact point, as a share of the reveal, 0..1. */
export const veilProgress = (impactY: number, edgeY: number, revealPx: number): number =>
  clamp01((impactY - edgeY) / revealPx);

/** The reveal's ease: sine in-out, so the hole swells slowly out of the ring and settles gently. */
export const veilEase = (p: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(p));

/** The hole's radius: -feather (veil whole) at 0, reach + feather (veil gone) at 1. */
export const veilRadius = (progress: number, reach: number, featherPx: number): number =>
  -featherPx + (reach + 2 * featherPx) * veilEase(progress);

/** The veil's own opacity as the hole grows: it thins by `alphaFade` so its last edge melts away. */
export const veilOpacity = (progress: number, alphaFade: number): number =>
  1 - alphaFade * veilEase(progress);

export type VeilState =
  | { kind: "intact" }
  | { kind: "open" }
  | { kind: "revealing"; x: number; r: number; opacity: number };

/**
 * The veil at this scroll: whole until the photo's edge reaches the impact point, a hole
 * opening from there (x in plate px, at the plate's top), and gone once it is fully open or the
 * photo's arrival is over (`leave.end`), whichever is first.
 */
export function veilState(
  scroll: number,
  leave: LeavePhases,
  impact: Point,
  edgeY: number,
  plate: { left: number; width: number; height: number },
  v: VeilTunables,
): VeilState {
  if (scroll >= leave.end) return { kind: "open" };
  if (!(scroll > leave.release)) return { kind: "intact" };
  const progress = veilProgress(impact.y, edgeY, veilRevealPx(impact.y, v));
  if (progress <= 0) return { kind: "intact" };
  if (progress >= 1) return { kind: "open" };
  const x = impact.x - plate.left;
  return {
    kind: "revealing",
    x,
    r: veilRadius(progress, veilReach(x, plate.width, plate.height), v.featherPx),
    opacity: veilOpacity(progress, v.alphaFade),
  };
}
