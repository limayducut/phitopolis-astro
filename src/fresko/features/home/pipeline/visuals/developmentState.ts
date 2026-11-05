import { channel } from "../chapterTimeline";
import { softOut } from "./visualKit";

export type DevelopmentState = {
  spine: number;
  modules: number;
  sources: number;
  feeders: number;
  packets: number;
  chips: number;
  engine: number;
  deploy: number;
  containers: number;
  interface: number;
  delivery: number;
  packetsToUser: number;
};

/** Item shares for the per-item sub-channels (see `staggerItem` / `popAt`). */
export const MODULE_SHARE = 0.4;
export const SOURCE_SHARE = 0.5;
export const CHIP_SHARE = 0.35;

/** Every channel as a pure function of chapter time `t` (MOTION-SPEC §5.2). */
export function developmentState(t: number): DevelopmentState {
  return {
    spine: channel(t, -1.6, -0.1, softOut),
    modules: channel(t, -1.2, 0.35, softOut),
    sources: channel(t, 0.35, 1.2, softOut),
    feeders: channel(t, 0.7, 1.35, softOut),
    // Carried to 1.45 (chips' own start) now that the team-header annotations
    // that used to bridge this gap are gone, so nothing sits idle here.
    packets: channel(t, 0.9, 1.45, softOut),
    chips: channel(t, 1.45, 2.25, softOut),
    engine: channel(t, 1.9, 2.35, softOut),
    deploy: channel(t, 2.35, 2.95, softOut),
    containers: channel(t, 2.35, 3.35, softOut),
    interface: channel(t, 3.35, 3.95, softOut),
    delivery: channel(t, 3.6, 4.35, softOut),
    packetsToUser: channel(t, 3.9, 4.35, softOut),
  };
}

export const DEVELOPMENT_SIG = ["modules", "sources", "chips", "containers", "interface"] as const;
