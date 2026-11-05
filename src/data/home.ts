// Home chapter data, derived from the verbatim fresko modules (content.ts,
// pipelineCopy.ts, plateFocus.ts, chapterLayout.ts) so nothing is re-typed.
// index.astro spreads each entry into <PillarChapter>; the component reads
// `pillar` and resolves everything else from the same modules.

import { CONTENT } from "@/shared/content";
import { CHAPTER_BEATS, CHAPTERS as CHAPTER_COPY } from "@/features/home/pipeline/pipelineCopy";
import { PLATE_PHONE_POSITION_X } from "@/features/home/pipeline/plateFocus";
import { CHAPTER_LAYOUT } from "@/features/home/pipeline/chapterLayout";
import type { PillarName } from "@/features/home/pipeline/chapterTimeline";

export interface Chapter {
  id: string;
  pillar: PillarName;
  name: string;
  deck: string;
  image: string;
  alt: string;
  width: number;
  height: number;
  phoneX: number;
  textSide: "left" | "right";
  beats: readonly string[];
  description: string;
}

const CONTENT_IDS: Record<PillarName, string> = { research: "01", development: "02", support: "03" };
const IMAGE_SIZE: Record<PillarName, { width: number; height: number }> = {
  research: { width: 2000, height: 1116 },
  development: { width: 2000, height: 1120 },
  support: { width: 2000, height: 1125 },
};

function pillarContent(pillar: PillarName) {
  const entry = CONTENT.hero.salesPitch.pillars.find((p) => p.id === CONTENT_IDS[pillar]);
  if (!entry) throw new Error(`Home pipeline: missing pillar ${pillar}`);
  return entry;
}

const PILLARS: readonly PillarName[] = ["research", "development", "support"];

export const CHAPTERS: readonly Chapter[] = PILLARS.map((pillar) => {
  const content = pillarContent(pillar);
  return {
    id: `home-${pillar}`,
    pillar,
    name: content.name.replace(/\s+Pillar$/i, ""),
    deck: CHAPTER_COPY[pillar].kicker,
    image: content.image,
    alt: content.alt,
    ...IMAGE_SIZE[pillar],
    phoneX: PLATE_PHONE_POSITION_X[pillar],
    textSide: CHAPTER_LAYOUT[pillar].textSide,
    beats: CHAPTER_BEATS[pillar],
    description: content.officialDescription,
  };
});
