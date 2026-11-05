/**
 * The veil's writes (owner, 2026-10-14): a receiving photo arrives under a navy veil and the
 * absorbed point clears it, a soft hole opening from where it struck. Reads through
 * handoffMeasure, maths in handoffPath; this only writes the hole's two variables, the veil's
 * opacity and its visibility, and leaves nothing inline while the veil is whole.
 */
import { VEIL_FEATHER_PX, VEIL_R_VAR, VEIL_X_VAR } from "./handoffVeilStyle";
import {
  veilImpact,
  veilState,
  type HandoffTunables,
  type VeilState,
  type VeilTunables,
} from "./handoffPath";
import {
  findVeil,
  measurePhotoEdge,
  measurePlate,
  measureSource,
  type Boundary,
} from "./handoffMeasure";

/* ── Tunables ─────────────────────────────────────────────────────────────── */
export const VEIL: VeilTunables = {
  /** The reveal spans this share of the strike's depth, so it lands just before the photo
   *  reaches the viewport's top (its arrival's end); past that the veil is gone regardless. */
  revealShare: 0.92,
  /** The shortest reveal, px. */
  minRevealPx: 240,
  /** The hole's soft edge, px (the mask's feather is the same value). */
  featherPx: VEIL_FEATHER_PX,
  /** The veil thins by this much as the hole grows, so its last edge melts into the photo's own fade. */
  alphaFade: 0.3,
};

const round = (n: number): string => String(Math.round(n * 100) / 100);

/** The veil as written: a hole (two variables and an opacity) while it opens, hidden once open, nothing inline when whole. */
export function writeVeil(veil: HTMLElement, state: VeilState | null): void {
  if (state?.kind === "revealing") {
    veil.style.setProperty(VEIL_X_VAR, `${round(state.x)}px`);
    veil.style.setProperty(VEIL_R_VAR, `${round(state.r)}px`);
    veil.style.opacity = String(Math.round(state.opacity * 1e3) / 1e3);
    veil.style.removeProperty("visibility");
    return;
  }
  veil.style.removeProperty(VEIL_X_VAR);
  veil.style.removeProperty(VEIL_R_VAR);
  veil.style.removeProperty("opacity");
  if (state?.kind === "open") veil.style.visibility = "hidden";
  else veil.style.removeProperty("visibility");
}

/** The receiving photo's veil at this scroll, from the same edge and point the absorb reads. */
export function paintVeil(boundary: Boundary, scroll: number, tunables: HandoffTunables): void {
  const veil = findVeil(boundary);
  if (!veil) return;
  const { leave } = boundary;
  if (scroll >= leave.end) return writeVeil(veil, { kind: "open" });
  if (!(scroll > leave.release)) return writeVeil(veil, { kind: "intact" });
  const plate = measurePlate(boundary);
  if (!plate) return;
  const impact = veilImpact(measureSource(boundary), scroll, leave.release, tunables, {
    x: plate.left + plate.width / 2,
    y: window.innerHeight / 2,
  });
  writeVeil(veil, veilState(scroll, leave, impact, measurePhotoEdge(boundary), plate, VEIL));
}
