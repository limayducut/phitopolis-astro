/**
 * RunGlobe.tsx, ported. Support: one world wrapped in systems, staffed, in touch, around the
 * clock (MOTION-SPEC §5.3). An orbit ring (back half behind the globe, front half over it), the
 * interactive globe, a 24-tick dial, a mark running the ring on its own clock, and the
 * platform chips.
 */
import { NOIR } from "@/shared/theme/palette";
import { HQ } from "@/shared/content/reachCities";
import {
  GLOBE_SVG,
  GLOBE_VIEW,
  HQ_DOT_R,
  projectOrtho,
} from "@/features/home/rebuild/globe/globeData";
import { mix } from "../chapterTimeline";
import { DIAL_TICKS, RING_ITEMS, RING_SHARE, TICK_SHARE, supportState, tickAt } from "./supportState";
import { supportLayout, type SupportLayout } from "./supportLayout";
import { orbitPoint } from "./orbitGeometry";
import { applyBindings, bind, buildBindings, rectStyle } from "./visualKit";
import {
  ARCS_ALPHA_VAR,
  ARCS_HELD_ATTR,
  HQ_PULSE_ALPHA_VAR,
  HQ_PULSE_SCALE_VAR,
  createSpinningGlobe,
  type SpinningGlobeHandle,
} from "./spinningGlobe";
import {
  POINT_SCALE,
  SUPPORT_EMERGED,
  collapseAt,
  pulseRing,
  supportCollapse,
  supportEmerge,
  type SupportCollapse,
} from "./handoffState";
import { h, s, type Child } from "./dom";
import type { VisualFactory } from "./visualRuntime";

/** One lap of the ring per 12 s — a full day read at a glance, slow enough not to pull the
 *  eye off the copy. */
const ORBIT_PERIOD_MS = 12000;

function orbitMark(layout: SupportLayout, time: number) {
  const ring = layout.rings[0]!;
  const angle = (time / ORBIT_PERIOD_MS) * Math.PI * 2;
  const p = orbitPoint(ring.tiltX, ring.tiltY, angle);
  return {
    x: layout.cx + p.x * layout.R * 1.04,
    y: layout.cy + p.y * layout.R * 1.04,
    // Behind the globe it fades rather than vanishing.
    opacity: p.z >= 0 ? 0.95 : 0.3,
  };
}

/** Where the hub sits on the globe at its opening view: the carrier's landing if the live hub is out of sight. */
function restingHub(layout: SupportLayout) {
  const p = projectOrtho(HQ.lon, HQ.lat, GLOBE_VIEW.lon, GLOBE_VIEW.lat);
  return { x: layout.cx + p.x * layout.R, y: layout.cy - p.y * layout.R };
}

/** The handoff's pulse and arc hold, written on the visual's root (cleared when off). */
function writeHandoff(root: HTMLElement, on: boolean, pulse: number, arcsHeld: boolean): void {
  const ring = pulseRing(pulse);
  if (on && ring.opacity > 0) {
    root.style.setProperty(HQ_PULSE_ALPHA_VAR, String(Math.round(ring.opacity * 1e3) / 1e3));
    root.style.setProperty(HQ_PULSE_SCALE_VAR, String(Math.round(ring.scale * 1e3) / 1e3));
  } else {
    root.style.removeProperty(HQ_PULSE_ALPHA_VAR);
    root.style.removeProperty(HQ_PULSE_SCALE_VAR);
  }
  if (on && arcsHeld) root.setAttribute(ARCS_HELD_ATTR, "");
  else root.removeAttribute(ARCS_HELD_ATTR);
}

/**
 * The collapse's own writes (the bound channels carry the rest): the dial fades, the arcs fade,
 * and the globe shrinks to its centre and gives way to the carrier. At rest it writes nothing
 * beyond what the bindings already wrote, so the DOM is the plain diagram's.
 */
function writeCollapse(
  root: HTMLElement,
  parts: { globe: HTMLElement | null; dial: HTMLElement | SVGElement | null },
  k: SupportCollapse,
  grown: number,
): void {
  if (k.arcs > 0) root.style.setProperty(ARCS_ALPHA_VAR, String(Math.round((1 - k.arcs) * 1e3) / 1e3));
  else root.style.removeProperty(ARCS_ALPHA_VAR);
  if (parts.dial) {
    if (k.frame > 0) parts.dial.style.opacity = String(1 - k.frame);
    else parts.dial.style.removeProperty("opacity");
  }
  if (parts.globe && (k.globe > 0 || k.gone > 0)) {
    // Over the `grow` binding's own scale and fade (see supportScene).
    const scale = mix(0.92, 1, grown) * (1 - (1 - POINT_SCALE) * k.globe);
    parts.globe.style.transform = `scale(${String(Math.round(scale * 1e4) / 1e4)})`;
    parts.globe.style.opacity = String(grown * (1 - k.gone));
  }
}

function dial(layout: SupportLayout): SVGSVGElement {
  const D = layout.dialR + 4;
  const len = (i: number) => layout.R * (i % 6 === 0 ? 0.055 : 0.035);
  return s(
    "svg",
    {
      className: "pipeline-dial pv-support-dial",
      viewBox: `${String(-D)} ${String(-D)} ${String(2 * D)} ${String(2 * D)}`,
      "aria-hidden": "true",
      focusable: "false",
      style: { left: layout.cx - D, top: layout.cy - D, width: 2 * D, height: 2 * D },
    },
    s("circle", { r: layout.dialR, fill: "none", stroke: NOIR.frost, strokeOpacity: 0.12, strokeWidth: 0.6 }),
    Array.from({ length: DIAL_TICKS }, (_, i) => {
      const a = (i / DIAL_TICKS) * Math.PI * 2;
      const r1 = layout.dialR;
      const r0 = layout.dialR - len(i);
      return s("line", {
        x1: Math.sin(a) * r1,
        y1: -Math.cos(a) * r1,
        x2: Math.sin(a) * r0,
        y2: -Math.cos(a) * r0,
        stroke: NOIR.gold,
        strokeOpacity: 0.95,
        strokeWidth: i % 6 === 0 ? 1.25 : 1,
        strokeLinecap: "round",
        ...bind("dial", "fade", { min: 0.18, at: { at: tickAt(i), share: TICK_SHARE } }),
      });
    }),
  );
}

function supportScene(layout: SupportLayout, globe: SpinningGlobeHandle): Child[] {
  const ring = (side: "front" | "back", j: number) => ({
    item: { i: j * 2 + (side === "front" ? 0 : 1), n: RING_ITEMS, share: RING_SHARE },
  });
  const nodeItem = (i: number) => ({ item: { i, n: 3, share: 0.5 } });
  const viewBox = `0 0 ${String(layout.w)} ${String(layout.h)}`;
  const hub = restingHub(layout);
  return [
    s(
      "svg",
      { className: "pv-support-svg", viewBox, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" },
      layout.rings.map((r, j) =>
        s("path", {
          className: "run-globe-orbit run-globe-orbit-back",
          d: r.backD,
          fill: "none",
          stroke: NOIR.gold,
          strokeOpacity: 0.2,
          strokeWidth: 1,
          strokeLinecap: "round",
          pathLength: 1,
          strokeDasharray: "1 1",
          ...bind("rings", "draw", ring("back", j)),
        }),
      ),
    ),
    h(
      "div",
      { className: "pv-support-globe", style: rectStyle(layout.globeBox), ...bind("globe", "grow", { min: 0.92 }) },
      globe.el,
    ),
    s(
      "svg",
      { className: "pv-support-svg", viewBox, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" },
      layout.rings.map((r, j) =>
        s("path", {
          className: "run-globe-orbit run-globe-orbit-front",
          d: r.frontD,
          fill: "none",
          stroke: NOIR.gold,
          strokeOpacity: 0.8,
          strokeWidth: 1,
          strokeLinecap: "round",
          pathLength: 1,
          strokeDasharray: "1 1",
          ...bind("rings", "draw", ring("front", j)),
        }),
      ),
      // The round-the-clock cycle: one mark running the ring on its own clock, not on the
      // reader's scroll. It dims on the far side instead of disappearing.
      s("g", bind("cycle", "fade"), s("circle", { "data-orbit": "", cx: layout.cx, cy: layout.cy, r: 3.2, fill: NOIR.gold })),
      // where the globe condenses: the carrier's point leaves from here for the closing
      s("circle", { "data-handoff-out": "", cx: layout.cx, cy: layout.cy, r: 1, fill: "none", stroke: "none" }),
      s("circle", {
        "data-handoff-in": "rest",
        cx: hub.x,
        cy: hub.y,
        r: (HQ_DOT_R * layout.globeBox.w) / (2 * GLOBE_SVG.view),
        fill: "none",
        stroke: "none",
      }),
    ),
    dial(layout),
    layout.stack.map((item, i) =>
      h(
        "span",
        { className: "pv-chip run-globe-node", style: rectStyle(item.rect), ...bind("ringNodes", "rise", nodeItem(i)) },
        item.text,
      ),
    ),
  ];
}

/** Support: one world wrapped in systems, staffed, in touch, around the clock. */
export const runGlobe: VisualFactory = (root, { compact, mode, handoff, clock }) => {
  root.className = compact ? "pv pv-support run-globe pv-framed" : "pv pv-support run-globe";
  root.dataset.pipelineVisual = "support";
  root.setAttribute("aria-hidden", "true");
  // One globe for the life of this mount: its turn (and the arcs' draw cycle) survives a resize.
  const globe = createSpinningGlobe();

  return {
    build(size) {
      const layout = supportLayout(size.w, size.h, compact);
      root.replaceChildren();
      for (const child of supportScene(layout, globe).flat(2)) {
        if (child instanceof Node) root.appendChild(child);
      }
      const bindings = buildBindings(root);
      const orbit = root.querySelector<SVGCircleElement>("[data-orbit]");
      const parts = {
        globe: root.querySelector<HTMLElement>(".pv-support-globe"),
        dial: root.querySelector<SVGElement>(".pv-support-dial"),
      };

      return (t, time) => {
        const story = supportState(t);
        const on = handoff && mode === "scrub";
        const k = supportCollapse(on ? collapseAt(t) : 0);
        applyBindings(bindings, {
          ...story,
          ringNodes: story.ringNodes * (1 - k.labels),
          rings: story.rings * (1 - k.frame),
          cycle: story.cycle * (1 - k.frame),
        });
        const emerge = on ? supportEmerge(t, clock.beatCount) : SUPPORT_EMERGED;
        writeHandoff(root, on, emerge.pulse, emerge.arcsHeld);
        writeCollapse(root, parts, k, story.globe);
        if (orbit) {
          const o = orbitMark(layout, time);
          orbit.setAttribute("cx", String(o.x));
          orbit.setAttribute("cy", String(o.y));
          orbit.setAttribute("opacity", String(o.opacity));
        }
      };
    },
    destroy() {
      globe.destroy();
    },
  };
};
