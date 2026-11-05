import type { PillarName } from "./chapterTimeline";

/**
 * How a chapter's pinned stage is laid out and which way its sentences advance. The
 * engine (PillarChapter, ChapterScript, the driver) reads only this; a pillar
 * changes its layout by changing its entry here.
 *
 *  - `vertical`: sentences advance top to bottom.
 *  - `horizontal`: sentences advance left to right.
 *  - `textSide`: which column holds the sentences when the stage is two-column.
 */
export type SignalDirection = "vertical" | "horizontal";
export interface ChapterLayout {
  direction: SignalDirection;
  textSide: "left" | "right";
}

export const CHAPTER_LAYOUT = {
  research: { direction: "vertical", textSide: "left" },
  development: { direction: "horizontal", textSide: "left" },
  support: { direction: "vertical", textSide: "right" },
} as const satisfies Record<PillarName, ChapterLayout>;

/** How far a sentence travels along the signal axis between resting and gone, px. */
export const SENTENCE_TRAVEL_PX = 48;

/**
 * A horizontal chapter stacks its stage: sentences above, the visual below. The stage holds
 * still across the pin (no glide); only the sentences change.
 */
/** Share of the pinned stage's height the sentence row takes in a horizontal chapter, percent. */
export const HORIZONTAL_TEXT_SHARE = 36;
