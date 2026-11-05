// AppShell.tsx's entrance machinery, ported:
//  - whether the intro (preloader) plays: "/" only, once per session, not
//    under reduced motion (preloaderGate.shouldShowPreloader);
//  - the warm-up load signals the preloader paces itself against;
//  - phase timeline "covered" → "hero" → "header" (+300ms) → "open" (+600ms);
//  - the hero cascade 1..5 at 250ms steps once the preloader is done;
//  - Alt+M toggles the navbar motto.

import { shouldShowPreloader } from "@/shared/components/preloaderGate";
import type { LoadSignal } from "@/shared/components/Preloader";
import { LOAD_WEIGHTS, getHomeFilmLoad } from "@/shared/components/introLoadSignals";
import { HERO_OPENING_FILM_ASSETS, HERO_PHONE_QUERY } from "./heroFilm";
import { prefersReducedMotion } from "./media";
import { store } from "./store";

const SETTLE_MS = 80;
const HEADER_AT_MS = 300;
const OPEN_AT_MS = 600;
const CASCADE_STEP_MS = 250;

export const HOME_CHAPTER_PHOTOS: readonly string[] = [
  "/images/pillars-hd/research-desk-team-hd.webp",
  "/images/pillars-hd/development-whiteboard-hd.webp",
  "/images/pillars-hd/support-meeting-hd.webp",
];
const HOME_BACKGROUND_IMAGES: readonly string[] = ["/videos/we-build-the-future-poster.jpg"];

function labelForAsset(url: string): string {
  return (url.split("/").pop() || "ASSET").toUpperCase().substring(0, 15);
}

/** AppShell.preloadAsset: decode images, fetch anything else; never hangs (1.2s cap). */
export function preloadAsset(url: string): Promise<void> {
  return new Promise((resolve) => {
    const ext = url.split(".").pop()?.toLowerCase() || "";
    let called = false;
    const done = () => {
      if (!called) {
        called = true;
        resolve();
      }
    };
    const timer = setTimeout(done, 1200);
    const finish = () => {
      clearTimeout(timer);
      done();
    };
    try {
      if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
        const img = new Image();
        img.src = url;
        if (typeof img.decode === "function") img.decode().then(finish, finish);
        else {
          img.onload = finish;
          img.onerror = finish;
        }
      } else {
        fetch(url, { cache: "force-cache" }).then(finish, finish);
      }
    } catch {
      finish();
    }
  });
}

/** AppShell.buildWarmupSignals for "/": blocking poster + chapter photos + the hero film, then background. */
export function buildWarmupSignals(): LoadSignal[] {
  const phone = window.matchMedia(HERO_PHONE_QUERY).matches;
  const blocking = [phone ? HERO_OPENING_FILM_ASSETS.phoneStill : HERO_OPENING_FILM_ASSETS.poster, ...HOME_CHAPTER_PHOTOS];
  const background = [
    ...HOME_BACKGROUND_IMAGES,
    phone ? HERO_OPENING_FILM_ASSETS.poster : HERO_OPENING_FILM_ASSETS.phoneStill,
  ];
  const film = getHomeFilmLoad();
  return [
    ...blocking.map((url) => ({
      label: labelForAsset(url),
      weight: LOAD_WEIGHTS.poster,
      promise: preloadAsset(url),
    })),
    { label: "FILM", weight: LOAD_WEIGHTS.video, progress: film, promise: film.ready },
    ...background.map((url) => ({ label: labelForAsset(url), blocking: false, promise: preloadAsset(url) })),
  ];
}

export interface PreloaderHandlers {
  warmup: LoadSignal[];
  /** The overlay starts its exit: release the entrance phases. */
  onStartExit: () => void;
  /** The P-window opens: the hero film may show. */
  onWindowOpen: () => void;
  /** The overlay is gone: unmount it and run the hero cascade. */
  onDone: () => void;
}

/** Decides the initial state. Must run before any subsystem init reads the store. */
export function initEntranceState(): { showPreloader: boolean } {
  const reduced = prefersReducedMotion();
  const showPreloader = shouldShowPreloader(reduced, "/");
  store.set({
    showPreloader,
    phase: reduced ? "open" : "covered",
    heroCascadeStep: showPreloader ? 0 : 5,
    introWindowOpen: false,
  });
  return { showPreloader };
}

/**
 * Runs the entrance. `startPreloader` mounts the intro overlay (Preloader
 * port) and must call the handlers; without a preloader the entrance releases
 * after SETTLE_MS.
 */
export function runEntrance(startPreloader: (handlers: PreloaderHandlers) => void): void {
  const warmup = buildWarmupSignals();
  let released = store.get().phase === "open";

  const releaseEntrance = () => {
    if (released) return;
    released = true;
    store.set({ phase: "hero" });
    window.setTimeout(() => store.set({ phase: "header" }), HEADER_AT_MS);
    window.setTimeout(() => store.set({ phase: "open" }), OPEN_AT_MS);
  };

  if (store.get().showPreloader) {
    startPreloader({
      warmup,
      onStartExit: releaseEntrance,
      onWindowOpen: () => store.set({ introWindowOpen: true }),
      onDone: () => {
        store.set({ showPreloader: false });
        [1, 2, 3, 4, 5].forEach((step, i) =>
          window.setTimeout(() => store.set({ heroCascadeStep: step }), i * CASCADE_STEP_MS),
        );
      },
    });
  } else {
    window.setTimeout(releaseEntrance, SETTLE_MS);
  }

  // Alt+M toggles the navbar motto (AppShell handleMottoKey).
  window.addEventListener("keydown", (e) => {
    const active = document.activeElement as HTMLElement | null;
    const editable =
      active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
    if (!editable && e.altKey && e.key.toLowerCase() === "m") {
      e.preventDefault();
      store.set({ showMotto: !store.get().showMotto });
    }
  });
}
