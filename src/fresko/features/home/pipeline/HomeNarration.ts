// Vanilla port of fresko pipeline/HomeNarration.tsx (the curtain timeline) and
// pipeline/useWordLight.ts (the desktop word light).

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { refreshPriorityFor } from "@/shared/motion/beatThresholds";
import { sectionOrder } from "@/shared/sections";
import { HOME_DESKTOP_QUERY } from "@/features/home/rebuild/homeFlow";
import { homeReveal } from "@/features/home/rebuild/useHomeReveal";

gsap.registerPlugin(ScrollTrigger);

const CURTAIN_PARALLAX = { film: 0.08, copy: 0.22 } as const;

/** The hero recedes as the narration rises over it; the narration's rule draws. */
function curtain(timeline: gsap.core.Timeline, root: HTMLElement) {
  const heroPlateInner = document.querySelector<HTMLElement>(".hero-plate-inner");
  const heroPlateScrim = document.querySelector<HTMLElement>(".hero-plate-scrim");
  const heroFilm = document.querySelector<HTMLElement>(".hero-film");
  const heroCopy = document.querySelector<HTMLElement>(".hero-copy");
  const rule = root.querySelector<HTMLElement>(".pipeline-narration-rule");
  const viewportHeight = () => window.innerHeight;

  if (heroPlateInner) {
    timeline.fromTo(heroPlateInner, { scale: 1 }, { scale: 0.94, ease: "none", immediateRender: false }, 0);
  }
  if (heroFilm) {
    timeline.fromTo(
      heroFilm,
      { y: 0 },
      { y: () => -CURTAIN_PARALLAX.film * viewportHeight(), ease: "none", immediateRender: false },
      0,
    );
  }
  if (heroCopy) {
    timeline.fromTo(
      heroCopy,
      { y: 0, autoAlpha: 1 },
      {
        y: () => -CURTAIN_PARALLAX.copy * viewportHeight(),
        autoAlpha: 0.35,
        ease: "none",
        immediateRender: false,
      },
      0,
    );
  }
  if (timeline.scrollTrigger) timeline.scrollTrigger.vars.invalidateOnRefresh = true;
  if (heroPlateScrim) {
    timeline.fromTo(heroPlateScrim, { autoAlpha: 0 }, { autoAlpha: 0.45, ease: "none", immediateRender: false }, 0);
  }
  if (rule) {
    timeline.fromTo(rule, { scaleX: 0 }, { scaleX: 1, ease: "none", immediateRender: false }, 0);
  }
}

/* ── useWordLight ── */
const WORD_START_OPACITY = 0.16;
const WORD_LIT_SHARE = 0.25;
const WORD_STAGGER_SHARE = 0.75;
const WORD_HOLD_SHARE = 0.8;

export function wordLightHoldDistance(rootHeight: number, viewportHeight: number): number {
  return Math.round(Math.max(0, rootHeight - viewportHeight) * WORD_HOLD_SHARE);
}

function wordLight(root: HTMLElement): void {
  const media = gsap.matchMedia();
  media.add(HOME_DESKTOP_QUERY, () => {
    const words = gsap.utils.toArray<HTMLElement>(".pipeline-word", root);
    if (!words.length) return;
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "home:home-narration:words",
        trigger: root,
        start: "top top",
        end: () => `+=${wordLightHoldDistance(root.offsetHeight, window.innerHeight)}`,
        scrub: true,
        refreshPriority: refreshPriorityFor(sectionOrder("home-narration")),
      },
    });
    timeline.fromTo(
      words,
      { opacity: WORD_START_OPACITY },
      {
        opacity: 1,
        duration: WORD_LIT_SHARE,
        stagger: WORD_STAGGER_SHARE / words.length,
        ease: "none",
        immediateRender: false,
        lazy: false,
      },
      0,
    );
    timeline.progress(1).progress(timeline.scrollTrigger?.progress ?? 0);
    return () => gsap.set(words, { clearProps: "opacity" });
  });
}

export function initHomeNarration(): void {
  const root = document.querySelector<HTMLElement>(".pipeline-narration");
  if (!root) return;
  homeReveal(root, "home-narration", curtain, "top bottom", "top top");
  wordLight(root);
}
