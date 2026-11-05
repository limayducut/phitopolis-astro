/**
 * The handoff carrier's DOM reads: a boundary's leaving chapter (body, pin), what receives the
 * point (its photo's run and plate; its body and pin when the point lands there), the scroll
 * windows, the anchors where they sit while pinned, and the photo's live top edge. Reads only.
 */
import {
  COLLAPSE_SVH,
  EMERGE_GROW_SVH,
  HANDOFF_CROSSFADE,
  LANDING_SVH,
  type PillarName,
} from "./chapterTimeline";
import {
  landingScale,
  photoTopEdge,
  pinnedCentre,
  type EnterPhases,
  type HandoffTarget,
  type LeavePhases,
} from "./handoffPath";
import { SHUTTER_TOP_CLASS } from "@/features/home/rebuild/aperture";
import type { Point } from "./visuals/visualKit";

const SECTION_ID: Record<HandoffTarget, string> = {
  research: "home-research",
  development: "home-development",
  support: "home-support",
  closing: "closing",
};

/** One boundary's elements. The anchors are looked up on each read: the visuals render them once measured. */
export interface Boundary {
  id: string;
  aBody: HTMLElement;
  aPin: HTMLElement;
  /** What rises with the receiving photo (an opener run, the closing's wrapper): its top is the photo's. */
  bRun: HTMLElement;
  /** The receiving photo's plate, within `bRun`. */
  plateSelector: string;
  /** Where the point lands, when it does (a chapter's body and pin; the closing has none). */
  landing: { body: HTMLElement; pin: HTMLElement } | null;
  leave: LeavePhases;
  enter: EnterPhases | null;
}

const docTop = (el: HTMLElement): number => el.getBoundingClientRect().top + window.scrollY;

/** The receiving end: a chapter's opener run, body and pin, or the closing's (non-sticky) wrapper. */
function receiver(to: HandoffTarget) {
  const section = document.getElementById(SECTION_ID[to]);
  if (to === "closing") {
    const run = section?.querySelector<HTMLElement>(".home-closing-stage")?.parentElement;
    return run ? { run, plateSelector: ".home-closing-picture", landing: null } : null;
  }
  const run = section?.querySelector<HTMLElement>(".pipeline-opener-run");
  const body = section?.querySelector<HTMLElement>(".pipeline-chapter-body");
  const pin = body?.querySelector<HTMLElement>(".pipeline-pin");
  return run && body && pin
    ? { run, plateSelector: ".pipeline-opener-window", landing: { body, pin } }
    : null;
}

export function findBoundary(from: PillarName, to: HandoffTarget): Boundary | null {
  const aBody = document
    .getElementById(SECTION_ID[from])
    ?.querySelector<HTMLElement>(".pipeline-chapter-body");
  const aPin = aBody?.querySelector<HTMLElement>(".pipeline-pin");
  const b = receiver(to);
  if (!aBody || !aPin || !b) return null;
  return {
    id: `home:handoff:${from}-${to}`,
    aBody,
    aPin,
    bRun: b.run,
    plateSelector: b.plateSelector,
    landing: b.landing,
    leave: { start: 0, release: 0, end: 0 },
    enter: b.landing ? { start: 0, grown: 0, end: 0 } : null,
  };
}

/**
 * Leaving, scroll px: A's pin lets go (`release`) when its body's bottom meets the viewport's;
 * the lead-in is the collapse's cross-fade before that; it ends when the receiving run's top
 * (the photo's top edge, rising one-for-one with the scroll) has reached the viewport's top.
 */
export function measureLeave(boundary: Boundary): LeavePhases {
  const vh = window.innerHeight;
  const release = docTop(boundary.aBody) + boundary.aBody.offsetHeight - vh;
  return {
    start: release - (COLLAPSE_SVH * HANDOFF_CROSSFADE * vh) / 100,
    release,
    end: docTop(boundary.bRun),
  };
}

/** Entering, scroll px: from B's pin start (its body's top meets the viewport's), the grow, then the fade; null with no landing. */
export function measureEnter(boundary: Boundary): EnterPhases | null {
  if (!boundary.landing) return null;
  const vh = window.innerHeight / 100;
  const start = docTop(boundary.landing.body);
  const grown = start + EMERGE_GROW_SVH * vh;
  return { start, grown, end: grown + LANDING_SVH * vh };
}

/** Where the receiving run ends, scroll px (its bottom at the viewport's top): its photo is gone by then. */
export const measureRunEnd = (boundary: Boundary): number =>
  docTop(boundary.bRun) + boundary.bRun.offsetHeight;

/** A's source anchor (`data-handoff-out`) where it sits while A is pinned; null before A's visual has one. */
export function measureSource(boundary: Boundary): Point | null {
  const out = boundary.aPin.querySelector("[data-handoff-out]");
  if (!out) return null;
  return pinnedCentre(out.getBoundingClientRect(), boundary.aPin.getBoundingClientRect());
}

/**
 * B's landing anchor while B is pinned (its live `data-handoff-in="live"` if on screen, else
 * its resting one) and the landing scale that matches that node's size; null with no landing
 * or before B's visual has an anchor.
 */
export function measureTarget(
  boundary: Boundary,
  dotPx: number,
  scaleRange: readonly [number, number],
): { to: Point; landing: number } | null {
  const pin = boundary.landing?.pin;
  if (!pin) return null;
  const into =
    pin.querySelector("[data-handoff-in='live']") ?? pin.querySelector("[data-handoff-in]");
  if (!into) return null;
  const target = into.getBoundingClientRect();
  return {
    to: pinnedCentre(target, pin.getBoundingClientRect()),
    landing: landingScale(target.width, dotPx, scaleRange),
  };
}

/** The receiving photo's veil, if it carries one (only when the handoff is on). */
export const findVeil = (boundary: Boundary): HTMLElement | null =>
  boundary.bRun.querySelector<HTMLElement>("[data-handoff-veil]");

const plateOf = (boundary: Boundary): HTMLElement | null =>
  boundary.bRun.querySelector<HTMLElement>(boundary.plateSelector);

/** The receiving photo's plate box right now, viewport px; null if it has none. */
export function measurePlate(
  boundary: Boundary,
): { left: number; top: number; width: number; height: number } | null {
  const plate = plateOf(boundary);
  if (!plate) return null;
  const { left, top, width, height } = plate.getBoundingClientRect();
  return { left, top, width, height };
}

/** The receiving photo's visible top edge right now, viewport px (`Infinity` if it has no plate). */
export function measurePhotoEdge(boundary: Boundary): number {
  const plate = plateOf(boundary);
  if (!plate) return Number.POSITIVE_INFINITY;
  const shutter = plate.querySelector<HTMLElement>(`.${SHUTTER_TOP_CLASS}`);
  return photoTopEdge(
    plate.getBoundingClientRect().top,
    shutter ? shutter.getBoundingClientRect().bottom : null,
  );
}
