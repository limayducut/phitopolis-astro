import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCROLL_SPEED } from "@/shared/motion/scrollSpeed";

gsap.registerPlugin(ScrollTrigger);

/**
 * ── THE GOLD THREAD, SHARED MATH AND NODE WIRING ────────────────────────────
 *
 * One gold line runs down the gutter at `homeLayout.ts`'s `GUTTER_LINE_X`,
 * drawn by `GoldThread.tsx` and driven by `HomeThreadRun.tsx` (one shared
 * scroll clock across however many segments are mounted). This module holds the
 * pieces every consumer needs and none of them render JSX themselves:
 *  - the node ring's sizing constants and its CSS pre-state,
 *  - `buildGoldNodes`, the per-node ScrollTrigger wiring chapter stations use,
 *  - `threadDraw` / `threadTip`, the pure functions `HomeThreadRun` paints
 *    every segment's line and riding tip from.
 */

/** Gold gutter node: one ring per panel, level with the panel's label. At
 *  rest (and on mobile / reduced motion) it is filled; on desktop it waits
 *  as an empty ring and fills + grows slightly as the line's tip passes. */
export const NODE_PX = 14;
export const NODE_RING_PX = 2;
export const NODE_WAITING_SCALE = 0.85;
/** Half-height (px) of the band around the viewport centre over which a node
 *  lights as the line's tip (always at the viewport centre) crosses it. */
export const NODE_LIGHT_PX = 24;

/**
 * Drawn share (0..1) of a `[data-thread-draw]` element whose own span on the
 * run's shared scroll clock is `[top, top + h]`, at clock value `v`. `h <= 0`
 * draws fully open rather than staying permanently undrawn: a zero-height
 * element has no span to scrub against.
 */
export function threadDraw(v: number, top: number, h: number): number {
  if (h <= 0) return 1;
  return Math.max(0, Math.min(1, (v - top) / h));
}

/**
 * The riding tip's local offset (`y`, clamped to the segment's own span) and
 * `visible` state inside a `[data-thread-draw]` segment spanning
 * `[top, top + h]`, at clock value `v`. Exactly one tip is visible at any `v`
 * inside `[0, total)` once every segment is accounted for: a tip disappears
 * the instant its own segment finishes drawing (`v >= top + h`), the same
 * pixel the next segment's tip picks it up at. `lead` marks the first
 * segment's own tip, which stays visible even if `v` ever reads fractionally
 * before its `top` (scrub settle jitter). A follower tip must not do that,
 * or two tips could show at once during the handoff.
 */
export function threadTip(
  v: number,
  top: number,
  h: number,
  lead: boolean,
): { y: number; visible: boolean } {
  return {
    y: Math.max(0, Math.min(h, v - top)),
    visible: (lead || v >= top) && v < top + h,
  };
}

/**
 * Builds the per-node fill/scale ScrollTriggers for every `.{nodeClass}`
 * under `root`: id `${idPrefix}-{i}`, the same `center center+=/-=NODE_LIGHT_PX`
 * scrub window and "paint once at the reader's actual position" trick the
 * thread's other triggers use. Meant to be called from inside a desktop
 * `gsap.matchMedia` callback: its triggers revert with that context, not on
 * their own.
 */
export function buildGoldNodes(
  root: HTMLElement,
  nodeClass: string,
  idPrefix: string,
  scrub: number | true = SCROLL_SPEED,
): void {
  gsap.utils.toArray<HTMLElement>(`.${nodeClass}`, root).forEach((node, i) => {
    const ring = node.querySelector<HTMLElement>(`.${nodeClass}-ring`);
    const fill = node.querySelector<HTMLElement>(`.${nodeClass}-fill`);
    if (!ring || !fill) return;
    const nodeTl = gsap.timeline({
      scrollTrigger: {
        id: `${idPrefix}-${String(i)}`,
        trigger: node,
        start: `center center+=${String(NODE_LIGHT_PX)}`,
        end: `center center-=${String(NODE_LIGHT_PX)}`,
        scrub,
      },
    });
    nodeTl.fromTo(
      ring,
      { scale: NODE_WAITING_SCALE },
      { scale: 1, ease: "none", immediateRender: false, lazy: false },
      0,
    );
    nodeTl.fromTo(
      fill,
      { opacity: 0 },
      { opacity: 1, ease: "none", immediateRender: false, lazy: false },
      0,
    );
    nodeTl.progress(1).progress(nodeTl.scrollTrigger?.progress ?? 0);
  });
}

/** The CSS pre-state for a `nodeClass`'s waiting ring + unlit fill: the
 *  progress-0 state `buildGoldNodes`'s triggers scrub away from. The caller
 *  wraps this under `HOME_DESKTOP_MQ` (desktop-only; mobile and reduced
 *  motion keep the lit, filled default). */
export function goldNodePrestateSx(nodeClass: string) {
  return {
    [`& .${nodeClass}-ring`]: { transform: `scale(${String(NODE_WAITING_SCALE)})` },
    [`& .${nodeClass}-fill`]: { opacity: 0 },
  };
}
