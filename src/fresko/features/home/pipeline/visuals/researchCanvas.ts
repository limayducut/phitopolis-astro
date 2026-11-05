import { NOIR } from "@/shared/theme/palette";
import { clamp01, easeOutCubic, mix, smoothstep } from "../chapterTimeline";
import type { ResearchLayout } from "./researchLayout";
import { INGEST_SHARE, type ResearchState } from "./researchState";
import { popAt, seededUnit, type Point } from "./visualKit";

/** The documents sit in a grid: 3 across and 4 down (4 across and 3 down in the tall layout). All of them are gathered into one. */
export const NOISE_COUNT = 12;
export const INGEST_COUNT = 12;
/** Fresh documents that arrive once the signal is out: the grid fills again. */
export const REFILL_COUNT = 12;
const EDGE_X = -48;
/** Horizontal and vertical pitch of the grid, in document widths and heights. */
const PITCH_X = 1.6;
const PITCH_Y = 1.4;
/** A document is this much taller than it is wide. */
const ASPECT = 1.28;
/** In the handoff's gathering, the farthest document sets off this share of the way in. */
const GATHER_LEAD = 0.3;

const DOCS = Array.from({ length: NOISE_COUNT }, (_, i) => ({
  phaseIn: seededUnit(i, 4) * 0.5,
  seed: seededUnit(i, 9),
}));

/** Where the grid sits and how big a document is, so the whole grid fits the cloud. */
function grid(L: ResearchLayout) {
  const cols = L.column ? 4 : 3;
  const rows = L.column ? 3 : 4;
  const { cx, cy, rx, ry } = L.cloud;
  const fitW = (2 * rx) / (PITCH_X * (cols - 1) + 1);
  const fitH = (2 * ry) / (PITCH_Y * ASPECT * (rows - 1) + ASPECT);
  const wanted = Math.max(30, Math.min(0.068 * L.w, 54));
  const dw = Math.min(wanted, fitW, fitH);
  const dh = dw * ASPECT;
  const pitchX = PITCH_X * dw;
  const pitchY = PITCH_Y * dh;
  const spot = (k: number): Point => ({
    x: cx + ((k % cols) - (cols - 1) / 2) * pitchX,
    y: cy + (Math.floor(k / cols) - (rows - 1) / 2) * pitchY,
  });
  return { cols, rows, dw, dh, spot };
}

/** A point `u` of the way along a quadratic curve that bows toward the target's cross axis. */
function along(from: Point, to: Point, column: boolean, u: number): Point {
  const control = column
    ? { x: to.x, y: mix(from.y, to.y, 0.6) }
    : { x: mix(from.x, to.x, 0.6), y: to.y };
  const k = smoothstep(u);
  const m = 1 - k;
  return {
    x: m * m * from.x + 2 * m * k * control.x + k * k * to.x,
    y: m * m * from.y + 2 * m * k * control.y + k * k * to.y,
  };
}

export interface ResearchDrawOptions {
  /** Ambient clock in ms; 0 draws the rest pose (no drift). */
  time: number;
  lowPower: boolean;
  /** The handoff's collapse: how far the fresh documents have gathered into the model (0 = not at all). */
  gather?: number;
}

/** One document: a rounded sheet with a folded corner, a header bar and a few lines of text. Upright, always. */
function drawDoc(
  ctx: CanvasRenderingContext2D,
  at: Point,
  dw: number,
  scale: number,
  alpha: number,
  strong: boolean,
  gold: boolean,
): void {
  if (alpha <= 0.01) return;
  const dh = dw * ASPECT;
  const r = dw * 0.1;
  const fold = dw * 0.28;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-dw / 2 + r, -dh / 2);
  ctx.lineTo(dw / 2 - fold, -dh / 2);
  ctx.lineTo(dw / 2, -dh / 2 + fold);
  ctx.lineTo(dw / 2, dh / 2 - r);
  ctx.arcTo(dw / 2, dh / 2, dw / 2 - r, dh / 2, r);
  ctx.lineTo(-dw / 2 + r, dh / 2);
  ctx.arcTo(-dw / 2, dh / 2, -dw / 2, dh / 2 - r, r);
  ctx.lineTo(-dw / 2, -dh / 2 + r);
  ctx.arcTo(-dw / 2, -dh / 2, -dw / 2 + r, -dh / 2, r);
  ctx.closePath();
  ctx.globalAlpha = alpha * (strong ? 0.2 : 0.09);
  ctx.fillStyle = NOIR.frost;
  ctx.fill();
  ctx.globalAlpha = alpha * (strong ? 0.95 : 0.6);
  ctx.strokeStyle = NOIR.frost;
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dw / 2 - fold, -dh / 2);
  ctx.lineTo(dw / 2 - fold, -dh / 2 + fold);
  ctx.lineTo(dw / 2, -dh / 2 + fold);
  ctx.stroke();
  const left = -dw * 0.3;
  ctx.globalAlpha = alpha * (strong ? 0.8 : 0.5);
  for (let k = 0; k < 3; k += 1) {
    const y = -dh / 2 + dh * (0.46 + k * 0.17);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + dw * (k === 2 ? 0.34 : 0.6), y);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * (gold || strong ? 1 : 0.55);
  ctx.strokeStyle = gold || strong ? NOIR.gold : NOIR.frost;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, -dh / 2 + dh * 0.22);
  ctx.lineTo(left + dw * 0.3, -dh / 2 + dh * 0.22);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Canvas = the documents: they stream in from the left into a grid, linked to
 * their neighbours; once the model is drawn they all travel along curves into
 * one stack, merge into a single document that slips into the model, and the
 * grid fills with fresh documents once the signal is out.
 */
export function drawResearch(
  ctx: CanvasRenderingContext2D,
  L: ResearchLayout,
  s: ResearchState,
  { time, gather = 0 }: ResearchDrawOptions,
): void {
  ctx.clearRect(0, 0, L.w, L.h);
  const ambient = time > 0;
  const { cols, rows, dw, dh, spot } = grid(L);
  const stack: Point = L.column
    ? { x: L.inPort.x, y: L.inPort.y - dh * 0.95 }
    : { x: L.inPort.x - dw * 0.95, y: L.inPort.y };
  const drift = (seed: number) =>
    ambient ? Math.sin(time * 0.00018 + seed * 20) * 0.003 * L.h : 0;
  const checker = (k: number) => (k % cols) % 2 === Math.floor(k / cols) % 2;

  /* nearest-first: documents closer to the stack leave first */
  const reach = Math.max(
    ...DOCS.map((_, i) => Math.hypot(spot(i).x - stack.x, spot(i).y - stack.y)),
  );

  /* where every document is this frame, and how visible */
  const placed = DOCS.map((p, i) => {
    const arrive = clamp01((s.noise - p.phaseIn) / (1 - p.phaseIn));
    const rest = spot(i);
    rest.y += drift(p.seed);
    let at: Point = { x: mix(EDGE_X, rest.x, easeOutCubic(arrive)), y: rest.y };
    let scale = 0.9 + 0.1 * arrive;
    const lead = 0.3 * (Math.hypot(rest.x - stack.x, rest.y - stack.y) / reach);
    const u = popAt(s.ingest, lead, INGEST_SHARE);
    if (u > 0) {
      at = along(rest, stack, L.column, u);
      scale = mix(1, 0.86, u);
    }
    // Once gathered, the stack gives way to the merged document.
    const alpha = arrive * (1 - smoothstep(clamp01((s.ingest - 0.52) / 0.14)));
    return { at, scale, alpha };
  });

  /* links: a short dotted connector between each document and its neighbours, across and down;
     they let go as the documents gather */
  const linkAlpha = (1 - clamp01(s.ingest / 0.3)) * 0.45;
  if (linkAlpha > 0.01) {
    ctx.strokeStyle = NOIR.frost;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    const join = (a: number, b: number, from: Point, to: Point) => {
      const alpha = Math.min(placed[a]!.alpha, placed[b]!.alpha) * linkAlpha;
      if (alpha <= 0.01) return;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    };
    for (let k = 0; k < NOISE_COUNT; k += 1) {
      const here = placed[k]!.at;
      if (k % cols < cols - 1) {
        const next = placed[k + 1]!.at;
        join(k, k + 1, { x: here.x + dw / 2, y: here.y }, { x: next.x - dw / 2, y: next.y });
      }
      if (Math.floor(k / cols) < rows - 1) {
        const below = placed[k + cols]!.at;
        join(k, k + cols, { x: here.x, y: here.y + dh / 2 }, { x: below.x, y: below.y - dh / 2 });
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  placed.forEach((d, i) => {
    drawDoc(ctx, d.at, dw, d.scale, d.alpha, false, checker(i));
  });

  /* the merged document: it forms at the stack, then slips into the model's body */
  const centre: Point = { x: L.hex.cx, y: L.hex.cy };
  const formed = smoothstep(clamp01((s.ingest - 0.5) / 0.14));
  if (formed > 0) {
    const enter = smoothstep(clamp01((s.ingest - 0.7) / 0.28));
    const at = along(stack, centre, L.column, enter);
    const gone = 1 - clamp01((enter - 0.72) / 0.28);
    drawDoc(ctx, at, dw * 1.18, mix(1, 0.5, enter), formed * gone, true, true);
  }

  /* refill: the next problem's documents arrive from the left edge and fill the grid again;
     in the handoff's collapse they gather into the model's centre, nearest first, and fade */
  const gatherReach = Math.max(
    ...DOCS.map((_, i) => Math.hypot(spot(i).x - centre.x, spot(i).y - centre.y)),
  );
  for (let j = 0; j < REFILL_COUNT; j += 1) {
    const p = DOCS[j]!;
    const arrive = clamp01((s.refill - p.phaseIn) / (1 - p.phaseIn));
    if (arrive <= 0) continue;
    const rest = spot(j);
    let at: Point = { x: mix(EDGE_X, rest.x, easeOutCubic(arrive)), y: rest.y + drift(p.seed) };
    let scale = 0.9 + 0.1 * arrive;
    let alpha = arrive;
    const lead = GATHER_LEAD * (Math.hypot(rest.x - centre.x, rest.y - centre.y) / gatherReach);
    const u = popAt(gather, lead, 1 - GATHER_LEAD);
    if (u > 0) {
      at = along(at, centre, L.column, u);
      scale *= mix(1, 0.3, u);
      alpha *= 1 - smoothstep(clamp01((u - 0.55) / 0.45));
    }
    drawDoc(ctx, at, dw, scale, alpha, false, checker(j));
  }
}
