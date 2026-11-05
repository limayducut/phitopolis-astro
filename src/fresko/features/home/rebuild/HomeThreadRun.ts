// Vanilla port of fresko rebuild/HomeThreadRun.tsx: one scrubbed trigger from
// the first segment's top to the last segment's bottom, painting every
// [data-thread-draw] / [data-thread-tip] from the pure goldThreadMotion maths.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { refreshPriorityFor } from "@/shared/motion/beatThresholds";
import { sectionOrder } from "@/shared/sections";
import { threadDraw, threadTip } from "./goldThreadMotion";
import { HOME_DESKTOP_QUERY } from "./homeFlow";

gsap.registerPlugin(ScrollTrigger);

/** Sums `offsetTop` up the offsetParent chain until `ancestor` (layout-based, ignores transforms). */
function offsetTopWithin(el: HTMLElement, ancestor: HTMLElement): number {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    y += node.offsetTop;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
  }
  return y;
}

export function initHomeThreadRun(): void {
  const root = document.querySelector<HTMLElement>("[data-thread-run]");
  if (!root) return;
  const media = gsap.matchMedia();
  media.add(HOME_DESKTOP_QUERY, () => {
    const segments = gsap.utils.toArray<HTMLElement>("[data-thread-segment]", root);
    const draws = gsap.utils.toArray<HTMLElement>("[data-thread-draw]", root);
    const tips = gsap.utils.toArray<HTMLElement>("[data-thread-tip]", root);
    if (segments.length === 0) return;
    const first = segments[0]!;
    const last = segments[segments.length - 1]!;

    let total = 0;
    let drawTop: number[] = [];
    let drawHeight: number[] = [];
    let tipTop: number[] = [];
    let tipHeight: number[] = [];
    const measure = () => {
      const firstTop = offsetTopWithin(first, root);
      const segTop = segments.map((s) => offsetTopWithin(s, root) - firstTop);
      const segHeight = segments.map((s) => s.offsetHeight);
      const lastIndex = segments.length - 1;
      total = (segTop[lastIndex] ?? 0) + (segHeight[lastIndex] ?? 0);
      drawTop = draws.map((el) => offsetTopWithin(el, root) - firstTop);
      drawHeight = draws.map((el) => el.offsetHeight);
      const owners = tips.map((el) => segments.findIndex((segment) => segment.contains(el)));
      tipTop = tips.map((el, i) => {
        const owner = owners[i] ?? -1;
        return owner >= 0 ? (segTop[owner] ?? 0) : offsetTopWithin(el, root) - firstTop;
      });
      tipHeight = tips.map((el, i) => {
        const owner = owners[i] ?? -1;
        return owner >= 0 ? (segHeight[owner] ?? 0) : el.offsetHeight;
      });
    };

    const state = { p: 0 };
    const paint = () => {
      const v = state.p * total;
      draws.forEach((el, i) => {
        const drawn = threadDraw(v, drawTop[i] ?? 0, drawHeight[i] ?? 0);
        el.style.transform = `scaleY(${String(drawn)})`;
      });
      tips.forEach((el, i) => {
        const lead = el.dataset.threadTip === "lead";
        const at = threadTip(v, tipTop[i] ?? 0, tipHeight[i] ?? 0, lead);
        el.style.transform = `translateY(${String(at.y)}px)`;
        el.style.visibility = at.visible ? "visible" : "hidden";
      });
    };

    measure();
    const tween = gsap.fromTo(
      state,
      { p: 0 },
      {
        p: 1,
        ease: "none",
        immediateRender: false,
        lazy: false,
        onUpdate: paint,
        scrollTrigger: {
          id: "home:thread",
          trigger: first,
          start: "top center",
          endTrigger: last,
          end: "bottom center",
          // `true`, not a lag: the tip must sit exactly on the reading line every frame.
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: refreshPriorityFor(sectionOrder("home-narration")),
          onRefresh: () => {
            measure();
            paint();
          },
        },
      },
    );
    tween.progress(1).progress(tween.scrollTrigger?.progress ?? 0);
    paint();

    return () => {
      for (const el of draws) el.style.removeProperty("transform");
      for (const el of tips) {
        el.style.removeProperty("transform");
        el.style.removeProperty("visibility");
      }
    };
  });
}
