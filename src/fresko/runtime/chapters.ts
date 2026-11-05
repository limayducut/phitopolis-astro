// The seam between the chapter scroll driver and the chapter diagrams.
//
// fresko's PillarChapter created one ChapterClock per chapter and handed it to
// both useChapterDriver (writes `clock.set(t)`) and the chapter's Visual
// (subscribes). Here the clocks live in one registry both sides import.

import {
  createChapterClock,
  type ChapterClock,
  type PillarName,
  type VisualMode,
} from "@/features/home/pipeline/chapterTimeline";
import { CHAPTER_BEATS } from "@/features/home/pipeline/pipelineCopy";
import { HOME_DESKTOP_QUERY } from "@/features/home/rebuild/homeFlow";
import { isLowPowerDevice, media } from "./media";

export const PILLARS: readonly PillarName[] = ["research", "development", "support"];

export const chapterClocks: Record<PillarName, ChapterClock> = {
  research: createChapterClock(CHAPTER_BEATS.research.length),
  development: createChapterClock(CHAPTER_BEATS.development.length),
  support: createChapterClock(CHAPTER_BEATS.support.length),
};

/** The chapter visuals' mode: "scrub" follows the clock (desktop, motion allowed). */
export const desktopMotion = () => media(HOME_DESKTOP_QUERY);
export const visualMode = (): VisualMode => (desktopMotion().matches ? "scrub" : "static");

/** useHandoffOn: the cross-section handoff runs on desktop with motion, not on low power. */
export const handoffOn = (): boolean => desktopMotion().matches && !isLowPowerDevice();
