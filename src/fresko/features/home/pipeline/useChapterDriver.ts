// Vanilla port of fresko pipeline/useChapterDriver.ts: everything above the
// hook is verbatim; the hook became `initChapterDriver`.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { refreshPriorityFor } from "@/shared/motion/beatThresholds";
import { sectionOrder } from "@/shared/sections";
import { NAVBAR_FLOATING_HEIGHT_PX } from "@/shared/theme/container";
import {
  ARRIVAL_PHOTO_SCALE,
  SHUTTER_BOTTOM_CLASS,
  SHUTTER_TOP_CLASS,
  apertureStart,
  closedBand,
  createMotionHint,
  facesShares,
  fitPositionY,
  shutterPercents,
  type FacesShares,
  type PlateFocus,
} from "@/features/home/rebuild/aperture";
import { HOME_DESKTOP_QUERY, type HomeFlowId } from "@/features/home/rebuild/homeFlow";
import { CHAPTER_LAYOUT, SENTENCE_TRAVEL_PX, type ChapterLayout } from "./chapterLayout";
import { sentencePose, wordAlpha } from "./scriptLight";
import {
  VISUAL_END_T,
  clamp01,
  riseProgress,
  scriptPosition,
  visualTime,
  type ChapterClock,
  type PillarName,
} from "./chapterTimeline";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * The cover's parallax (owner, 2026-10-14: the photos drift, never shrink): while the body
 * rises over the sticky opener, the opener drifts up at this share of the body's rate.
 */
export const COVER_PARALLAX = 0.35;
/** The photo's dim once the body has fully covered it (the band copy is never dimmed). */
export const COVER_DIM = 0.35;
/** A percentage rounded so no exponent is ever written, and a negative zero is a plain 0. */
const roundPercent = (percent: number): number => Math.round(percent * 1e4) / 1e4 + 0;
/** A vertical move of `percent` of the element's own height. */
const translatePercent = (percent: number): string =>
  `translate3d(0, ${String(roundPercent(percent))}%, 0)`;
/** Written values closer than this are not re-written. */
const WRITE_EPSILON = 0.004;
/** The title's rise starts here when there is no layout to measure the band's entry from. */
const RISE_FALLBACK_START = 0.35;
/** The title's rise always gets at least this share of the arrival to move in. */
const RISE_MIN_SPAN = 0.1;

interface ScriptLine {
  clause: HTMLElement;
  words: HTMLElement[];
  written: number[];
  /** The clause's progress bar fill, when it has one. */
  fill: HTMLElement | null;
  /** The last written clause opacity / travel / fill (NaN: none yet). */
  alpha: number;
  travel: number;
  filled: number;
}

/** Whether a value is worth writing: it moved past the epsilon, or it landed exactly on 0 or 1 (a resting state is always written). */
const worthWriting = (written: number, next: number): boolean =>
  !(Math.abs(next - written) < WRITE_EPSILON) || ((next === 0 || next === 1) && next !== written);

export function collectScript(script: HTMLElement): ScriptLine[] {
  const clauses = [...script.querySelectorAll<HTMLElement>(".pipeline-clause")];
  return clauses.map((clause) => {
    const words = [...clause.querySelectorAll<HTMLElement>(".pipeline-word")];
    return {
      clause,
      words,
      written: words.map(() => Number.NaN),
      fill: clause.querySelector<HTMLElement>(".pipeline-clause-fill"),
      alpha: Number.NaN,
      travel: Number.NaN,
      filled: Number.NaN,
    };
  });
}

/**
 * The sentences as a pure function of the script position `s`: each clause's opacity and its
 * travel along the chapter's signal axis, and each word's opacity. One sentence is on screen at
 * a time (`sentencePose`). Only `style.opacity` and `style.transform` are written, and only on change.
 */
export function paintScript(
  lines: readonly ScriptLine[],
  s: number,
  layout: ChapterLayout = CHAPTER_LAYOUT.research,
): void {
  const axis = layout.direction === "vertical" ? "Y" : "X";
  lines.forEach((line, k) => {
    const pose = sentencePose(s, k, lines.length);
    if (worthWriting(line.alpha, pose.alpha)) {
      line.alpha = pose.alpha;
      line.clause.style.opacity = String(pose.alpha);
    }
    if (worthWriting(line.travel, pose.travel)) {
      line.travel = pose.travel;
      line.clause.style.transform = `translate${axis}(${String(Math.round(pose.travel * SENTENCE_TRAVEL_PX * 100) / 100)}px)`;
    }
    if (line.fill) {
      // The sentence's own small bar fills as the sentence is read (its beat is k .. k + 1).
      const filled = clamp01(s - k);
      if (worthWriting(line.filled, filled)) {
        line.filled = filled;
        line.fill.style.transform = `scaleY(${String(Math.round(filled * 1e3) / 1e3)})`;
      }
    }
    line.words.forEach((word, i) => {
      const alpha = wordAlpha(s, k, i, line.words.length);
      const prev = line.written[i] ?? Number.NaN;
      if (Number.isFinite(prev) && !worthWriting(prev, alpha)) return;
      line.written[i] = alpha;
      word.style.opacity = String(alpha);
    });
  });
}

export function clearScript(lines: readonly ScriptLine[]): void {
  for (const line of lines) {
    line.clause.style.removeProperty("opacity");
    line.clause.style.removeProperty("transform");
    line.fill?.style.removeProperty("transform");
    line.alpha = Number.NaN;
    line.travel = Number.NaN;
    line.filled = Number.NaN;
    line.words.forEach((word, i) => {
      word.style.removeProperty("opacity");
      line.written[i] = Number.NaN;
    });
  }
}

/** The opener's parts the cover writes, looked up once (not every frame), and the hints for the two that repaint. */
interface CoverParts {
  opener: HTMLElement;
  dim: HTMLElement | null;
  openerHint: ReturnType<typeof createMotionHint>;
  dimHint: ReturnType<typeof createMotionHint>;
}

function coverParts(opener: HTMLElement): CoverParts {
  const dim = opener.querySelector<HTMLElement>(".pipeline-opener-dim");
  return {
    opener,
    dim,
    openerHint: createMotionHint([opener]),
    dimHint: createMotionHint(dim ? [dim] : [], "opacity"),
  };
}

/** The opener's lift, as a percentage of its own (one-viewport) height, at cover progress `c`. */
export const coverLiftPercent = (c: number): number => -100 * COVER_PARALLAX * clamp01(c);

/**
 * The cover phase (`c`: how far the body has risen, 0..1): the body rises OVER the sticky
 * opener (the opener rests under it, CHAPTER_Z.openerResting) while the opener (plate and
 * band, one unit) drifts up at COVER_PARALLAX of the body's rate: a parallax, the photo never
 * scaled. The rise is one viewport and the opener one viewport tall, so the drift is a
 * percentage of the opener itself. The photo's dim deepens to COVER_DIM; the band copy is
 * never touched. Both are hinted to the compositor only while the cover is moving.
 */
function paintCover({ opener, dim, openerHint, dimHint }: CoverParts, c: number): void {
  const moving = c > 0 && c < 1;
  openerHint.set(moving);
  dimHint.set(moving);
  if (c > 0) opener.style.transform = translatePercent(coverLiftPercent(c));
  else opener.style.removeProperty("transform");
  if (dim) dim.style.opacity = String(COVER_DIM * c);
}

function clearCover({ opener, dim, openerHint, dimHint }: CoverParts): void {
  openerHint.release();
  dimHint.release();
  opener.style.removeProperty("transform");
  dim?.style.removeProperty("opacity");
}

/** A photo's faces and crop, read back from the attributes `ChapterOpener` wrote beside its object-position. */
export function readPlateFocus(media: HTMLElement): PlateFocus {
  const read = (name: string, fallback: number) => {
    const value = Number.parseFloat(media.getAttribute(name) ?? "");
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    facesTop: read("data-faces-top", 0.5),
    facesBottom: read("data-faces-bottom", 0.5),
    positionY: read("data-position-y", 0.5),
  };
}

/**
 * Where in the arrival the title's line rise starts: the progress at which the title's box
 * reaches the bottom of the viewport (before that there is nothing of the title on screen
 * to rise). `titleTopPx` is the title's distance below the top of the arrival's trigger;
 * `distancePx` is the scroll the arrival spans. A zero measurement (no layout) keeps the
 * fallback start; the rise always keeps a span to move in, and lands by the arrival's end.
 */
export function titleRiseStart(titleTopPx: number, distancePx: number): number {
  if (!(titleTopPx > 0) || !(distancePx > 0)) return RISE_FALLBACK_START;
  return Math.min(titleTopPx / distancePx, 1 - RISE_MIN_SPAN);
}

/**
 * One shutter's inline move, written only when the rounded value changes. Zero is the
 * resting CSS (open), so it leaves no inline transform at all.
 */
function createShutterWriter(shutter: HTMLElement) {
  let written = Number.NaN;
  return (percent: number) => {
    const rounded = roundPercent(percent);
    if (rounded === written) return;
    written = rounded;
    if (rounded === 0) shutter.style.removeProperty("transform");
    else shutter.style.transform = translatePercent(rounded);
  };
}

/**
 * Arrival: the photo plate opens from a band of photo that holds every face to its full
 * height as the run rises into view. Transform only, no clip. Owns only the two
 * shutters' transform (written directly, a percentage of the plate), the media's scale and
 * the title lines' yPercent, and, on refresh, the photo's vertical object-position.
 *
 * The band holds the photo's faces stretch whole (`readPlateFocus`, resolved through the
 * photo's own cover crop by `facesShares`, and followed through the photo's 1.08 -> 1
 * settle by `closedBand`). The crop itself is refitted to the plate (`fitPositionY`) so the
 * faces clear the floating navbar's strip. The shutters stay closed until the arrival
 * progress at which the band's top edge crosses the bottom of the viewport, then open on
 * the intro's quart in-out curve and are fully apart by `ARRIVAL_APERTURE_END`; they stay
 * open while the photo has not loaded (or failed to), so no shutter closes over an empty
 * window. The title rises as its box comes on screen and lands by the arrival's end.
 * Everything is measured on refresh and when the image has loaded, never per frame.
 */
function buildArrival(section: HTMLElement, id: HomeFlowId): (() => void) | undefined {
  const run = section.querySelector<HTMLElement>(".pipeline-opener-run");
  const frame = section.querySelector<HTMLElement>(".pipeline-opener-frame");
  const copy = section.querySelector<HTMLElement>(".pipeline-opener-copy");
  const shutterTop = section.querySelector<HTMLElement>(`.${SHUTTER_TOP_CLASS}`);
  const shutterBottom = section.querySelector<HTMLElement>(`.${SHUTTER_BOTTOM_CLASS}`);
  const media = section.querySelector<HTMLImageElement>(".pipeline-opener-media");
  const heading = section.querySelector<HTMLElement>(".pipeline-opener-title");
  if (!run || !frame || !shutterTop || !shutterBottom || !media) return undefined;
  const hint = createMotionHint([shutterTop, shutterBottom, media]);
  const focus = readPlateFocus(media);
  const writeTop = createShutterWriter(shutterTop);
  const writeBottom = createShutterWriter(shutterBottom);

  // Read on refresh and on image load only; the paint below reads the numbers.
  let faces: FacesShares = { top: 0.5, bottom: 0.5 };
  let start = 0;
  let ready = media.complete && media.naturalWidth > 0;
  const paintAperture = (progress: number) => {
    const { top, bottom } = ready ? shutterPercents(progress, start, faces) : { top: 0, bottom: 0 };
    writeTop(top);
    writeBottom(bottom);
  };

  // The title's line rise, placed where the title's box enters and scaled to land by 1.
  let rise: gsap.core.Animation | undefined;
  let riseDuration = 0;
  let riseStart = RISE_FALLBACK_START;
  const placeRise = () => {
    if (!rise) return;
    rise.timeScale(riseDuration / (1 - riseStart));
    tl.add(rise, riseStart);
    // Land on the reader's actual position for the re-placed lines.
    tl.progress(1).progress(tl.scrollTrigger?.progress ?? 0);
  };

  const measure = (self: ScrollTrigger) => {
    const height = frame.offsetHeight;
    const layout = {
      width: frame.offsetWidth,
      height,
      imageWidth: media.naturalWidth || Number(media.getAttribute("width")),
      imageHeight: media.naturalHeight || Number(media.getAttribute("height")),
    };
    const positionY =
      Math.round(fitPositionY(layout, focus, NAVBAR_FLOATING_HEIGHT_PX) * 1e4) / 1e4;
    if (positionY === focus.positionY) media.style.removeProperty("object-position");
    else media.style.objectPosition = `50% ${String(positionY * 100)}%`;
    faces = facesShares(layout, { ...focus, positionY });
    const distance = self.end - self.start;
    start = apertureStart(frame.offsetTop + closedBand(faces, 0).top * height, distance);
    const nextRiseStart = titleRiseStart(
      (copy?.offsetTop ?? 0) + (heading?.offsetTop ?? 0),
      distance,
    );
    if (Math.abs(nextRiseStart - riseStart) > 1e-4) {
      riseStart = nextRiseStart;
      placeRise();
    }
    hint.set(self.isActive);
    paintAperture(self.progress);
  };

  const tl = gsap.timeline({
    onUpdate: () => {
      paintAperture(tl.progress());
    },
    scrollTrigger: {
      id: `home:${id}:opener`,
      trigger: run,
      start: "top bottom",
      end: "top top",
      scrub: true,
      invalidateOnRefresh: true,
      refreshPriority: refreshPriorityFor(sectionOrder(id)),
      onRefresh: measure,
      // The compositor hint exists only while the arrival is running.
      onToggle: (self) => {
        hint.set(self.isActive);
      },
    },
  });
  // Fixes the timeline at exactly one unit so the ranges below are shares of arrival.
  tl.to({}, { duration: 1, ease: "none" }, 0);
  tl.fromTo(
    media,
    { scale: ARRIVAL_PHOTO_SCALE },
    { scale: 1, duration: 1, ease: "none", immediateRender: false },
    0,
  );
  if (heading) {
    SplitText.create(heading, {
      type: "lines",
      mask: "lines",
      linesClass: "pipeline-opener-line",
      autoSplit: true,
      onSplit: (split) => {
        const lines = gsap.fromTo(
          split.lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: "power3.out",
            immediateRender: false,
            lazy: false,
          },
        );
        rise = lines;
        riseDuration = lines.duration();
        placeRise();
        return lines;
      },
    });
  }
  if (tl.scrollTrigger) measure(tl.scrollTrigger);
  tl.progress(1).progress(tl.scrollTrigger?.progress ?? 0);
  // The photo's size is known from its attributes, but a loaded file may differ: measure again.
  const onLoad = () => {
    ready = true;
    if (tl.scrollTrigger) measure(tl.scrollTrigger);
  };
  media.addEventListener("load", onLoad);
  // A revert rewinds a fromTo to its pre-tween values; the lit default is no transform at all.
  return () => {
    media.removeEventListener("load", onLoad);
    hint.release();
    shutterTop.style.removeProperty("transform");
    shutterBottom.style.removeProperty("transform");
    media.style.removeProperty("transform");
    media.style.removeProperty("object-position");
  };
}

/**
 * The single progress source for a chapter (the useChapterDriver hook, ported).
 * One scrubbed trigger over the body (its rise, then the pin) maps scroll to
 * progress `p`; the cover, the sentences, the signal and the visual (through
 * the clock, remapped so its whole story plays across the pin) are all pure
 * functions of it. Returns the gsap.matchMedia (revert to tear down).
 */
export function initChapterDriver({
  pillar,
  id,
  beatCount,
  section,
  body,
  clock,
  handoff = false,
}: {
  pillar: PillarName;
  id: HomeFlowId;
  beatCount: number;
  section: HTMLElement;
  body: HTMLElement;
  clock: ChapterClock;
  /** The cross-chapter handoff is on: the visual clock runs its collapse at the end of the pin. */
  handoff?: boolean;
}): gsap.MatchMedia {
  const media = gsap.matchMedia();
  media.add(HOME_DESKTOP_QUERY, () => {
    const script = body.querySelector<HTMLElement>(".pipeline-script");
    const opener = section.querySelector<HTMLElement>(".pipeline-opener");
    const lines = script ? collectScript(script) : [];
    const layout = CHAPTER_LAYOUT[pillar];

    const clearArrival = buildArrival(section, id);
    // The opener keeps its resting z (under the body): the body rises over the photo.
    const cover = opener ? coverParts(opener) : undefined;
    const proxy = { p: 0 };
    const paint = () => {
      const position = scriptPosition(proxy.p, beatCount);
      paintScript(lines, position, layout);
      if (cover) paintCover(cover, riseProgress(proxy.p, beatCount));
      clock.set(visualTime(proxy.p, beatCount, pillar, handoff));
    };
    const tween = gsap.fromTo(
      proxy,
      { p: 0 },
      {
        p: 1,
        ease: "none",
        immediateRender: false,
        lazy: false,
        onUpdate: paint,
        scrollTrigger: {
          id: `home:${id}`,
          trigger: body,
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: refreshPriorityFor(sectionOrder(id)),
          onRefresh: paint,
        },
      },
    );
    tween.progress(1).progress(tween.scrollTrigger?.progress ?? 0);
    paint();

    return () => {
      clearScript(lines);
      clearArrival?.();
      if (cover) clearCover(cover);
      clock.set(VISUAL_END_T);
    };
  });
  return media;
}
