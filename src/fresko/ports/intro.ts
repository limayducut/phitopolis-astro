// OWNER: intro fork. The preloader overlay (Preloader + intro/*).
//
// The overlay markup is server-rendered (src/components/intro/Preloader.astro)
// and shown from first paint when html[data-intro="on"]. This module runs it
// (startPreloader) or, when the entrance decides there is no intro, removes it.

import type { PreloaderHandlers } from "../runtime/entrance";
import { store } from "../runtime/store";
import { discardPreloader, runPreloader } from "../shared/components/preloader/runPreloader";

let started = false;

/** Mounts and runs the intro overlay; calls the handlers (see entrance.ts). */
export function startPreloader(handlers: PreloaderHandlers): void {
  started = true;
  runPreloader({
    warmup: handlers.warmup,
    onStartExit: handlers.onStartExit,
    onWindowOpen: handlers.onWindowOpen,
    onDone: handlers.onDone,
  });
}

// boot.ts runs synchronously: by the time this microtask runs, the entrance has
// decided. No intro this visit -> drop the server-rendered overlay (it is already
// display:none unless the head script and the gate ever disagree).
queueMicrotask(() => {
  if (!started && !store.get().showPreloader) {
    discardPreloader();
    if (document.documentElement.dataset.intro === "on") document.documentElement.dataset.intro = "off";
  }
});
