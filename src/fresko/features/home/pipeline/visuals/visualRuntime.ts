/**
 * useVisualRuntime.ts + useStageSize, ported to a mount controller.
 *
 * - Stage size: the `.pipeline-visual-scale` frame's offset size when it has one, else the
 *   stage's (`.pipeline-visual-stage`, or the parent) bounding box; a zero box keeps the last
 *   size (or FALLBACK_STAGE). Re-measured by a ResizeObserver on the stage.
 * - "static" mode renders STATIC_T once per layout; "scrub" follows the chapter clock.
 * - The ambient loop (pulse, packets, orbit mark) runs only while the stage intersects the
 *   viewport and the tab is visible, never under reduced motion or on a low-power device.
 * - A layout change (size) rebuilds the visual; a context change (wide/compact, desktop
 *   motion, handoff) remounts it, as the React props/media queries did.
 */
import { STATIC_T, VISUAL_END_T, type ChapterClock, type VisualMode } from "../chapterTimeline";
import { WIDE_QUERY } from "./visualKit";
import { isLowPowerDevice, media, reducedMotion } from "@/runtime/media";
import { desktopMotion, handoffOn, visualMode } from "@/runtime/chapters";

export interface StageSize {
  w: number;
  h: number;
}
export const FALLBACK_STAGE: StageSize = { w: 728, h: 900 };

export type RenderFn = (t: number, time: number) => void;

export interface VisualContext {
  /** Below WIDE_QUERY: the compact frames. */
  compact: boolean;
  mode: VisualMode;
  handoff: boolean;
  clock: ChapterClock;
  lowPower: boolean;
}

export interface VisualInstance {
  /** Builds (or rebuilds) the DOM for this stage size; returns the per-frame render. */
  build(size: StageSize): RenderFn | null;
  /** Tears down anything the instance owns beyond the root's children. */
  destroy?(): void;
}

export type VisualFactory = (root: HTMLElement, ctx: VisualContext) => VisualInstance;

const stageOf = (root: HTMLElement): Element =>
  root.closest(".pipeline-visual-stage") ?? root.parentElement ?? root;

function measure(root: HTMLElement, current: StageSize | null): StageSize {
  const frame = root.closest<HTMLElement>(".pipeline-visual-scale");
  const box =
    frame && frame.offsetWidth > 0 && frame.offsetHeight > 0
      ? { width: frame.offsetWidth, height: frame.offsetHeight }
      : stageOf(root).getBoundingClientRect();
  if (box.width > 0 && box.height > 0) {
    return current && current.w === box.width && current.h === box.height
      ? current
      : { w: box.width, h: box.height };
  }
  return current ?? FALLBACK_STAGE;
}

/** Mounts one chapter visual on `root` and keeps it in step with its clock, size and context. */
export function mountVisual(
  root: HTMLElement,
  clock: ChapterClock,
  factory: VisualFactory,
  ambient: boolean,
): () => void {
  const wide = media(WIDE_QUERY);
  const desktop = desktopMotion();
  const reduced = reducedMotion();
  const lowPower = isLowPowerDevice();

  let instance: VisualInstance | null = null;
  let render: RenderFn | null = null;
  let size: StageSize | null = null;
  let mode: VisualMode = "static";
  let t = VISUAL_END_T;
  let time = 0;
  let unsubscribeClock: (() => void) | null = null;

  /* ── the clock / static render (useVisualRuntime's first effect) ── */
  const follow = () => {
    unsubscribeClock?.();
    unsubscribeClock = null;
    if (!render) return;
    if (mode === "static") {
      t = STATIC_T;
      render(t, 0);
      return;
    }
    unsubscribeClock = clock.subscribe((next) => {
      t = next;
      render?.(next, time);
    });
  };

  /* ── the ambient loop (useVisualRuntime's second effect) ── */
  let frame = 0;
  let intersecting = false;
  const tick = (now: number) => {
    frame = 0;
    time = now;
    render?.(t, now);
    if (intersecting && document.visibilityState !== "hidden")
      frame = window.requestAnimationFrame(tick);
  };
  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    delete root.dataset.ambient;
  };
  const ambientAllowed = () => ambient && !reduced.matches && !lowPower && !!render;
  const start = () => {
    if (!ambientAllowed() || frame || !intersecting || document.visibilityState === "hidden") return;
    root.dataset.ambient = "on";
    frame = window.requestAnimationFrame(tick);
  };
  const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
  const io = new IntersectionObserver(([entry]) => {
    intersecting = entry?.isIntersecting ?? false;
    if (intersecting) start();
    else stop();
  });
  io.observe(stageOf(root));
  document.addEventListener("visibilitychange", onVisibility);

  /* ── layout: build for the measured size ── */
  const rebuild = () => {
    if (!instance || !size) return;
    stop();
    render = instance.build(size);
    follow();
    start();
  };

  /* ── context: (re)mount the instance ── */
  const remount = () => {
    unsubscribeClock?.();
    unsubscribeClock = null;
    stop();
    instance?.destroy?.();
    root.replaceChildren();
    mode = visualMode();
    instance = factory(root, {
      compact: !wide.matches,
      mode,
      handoff: handoffOn(),
      clock,
      lowPower,
    });
    size = measure(root, size);
    rebuild();
  };

  const ro =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          const next = measure(root, size);
          if (next === size) return;
          size = next;
          rebuild();
        });
  ro?.observe(stageOf(root));
  const onResize = () => {
    const next = measure(root, size);
    if (next === size) return;
    size = next;
    rebuild();
  };
  if (!ro) window.addEventListener("resize", onResize);

  // The media watchers call back immediately; the first call mounts.
  let ready = false;
  const onContext = () => {
    if (ready) remount();
  };
  const offs = [wide.on(onContext), desktop.on(onContext), reduced.on(() => (ready ? (stop(), start()) : undefined))];
  ready = true;
  remount();

  return () => {
    offs.forEach((off) => off());
    unsubscribeClock?.();
    stop();
    io.disconnect();
    ro?.disconnect();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    instance?.destroy?.();
    root.replaceChildren();
  };
}
