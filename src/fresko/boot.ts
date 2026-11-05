// Page bootstrap: replaces fresko's React tree (main.tsx → AppShell → routes/index).
// Order matters: the entrance state must be decided before any subsystem reads it.

import { initEntranceState, runEntrance } from "./runtime/entrance";
import { initSmoothScroll } from "./runtime/smoothScroll";
import { handoffOn } from "./runtime/chapters";
import { initChrome } from "./ports/chrome";
import { initHome } from "./ports/home";
import { initVisuals } from "./ports/visuals";
import { startPreloader } from "./ports/intro";
import { store } from "./runtime/store";

initEntranceState();

// AppShell: everything behind the intro overlay is inert while it shows; main +
// footer are inert while the mega drawer is open (the header stays live so the
// trigger keeps focus through the hand-off).
const setInert = (selector: string, on: boolean) =>
  document.querySelector<HTMLElement>(selector)?.toggleAttribute("inert", on);
store.on("showPreloader", (on) => setInert("[data-inert-preloader]", on));
store.on("megaNavOpen", (on) => setInert("[data-inert-meganav]", on));
// Lenis-free fallback: AppShell clears any body scroll lock on mount.
document.body.style.overflow = "";
// The handoff (collapses, carrier, veils) is decided at runtime; CSS keys off this.
document.documentElement.dataset.handoff = handoffOn() ? "on" : "off";
initSmoothScroll();
initChrome();
initHome();
initVisuals();
runEntrance(startPreloader);
