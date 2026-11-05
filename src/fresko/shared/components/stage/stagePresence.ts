// Vanilla port of fresko stage/stagePresence.ts (useStagePresence): reports a
// section as active while it occupies the viewport middle. Runs under reduced
// motion too (it is informational).

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { setActiveSection } from "@/shared/sections";
import { refreshPriorityFor } from "@/shared/motion/beatThresholds";

gsap.registerPlugin(ScrollTrigger);

export function stagePresence(el: HTMLElement, id: string, order?: number): ScrollTrigger {
  return ScrollTrigger.create({
    trigger: el,
    // NOT a reveal threshold: a presence tracker ("occupies the viewport middle").
    start: "top 50%",
    end: "bottom 50%",
    ...(order === undefined ? {} : { refreshPriority: refreshPriorityFor(order) }),
    onToggle: (self) => {
      if (self.isActive) setActiveSection(id);
    },
  });
}
