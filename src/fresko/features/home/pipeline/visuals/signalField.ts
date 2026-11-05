/**
 * SignalField.tsx, ported. Research: documents gather into one, become a model, and come out
 * as one clean signal. A canvas draws the documents; an SVG draws the model (a soft hexagon
 * with a small network), the wave, its crests and the pulse riding it; two chips name the
 * methods (wide stages only).
 */
import { NOIR } from "@/shared/theme/palette";
import { drawResearch } from "./researchCanvas";
import { hexPath, researchLayout, type ResearchLayout } from "./researchLayout";
import { LAYER_SHARE, researchState, type ResearchState } from "./researchState";
import {
  POINT_SCALE,
  collapseAt,
  researchCollapse,
  writeShrink,
  type ResearchCollapse,
} from "./handoffState";
import {
  applyBindings,
  bind,
  buildBindings,
  pathD,
  pointAt,
  rectStyle,
  type Binding,
} from "./visualKit";
import { h, nextId, s } from "./dom";
import type { VisualFactory } from "./visualRuntime";

const MAX_DPR = 2;
const PULSE_MS = 2400;
/** The inner hexagon, as a share of the outer one. */
const INNER_HEX = 0.8;

/** The bound channels: the story's, with the handoff's collapse folded in (none at rest). */
function boundState(
  story: ResearchState,
  k: ResearchCollapse,
): ResearchState & { crests: number; head: number } {
  return {
    ...story,
    tags: story.tags * (1 - k.tags),
    signal: story.signal * (1 - k.retract),
    crests: story.pulse * (1 - k.crests),
    head: story.pulse * (1 - k.head),
  };
}

/** The model and the signal: a hexagonal model with a small network in it, and one clean wave out. */
function researchSvg(layout: ResearchLayout): SVGSVGElement {
  const uid = nextId();
  const gradientId = `rs-area-${uid}`;
  const fadeId = `rs-fade-${uid}`;
  const maskId = `rs-mask-${uid}`;
  const outer = hexPath(layout.hex);
  const inner = hexPath({ ...layout.hex, R: layout.hex.R * INNER_HEX }, 0.2);
  const { pts, peaks, maxY } = layout.signal;
  const { net } = layout;
  const last = pts[pts.length - 1]!;
  const baseline = Math.min(layout.h * 0.94, maxY + 0.07 * layout.h);
  const area = `${pathD(pts)}L${String(last.x)} ${String(baseline)}L${String(pts[0]!.x)} ${String(baseline)}Z`;
  return s(
    "svg",
    {
      className: "pv-research-svg",
      viewBox: `0 0 ${String(layout.w)} ${String(layout.h)}`,
      preserveAspectRatio: "none",
      "aria-hidden": "true",
      focusable: "false",
    },
    s(
      "defs",
      null,
      s(
        "linearGradient",
        { id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1" },
        s("stop", { offset: "0", stopColor: NOIR.gold, stopOpacity: 0.3 }),
        s("stop", { offset: "1", stopColor: NOIR.gold, stopOpacity: 0 }),
      ),
      // the area eases in from the model's port, so it has no hard left edge
      s(
        "linearGradient",
        {
          id: fadeId,
          gradientUnits: "userSpaceOnUse",
          x1: pts[0]!.x,
          y1: "0",
          x2: pts[0]!.x + 0.18 * (last.x - pts[0]!.x),
          y2: "0",
        },
        s("stop", { offset: "0", stopColor: NOIR.white, stopOpacity: 0 }),
        s("stop", { offset: "1", stopColor: NOIR.white, stopOpacity: 1 }),
      ),
      s(
        "mask",
        { id: maskId, maskUnits: "userSpaceOnUse", x: "0", y: "0", width: layout.w, height: layout.h },
        s("rect", { x: "0", y: "0", width: layout.w, height: layout.h, fill: `url(#${fadeId})` }),
      ),
    ),
    // the model: a soft hexagon, a second one inside it, and a three-layer network between;
    // in the handoff it shrinks in place to the carrier's point
    s(
      "g",
      { "data-collapse": "model" },
      s("path", {
        d: outer,
        fill: NOIR.gold,
        fillOpacity: 0.08,
        stroke: "none",
        ...bind("modelFill", "fill", { max: 0.08 }),
      }),
      s("path", {
        d: outer,
        fill: "none",
        stroke: NOIR.frost,
        strokeOpacity: 0.6,
        strokeWidth: 1.75,
        strokeLinejoin: "round",
        pathLength: 1,
        strokeDasharray: "1 1",
        ...bind("model", "draw"),
      }),
      s("path", {
        d: outer,
        fill: "none",
        stroke: NOIR.gold,
        strokeOpacity: 0.9,
        strokeWidth: 1.75,
        strokeLinejoin: "round",
        ...bind("modelFill", "fade", { max: 0.9 }),
      }),
      s("path", {
        d: inner,
        fill: "none",
        stroke: NOIR.frost,
        strokeOpacity: 0.28,
        strokeWidth: 1,
        strokeLinejoin: "round",
        pathLength: 1,
        strokeDasharray: "1 1",
        ...bind("model", "draw"),
      }),
      net.links.map((group, gap) =>
        group.map((d) =>
          s("path", {
            d,
            fill: "none",
            stroke: NOIR.gold,
            strokeOpacity: 0.5,
            strokeWidth: 1,
            strokeLinecap: "round",
            pathLength: 1,
            strokeDasharray: "1 1",
            ...bind("layers", "draw", { item: { i: gap, n: 3, share: LAYER_SHARE } }),
          }),
        ),
      ),
      net.layers.map((nodes, li) =>
        nodes.map((p) =>
          s("circle", {
            cx: p.x,
            cy: p.y,
            r: net.nodeR,
            fill: NOIR.gold,
            ...bind("layers", "fade", { item: { i: li, n: 3, share: LAYER_SHARE } }),
          }),
        ),
      ),
    ),
    // the signal: the wave, the soft area under it, and a ring on each crest it flags
    s(
      "g",
      { mask: `url(#${maskId})` },
      s("path", { d: area, fill: `url(#${gradientId})`, stroke: "none", ...bind("signal", "fade") }),
    ),
    s("path", {
      d: pathD(pts),
      fill: "none",
      stroke: NOIR.gold,
      strokeOpacity: 0.95,
      strokeWidth: 2.5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      pathLength: 1,
      strokeDasharray: "1 1",
      ...bind("signal", "draw"),
    }),
    peaks.map((p) =>
      s(
        "g",
        bind("crests", "fade"),
        s("circle", { cx: p.x, cy: p.y, r: 10, fill: "none", stroke: NOIR.gold, strokeOpacity: 0.55 }),
        s("circle", { cx: p.x, cy: p.y, r: 3.5, fill: NOIR.gold }),
      ),
    ),
    s("circle", { "data-pulse": "", cx: last.x, cy: last.y, r: 3, fill: NOIR.gold, ...bind("head", "fade") }),
    // where the model condenses: the carrier's point leaves from here
    s("circle", {
      "data-handoff-out": "",
      cx: layout.hex.cx,
      cy: layout.hex.cy,
      r: 1,
      fill: "none",
      stroke: "none",
    }),
  );
}

/** Research: documents gather into one, become a model, and come out as one clean signal. */
export const signalField: VisualFactory = (root, { compact, mode, handoff, lowPower }) => {
  root.className = compact ? "pv pv-research pv-framed" : "pv pv-research";
  root.dataset.pipelineVisual = "research";
  root.setAttribute("aria-hidden", "true");
  // The canvas is always rendered (React kept it across layouts).
  const canvas = h("canvas", {
    className: "pv-research-canvas",
    "aria-hidden": "true",
    width: 720,
    height: 620,
  });
  root.appendChild(canvas);

  return {
    build(size) {
      const layout = researchLayout(size.w, size.h, compact);
      root.replaceChildren(canvas);
      root.appendChild(researchSvg(layout));
      if (!compact) {
        root.append(
          h(
            "span",
            { className: "pv-chip pv-research-tag", style: rectStyle(layout.tags.ml), ...bind("tags", "rise") },
            "Machine Learning",
          ),
          h(
            "span",
            { className: "pv-chip pv-research-tag", style: rectStyle(layout.tags.dl), ...bind("tags", "rise") },
            "Deep Learning",
          ),
        );
      }
      const bindings: Binding[] = buildBindings(root);
      const pulse = root.querySelector<SVGCircleElement>("[data-pulse]");
      const model = root.querySelector<SVGGElement>("[data-collapse='model']");
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(layout.w * dpr);
      canvas.height = Math.round(layout.h * dpr);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      return (t, time) => {
        const state = researchState(t);
        const k = researchCollapse(handoff && mode === "scrub" ? collapseAt(t) : 0);
        if (ctx) drawResearch(ctx, layout, state, { time, lowPower, gather: k.docs });
        const bound = boundState(state, k);
        applyBindings(bindings, bound);
        const hex = { x: layout.hex.cx, y: layout.hex.cy };
        writeShrink(model, hex, 1 - (1 - POINT_SCALE) * k.model, 1 - k.gone);
        /* the pulse rides the signal's head; once the signal is out it loops along it (ambient only) */
        if (pulse) {
          const line = layout.signal.line;
          const share = time > 0 && bound.signal >= 1 ? (time / PULSE_MS) % 1 : bound.signal;
          const p = pointAt(line, share * line.length);
          pulse.setAttribute("cx", String(p.x));
          pulse.setAttribute("cy", String(p.y));
        }
      };
    },
  };
};
