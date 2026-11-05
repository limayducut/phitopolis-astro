/**
 * The handoff's channels on the visual clock: how a diagram condenses into the carrier's point
 * at the end of its chapter (collapse) and how the next one takes it in (emerge). Pure
 * functions of chapter time `t`, kept out of the story states so every story channel still
 * finishes at 1 on its own span. With the handoff off they are the neutral values (no
 * collapse, emerged), so the picture is exactly the story's.
 */
import type { Point } from "./visualKit";
import { softOut } from "./visualKit";
import {
  COLLAPSE_T0,
  COLLAPSE_T1,
  HANDOFF_CROSSFADE,
  channel,
  clamp01,
  landingWindow,
  mix,
  smoothstep,
} from "../chapterTimeline";

/** Visual-clock units the Development machine-learning network takes to grow out of the landed point. */
export const EMERGE_T = 0.6;
/** Visual-clock units of the single ring pulse on the Support hub once the point has landed. */
export const PULSE_T = 0.4;
/** The hub's arcs start firing this share into the pulse. */
export const ARCS_AT = 0.35;
/** The pulse ring grows to this multiple of its resting radius as it fades. */
export const PULSE_SCALE = 3.4;
/** What a condensed group shrinks to at the very end (it is a point by then). */
export const POINT_SCALE = 0.03;

const linear = (x: number): number => clamp01(x);
/** `c`'s eased sub-progress over [a, b]. */
export const span = (c: number, a: number, b: number, ease = smoothstep): number =>
  ease(clamp01((c - a) / (b - a)));

/** The collapse, 0 until COLLAPSE_T0 and 1 from COLLAPSE_T1; linear, as the scroll that drives it. */
export const collapseAt = (t: number): number => channel(t, COLLAPSE_T0, COLLAPSE_T1, linear);
/** How far the diagram's last point has given way to the carrier (the collapse's last share, linear). */
export const handedOver = (c: number): number => span(c, 1 - HANDOFF_CROSSFADE, 1, linear);

export interface ResearchCollapse {
  /** The ML / DL chips fade. */
  tags: number;
  /** The fresh documents travel into the model's centre. */
  docs: number;
  /** The wave draws back along itself into the model. */
  retract: number;
  /** The crest rings fade, ahead of the retract. */
  crests: number;
  /** The dot running the wave fades before the wave draws back. */
  head: number;
  /** The model shrinks in place to a point. */
  model: number;
  /** The point gives way to the carrier. */
  gone: number;
}
/** Research's collapse: chips and documents first, then the wave, then the model; one gathering motion. */
export function researchCollapse(c: number): ResearchCollapse {
  return {
    tags: span(c, 0, 0.25),
    docs: span(c, 0, 0.45, (x) => x),
    retract: span(c, 0.12, 0.55),
    crests: span(c, 0.08, 0.3),
    head: span(c, 0, 0.12),
    model: span(c, 0.4, 0.85),
    gone: handedOver(c),
  };
}

export interface DevelopmentCollapse {
  /** The technology chips and environment names fade. */
  labels: number;
  /** Sources, environments and their lines gather toward the product and fade. */
  outer: number;
  /** The product window shrinks to a point. */
  core: number;
  gone: number;
}
export function developmentCollapse(c: number): DevelopmentCollapse {
  return {
    labels: span(c, 0, 0.25),
    outer: span(c, 0.05, 0.5),
    core: span(c, 0.35, 0.85),
    gone: handedOver(c),
  };
}

export interface SupportCollapse {
  /** The platform chips fade. */
  labels: number;
  /** The hub's arcs fade out (their draw cycle is CSS-timed, so they fade rather than scrub back). */
  arcs: number;
  /** The dial, the orbit ring and its running mark go. */
  frame: number;
  /** The globe shrinks in place to a point. */
  globe: number;
  gone: number;
}
/** Support's collapse: chips and arcs first, then the dial and ring, then the globe to a point. */
export function supportCollapse(c: number): SupportCollapse {
  return {
    labels: span(c, 0, 0.25),
    arcs: span(c, 0, 0.3),
    frame: span(c, 0.1, 0.45),
    globe: span(c, 0.35, 0.85),
    gone: handedOver(c),
  };
}

export interface DevelopmentEmerge {
  /** The landed point, fading in as the carrier fades out. */
  seed: number;
  /** The machine-learning network growing out of it. */
  grow: number;
}
export const DEVELOPMENT_EMERGED: DevelopmentEmerge = { seed: 0, grow: 1 };
export function developmentEmerge(t: number, beatCount: number): DevelopmentEmerge {
  const { land, settled } = landingWindow(beatCount, "development");
  return {
    seed: channel(t, land, settled, linear),
    grow: channel(t, settled, settled + EMERGE_T, softOut),
  };
}
/** The seed shows from its landing until the network has spread out of it. */
export const seedOpacity = (e: DevelopmentEmerge): number => e.seed * (1 - span(e.grow, 0, 0.5));

export interface SupportEmerge {
  /** The ring pulse on the hub, 0..1 (0 and 1 both show no ring). */
  pulse: number;
  /** Whether the hub's arcs are held back (not drawn) until the pulse has gone out. */
  arcsHeld: boolean;
}
export const SUPPORT_EMERGED: SupportEmerge = { pulse: 1, arcsHeld: false };
export function supportEmerge(t: number, beatCount: number): SupportEmerge {
  const { settled } = landingWindow(beatCount, "support");
  return {
    pulse: channel(t, settled, settled + PULSE_T, linear),
    arcsHeld: t < settled + ARCS_AT * PULSE_T,
  };
}
/** The pulse ring's scale and opacity: it grows out of the hub and fades, then is gone. */
export function pulseRing(pulse: number): { scale: number; opacity: number } {
  if (pulse <= 0 || pulse >= 1) return { scale: 1, opacity: 0 };
  return { scale: mix(1, PULSE_SCALE, softOut(pulse)), opacity: 0.9 * (1 - pulse) };
}

/**
 * Shrinks a group in place toward `at` (scale) and fades it; at rest (scale 1, opacity 1) it
 * leaves no attribute at all, so the DOM is the plain diagram's.
 */
export function writeShrink(
  el: SVGElement | null,
  at: Point,
  scale: number,
  opacity: number,
): void {
  if (!el) return;
  if (scale >= 1 && opacity >= 1) {
    el.removeAttribute("transform");
    el.removeAttribute("opacity");
    return;
  }
  const x = Math.round(at.x * 100) / 100;
  const y = Math.round(at.y * 100) / 100;
  const k = Math.round(Math.max(scale, 0) * 1e4) / 1e4;
  el.setAttribute(
    "transform",
    `translate(${String(x)} ${String(y)}) scale(${String(k)}) translate(${String(-x)} ${String(-y)})`,
  );
  el.setAttribute("opacity", String(Math.round(clamp01(opacity) * 1e3) / 1e3));
}
