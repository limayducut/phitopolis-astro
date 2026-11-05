import { NOIR } from "@/shared/theme/palette";
import type { PillarName } from "./chapterTimeline";

/**
 * The chapter accent per pillar. Owner, 2026-10-13: the brand gold throughout
 * (the cyan / green / violet trial is dropped), so all three are gold; the map
 * stays so a pillar can be told apart later without touching the call sites.
 */
export const PILLAR_HUE: Record<PillarName, string> = {
  research: NOIR.gold,
  development: NOIR.gold,
  support: NOIR.gold,
};
