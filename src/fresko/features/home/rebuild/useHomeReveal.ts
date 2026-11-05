// Vanilla port of fresko rebuild/useHomeReveal.ts: `homeReveal` (one
// non-pinned, scroll-scrubbed timeline for a home section) and `homeEntrance`
// (one-shot entrance for every [data-reveal] in a section). Same triggers,
// same spec values, same geometry rules.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { refreshPriorityFor } from "@/shared/motion/beatThresholds";
import {
  REVEAL_BURST_MS,
  REVEAL_DURATION_S,
  REVEAL_EASE,
  REVEAL_RISE_PX,
  REVEAL_START,
  REVEAL_STAGGER_S,
  WIPE_DRIFT_PX,
  WIPE_DURATION_S,
  WIPE_EASE,
} from "@/shared/motion/entranceSpec";
import { sectionOrder } from "@/shared/sections";
import { HOME_MOTION_QUERY } from "./homeFlow";
import type { HomeFlowId } from "./homeFlow";

gsap.registerPlugin(ScrollTrigger);

export type BuildTimeline = (timeline: gsap.core.Timeline, root: HTMLElement) => void;

/** useHomeReveal: returns the gsap.matchMedia so callers can revert it. */
export function homeReveal(
  root: HTMLElement,
  id: HomeFlowId,
  timelineFor: BuildTimeline,
  start = "top 80%",
  end = "top 20%",
  query = HOME_MOTION_QUERY,
): gsap.MatchMedia {
  const media = gsap.matchMedia();
  media.add(query, () => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: `home:${id}`,
        trigger: root,
        start,
        end,
        scrub: true,
        refreshPriority: refreshPriorityFor(sectionOrder(id)),
      },
    });
    timelineFor(timeline, root);
    // Lit-default invariant: land on the reader's actual position before first paint.
    timeline.progress(1).progress(timeline.scrollTrigger?.progress ?? 0);
  });
  return media;
}

export { REVEAL_START };

export interface HomeEntranceOptions {
  wipe?: "clip" | "fade";
}

/** useHomeEntrance: one-shot, time-based entrance for each [data-reveal] in `root`. */
export function homeEntrance(
  root: HTMLElement,
  enabled = true,
  options: HomeEntranceOptions = {},
): gsap.MatchMedia | null {
  if (!enabled) return null;
  const wipeFade = options.wipe === "fade";
  const media = gsap.matchMedia();
  media.add(HOME_MOTION_QUERY, () => {
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!targets.length) return;
    let burstAt = -Infinity;
    let burstIndex = 0;
    targets.forEach((el) => {
      // Geometry at creation decides everything below.
      const belowFold = el.getBoundingClientRect().top >= window.innerHeight;
      if (!belowFold) return; // on screen already: leave lit, never animate
      const wipe = el.dataset.reveal === "wipe";
      const tween = wipe
        ? gsap.fromTo(
            el,
            wipeFade
              ? { x: -WIPE_DRIFT_PX, opacity: 0 }
              : { clipPath: "inset(0 100% 0 0)", x: -WIPE_DRIFT_PX, autoAlpha: 1 },
            {
              ...(wipeFade ? { opacity: 1 } : { clipPath: "inset(0 0% 0 0)" }),
              x: 0,
              duration: WIPE_DURATION_S,
              ease: WIPE_EASE,
              paused: true,
              immediateRender: true,
            },
          )
        : gsap.fromTo(
            el,
            { y: REVEAL_RISE_PX, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: REVEAL_DURATION_S,
              ease: REVEAL_EASE,
              paused: true,
              immediateRender: true,
            },
          );
      let played = false;
      const reveal = () => {
        if (played) return;
        played = true;
        const now = performance.now();
        burstIndex = now - burstAt < REVEAL_BURST_MS ? burstIndex + 1 : 0;
        burstAt = now;
        tween.delay(burstIndex * REVEAL_STAGGER_S).play();
      };
      ScrollTrigger.create({
        trigger: el,
        start: REVEAL_START,
        once: true,
        onEnter: reveal,
        onRefresh: (self) => {
          if (self.progress > 0) reveal();
        },
      });
    });
  });
  return media;
}
