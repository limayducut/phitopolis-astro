// BackToTop.tsx behaviour: visible past one screen; glides home with Lenis
// (1.2s) where it runs, else native smooth scroll; reduced motion jumps.
// Focus then moves to <main> so a keyboard user carries on from the top.

import { getLenis } from "./smoothScrollControls";
import { prefersReducedMotion } from "../../runtime/media";

/** Shown once the reader is a full screen down the page. */
const BACK_TO_TOP_AFTER_SCREENS = 1;
/** Lenis glide back to the top, in seconds. */
const LENIS_DURATION_S = 1.2;

export function initBackToTop(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-back-to-top]");
  if (!button) return;

  let frame = 0;
  let visible: boolean | null = null;
  const update = () => {
    frame = 0;
    const next = window.scrollY > window.innerHeight * BACK_TO_TOP_AFTER_SCREENS;
    if (next === visible) return;
    visible = next;
    if (next) {
      button.dataset.visible = "";
      button.removeAttribute("aria-hidden");
      button.removeAttribute("tabindex");
    } else {
      delete button.dataset.visible;
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
    }
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  button.addEventListener("click", () => {
    const reduced = prefersReducedMotion();
    const lenis = getLenis();
    if (lenis)
      lenis.scrollTo(
        0,
        reduced ? { immediate: true, force: true } : { duration: LENIS_DURATION_S, force: true },
      );
    else window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  });
}
