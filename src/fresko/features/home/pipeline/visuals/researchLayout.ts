import { smoothstep } from "../chapterTimeline";
import {
  CHIP_H,
  STAGE_PAD,
  chipWidth,
  polyline,
  type Point,
  type Polyline,
  type Rect,
} from "./visualKit";

/** A gentle wave in unit space; `signalWave` rescales it to [-1, 1]. */
export function signalY(x: number): number {
  const normalized = x * Math.PI * 2;
  return 0.5 + Math.sin(normalized * 1.5) * 0.12 + Math.sin(normalized * 3.2 + 0.7) * 0.04;
}
const SIGNAL_HALF_RANGE = Math.max(
  ...Array.from({ length: 401 }, (_, i) => Math.abs(signalY(i / 400) - 0.5)),
);
const signalWave = (u: number): number => (signalY(u) - 0.5) / SIGNAL_HALF_RANGE;

const SIGNAL_SAMPLES = 80;
const BEND_SAMPLES = 16;
/** Width/height ratio below which the three stations stack top to bottom. */
const COLUMN_RATIO = 0.55;

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
/** The model's body: a rounded hexagon whose two pointed vertices are the in and out ports. */
export interface Hex {
  cx: number;
  cy: number;
  /** Centre to vertex. */
  R: number;
  /** Pointy top and bottom (the column layout), else pointy left and right. */
  column: boolean;
}
/** The small network inside the hexagon: three layers of nodes, curved links between them. */
export interface ModelNet {
  /** Node positions, one array per layer. */
  layers: Point[][];
  /** Curved links as path data, one group per gap between layers. */
  links: string[][];
  nodeR: number;
}

export interface ResearchLayout {
  w: number;
  h: number;
  compact: boolean;
  /** Column mode: noise on top, the model in the middle, the signal below. */
  column: boolean;
  cloud: Ellipse;
  model: Rect;
  inPort: Point;
  outPort: Point;
  /** The three layer lines inside the model. */
  layers: [Point, Point][];
  hex: Hex;
  net: ModelNet;
  signal: {
    pts: Point[];
    line: Polyline;
    x0: number;
    x1: number;
    minY: number;
    maxY: number;
    /** The wave's crests (up to three): where a signal is flagged. */
    peaks: Point[];
  };
  tags: { ml: Rect; dl: Rect };
  zones: { name: string; rect: Rect }[];
}

const NET_SHAPE = [3, 4, 3] as const;
const n2 = (v: number): string => String(Math.round(v * 100) / 100);

/** A hexagon with softened corners, as path data (quadratic corners through each vertex). */
export function hexPath({ cx, cy, R, column }: Hex, soften = 0.22): string {
  const start = column ? -Math.PI / 2 : 0;
  const v = Array.from({ length: 6 }, (_, i) => ({
    x: cx + R * Math.cos(start + (i * Math.PI) / 3),
    y: cy + R * Math.sin(start + (i * Math.PI) / 3),
  }));
  const between = (a: Point, b: Point, k: number): Point => ({
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
  });
  let d = "";
  v.forEach((corner, i) => {
    const prev = v[(i + 5) % 6]!;
    const next = v[(i + 1) % 6]!;
    const a = between(corner, prev, soften);
    const b = between(corner, next, soften);
    d += `${i === 0 ? "M" : "L"}${n2(a.x)} ${n2(a.y)}Q${n2(corner.x)} ${n2(corner.y)} ${n2(b.x)} ${n2(b.y)}`;
  });
  return `${d}Z`;
}

/** The network inside the hexagon, laid out along the flow (left to right, or top to bottom). */
function modelNet(hex: Hex): ModelNet {
  const { cx, cy, R, column } = hex;
  const at = (along: number, across: number): Point =>
    column ? { x: cx + across, y: cy + along } : { x: cx + along, y: cy + across };
  const layers = NET_SHAPE.map((count, li) =>
    Array.from({ length: count }, (_, k) =>
      at((li - 1) * 0.46 * R, (k - (count - 1) / 2) * (count === 3 ? 0.3 : 0.28) * R),
    ),
  );
  const links = [0, 1].map((gap) => {
    const group: string[] = [];
    for (const a of layers[gap]!) {
      for (const b of layers[gap + 1]!) {
        const mid = column ? { dx: 0, dy: (b.y - a.y) / 2 } : { dx: (b.x - a.x) / 2, dy: 0 };
        group.push(
          `M${n2(a.x)} ${n2(a.y)}C${n2(a.x + mid.dx)} ${n2(a.y + mid.dy)} ${n2(b.x - mid.dx)} ${n2(b.y - mid.dy)} ${n2(b.x)} ${n2(b.y)}`,
        );
      }
    }
    return group;
  });
  return { layers, links, nodeR: Math.max(2.6, 0.045 * R) };
}

/** Up to three crests of the wave, left to right (local minima of y). */
function crests(pts: readonly Point[]): Point[] {
  const found: Point[] = [];
  for (let i = 2; i < pts.length - 2; i += 1) {
    const p = pts[i]!;
    if (
      p.y < pts[i - 1]!.y &&
      p.y <= pts[i + 1]!.y &&
      p.y < pts[i - 2]!.y &&
      p.y <= pts[i + 2]!.y
    ) {
      found.push(p);
    }
  }
  return found.slice(0, 3);
}

/**
 * Compact (phone) row: the model sits a touch right of centre and the cloud is narrower, so
 * the document grid's right column ends clear of the hexagon. Centred, with an 84px floor,
 * the grid ran under the hexagon at every phone width (review, 2026-10-16).
 */
const COMPACT_MODEL_CX = 0.53;
const COMPACT_CLOUD = { cx: 0.19, rx: 0.165 } as const;

export function researchLayout(w: number, h: number, compact = false): ResearchLayout {
  const column = w / h < COLUMN_RATIO;
  const cx = !column && compact ? COMPACT_MODEL_CX * w : w / 2;
  const cy = h / 2;
  const s = column
    ? Math.max(88, Math.min(0.16 * w, 128))
    : compact
      ? Math.max(72, Math.min(0.27 * w, 140))
      : Math.max(140, Math.min(0.28 * w, 220));
  const model: Rect = { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
  const inPort: Point = column ? { x: cx, y: model.y } : { x: model.x, y: cy };
  const outPort: Point = column ? { x: cx, y: model.y + s } : { x: model.x + s, y: cy };

  const cloud: Ellipse = column
    ? { cx, cy: 0.24 * h, rx: 0.36 * w, ry: 0.09 * h }
    : compact
      ? { cx: COMPACT_CLOUD.cx * w, cy, rx: COMPACT_CLOUD.rx * w, ry: 0.4 * h }
      : { cx: 0.165 * w, cy, rx: 0.16 * w, ry: 0.22 * h };

  const layers = [0.28, 0.5, 0.72].map((f): [Point, Point] => [
    { x: model.x + 0.2 * s, y: model.y + f * s },
    { x: model.x + 0.8 * s, y: model.y + f * s },
  ]);

  /* the signal: one clean line out of the model's out-port */
  const pts: Point[] = [outPort];
  const run = (x0: number, x1: number, y: number, amplitude: number) => {
    for (let i = 0; i <= SIGNAL_SAMPLES; i += 1) {
      const u = i / SIGNAL_SAMPLES;
      pts.push({ x: x0 + (x1 - x0) * u, y: y + signalWave(u) * amplitude * smoothstep(u / 0.25) });
    }
  };
  let x0: number;
  let x1: number;
  if (column) {
    x0 = 0.08 * w;
    x1 = 0.92 * w;
    const runY = 0.72 * h;
    for (let i = 1; i <= BEND_SAMPLES; i += 1) {
      const k = i / BEND_SAMPLES;
      pts.push({
        x: outPort.x + (x0 - outPort.x) * smoothstep(k),
        y: outPort.y + (runY - outPort.y) * k,
      });
    }
    run(x0, x1, runY, 0.06 * h);
  } else {
    x0 = outPort.x + 0.03 * w;
    x1 = 0.94 * w;
    run(x0, x1, cy, 0.13 * h);
  }
  const ys = pts.map((p) => p.y);
  const signal = {
    pts,
    line: polyline(pts),
    x0,
    x1,
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    peaks: crests(pts),
  };
  const hex: Hex = { cx, cy, R: s / 2, column };
  const net = modelNet(hex);

  /* ML / DL chips: under the model (row) or beside it (column) */
  const mlW = chipWidth("Machine Learning");
  const dlW = chipWidth("Deep Learning");
  const stageRight = w * (1 - STAGE_PAD);
  const tags = column
    ? (() => {
        const x = Math.min(model.x + s + 14, stageRight - mlW);
        const top = cy - (2 * CHIP_H + 6) / 2;
        return {
          ml: { x, y: top, w: mlW, h: CHIP_H },
          dl: { x, y: top + CHIP_H + 6, w: dlW, h: CHIP_H },
        };
      })()
    : {
        ml: { x: cx - mlW / 2, y: model.y + s + 14, w: mlW, h: CHIP_H },
        dl: { x: cx - dlW / 2, y: model.y + s + 14 + CHIP_H + 6, w: dlW, h: CHIP_H },
      };

  const zones = compact
    ? []
    : [
        { name: "ml", rect: tags.ml },
        { name: "dl", rect: tags.dl },
      ];

  return {
    w,
    h,
    compact,
    column,
    cloud,
    model,
    inPort,
    outPort,
    layers,
    hex,
    net,
    signal,
    tags,
    zones,
  };
}
