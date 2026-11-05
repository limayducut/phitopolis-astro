// Preloader contract (constants + load-signal type), split out of fresko Preloader.tsx.
// The intro implementation lives in ./intro (see initPreloader).

import type { LoadProgress } from "./introLoadSignals";

export const PRELOADER_SESSION_KEY = "phitopolis:preloaded";

export interface LoadSignal {
  label: string;
  promise: Promise<unknown>;
  /**
   * Whether the reveal must wait on this signal. **Absent / `undefined` ===
   * blocking** — so a bare `{ label, promise }` (fonts, and every pre-tier
   * test) still gates the exit with zero changes. Set `blocking: false` for
   * warm-work that should keep running silently without holding the overlay:
   * route precompiles, the three.js chunk, deep-scroll / other-route imagery.
   */
  blocking?: boolean;
  /**
   * This signal's share of the overall progress, relative to the others
   * (default `DEFAULT_SIGNAL_WEIGHT`: every unweighted signal counts the same).
   */
  weight?: number;
  /**
   * A live 0..1 reading while the signal is still out (a streamed asset: the
   * hero film's buffering). Without one it counts 0 until its promise settles.
   * The promise stays the authority on "done"; this only makes the readout
   * honest in between.
   */
  progress?: LoadProgress;
}
