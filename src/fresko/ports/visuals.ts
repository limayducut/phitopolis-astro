// VISUALS: the three chapter diagrams (SignalField, SystemStack, RunGlobe with its
// SpinningGlobe/GlobeStatic) and the HandoffCarrier, mounted on their server-rendered roots.
import type { PillarName } from "@/features/home/pipeline/chapterTimeline";
import { CHAPTER_VISUALS } from "@/features/home/pipeline/visuals/registry";
import { mountVisual } from "@/features/home/pipeline/visuals/visualRuntime";
import { initHandoffCarrier } from "@/features/home/pipeline/handoffCarrier";
import { chapterClocks } from "@/runtime/chapters";

export function initVisuals(): void {
  for (const root of document.querySelectorAll<HTMLElement>("[data-pipeline-visual]")) {
    const pillar = root.dataset.pipelineVisual as PillarName | undefined;
    if (!pillar || !(pillar in CHAPTER_VISUALS)) continue;
    mountVisual(root, chapterClocks[pillar], CHAPTER_VISUALS[pillar], true);
  }
  const carrier = document.querySelector<SVGSVGElement>("svg.pipeline-handoff-carrier");
  if (carrier) initHandoffCarrier(carrier);

  // Dev-only test hook: drive a chapter clock by hand (e.g. from Playwright).
  if (import.meta.env.DEV) {
    (window as unknown as { __chapterClocks?: typeof chapterClocks }).__chapterClocks = chapterClocks;
  }
}
