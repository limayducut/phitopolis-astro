/**
 * HandoffCarrier.tsx, ported. The one gold point after each pillar diagram (HANDOFF_PAIRS
 * drives every boundary). Short scrubbed windows: leaving (it stays over its own stage, falls
 * a little and is absorbed by the next photo's rising edge with one ripple, clearing that
 * photo's veil) and, where it lands, entering (one ripple opens on the landing node and the
 * point grows out of it). Between them it is not drawn: it never crosses a photo. Desktop with
 * motion, not low-power; everywhere else the layer is removed (React rendered nothing).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  HANDOFF_PAIRS,
  HIDDEN_FRAME,
  enterFrame,
  leaveFrame,
  type CarrierFrame,
  type HandoffTunables,
} from "./handoffPath";
import {
  findBoundary,
  findVeil,
  measureEnter,
  measureLeave,
  measureRunEnd,
  measurePhotoEdge,
  measureSource,
  measureTarget,
  type Boundary,
} from "./handoffMeasure";
import { paintVeil, writeVeil } from "./handoffVeil";
import { desktopMotion, handoffOn } from "@/runtime/chapters";

gsap.registerPlugin(ScrollTrigger);

/* ── Tunables ─────────────────────────────────────────────────────────────── */
const TUNABLES: HandoffTunables = {
  /** The point's diameter, px. */
  dotPx: 8,
  /** Its short fall once its stage lets go, px (a little aside, mostly down). */
  drift: { x: 14, y: 44 },
  /** Scroll over which that fall plays, px. */
  driftPx: 220,
  /** The photo's edge rises this far past the point while it sinks to nothing, px. */
  absorbPx: 26,
  /** The one ripple ring: final radius, scroll (edge rise) it takes, peak opacity. */
  ringMaxPx: 72,
  ringPx: 110,
  ringAlpha: 0.7,
  /** The point grows to the node it lands on, within these scales. */
  landingScaleRange: [0.5, 2],
};

type Leg = { boundary: Boundary; leg: "leave" | "enter"; trigger?: ScrollTrigger };

const round = (n: number): string => String(Math.round(n * 100) / 100);

function writeCircle(el: SVGCircleElement, c: { x: number; y: number; r: number; opacity: number } | null) {
  if (!c || c.opacity <= 0 || c.r <= 0) {
    el.setAttribute("visibility", "hidden");
    return;
  }
  el.setAttribute("visibility", "visible");
  el.setAttribute("cx", round(c.x));
  el.setAttribute("cy", round(c.y));
  el.setAttribute("r", round(c.r));
  el.setAttribute("opacity", round(c.opacity));
}

function frameOf(leg: Leg, scroll: number): CarrierFrame {
  const { boundary } = leg;
  if (leg.leg === "leave") {
    const from = measureSource(boundary);
    return from ? leaveFrame(scroll, boundary.leave, from, measurePhotoEdge(boundary), TUNABLES) : HIDDEN_FRAME;
  }
  const target = measureTarget(boundary, TUNABLES.dotPx, TUNABLES.landingScaleRange);
  return target && boundary.enter
    ? enterFrame(scroll, boundary.enter, target.to, target.landing, TUNABLES)
    : HIDDEN_FRAME;
}

/** One boundary's legs: leaving always; entering only where the point lands (not the closing). */
const legsOf = (boundary: Boundary): Leg[] =>
  boundary.landing
    ? [
        { boundary, leg: "leave" },
        { boundary, leg: "enter" },
      ]
    : [{ boundary, leg: "leave" }];

/** CarrierLayer's useGSAP body: builds the windows and the veil triggers; returns the revert. */
function armCarrier(dot: SVGCircleElement, ring: SVGCircleElement): () => void {
  const ctx = gsap.context(() => {});
  const boundaries = HANDOFF_PAIRS.map(({ from, to }) => findBoundary(from, to)).filter(
    (b): b is Boundary => b !== null,
  );
  const windows = boundaries.flatMap(legsOf);
  const paint = () => {
    const active = windows.find((w) => w.trigger?.isActive);
    const frame = active?.trigger ? frameOf(active, active.trigger.scroll()) : HIDDEN_FRAME;
    writeCircle(dot, frame.dot);
    writeCircle(ring, frame.ring);
  };
  const veilTriggers: ScrollTrigger[] = [];
  ctx.add(() => {
    for (const w of windows) {
      const phases = () => (w.leg === "leave" ? w.boundary.leave : w.boundary.enter);
      w.trigger = ScrollTrigger.create({
        id: `${w.boundary.id}:${w.leg}`,
        start: () => {
          if (w.leg === "leave") w.boundary.leave = measureLeave(w.boundary);
          else w.boundary.enter = measureEnter(w.boundary);
          return phases()?.start ?? 0;
        },
        end: () => phases()?.end ?? 0,
        invalidateOnRefresh: true,
        onUpdate: paint,
        onToggle: paint,
        onRefresh: paint,
      });
    }
    // The veil: from the point's release for as long as its photo can be on screen (to the
    // next pin's start, or the closing's end), so a jump straight in still lands on the right
    // state.
    for (const boundary of boundaries) {
      const paintThis = (self: ScrollTrigger) => {
        paintVeil(boundary, self.scroll(), TUNABLES);
      };
      veilTriggers.push(
        ScrollTrigger.create({
          id: `${boundary.id}:veil`,
          start: () => {
            boundary.leave = measureLeave(boundary);
            boundary.enter = measureEnter(boundary);
            return boundary.leave.release;
          },
          end: () => boundary.enter?.start ?? measureRunEnd(boundary),
          invalidateOnRefresh: true,
          onUpdate: paintThis,
          onToggle: paintThis,
          onRefresh: paintThis,
        }),
      );
    }
  });
  paint();
  veilTriggers.forEach((trigger, i) => {
    const boundary = boundaries[i];
    if (boundary) paintVeil(boundary, trigger.scroll(), TUNABLES);
  });
  return () => {
    ctx.revert();
    writeCircle(dot, null);
    writeCircle(ring, null);
    for (const boundary of boundaries) {
      const veil = findVeil(boundary);
      if (veil) writeVeil(veil, null);
    }
  };
}

/**
 * Mounts the carrier layer while the handoff is on (desktop with motion, not low power) and
 * removes it otherwise. `layer` is the server-rendered <svg class="pipeline-handoff-carrier">.
 */
export function initHandoffCarrier(layer: SVGSVGElement): void {
  const parent = layer.parentNode;
  const next = layer.nextSibling;
  const dot = layer.querySelector<SVGCircleElement>(".pipeline-handoff-dot");
  const ring = layer.querySelector<SVGCircleElement>(".pipeline-handoff-ring");
  if (!parent || !dot || !ring) return;
  let revert: (() => void) | null = null;
  const sync = () => {
    const on = handoffOn();
    if (on && !revert) {
      if (!layer.isConnected) parent.insertBefore(layer, next);
      // After the chapters' own triggers and the visuals' first render (anchors measured).
      revert = armCarrier(dot, ring);
    } else if (!on) {
      revert?.();
      revert = null;
      layer.remove();
    }
  };
  desktopMotion().on(() => sync());
}
