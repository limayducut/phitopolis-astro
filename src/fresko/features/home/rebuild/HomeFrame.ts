// Vanilla port of fresko rebuild/HomeFrame.tsx + stage/SectionBeat.tsx for the
// home sections. Every home section is `motion: "scroll"` with `ownsPin`, so
// SectionBeat adds no reveal/exit tween of its own: what remains is the
// stage-presence tracker, the navbar anchor (the section's ground), and the
// one-shot [data-reveal] entrances (Home takes the "fade" wipe; the hero is
// excluded — its entrance is the preloader's cascade).

import { NAV_ANCHORS } from "@/shared/components/navbarAnchors";
import { GROUNDS } from "@/shared/theme/grounds";
import { homeSection, sectionOrder } from "@/shared/sections";
import { observeNavAnchor } from "@/runtime/store";
import { stagePresence } from "@/shared/components/stage/stagePresence";
import { homeEntrance } from "./useHomeReveal";
import type { HomeFlowId } from "./homeFlow";

const HOME_NAV_KEYS = {
  "hero-sequence": "FLOW_HERO_SEQUENCE",
  "home-narration": "FLOW_HOME_NARRATION",
  "home-research": "FLOW_HOME_RESEARCH",
  "home-development": "FLOW_HOME_DEVELOPMENT",
  "home-support": "FLOW_HOME_SUPPORT",
  closing: "FLOW_CLOSING",
} as const;

export function initHomeFrames(): void {
  for (const section of document.querySelectorAll<HTMLElement>("[data-home-frame]")) {
    const id = section.dataset.homeFrame as HomeFlowId;
    const def = homeSection(id);
    const ground = GROUNDS[def.ground ?? "base"];
    const flow = section.querySelector<HTMLElement>(`[data-flow-section="${id}"]`);
    stagePresence(section, id, sectionOrder(id));
    if (!flow) continue;
    observeNavAnchor(flow, NAV_ANCHORS[HOME_NAV_KEYS[id]], { dark: ground.dark });
    homeEntrance(flow, id !== "hero-sequence", { wipe: "fade" });
  }
}
