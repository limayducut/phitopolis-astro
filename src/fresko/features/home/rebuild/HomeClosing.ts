// Vanilla port of fresko rebuild/HomeClosing.tsx behaviour.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCROLL_SPEED } from "@/shared/motion/scrollSpeed";
import { refreshPriorityFor } from "@/shared/motion/beatThresholds";
import { sectionOrder } from "@/shared/sections";
import { getLenis } from "@/shared/components/smoothScrollControls";
import { getHomeFilmLoad } from "@/shared/components/introLoadSignals";
import { NAV_ANCHORS } from "@/shared/components/navbarAnchors";
import { observeNavAnchor } from "@/runtime/store";
import { prefersReducedMotion } from "@/runtime/media";
import { closingProgress } from "./homeFlow";
import { createVideoScrubber } from "./videoScrub";

gsap.registerPlugin(ScrollTrigger);

/** Load the film once the section is within this far of the viewport (or the hero film is ready). */
const CLOSING_LOAD_AHEAD = "0px 0px 300% 0px";
const PANEL_WIDTH_PCT = 48;
const PICTURE_SHIFT_PCT = -PANEL_WIDTH_PCT / 2;

export function initHomeClosing(): void {
  const root = document.querySelector<HTMLElement>("[data-home-closing]");
  if (!root) return;
  const video = root.querySelector<HTMLVideoElement>("video");
  const anchor = root.querySelector<HTMLElement>("[data-closing-cta-anchor]");

  // The section reads navy (film) but its CTA panel is frost: the navbar goes light over it.
  if (anchor) observeNavAnchor(anchor, NAV_ANCHORS.FLOW_CLOSING_CTA, { dark: false });

  if (!video) return;
  // Reduced motion renders no film at all (poster only).
  if (prefersReducedMotion()) {
    video.remove();
    return;
  }

  /* ── Film loading: after the hero film, or when near — whichever first ── */
  let loaded = false;
  const loadFilm = () => {
    if (loaded) return;
    loaded = true;
    video.src = video.dataset.src ?? "";
    observer.disconnect();
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadFilm();
    },
    { rootMargin: CLOSING_LOAD_AHEAD },
  );
  observer.observe(root);
  void getHomeFilmLoad().ready.then(loadFilm);

  const setFailed = () => {
    video.dataset.failed = "true";
  };

  /* ── The scrub ── */
  const media = gsap.matchMedia();
  media.add(
    { desktop: "(min-width: 768px)", motion: "(prefers-reduced-motion: no-preference)" },
    (context) => {
      if (!context.conditions?.motion) return;
      const desktop = Boolean(context.conditions.desktop);
      const seeker = createVideoScrubber(video, setFailed);
      const state = { progress: 0 };
      const span = root.querySelector<HTMLElement>(".home-closing-span");
      const timeline = gsap.timeline({
        scrollTrigger: {
          id: "home:closing",
          trigger: desktop ? (span ?? root) : root,
          start: desktop ? "top top" : "top bottom",
          end: desktop ? "bottom bottom" : "bottom top",
          scrub: SCROLL_SPEED,
          refreshPriority: refreshPriorityFor(sectionOrder("closing")),
        },
      });
      timeline.fromTo(
        state,
        { progress: 0 },
        {
          progress: 1,
          duration: 1,
          ease: "none",
          immediateRender: false,
          onUpdate: () => seeker.seek(closingProgress(state.progress).video),
        },
        0,
      );
      if (desktop) {
        timeline.fromTo(
          root.querySelector(".home-closing-picture"),
          { x: 0, xPercent: 0 },
          {
            x: 0,
            xPercent: PICTURE_SHIFT_PCT,
            duration: 1,
            ease: (p: number) => closingProgress(p).cta,
            immediateRender: false,
          },
          0,
        );
        timeline.fromTo(
          root.querySelector(".home-closing-cta"),
          { x: 0, xPercent: 100 },
          {
            x: 0,
            xPercent: 0,
            duration: 1,
            ease: (p: number) => closingProgress(p).cta,
            immediateRender: false,
          },
          0,
        );
      }
      timeline.progress(1).progress(timeline.scrollTrigger?.progress ?? 0);
      const onFocus = () => {
        // Keyboard users get the reachable CTA without a focus target offscreen.
        if (desktop && timeline.scrollTrigger) {
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(timeline.scrollTrigger.end, { immediate: true });
          else timeline.scrollTrigger.scroll(timeline.scrollTrigger.end);
        }
      };
      const cta = root.querySelector(".home-closing-cta");
      cta?.addEventListener("focusin", onFocus);
      return () => {
        seeker.dispose();
        cta?.removeEventListener("focusin", onFocus);
      };
    },
  );
}
