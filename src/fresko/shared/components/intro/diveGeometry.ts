/**
 * Mark + dive geometry — the pure half of the intro.
 *
 * No DOM, no React. Derived from the mark's own vector data
 * (`phitopolisMarkPaths.ts`; absolute `M`/`C`/`Z` only — the parser asserts
 * that):
 *
 *  - `getMarkPolygons()` flattens the three mark paths into polygons
 *    (translates baked in); `markHitAt()` tests a point against them.
 *  - `buildDivePathD()` bakes the mark into pixel space as HOLES in a
 *    viewport-sized rect (even-odd), for the P-window dive.
 *  - `diveGeometry()` gives the dive's scale origin and end scale.
 */

import {
  PHITOPOLIS_MARK_PATHS,
  PHITOPOLIS_MARK_VIEWBOX,
  type PhitopolisMarkPath,
} from "../phitopolisMarkPaths";

/* ── mark geometry ─────────────────────────────────────────────────────── */

const [VB_X, VB_Y, VB_W, VB_H] = PHITOPOLIS_MARK_VIEWBOX.split(/\s+/).map(Number) as [
  number,
  number,
  number,
  number,
];

/** The mark's viewBox, in mark units. */
export const MARK_VIEWBOX = { x: VB_X, y: VB_Y, w: VB_W, h: VB_H } as const;
/** width / height of the mark — the logo box's aspect ratio. */
export const MARK_ASPECT = VB_W / VB_H;

/**
 * The point the dive scales around, in mark units: the centre of the widest
 * inscribed circle inside the mark's solid (the right-hand side of the upper P's bowl).
 * `clearance` is that circle's radius — the distance to the nearest edge — so
 * the scale needed to cover the viewport is `farthestCorner / (clearance*k)`.
 * Found by a brute-force grid search over the flattened polygons; pinned by
 * `tests/motion/dive-geometry.test.ts`, which re-measures it.
 */
export const DIVE_ORIGIN = { x: 2147, y: 673, clearance: 123 } as const;

export interface MarkPolygon {
  accent: boolean;
  /** Flattened outline: x0, y0, x1, y1, … in mark (viewBox) units. */
  pts: Float64Array;
}

const TOKEN_RE = /[MCZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function parseTranslate(transform: string): [number, number] {
  const m = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(transform);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

type PathOp = { op: "M"; x: number; y: number } | { op: "C"; c: number[] } | { op: "Z" };

function parseD(d: string): PathOp[] {
  const tokens = d.match(TOKEN_RE) ?? [];
  const ops: PathOp[] = [];
  let i = 0;
  let cmd = "";
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        ops.push({ op: "Z" });
        continue;
      }
    }
    if (cmd === "M") ops.push({ op: "M", x: num(), y: num() });
    else if (cmd === "C") ops.push({ op: "C", c: [num(), num(), num(), num(), num(), num()] });
    else throw new Error(`phitopolis mark: unsupported path command "${cmd}"`);
  }
  return ops;
}

function flatten(path: PhitopolisMarkPath, segments: number): MarkPolygon {
  const [tx, ty] = parseTranslate(path.transform);
  const out: number[] = [];
  let cx = 0;
  let cy = 0;
  for (const o of parseD(path.d)) {
    if (o.op === "M") {
      cx = o.x;
      cy = o.y;
      out.push(cx + tx, cy + ty);
    } else if (o.op === "C") {
      const [x1, y1, x2, y2, x3, y3] = o.c as [number, number, number, number, number, number];
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const e = t * t * t;
        out.push(a * cx + b * x1 + c * x2 + e * x3 + tx, a * cy + b * y1 + c * y2 + e * y3 + ty);
      }
      cx = x3;
      cy = y3;
    }
  }
  return { accent: path.accent, pts: Float64Array.from(out) };
}

let polygonCache: MarkPolygon[] | null = null;

/** The mark as three flattened polygons (memoised). */
export function getMarkPolygons(): MarkPolygon[] {
  polygonCache ??= PHITOPOLIS_MARK_PATHS.map((p) => flatten(p, 4));
  return polygonCache;
}

/** Even-odd point-in-polygon against the whole mark. 0 = outside, 1 = P, 2 = accent. */
export function markHitAt(
  x: number,
  y: number,
  polys: MarkPolygon[] = getMarkPolygons(),
): 0 | 1 | 2 {
  for (const poly of polys) {
    const p = poly.pts;
    const n = p.length / 2;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = p[i * 2 + 1]!;
      const yj = p[j * 2 + 1]!;
      if (yi > y !== yj > y) {
        const xi = p[i * 2]!;
        const xj = p[j * 2]!;
        if (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return poly.accent ? 2 : 1;
  }
  return 0;
}

/* ── the dive ───────────────────────────────────────────────────────────── */

export interface Rect {
  left: number;
  top: number;
  height: number;
  /** When given, the mark is fitted `meet`-style and centred, exactly as the SVG renders it. */
  width?: number;
}

/** Mark units → CSS px for a logo box at `rect` (the SVG's `xMidYMid meet` mapping). */
export function markToPx(rect: Rect): { k: number; ox: number; oy: number } {
  const k =
    rect.width === undefined ? rect.height / VB_H : Math.min(rect.width / VB_W, rect.height / VB_H);
  const padX = rect.width === undefined ? 0 : (rect.width - VB_W * k) / 2;
  const padY = (rect.height - VB_H * k) / 2;
  return { k, ox: rect.left + padX - VB_X * k, oy: rect.top + padY - VB_Y * k };
}

const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * One even-odd path: a rect over the viewport (plus `margin`) with the mark
 * cut out of it, the mark baked into CSS px at `rect`. Filled navy, this is
 * the intro's ground with a P-shaped window onto the page.
 */
export function buildDivePathD(rect: Rect, vw: number, vh: number, margin = 64): string {
  const { k, ox, oy } = markToPx(rect);
  const parts: string[] = [`M${-margin} ${-margin}H${vw + margin}V${vh + margin}H${-margin}Z`];
  for (const path of PHITOPOLIS_MARK_PATHS) {
    const [tx, ty] = parseTranslate(path.transform);
    const X = (v: number) => fmt(ox + (v + tx) * k);
    const Y = (v: number) => fmt(oy + (v + ty) * k);
    for (const o of parseD(path.d)) {
      if (o.op === "M") parts.push(`M${X(o.x)} ${Y(o.y)}`);
      else if (o.op === "C") {
        const c = o.c;
        parts.push(`C${X(c[0]!)} ${Y(c[1]!)} ${X(c[2]!)} ${Y(c[3]!)} ${X(c[4]!)} ${Y(c[5]!)}`);
      } else parts.push("Z");
    }
  }
  return parts.join("");
}

/**
 * The dive's scale origin in px and the scale at which the window around it
 * covers the whole viewport (the inscribed circle at `DIVE_ORIGIN` has grown
 * past the farthest viewport corner), with 10% slack.
 */
export function diveGeometry(
  rect: Rect,
  vw: number,
  vh: number,
): { ox: number; oy: number; scale: number } {
  const m = markToPx(rect);
  const ox = m.ox + DIVE_ORIGIN.x * m.k;
  const oy = m.oy + DIVE_ORIGIN.y * m.k;
  const far = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(vw - ox, oy),
    Math.hypot(ox, vh - oy),
    Math.hypot(vw - ox, vh - oy),
  );
  const r = Math.max(DIVE_ORIGIN.clearance * m.k, 0.5);
  return { ox, oy, scale: (far / r) * 1.1 };
}
