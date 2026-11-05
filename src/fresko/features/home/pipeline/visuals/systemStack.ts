/**
 * SystemStack.tsx, ported. Development: the paragraph is the stack, data to engineering to
 * cloud to end users. Three source windows feed the product, which deploys into a private
 * and a public cloud and delivers to its users; the compact (phone) frame is a fixed 320x400.
 */
import { NOIR } from "@/shared/theme/palette";
import { CHIP_SHARE, MODULE_SHARE, SOURCE_SHARE, developmentState } from "./developmentState";
import {
  DEVELOPMENT_EMERGED,
  POINT_SCALE,
  collapseAt,
  developmentCollapse,
  developmentEmerge,
  seedOpacity,
  writeShrink,
} from "./handoffState";
import {
  COMPACT_FRAME,
  PACKETS_PER_ROUTE,
  developmentLayout,
  packetPosition,
  type DevelopmentLayout,
} from "./systemStackGeometry";
import {
  applyBindings,
  bind,
  buildBindings,
  chipWidth,
  pathD,
  rectStyle,
  staggerItem,
  type BindOptions,
  type Point,
  type Rect,
} from "./visualKit";
import { h, nextId, s, type Child } from "./dom";
import type { VisualFactory } from "./visualRuntime";

const CORNER = 6;
/** The product as it sits inside an environment: a small application window. */
const PRODUCT_W = 40;
const PRODUCT_H = 28;
/** In the handoff's collapse the sources and environments gather to this scale as they fade. */
const OUTER_GATHER_SCALE = 0.6;

/** A plain rounded rectangle, clockwise from the top edge. */
const rectD = (r: Rect, c = CORNER): string => {
  const n = (v: number): string => String(v);
  const corner = (x: number, y: number): string => `A${n(c)} ${n(c)} 0 0 1 ${n(x)} ${n(y)}`;
  const [x1, y1] = [r.x + r.w, r.y + r.h];
  return `M${n(r.x + c)} ${n(r.y)}H${n(x1 - c)}${corner(x1, r.y + c)}V${n(y1 - c)}${corner(x1 - c, y1)}H${n(r.x + c)}${corner(r.x, y1 - c)}V${n(r.y + c)}${corner(r.x + c, r.y)}Z`;
};

interface DrawProps extends BindOptions {
  d: string;
  ch: string;
  color?: string;
  opacity?: number;
  width?: number;
}
/** A stroke that draws itself (pathLength 1) from the channel; the default is fully drawn. */
function draw({ d, ch, color = NOIR.frost, opacity = 1, width = 1, ...options }: DrawProps) {
  return s("path", {
    d,
    fill: "none",
    stroke: color,
    strokeOpacity: opacity,
    strokeWidth: width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    pathLength: 1,
    strokeDasharray: "1 1",
    ...bind(ch, "draw", options),
  });
}

/** The title bar every window shares: a hairline under it and three dots at its left. */
const barOf = (r: Rect): number => Math.min(14, Math.max(9, r.h * 0.2));

function titleBar({
  r,
  ch,
  line,
  dots,
  color = NOIR.frost,
  opacity = 0.5,
}: {
  r: Rect;
  ch: string;
  line: BindOptions;
  dots: BindOptions;
  color?: string;
  opacity?: number;
}): Child[] {
  const bar = barOf(r);
  return [
    draw({
      d: `M${String(r.x)} ${String(r.y + bar)}H${String(r.x + r.w)}`,
      ch,
      color,
      opacity: opacity * 0.7,
      ...line,
    }),
    ...[0, 1, 2].map((i) =>
      s("circle", {
        cx: r.x + bar * 0.62 + i * bar * 0.5,
        cy: r.y + bar / 2,
        r: Math.max(1.4, bar * 0.14),
        fill: color,
        ...bind(ch, "fade", { ...dots, max: opacity }),
      }),
    ),
  ];
}

/** The content box of a window: under its title bar, inside a small margin. */
function innerOf(r: Rect): Rect {
  const bar = barOf(r);
  const pad = Math.max(6, r.w * 0.09);
  return { x: r.x + pad, y: r.y + bar + pad * 0.8, w: r.w - 2 * pad, h: r.h - bar - pad * 1.6 };
}

/** The centre of the machine-learning window's network: where the carrier lands and it grows from. */
function mlCentre(layout: DevelopmentLayout): Point {
  const net = innerOf(layout.tiles[1]);
  return { x: net.x + net.w / 2, y: net.y + net.h / 2 };
}

/** The product window's centre: where the diagram condenses to the carrier's point. */
const ifaceCentre = ({ iface }: DevelopmentLayout): Point => ({
  x: iface.x + iface.w / 2,
  y: iface.y + iface.h / 2,
});

/** The three data sources, each an application window: a scatter plot, a small network, a table. */
function windows(layout: DevelopmentLayout): Child[] {
  const item = (i: number): BindOptions => ({ item: { i, n: 3, share: SOURCE_SHARE } });
  const [science, learning, store] = layout.tiles;
  const at = (r: Rect, fx: number, fy: number): Point => ({ x: r.x + fx * r.w, y: r.y + fy * r.h });
  const sci = innerOf(science);
  const net = innerOf(learning);
  const tab = innerOf(store);
  const hidden: Point[] = [at(net, 0.5, 0.3), at(net, 0.5, 0.7)];
  const inputs: Point[] = [at(net, 0.1, 0.18), at(net, 0.1, 0.5), at(net, 0.1, 0.82)];
  const output = at(net, 0.9, 0.5);
  const seed = mlCentre(layout);
  const links = [
    ...inputs.flatMap((a) => hidden.map((b) => [a, b] as const)),
    ...hidden.map((a) => [a, output] as const),
  ];
  const trend = [0.78, 0.64, 0.7, 0.5, 0.42, 0.24];
  return [
    titleBar({ r: science, ch: "sources", line: item(0), dots: item(0) }),
    titleBar({ r: learning, ch: "sources", line: item(1), dots: item(1) }),
    titleBar({ r: store, ch: "sources", line: item(2), dots: item(2) }),

    // data science: a scatter plot on its axes, with its trend
    draw({
      d: `M${String(sci.x)} ${String(sci.y)}V${String(sci.y + sci.h)}H${String(sci.x + sci.w)}`,
      ch: "sources",
      opacity: 0.5,
      ...item(0),
    }),
    trend.map((fy, k) => {
      const p = at(sci, 0.14 + k * 0.15, fy);
      return s("circle", { cx: p.x, cy: p.y, r: 2.1, fill: NOIR.gold, ...bind("sources", "fade", item(0)) });
    }),
    draw({
      d: `M${String(at(sci, 0.1, 0.84).x)} ${String(at(sci, 0.1, 0.84).y)}Q${String(at(sci, 0.5, 0.5).x)} ${String(at(sci, 0.5, 0.5).y)} ${String(at(sci, 0.92, 0.2).x)} ${String(at(sci, 0.92, 0.2).y)}`,
      ch: "sources",
      color: NOIR.gold,
      opacity: 0.7,
      ...item(0),
    }),

    // machine learning: inputs, a hidden layer, one output. In the handoff it grows out of
    // the point the carrier lands on: the Research model becomes this input.
    s(
      "g",
      { "data-ml-net": "" },
      draw({
        d: links.map(([a, b]) => `M${String(a.x)} ${String(a.y)}L${String(b.x)} ${String(b.y)}`).join(""),
        ch: "mlNet",
        opacity: 0.5,
      }),
      [...inputs, ...hidden, output].map((n) =>
        s("circle", { cx: n.x, cy: n.y, r: 2.5, fill: NOIR.gold, ...bind("mlNet", "fade") }),
      ),
    ),
    // the landed point (the carrier's landing anchor), shown only in the handoff
    s("circle", {
      "data-ml-seed": "",
      "data-handoff-in": "",
      cx: seed.x,
      cy: seed.y,
      r: 3,
      fill: NOIR.gold,
      opacity: 0,
    }),

    // big data: a table, header then rows
    [0, 1, 2, 3].map((row) => {
      const y = tab.y + tab.h * (0.08 + row * 0.3);
      return s(
        "g",
        null,
        draw({
          d: `M${String(tab.x)} ${String(y)}h${String(tab.w * 0.3)}`,
          ch: "sources",
          color: row === 0 ? NOIR.gold : NOIR.frost,
          opacity: row === 0 ? 0.9 : 0.55,
          width: 3,
          ...item(2),
        }),
        draw({
          d: `M${String(tab.x + tab.w * 0.42)} ${String(y)}h${String(tab.w * (row === 0 ? 0.5 : 0.42 - row * 0.04))}`,
          ch: "sources",
          opacity: 0.45,
          width: 3,
          ...item(2),
        }),
      );
    }),
  ];
}

/** The product: an application window, with a sidebar, three stat cards and a chart, filled in last. */
function productInterface(layout: DevelopmentLayout): Child[] {
  const r = layout.iface;
  const bar = barOf(r);
  const item = (i: number): BindOptions => ({ item: { i, n: 8, share: 0.32 } });
  const side = Math.max(24, r.w * 0.13);
  const body: Rect = { x: r.x + side + 8, y: r.y + bar + 8, w: r.w - side - 16, h: r.h - bar - 16 };
  const cardH = Math.min(22, body.h * 0.26);
  const cardW = (body.w - 2 * 6) / 3;
  const chart: Rect = {
    x: body.x,
    y: body.y + cardH + 8,
    w: body.w,
    h: Math.max(12, body.h - cardH - 8),
  };
  const wave = [0.8, 0.55, 0.64, 0.34, 0.46, 0.18]
    .map((fy, k, all) => {
      const x = chart.x + (chart.w * k) / (all.length - 1);
      return `${k === 0 ? "M" : "L"}${String(x)} ${String(chart.y + chart.h * fy)}`;
    })
    .join("");
  return [
    draw({ d: rectD(r), ch: "interface", color: NOIR.gold, opacity: 0.9 }),
    titleBar({
      r,
      ch: "interface",
      line: { at: { at: 0.25, share: 0.4 } },
      dots: {},
      color: NOIR.gold,
      opacity: 0.9,
    }),
    // sidebar: a rail of icon squares
    draw({
      d: `M${String(r.x + side)} ${String(r.y + bar)}V${String(r.y + r.h)}`,
      ch: "delivery",
      opacity: 0.3,
      ...item(0),
    }),
    [0, 1, 2, 3].map((i) =>
      s("rect", {
        x: r.x + (side - 9) / 2,
        y: r.y + bar + 9 + i * 14,
        width: 9,
        height: 9,
        rx: 2.5,
        fill: i === 0 ? NOIR.gold : NOIR.frost,
        ...bind("delivery", "fade", { ...item(i), max: i === 0 ? 0.9 : 0.5 }),
      }),
    ),
    // three stat cards
    [0, 1, 2].map((i) => {
      const card: Rect = { x: body.x + i * (cardW + 6), y: body.y, w: cardW, h: cardH };
      return s(
        "g",
        null,
        draw({ d: rectD(card, 4), ch: "delivery", opacity: 0.5, ...item(4 + i) }),
        draw({
          d: `M${String(card.x + 6)} ${String(card.y + card.h * 0.62)}h${String(card.w * 0.45)}`,
          ch: "delivery",
          color: NOIR.gold,
          opacity: 0.85,
          width: 3,
          ...item(4 + i),
        }),
      );
    }),
    // the chart, last
    draw({ d: wave, ch: "delivery", color: NOIR.gold, opacity: 0.95, width: 2, item: { i: 7, n: 8, share: 0.32 } }),
  ];
}

function stackSvg(layout: DevelopmentLayout, compact: boolean): SVGSVGElement {
  const maskId = `pv-dev-mask-${nextId()}`;
  const { cx } = layout;
  const [left, right] = layout.containers;
  const module = (i: number): BindOptions => ({ item: { i, n: 4, share: MODULE_SHARE } });
  const engineCentre: Point = {
    x: layout.engine.x + layout.engine.w / 2,
    y: layout.engine.y + layout.engine.h / 2,
  };
  const product = (c: Rect) => {
    // Left of centre, under the environment's title bar, so its name sits below it and
    // the little services stack sits to its right.
    const bar = barOf(c);
    const centre = { x: c.x + c.w * 0.3, y: c.y + bar + (c.h - bar) * 0.4 };
    return {
      rect: { x: centre.x - PRODUCT_W / 2, y: centre.y - PRODUCT_H / 2, w: PRODUCT_W, h: PRODUCT_H },
      from: { x: engineCentre.x - centre.x, y: engineCentre.y - centre.y },
    };
  };
  return s(
    "svg",
    {
      className: compact ? "pv-dev-svg station-mobile-interface" : "pv-dev-svg",
      viewBox: `0 0 ${String(layout.w)} ${String(layout.h)}`,
      preserveAspectRatio: compact ? "xMidYMid meet" : "none",
      "aria-hidden": "true",
      focusable: "false",
    },
    s(
      "defs",
      null,
      s(
        "mask",
        { id: maskId, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: layout.w, height: layout.h },
        s("path", {
          d: rectD(left.rect),
          fill: "none",
          stroke: NOIR.white,
          strokeWidth: 4,
          pathLength: 1,
          strokeDasharray: "1 1",
          ...bind("modules", "draw", module(2)),
        }),
      ),
    ),
    // everything around the product; in the handoff it gathers in and fades
    s(
      "g",
      { "data-collapse": "outer" },
      // blueprint: spine, then four empty stations in sequence
      draw({
        d: `M${String(cx)} ${String(layout.spine.y0)}V${String(layout.spine.y1)}`,
        ch: "spine",
        color: NOIR.gold,
        opacity: 0.6,
      }),
      layout.tiles.map((tile) => draw({ d: rectD(tile), ch: "modules", opacity: 0.45, ...module(0) })),
      // The engine box belongs to the stacked (compact/narrow) layouts. The wide one centres
      // on the product, whose window `Interface` already draws.
      layout.engine === layout.iface
        ? null
        : draw({ d: rectD(layout.engine), ch: "modules", opacity: 0.45, ...module(1) }),
      s("path", {
        d: rectD(left.rect),
        fill: "none",
        stroke: NOIR.frost,
        strokeOpacity: 0.45,
        strokeWidth: 1,
        strokeDasharray: "5 4",
        mask: `url(#${maskId})`,
      }),
      draw({ d: rectD(right.rect), ch: "modules", opacity: 0.45, ...module(2) }),
      // sources
      windows(layout),
      layout.feeders.map((f, i) =>
        draw({ d: pathD(f), ch: "feeders", color: NOIR.gold, opacity: 0.7, item: { i, n: 3, share: 0.5 } }),
      ),
      // the engine, staffed (stacked layouts only — see above)
      layout.engine === layout.iface
        ? null
        : s("path", {
            d: rectD(layout.engine),
            fill: "none",
            stroke: NOIR.gold,
            strokeWidth: 1,
            opacity: 0.9,
            ...bind("engine", "fade", { max: 0.9 }),
          }),
      !compact
        ? layout.chips.map((c) =>
            c.tick
              ? draw({
                  d: pathD(c.tick),
                  ch: "chips",
                  opacity: 0.35,
                  item: { i: c.order, n: layout.chips.length, share: CHIP_SHARE },
                })
              : null,
          )
        : null,
      // deploy into both clouds
      [left, right].map((c) => {
        const p = product(c.rect);
        return s(
          "g",
          null,
          s("path", {
            d: rectD(c.rect),
            fill: NOIR.gold,
            fillOpacity: 0.06,
            stroke: "none",
            ...bind("containers", "fill", { max: 0.06 }),
          }),
          s("path", {
            d: rectD(c.rect),
            fill: "none",
            stroke: NOIR.gold,
            strokeWidth: 1,
            strokeDasharray: c.dashed ? "5 4" : undefined,
            opacity: 0.8,
            ...bind("containers", "fade", { max: 0.8 }),
          }),
          titleBar({ r: c.rect, ch: "containers", line: {}, dots: {}, color: NOIR.gold, opacity: 0.8 }),
          [0, 1, 2, 3].map((k) =>
            s("rect", {
              x: c.rect.x + c.rect.w * 0.64 + (k % 2) * 14,
              y: c.rect.y + barOf(c.rect) + 10 + Math.floor(k / 2) * 14,
              width: 9,
              height: 9,
              rx: 2.5,
              fill: NOIR.gold,
              ...bind("containers", "fade", { item: { i: k, n: 4, share: 0.4 }, max: 0.55 }),
            }),
          ),
          s(
            "g",
            bind("deploy", "slide", { from: p.from }),
            s("rect", {
              x: p.rect.x,
              y: p.rect.y,
              width: p.rect.w,
              height: p.rect.h,
              rx: 3,
              fill: NOIR.gold,
              fillOpacity: 0.14,
              stroke: NOIR.gold,
              strokeOpacity: 0.9,
            }),
            s("path", {
              d: `M${String(p.rect.x)} ${String(p.rect.y + 8)}h${String(p.rect.w)}M${String(p.rect.x + 6)} ${String(p.rect.y + 15)}h${String(p.rect.w * 0.55)}M${String(p.rect.x + 6)} ${String(p.rect.y + 21)}h${String(p.rect.w * 0.35)}`,
              stroke: NOIR.gold,
              strokeOpacity: 0.85,
              strokeWidth: 2,
              strokeLinecap: "round",
              fill: "none",
            }),
          ),
        );
      }),
      // delivery to the people who use it
      layout.delivery.map((f) => draw({ d: pathD(f), ch: "delivery", color: NOIR.gold, opacity: 0.7 })),
      s(
        "g",
        bind("packets", "fade"),
        layout.routes.flatMap((_, r) =>
          Array.from({ length: PACKETS_PER_ROUTE }, (_k, k) => {
            const p = packetPosition(layout, r, k, 0, 1);
            return s("circle", {
              "data-packet": `${String(r)}:${String(k)}`,
              cx: p.x,
              cy: p.y,
              r: 3,
              fill: NOIR.gold,
            });
          }),
        ),
      ),
    ),
    // the product; in the handoff it shrinks to the carrier's point
    s(
      "g",
      { "data-collapse": "core" },
      draw({ d: rectD(layout.iface), ch: "modules", opacity: 0.45, ...module(3) }),
      productInterface(layout),
    ),
    s("circle", {
      "data-handoff-out": "",
      cx: ifaceCentre(layout).x,
      cy: ifaceCentre(layout).y,
      r: 1,
      fill: "none",
      stroke: "none",
    }),
  );
}

/** Development: the paragraph is the stack, data to engineering to cloud to end users. */
export const systemStack: VisualFactory = (root, { compact, mode, handoff, clock }) => {
  root.className = compact ? "pv pv-development pv-compact station-mobile-final" : "pv pv-development";
  root.dataset.pipelineVisual = "development";
  root.setAttribute("aria-hidden", "true");

  return {
    build(size) {
      const layout = compact
        ? developmentLayout(COMPACT_FRAME.w, COMPACT_FRAME.h, true)
        : developmentLayout(size.w, size.h);
      root.replaceChildren(stackSvg(layout, compact));
      if (!compact) {
        for (const c of layout.chips) {
          root.appendChild(
            h(
              "span",
              {
                className: "pv-chip pv-dev-chip",
                style: rectStyle(c.rect),
                ...bind("chips", "rise", {
                  item: { i: c.order, n: layout.chips.length, share: CHIP_SHARE },
                }),
              },
              c.text,
            ),
          );
        }
        // The environments are named in the clause's own words — "within public or private
        // cloud environments" — so the dashed one reads as private and the solid one as public.
        for (const c of layout.containers) {
          const text = c.dashed ? "private" : "public";
          const lw = chipWidth(text);
          root.appendChild(
            h(
              "span",
              {
                className: "pv-chip pv-dev-cloud",
                style: rectStyle({
                  x: c.rect.x + (c.rect.w - lw) / 2,
                  y: c.rect.y + c.rect.h - 24,
                  w: lw,
                  h: 18,
                }),
                ...bind("cloudLabels", "rise"),
              },
              text,
            ),
          );
        }
      }
      const bindings = buildBindings(root);
      const packets = [...root.querySelectorAll<SVGCircleElement>("[data-packet]")];
      const parts = {
        net: root.querySelector<SVGGElement>("[data-ml-net]"),
        seed: root.querySelector<SVGCircleElement>("[data-ml-seed]"),
        outer: root.querySelector<SVGGElement>("[data-collapse='outer']"),
        core: root.querySelector<SVGGElement>("[data-collapse='core']"),
      };

      return (t, time) => {
        const state = developmentState(t);
        const on = handoff && mode === "scrub";
        const emerge = on ? developmentEmerge(t, clock.beatCount) : DEVELOPMENT_EMERGED;
        const k = developmentCollapse(on ? collapseAt(t) : 0);
        applyBindings(bindings, {
          ...state,
          chips: state.chips * (1 - k.labels),
          cloudLabels: state.containers * (1 - k.labels),
          mlNet: on ? emerge.grow : staggerItem(state.sources, 1, 3, SOURCE_SHARE),
        });
        const seed = mlCentre(layout);
        writeShrink(parts.net, seed, on ? POINT_SCALE + (1 - POINT_SCALE) * emerge.grow : 1, 1);
        parts.seed?.setAttribute("opacity", String(on ? seedOpacity(emerge) : 0));
        const centre = ifaceCentre(layout);
        writeShrink(parts.outer, centre, 1 - (1 - OUTER_GATHER_SCALE) * k.outer, 1 - k.outer);
        writeShrink(parts.core, centre, 1 - (1 - POINT_SCALE) * k.core, 1 - k.gone);
        packets.forEach((dot) => {
          const [r, kk] = (dot.dataset.packet ?? "0:0").split(":").map(Number);
          const p = packetPosition(layout, r ?? 0, kk ?? 0, time, state.packetsToUser);
          dot.setAttribute("cx", String(p.x));
          dot.setAttribute("cy", String(p.y));
        });
      };
    },
  };
};
