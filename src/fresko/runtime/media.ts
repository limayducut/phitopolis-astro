// Media-query, reduced-motion and device-tier helpers (the vanilla side of
// MUI `useMediaQuery`, motion's `useReducedMotion`, and useDeviceTier.ts).

export interface MediaWatch {
  readonly matches: boolean;
  /** Calls `cb` now and on every change. Returns an unsubscribe. */
  on(cb: (matches: boolean) => void): () => void;
}

const cache = new Map<string, MediaWatch>();

/** A shared, cached matchMedia wrapper. Accepts "@media …" or a bare query. */
export function media(query: string): MediaWatch {
  const q = query.replace(/^@media\s+/, "");
  const hit = cache.get(q);
  if (hit) return hit;
  const mql = window.matchMedia(q);
  const watch: MediaWatch = {
    get matches() {
      return mql.matches;
    },
    on(cb) {
      const handler = (e: MediaQueryListEvent) => cb(e.matches);
      mql.addEventListener("change", handler);
      cb(mql.matches);
      return () => mql.removeEventListener("change", handler);
    },
  };
  cache.set(q, watch);
  return watch;
}

export const reducedMotion = () => media("(prefers-reduced-motion: reduce)");
export const prefersReducedMotion = () => reducedMotion().matches;

/* ── Device tier (useDeviceTier.ts, verbatim logic) ───────── */

export type DeviceTier = "low" | "high";

const LOW_CORE_COUNT = 4;
const LOW_MEMORY_GB = 4;

interface ConnectionLike {
  saveData?: boolean;
  effectiveType?: string;
}

export function savesData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: ConnectionLike }).connection;
  if (conn?.saveData === true) return true;
  const eff = conn?.effectiveType;
  return eff === "slow-2g" || eff === "2g";
}

export function deviceTier(): DeviceTier {
  if (typeof navigator === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: ConnectionLike };
  if (savesData()) return "low";
  const cores = nav.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= LOW_CORE_COUNT) return "low";
  const mem = nav.deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem <= LOW_MEMORY_GB) return "low";
  return "high";
}

export const isLowPowerDevice = (): boolean => deviceTier() === "low";

/** Fine pointer (usePointerFine). */
export const pointerFine = () => media("(hover: hover) and (pointer: fine)");
