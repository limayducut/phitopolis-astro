// SmoothScroll.tsx, ported: Lenis driven by GSAP's ticker, feeding
// ScrollTrigger. Held stopped while the intro runs (heroCascadeStep 0) and
// started on the first cascade step. Off under reduced motion.

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LENIS_SMOOTH_DURATION, scrollEase } from "@/shared/motion/scrollSpeed";
import {
  publishScrollTriggerRefresh,
  refreshScrollTriggers,
} from "@/shared/motion/scrollTriggerBridge";
import { getLenis, setActiveLenis } from "@/shared/components/smoothScrollControls";
import { prefersReducedMotion } from "./media";
import { store } from "./store";

gsap.registerPlugin(ScrollTrigger);

publishScrollTriggerRefresh(() => {
  ScrollTrigger.refresh();
});

export function initSmoothScroll(): void {
  if (prefersReducedMotion()) return;
  const lenis = new Lenis({ duration: LENIS_SMOOTH_DURATION, easing: scrollEase });
  setActiveLenis(lenis);
  if (store.get().heroCascadeStep === 0) lenis.stop();

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time: number) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(() => ScrollTrigger.refresh());
  void document.fonts.ready.then(() => ScrollTrigger.refresh());

  store.on("heroCascadeStep", (step) => {
    if (step === 0) return;
    const active = getLenis();
    if (!active || !active.isStopped) return;
    active.start();
    requestAnimationFrame(() => refreshScrollTriggers());
  });
}
