// Vanilla replacement for fresko's React contexts (EntrancePhaseContext,
// IntroWindowOpenContext, HeroCascadeContext, NavbarProvider, mega-nav state).
//
// One global store; subsystems read with `store.get()` and react with
// `store.on(key, cb)` / `store.subscribe(cb)`. Every listener registered with
// `on` is called once immediately with the current value (like a React render).

import type { NavAnchorId } from "@/shared/components/navbarAnchors";

export type EntrancePhase = "covered" | "hero" | "header" | "open";
export type NavBgMode = "glass" | "none" | "fade";

export interface AppState {
  /** AppShell `phase`: "covered" → overlay up · "hero" · "header" · "open". */
  phase: EntrancePhase;
  /** The preloader's P-window has opened (the hero film shows through it). */
  introWindowOpen: boolean;
  /** 0 while the preloader runs, then 1..5 at 250ms steps; 5 on repeat visits. */
  heroCascadeStep: number;
  /** The intro overlay is mounted. */
  showPreloader: boolean;
  /** Header has been released at least once (phase reached "header"/"open"). */
  headerReleased: boolean;
  megaNavOpen: boolean;
  /** Navbar options (NavbarProvider). */
  autohideEnabled: boolean;
  showMotto: boolean;
  navBgMode: NavBgMode;
  /** Derived from the anchor registry: the navbar sits over a dark ground. */
  overDark: boolean;
}

type Key = keyof AppState;
type Listener<K extends Key> = (value: AppState[K], state: AppState) => void;

const state: AppState = {
  phase: "open",
  introWindowOpen: false,
  heroCascadeStep: 5,
  showPreloader: false,
  headerReleased: false,
  megaNavOpen: false,
  autohideEnabled: true,
  showMotto: false,
  navBgMode: "glass",
  overDark: true,
};

const keyed = new Map<Key, Set<Listener<Key>>>();
const any = new Set<(s: AppState, changed: Key[]) => void>();

export const store = {
  get(): Readonly<AppState> {
    return state;
  },
  set(patch: Partial<AppState>): void {
    const changed: Key[] = [];
    for (const key of Object.keys(patch) as Key[]) {
      const value = patch[key];
      if (value === undefined || Object.is(state[key], value)) continue;
      (state as unknown as Record<Key, unknown>)[key] = value;
      changed.push(key);
    }
    if (!changed.length) return;
    if (changed.includes("phase") && (state.phase === "header" || state.phase === "open")) {
      if (!state.headerReleased) {
        state.headerReleased = true;
        changed.push("headerReleased");
      }
    }
    for (const key of changed) keyed.get(key)?.forEach((cb) => cb(state[key], state));
    any.forEach((cb) => cb(state, changed));
  },
  /** Calls `cb` now and on every change of `key`. Returns an unsubscribe. */
  on<K extends Key>(key: K, cb: Listener<K>): () => void {
    let set = keyed.get(key);
    if (!set) keyed.set(key, (set = new Set()));
    set.add(cb as Listener<Key>);
    cb(state[key], state);
    return () => set.delete(cb as Listener<Key>);
  },
  subscribe(cb: (s: AppState, changed: Key[]) => void): () => void {
    any.add(cb);
    return () => any.delete(cb);
  },
};

/* ── Derived reads (the old hooks) ───────────────────────── */

/** useHeroFilmUncovered */
export const heroFilmUncovered = (s: AppState = state): boolean =>
  s.phase !== "covered" || s.introWindowOpen;
/** usePreloaderReady */
export const preloaderReady = (s: AppState = state): boolean => s.phase !== "covered";
/** useHeaderReleased */
export const headerReleasedNow = (s: AppState = state): boolean =>
  s.phase === "header" || s.phase === "open";
/** useEntranceSettled */
export const entranceSettled = (s: AppState = state): boolean => s.phase === "open";

/* ── Navbar anchor registry (NavbarProvider.registerAnchor) ─ */

interface AnchorEntry {
  dark: boolean;
  top: number;
}
const anchors = new Map<NavAnchorId, AnchorEntry>();

function recomputeOverDark() {
  let winner: AnchorEntry | null = null;
  for (const entry of anchors.values()) {
    if (winner === null || entry.top > winner.top) winner = entry;
  }
  store.set({ overDark: winner !== null && winner.dark });
}

export function registerAnchor(id: NavAnchorId, isIntersecting: boolean, dark = false, top = 0) {
  if (isIntersecting) anchors.set(id, { dark, top });
  else anchors.delete(id);
  recomputeOverDark();
}

const PROBE_TOP_PX = 40;
const PROBE_BOTTOM_PX = 45;
const probeMargin = (viewportHeight: number) =>
  `-${String(PROBE_TOP_PX)}px 0px -${String(Math.max(0, viewportHeight - PROBE_BOTTOM_PX))}px 0px`;

/**
 * useNavbarAnchor: watches `el` crossing the navbar's probe band and registers
 * it with its ground. Sets `data-ground="dark"` on dark anchors. Re-arms on
 * resize (the probe band depends on the viewport height).
 */
export function observeNavAnchor(
  el: Element,
  id: NavAnchorId,
  options?: { dark?: boolean; rootMargin?: string; threshold?: number | number[] },
): () => void {
  const dark = options?.dark ?? false;
  if (dark) el.setAttribute("data-ground", "dark");
  let observer: IntersectionObserver | null = null;
  let live = true;
  const arm = () => {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (live && entry) registerAnchor(id, entry.isIntersecting, dark, entry.boundingClientRect.top);
      },
      {
        root: null,
        rootMargin: options?.rootMargin ?? probeMargin(window.innerHeight),
        threshold: options?.threshold ?? 0,
      },
    );
    observer.observe(el);
  };
  arm();
  let lastH = window.innerHeight;
  const onResize = () => {
    if (window.innerHeight === lastH) return;
    lastH = window.innerHeight;
    arm();
  };
  window.addEventListener("resize", onResize);
  return () => {
    live = false;
    observer?.disconnect();
    window.removeEventListener("resize", onResize);
    registerAnchor(id, false);
  };
}
