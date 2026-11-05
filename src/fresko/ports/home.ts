// OWNER: home-flow fork. Hero, narration, gold thread, pillar chapters
// (opener + driver + script + aperture), closing, section frames/reveals.
// Every trigger sets its own refreshPriority, so creation order does not
// change the resolved geometry.

import { initHero } from "@/features/home/rebuild/HomeOpening";
import { initHomeFrames } from "@/features/home/rebuild/HomeFrame";
import { initHomeThreadRun } from "@/features/home/rebuild/HomeThreadRun";
import { initHomeNarration } from "@/features/home/pipeline/HomeNarration";
import { initChapterDriver } from "@/features/home/pipeline/useChapterDriver";
import { initHomeClosing } from "@/features/home/rebuild/HomeClosing";
import { CHAPTER_BEATS } from "@/features/home/pipeline/pipelineCopy";
import type { HomeFlowId } from "@/features/home/rebuild/homeFlow";
import { PILLARS, chapterClocks, handoffOn } from "@/runtime/chapters";

function initChapters(): void {
  for (const pillar of PILLARS) {
    const id = `home-${pillar}` as HomeFlowId;
    const section = document.querySelector<HTMLElement>(`#${id} .pipeline-chapter`);
    const body = section?.querySelector<HTMLElement>(".pipeline-chapter-body");
    if (!section || !body) continue;
    initChapterDriver({
      pillar,
      id,
      beatCount: CHAPTER_BEATS[pillar].length,
      section,
      body,
      clock: chapterClocks[pillar],
      handoff: handoffOn(),
    });
  }
}

export function initHome(): void {
  // The hero first: its film reports into the intro's load ledger.
  initHero();
  // Children's effects ran before their frames' in React; keep that order.
  initHomeNarration();
  initChapters();
  initHomeClosing();
  initHomeThreadRun();
  initHomeFrames();
}
