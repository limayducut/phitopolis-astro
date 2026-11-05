import { channel } from "../chapterTimeline";
import { softOut } from "./visualKit";

export type ResearchState = {
  noise: number;
  model: number;
  layers: number;
  tags: number;
  ingest: number;
  modelFill: number;
  signal: number;
  pulse: number;
  refill: number;
};

/** Item share of the model's three layer lines (see `staggerItem`). */
export const LAYER_SHARE = 0.5;
/** Each ingested particle ramps over this share of the `ingest` channel. */
export const INGEST_SHARE = 0.4;

/** Every channel as a pure function of chapter time `t`: noise, then model, then signal. */
export function researchState(t: number): ResearchState {
  return {
    // Carried to 0.35 (model's own start) now that the data-scientist annotation
    // that used to bridge noise -> model is gone, so nothing sits idle here.
    noise: channel(t, -1.6, 0.35, softOut),
    model: channel(t, 0.35, 1.0, softOut),
    layers: channel(t, 0.55, 1.35, softOut),
    tags: channel(t, 0.8, 1.35, softOut),
    ingest: channel(t, 1.35, 2.35, softOut),
    modelFill: channel(t, 1.6, 2.35, softOut),
    signal: channel(t, 2.35, 3.2, softOut),
    pulse: channel(t, 2.9, 3.35, softOut),
    refill: channel(t, 3.35, 4.35, softOut),
  };
}

/** The channel that must be >= 0.9 when beat k's clause is centred and <= 0.1 0.7 earlier. */
export const RESEARCH_SIG = ["noise", "model", "ingest", "signal", "refill"] as const;
