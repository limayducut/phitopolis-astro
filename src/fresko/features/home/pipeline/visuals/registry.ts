import type { PillarName } from "../chapterTimeline";
import { runGlobe } from "./runGlobe";
import { signalField } from "./signalField";
import { systemStack } from "./systemStack";
import type { VisualFactory } from "./visualRuntime";

/** registry.tsx: each chapter's visual. All three run an ambient loop. */
export const CHAPTER_VISUALS: Record<PillarName, VisualFactory> = {
  research: signalField,
  development: systemStack,
  support: runGlobe,
};
