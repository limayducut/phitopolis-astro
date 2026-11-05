import { TEAM_CARDS } from "../pipelineCopy";
import {
  STAGE_PAD,
  chipWidth,
  chipsBlockHeight,
  type Point,
  type Rect,
  flowChips,
  rectBottom,
  rectRight,
} from "./visualKit";

const TEAMS = TEAM_CARDS.filter((team) => team.chapter === "development");
export const SWE = TEAMS[0]!;
export const FULL_STACK = TEAMS[1]!;
/** Three chips per team: languages, tools and a methodology, each selected from the team's own list. */
const pick = (chips: readonly string[], wanted: readonly string[]): readonly string[] =>
  wanted.filter((name) => chips.includes(name));
export const SWE_CHIPS: readonly string[] = pick(SWE.chips, ["C++", "Rust", "Linux"]);
export const FS_CHIPS: readonly string[] = pick(FULL_STACK.chips, [
  "Typescript",
  "ReactJS",
  "CI/CD",
]);
export const NARROW_W = 560;
export const COMPACT_FRAME = { w: 320, h: 400 } as const;
const DEV_CHIP_H = 22;
const DEV_CHIP_PITCH = 30;
const CLOUD_GAP = 28;
/** The deployed product: one square per cloud. */
export const PRODUCT = 14;

export interface ChipPlacement {
  text: string;
  rect: Rect;
  /** Reveal order across both teams (alternating left/right). */
  order: number;
  /** The 8px hairline from the chip toward the module (wide layout only). */
  tick: [Point, Point] | null;
}
export interface ContainerPlacement {
  rect: Rect;
  dashed: boolean;
}

export interface DevelopmentLayout {
  w: number;
  h: number;
  compact: boolean;
  narrow: boolean;
  cx: number;
  spine: { y0: number; y1: number };
  /** The three source tiles. */
  tiles: [Rect, Rect, Rect];
  joinY: number;
  engine: Rect;
  chips: ChipPlacement[];
  containers: [ContainerPlacement, ContainerPlacement];
  iface: Rect;
  /** Feeders from each source tile into the spine. */
  feeders: Point[][];
  /** Feeders from each container into the interface. */
  delivery: Point[][];
  /** Packet routes: tile -> spine, ending at the engine top (before the extension). */
  routes: Point[][];
  engineTopY: number;
  ifaceTopY: number;
  zones: { name: string; rect: Rect }[];
}

const pathLength = (pts: readonly Point[]): number =>
  pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);
export function pointOnPath(pts: readonly Point[], distance: number): Point {
  let left = distance;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg || i === pts.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, left / seg);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= seg;
  }
  return pts[0]!;
}

/** Reveal order across both chip columns, alternating left and right. */
function devChipOrder(): Map<string, number> {
  const pairs: Array<[string, number]> = [];
  let k = 0;
  for (let i = 0; i < Math.max(SWE_CHIPS.length, FS_CHIPS.length); i += 1) {
    if (i < SWE_CHIPS.length) pairs.push([`l${String(i)}`, k++]);
    if (i < FS_CHIPS.length) pairs.push([`r${String(i)}`, k++]);
  }
  return new Map(pairs);
}

/**
 * Wide: the product at the centre, and everything that builds it arranged
 * around it — the data sources above, the technologies flanking, the two cloud
 * environments below. Each ring is a beat, so the picture assembles outward
 * from the thing being built instead of running top to bottom (owner,
 * 2026-10-12).
 *
 * There is no separate engine box here: `Interface` already draws the product
 * as a window with a title bar and content rows, so it is the one box on the
 * stage and `engine` points at it. The stacked layouts below still have theirs.
 */
function wideDevelopmentLayout(w: number, h: number): DevelopmentLayout {
  const cx = w / 2;
  const yTop = h * STAGE_PAD + 2;

  /* One vertical flow, measured and then centred on the stage, so the three
   *  rows sit close enough to read as a single assembly instead of drifting
   *  apart to the stage's edges (owner, 2026-10-12). */
  const tileW = Math.min(w * 0.19, 118);
  const tileH = tileW * 0.74;
  const ifaceW = Math.min(w * 0.36, 270);
  const ifaceH = Math.min(h * 0.2, 150);
  const cloudH = 84;
  const GAP_SOURCES = Math.max(56, Math.min(h * 0.08, 78));
  const GAP_CLOUDS = Math.max(48, Math.min(h * 0.07, 68));
  const blockH = tileH + GAP_SOURCES + ifaceH + GAP_CLOUDS + cloudH;
  const blockTop = Math.max(yTop, (h - blockH) / 2);

  /* The product, at the centre of it all. */
  const iface: Rect = {
    x: cx - ifaceW / 2,
    y: blockTop + tileH + GAP_SOURCES,
    w: ifaceW,
    h: ifaceH,
  };
  const ifaceMidY = iface.y + ifaceH / 2;

  /* The technologies, flanking it, each on a short tick pointing in. */
  const columnH = (Math.max(SWE_CHIPS.length, FS_CHIPS.length) - 1) * DEV_CHIP_PITCH + DEV_CHIP_H;
  const chipTop = ifaceMidY - columnH / 2;
  const flank = Math.max(34, Math.min(w * 0.06, 56));
  const orderOf = devChipOrder();
  const column = (texts: readonly string[], side: "l" | "r"): ChipPlacement[] =>
    texts.map((text, i): ChipPlacement => {
      const cw = chipWidth(text);
      const y = chipTop + i * DEV_CHIP_PITCH;
      const midY = y + DEV_CHIP_H / 2;
      const rect: Rect =
        side === "l"
          ? { x: iface.x - flank - cw, y, w: cw, h: DEV_CHIP_H }
          : { x: rectRight(iface) + flank, y, w: cw, h: DEV_CHIP_H };
      return {
        text,
        rect,
        order: orderOf.get(`${side}${String(i)}`) ?? i,
        tick:
          side === "l"
            ? [
                { x: rectRight(rect), y: midY },
                { x: iface.x, y: midY },
              ]
            : [
                { x: rect.x, y: midY },
                { x: rectRight(iface), y: midY },
              ],
      };
    });
  const chips = [...column(SWE_CHIPS, "l"), ...column(FS_CHIPS, "r")];

  /* The data that feeds it: three application windows in a row above. */
  const tiles = [0.27, 0.5, 0.73].map((f) => ({
    x: w * f - tileW / 2,
    y: blockTop,
    w: tileW,
    h: tileH,
  })) as [Rect, Rect, Rect];
  const joinY = blockTop + tileH + 14;
  const feeders = tiles.map((gr) => [
    { x: gr.x + gr.w / 2, y: gr.y + gr.h },
    { x: gr.x + gr.w / 2, y: joinY },
    { x: cx, y: joinY },
  ]);
  const routes = feeders.map((f) => [...f, { x: cx, y: iface.y }]);

  /* The environments it runs in: two clouds below, each holding the product. */
  const cloudW = Math.min(w * 0.26, 190);
  const cloudGap = Math.max(w * 0.05, 40);
  const cloudTop = rectBottom(iface) + GAP_CLOUDS;
  const leftRect: Rect = { x: cx - cloudGap / 2 - cloudW, y: cloudTop, w: cloudW, h: cloudH };
  const rightRect: Rect = { x: cx + cloudGap / 2, y: cloudTop, w: cloudW, h: cloudH };
  const containers: [ContainerPlacement, ContainerPlacement] = [
    { rect: leftRect, dashed: true },
    { rect: rightRect, dashed: false },
  ];

  /* Deployment: the product leaves the window and lands in each cloud. */
  const midY = (rectBottom(iface) + cloudTop) / 2;
  const delivery = [leftRect, rightRect].map((r) => {
    const tx = r.x + r.w / 2;
    return [
      { x: cx, y: rectBottom(iface) },
      { x: cx, y: midY },
      { x: tx, y: midY },
      { x: tx, y: cloudTop },
    ];
  });

  return {
    w,
    h,
    compact: false,
    narrow: false,
    cx,
    spine: { y0: joinY, y1: iface.y },
    tiles,
    joinY,
    engine: iface,
    chips,
    containers,
    iface,
    feeders,
    delivery,
    routes,
    engineTopY: iface.y,
    ifaceTopY: iface.y,
    zones: chips.map((c) => ({ name: `chip-${c.text}`, rect: c.rect })),
  };
}

export function developmentLayout(w: number, h: number, compact = false): DevelopmentLayout {
  if (!compact && w >= NARROW_W) return wideDevelopmentLayout(w, h);
  const narrow = !compact && w < NARROW_W;
  const cx = w / 2;
  const pad = w * STAGE_PAD;
  const yTop = h * STAGE_PAD + 2;
  const yBottom = h * (1 - STAGE_PAD);
  const gap = compact ? 12 : CLOUD_GAP;

  /* Row A: three source tiles, no enclosing box */
  const g = Math.min(0.09 * h, 0.13 * w, 72);
  const tiles = [0.31, 0.5, 0.69].map((f) => ({ x: w * f - g / 2, y: yTop, w: g, h: g })) as [
    Rect,
    Rect,
    Rect,
  ];
  const joinY = yTop + g + 12;

  /* Row B: the engine, with the chips flowing underneath it. Only the stacked
   *  layouts reach here — the wide one is centred on the product instead and
   *  returned above. */
  const engineW = w * 0.28;
  const engineX = cx - engineW / 2;

  let engine: Rect;
  let chips: ChipPlacement[] = [];
  let bBottom: number;
  const interleave = (left: number, right: number) => {
    const order: Array<["l" | "r", number]> = [];
    for (let i = 0; i < Math.max(left, right); i += 1) {
      if (i < left) order.push(["l", i]);
      if (i < right) order.push(["r", i]);
    }
    return order;
  };
  const orderOf = new Map(
    interleave(SWE_CHIPS.length, FS_CHIPS.length).map(([side, i], n) => [`${side}${String(i)}`, n]),
  );

  if (compact) {
    engine = { x: engineX, y: joinY + 14, w: engineW, h: Math.max(40, h * 0.1) };
    bBottom = rectBottom(engine);
  } else {
    engine = { x: engineX, y: joinY + 14, w: engineW, h: 44 };
    const blockW = w * 0.44;
    const top = rectBottom(engine) + 10;
    const place = (texts: readonly string[], x: number, side: "l" | "r") =>
      flowChips(texts, x, top + 6, blockW).map((r, i): ChipPlacement => ({
        text: texts[i]!,
        rect: { ...r, h: DEV_CHIP_H },
        order: orderOf.get(`${side}${String(i)}`) ?? i,
        tick: null,
      }));
    chips = [...place(SWE_CHIPS, pad, "l"), ...place(FS_CHIPS, w - pad - blockW, "r")];
    bBottom =
      top + 6 + Math.max(chipsBlockHeight(SWE_CHIPS, blockW), chipsBlockHeight(FS_CHIPS, blockW));
  }

  /* Rows C and D, with slack spread so the stack fills the stage.
   *  The clouds and the interface are sized to hug what they hold (one product
   *  square each, and two bars) rather than to fill the stage: stretched to the
   *  old 0.4w × 170 they were large hollow rectangles, which read as empty
   *  states — the dashed one as a drop zone (owner, 2026-10-12). */
  const hC = compact
    ? Math.max(56, h * 0.12)
    : Math.max(60, Math.min((h > 1.5 * w ? 0.09 : 0.075) * h, 104));
  const ifaceMax = compact ? h * 0.2 : Math.min(0.1 * h, 96);
  const naturalC = bBottom + gap;
  const naturalD = naturalC + hC + gap;
  const naturalEnd = naturalD + Math.max(60, ifaceMax * 0.75);
  const dEnd = compact ? h * 0.97 : yBottom - 8;
  const slack = Math.max(0, dEnd - naturalEnd);
  const cTop = naturalC + slack * 0.4;
  const dTop = naturalD + slack * 0.7;
  const ifaceW = compact ? w * 0.4 : Math.min(w * 0.28, 260);
  const iface: Rect = {
    x: cx - ifaceW / 2,
    y: dTop,
    w: ifaceW,
    h: Math.min(ifaceMax, dEnd - dTop),
  };

  const cloudGap = Math.max(w * 0.08, 56);
  // Each cloud is sized to its one product square, not to the half-stage it
  // used to span, and the pair stays centred on the thread.
  const cloudW = compact ? cx - cloudGap / 2 - w * 0.1 : Math.min(w * 0.2, 184);
  const leftRect: Rect = { x: cx - cloudGap / 2 - cloudW, y: cTop, w: cloudW, h: hC };
  const rightRect: Rect = { x: cx + cloudGap / 2, y: cTop, w: cloudW, h: hC };
  const containers: [ContainerPlacement, ContainerPlacement] = [
    { rect: leftRect, dashed: true },
    { rect: rightRect, dashed: false },
  ];

  const feeders = tiles.map((gr) => [
    { x: gr.x + gr.w / 2, y: gr.y + gr.h },
    { x: gr.x + gr.w / 2, y: joinY },
    { x: cx, y: joinY },
  ]);
  const routes = feeders.map((f) => [...f, { x: cx, y: engine.y }]);
  const midY = (rectBottom(leftRect) + iface.y) / 2;
  const delivery = [leftRect, rightRect].map((r, i) => {
    const sx = i === 0 ? rectRight(r) - 30 : r.x + 30;
    return [
      { x: sx, y: rectBottom(r) },
      { x: sx, y: midY },
      { x: cx, y: midY },
      { x: cx, y: iface.y },
    ];
  });

  const zones: { name: string; rect: Rect }[] = compact
    ? []
    : chips.map((c) => ({ name: `chip-${c.text}`, rect: c.rect }));

  return {
    w,
    h,
    compact,
    narrow,
    cx,
    spine: { y0: yTop, y1: iface.y },
    tiles,
    joinY,
    engine,
    chips,
    containers,
    iface,
    feeders,
    delivery,
    routes,
    engineTopY: engine.y,
    ifaceTopY: iface.y,
    zones,
  };
}

export const PACKETS_PER_ROUTE = 1;
const PACKET_SPEED = 0.09; // px per ms

/**
 * Where packet `k` of route `r` is. The route is tile -> spine, running down
 * the spine to `mix(engine top, interface top, reach)`. `time` is the ambient
 * clock (0 = rest pose, packets spread along the route, offset per route).
 */
export function packetPosition(
  layout: DevelopmentLayout,
  r: number,
  k: number,
  time: number,
  reach: number,
): Point {
  const base = layout.routes[r]!;
  const endY = layout.engineTopY + (layout.ifaceTopY - layout.engineTopY) * reach;
  const pts = [...base, { x: layout.cx, y: Math.max(layout.engineTopY, endY) }];
  const length = pathLength(pts);
  const d = (((k + 0.5) / PACKETS_PER_ROUTE + r * 0.21) * length + time * PACKET_SPEED) % length;
  return pointOnPath(pts, d);
}
