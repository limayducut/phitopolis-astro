/**
 * Shared, pure helpers for the three chapter visuals: per-item sub-channels,
 * rectangle geometry for the layout tests, text-size estimates, and the
 * data-attribute bindings that let one `state` record drive DOM and SVG
 * elements without any React state. No React, no GSAP.
 */
import { clamp01, easeOutCubic, mix } from "../chapterTimeline";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

/** Wide enough for the full annotated layout; below it the visuals render compact frames. */
export const WIDE_QUERY = "(min-width: 768px)";

export const rectStyle = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h });

/** Stage padding on every side, as a share of the stage's width and height. */
export const STAGE_PAD = 0.04;

export const rectRight = (r: Rect): number => r.x + r.w;
export const rectBottom = (r: Rect): number => r.y + r.h;

export function rectsIntersect(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
  );
}

export function rectInside(inner: Rect, outer: Rect, eps = 0.5): boolean {
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    rectRight(inner) <= rectRight(outer) + eps &&
    rectBottom(inner) <= rectBottom(outer) + eps
  );
}

/** The stage minus its 4% padding. */
export const paddedStage = (w: number, h: number): Rect => ({
  x: w * STAGE_PAD,
  y: h * STAGE_PAD,
  w: w * (1 - 2 * STAGE_PAD),
  h: h * (1 - 2 * STAGE_PAD),
});

/** Does the filled disc (cx, cy, r) touch the rectangle? */
export function rectCircleIntersect(rect: Rect, cx: number, cy: number, r: number): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(nx - cx, ny - cy) < r;
}

/** Does the rectangle (grown by `pad`) hold any of the points? */
export function rectNearPoints(rect: Rect, points: readonly Point[], pad: number): boolean {
  return points.some(
    (p) =>
      p.x > rect.x - pad &&
      p.x < rect.x + rect.w + pad &&
      p.y > rect.y - pad &&
      p.y < rect.y + rect.h + pad,
  );
}

/** Does the ellipse (cx, cy, rx, ry) touch the rectangle? Conservative: samples the outline and the centre. */
export function rectEllipseIntersect(
  rect: Rect,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return ((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2 < 1;
}

/** Item `i` of `count`, ramping over `share` of the channel; items start evenly and the last ends at 1. */
export function staggerItem(c: number, i: number, count: number, share: number): number {
  return popAt(c, count <= 1 ? 0 : (i / (count - 1)) * (1 - share), share);
}

/** A sub-channel that starts when `c` reaches `at` and ramps linearly over `share` of it. */
export function popAt(c: number, at: number, share: number): number {
  // A finished channel finishes every item exactly (no float residue in the static frame).
  if (c >= 1 && at + share <= 1 + 1e-9) return 1;
  return clamp01((c - at) / share);
}

/**
 * The visuals' default ease: ease-out with a small linear share, so a channel
 * never stalls at its tail and the picture keeps moving until the next window.
 */
export const softOut = (x: number): number => clamp01(0.85 * easeOutCubic(x) + 0.15 * clamp01(x));

/** An ease that is linear and reaches 1 at `x = end` (for sweeps whose pace should stay constant). */
export const linearTo =
  (end: number) =>
  (x: number): number =>
    clamp01(x / end);

export const seededUnit = (index: number, salt: number): number => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

/* ── text estimates (layout is computed, not measured, so tests can check it) ── */
export const MONO_CHAR = 7.4;
export const CHIP_H = 24;
export const CHIP_PAD = 16;
export const CHIP_GAP = 6;
const TITLE_CHAR = 8.6;
const LINE_CHAR = 6.9;

export const chipWidth = (text: string): number => Math.ceil(text.length * MONO_CHAR + CHIP_PAD);

/** Flow chips left to right inside `maxW`, wrapping rows; returns one rect per chip. */
export function flowChips(texts: readonly string[], x: number, y: number, maxW: number): Rect[] {
  const rects: Rect[] = [];
  let cx = 0;
  let row = 0;
  for (const text of texts) {
    const w = Math.min(chipWidth(text), maxW);
    if (cx > 0 && cx + w > maxW) {
      cx = 0;
      row += 1;
    }
    rects.push({ x: x + cx, y: y + row * (CHIP_H + CHIP_GAP), w, h: CHIP_H });
    cx += w + CHIP_GAP;
  }
  return rects;
}

export const bottomOf = (rects: readonly Rect[]): number => Math.max(...rects.map(rectBottom));

/** Height of a team block: Outfit title, wrapped Inter line, and optionally a chip block below. */
export function teamBlockHeight(title: string, line: string, width: number, chipsH = 0): number {
  const titleLines = Math.max(1, Math.ceil((title.length * TITLE_CHAR) / width));
  const lineLines = Math.max(1, Math.ceil((line.length * LINE_CHAR) / width));
  return titleLines * 22 + lineLines * 18 + 4 + (chipsH > 0 ? chipsH + 6 : 0);
}

/** Height of the wrapped chip block that `flowChips` produces for these chips. */
export function chipsBlockHeight(texts: readonly string[], maxW: number): number {
  return texts.length === 0 ? 0 : bottomOf(flowChips(texts, 0, 0, maxW));
}

/* ── polylines ── */
export interface Polyline {
  pts: readonly Point[];
  cum: readonly number[];
  length: number;
}
export function polyline(pts: readonly Point[]): Polyline {
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { pts, cum, length: cum[cum.length - 1] ?? 0 };
}
export function pointAt(line: Polyline, distance: number): Point {
  const d = Math.max(0, Math.min(line.length, distance));
  let lo = 0;
  let hi = line.pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (line.cum[mid]! < d) lo = mid;
    else hi = mid;
  }
  const a = line.pts[lo]!;
  const b = line.pts[hi]!;
  const span = line.cum[hi]! - line.cum[lo]!;
  const k = span === 0 ? 0 : (d - line.cum[lo]!) / span;
  return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k) };
}
export const pathD = (pts: readonly Point[], close = false): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("") +
  (close ? "Z" : "");

/* ── bindings: data attributes → inline styles, driven by one state record ── */
export type Fx = "draw" | "fade" | "rise" | "pop" | "fill" | "clip" | "slide" | "grow";
export interface BindOptions {
  /** Final value of the fade / fill (default 1). */
  max?: number;
  /** Starting value of the fade (default 0). */
  min?: number;
  /** Per-item stagger: item `i` of `n`, each ramping over `share`. */
  item?: { i: number; n: number; share: number };
  /** Start when the channel reaches `at`, ramping over `share`. */
  at?: { at: number; share: number };
  /** Width of a clip rect at 1. */
  size?: number;
  /** Slide: the offset (px) the element starts from, relative to its resting place. */
  from?: Point;
}
export type BindingProps = Record<string, string | number>;

export function bind(ch: string, fx: Fx, o: BindOptions = {}): BindingProps {
  const p: BindingProps = { "data-ch": ch, "data-fx": fx };
  if (o.max !== undefined) p["data-max"] = o.max;
  if (o.min !== undefined) p["data-min"] = o.min;
  if (o.item) {
    p["data-i"] = o.item.i;
    p["data-n"] = o.item.n;
    p["data-share"] = o.item.share;
  }
  if (o.at) {
    p["data-at"] = o.at.at;
    p["data-share"] = o.at.share;
  }
  if (o.size !== undefined) p["data-size"] = o.size;
  if (o.from) {
    p["data-dx"] = o.from.x;
    p["data-dy"] = o.from.y;
  }
  return p;
}

export interface Binding {
  el: HTMLElement | SVGElement;
  ch: string;
  fx: Fx;
  max: number;
  min: number;
  i: number;
  n: number;
  at: number;
  share: number;
  size: number;
  dx: number;
  dy: number;
}

export function buildBindings(root: Element): Binding[] {
  return [...root.querySelectorAll<HTMLElement | SVGElement>("[data-ch]")].map((el) => {
    const d = el.dataset;
    return {
      el,
      ch: d.ch ?? "",
      fx: (d.fx ?? "fade") as Fx,
      max: d.max === undefined ? 1 : Number(d.max),
      min: d.min === undefined ? 0 : Number(d.min),
      i: d.i === undefined ? -1 : Number(d.i),
      n: d.n === undefined ? 0 : Number(d.n),
      at: d.at === undefined ? Number.NaN : Number(d.at),
      share: d.share === undefined ? 1 : Number(d.share),
      size: d.size === undefined ? 0 : Number(d.size),
      dx: d.dx === undefined ? 0 : Number(d.dx),
      dy: d.dy === undefined ? 0 : Number(d.dy),
    };
  });
}

export function applyBindings(
  bindings: readonly Binding[],
  state: Readonly<Record<string, number>>,
): void {
  for (const b of bindings) {
    const c = state[b.ch] ?? 0;
    const v =
      b.n > 0
        ? staggerItem(c, b.i, b.n, b.share)
        : Number.isNaN(b.at)
          ? c
          : popAt(c, b.at, b.share);
    const style = b.el.style;
    switch (b.fx) {
      case "draw":
        style.strokeDashoffset = String(1 - v);
        break;
      case "fade":
        style.opacity = String(mix(b.min, b.max, v));
        break;
      case "rise":
        style.opacity = String(mix(b.min, b.max, v));
        style.transform = `translateY(${String((1 - v) * 6)}px)`;
        break;
      case "pop":
        style.opacity = String(v);
        style.transform = `scale(${String(0.85 + 0.15 * v)})`;
        break;
      case "grow":
        style.opacity = String(v);
        style.transform = `scale(${String(mix(b.min, 1, v))})`;
        break;
      case "fill":
        style.fillOpacity = String(v * b.max);
        break;
      case "slide":
        style.opacity = String(clamp01(v * 4));
        style.transform = `translate(${String((1 - v) * b.dx)}px, ${String((1 - v) * b.dy)}px)`;
        break;
      case "clip":
        b.el.setAttribute("width", String(v * b.size));
        break;
    }
  }
}
