// Preloader.tsx's behaviour, ported to the DOM (the markup is server-rendered
// by src/components/intro/Preloader.astro).
//
// The intro — "white page, six flipping bars, corner dots become the P's
// terminals, the lockup forms, P-window dive" — is a real asset loader: its
// percentage is the weighted share of the blocking load signals that has
// arrived (introLoadSignals.ts), and the reveal never runs ahead of that work.
// Timings and the beat table live in preloaderChoreo.ts.
//
// Each React effect of the original is one section below, in the same order,
// with the same guards; React state becomes plain variables plus the DOM
// writes the re-render used to make.
//
// ENGINEERING INVARIANTS (as in fresko):
//  - Entrances are opacity + transform (+ clip) only, on motion's clock. The
//    TIMELINE of what matters (dive, stall cap, failsafe) lives in timers, so
//    a hidden tab that pauses rAF still resolves.
//  - The dive waits for the blocking signals.
//  - One owner per animated property of an element.
//  - The unconditional failsafe resolves the overlay even if every animation
//    and every signal fails. Nothing may leave this mounted.

import { animate } from "motion";

import { EASE_IN_SOFT, EASE_OUT_SOFT } from "@/shared/motion/easing";
import {
  ACCENT_AT_S,
  ACCENT_FROM_SCALE,
  ACCENT_S,
  BARS_END_S,
  BAR_FLIP_S,
  CHOREO_END_S,
  CONTENT_OUT_AT_S,
  CONTENT_OUT_S,
  DIVE_BACKUP_S,
  DIVE_S,
  DOTS_APPEAR_S,
  DOTS_TRAVEL_S,
  FAILSAFE_MS,
  HOLD_AT_S,
  HOLD_BREATH_S,
  LINE_DONE_S,
  LOADED_HOLD_S,
  LINE_TRACK_AT_S,
  LINE_TRACK_S,
  LOCKUP_BREATHE_PEAK,
  MOTTO_AT_S,
  MOTTO_REVEAL_S,
  P_IN_AT_S,
  P_IN_S,
  SIGNAL_CAP_AFTER_CHOREO_MS,
  SKIP_AT_S,
  SKIP_CONTENT_OUT_S,
  SKIP_DIVE_S,
  SKIP_FADE_S,
  SKIP_OPACITY,
  VIGNETTE_AT_S,
  VIGNETTE_S,
  WORDMARK_AT_S,
  WORDMARK_REVEAL_S,
  progressTweenS,
} from "../preloaderChoreo";
import { PRELOADER_SESSION_KEY, type LoadSignal } from "../Preloader";
import { LOAD_WEIGHTS, overallProgress } from "../introLoadSignals";
import { whenIntroFontsReady } from "../intro/introFonts";
import type { Rect } from "../intro/diveGeometry";
import {
  dotOffsetAt,
  dotRestRadiusPx,
  dotStartOffset,
  terminalRadiusPx,
} from "../intro/dotAnchors";
import { fallbackMarkRect } from "../intro/introLayout";
import {
  BAR_EASE,
  DOTS_LAYER_KEYS,
  LOCKUP_BREATHE_KEYS,
  REVEAL_EASE,
  barStartS,
  barTransform,
  barValueAt,
  dotAppearStartS,
  dotScaleKeys,
  dotTravelStartS,
  keysToTween,
  poseAt,
  revealClip,
  riseTransform,
  travelEase,
  type BarSegment,
  type Key,
} from "../intro/introPose";
import { readIntroFreeze } from "../intro/devFreeze";
import { mountPWindowDive, type DiveController } from "./pWindowDive";

export interface PreloaderOptions {
  onDone: () => void;
  onStartExit?: () => void;
  /** The P-window hole is mounted and the mark starts to fade: the film inside may start now. */
  onWindowOpen?: () => void;
  warmup?: LoadSignal[];
}

type Run = { stop: () => void };
type Ease = readonly [number, number, number, number];

/** How many chords approximate each dot's curved travel (linear between them). */
const TRAVEL_SAMPLES = 16;

const now = () => (typeof performance === "undefined" ? Date.now() : performance.now());
const px = (v: number) => Math.round(v * 100) / 100;
/** The readout's number: three digits, "087". */
const formatPercent = (fraction: number): string =>
  String(Math.round(Math.min(1, Math.max(0, fraction)) * 100)).padStart(3, "0");
const scaleOf = (v: number) => `scale(${v})`;

function collectFontSignals(): LoadSignal[] {
  if (typeof document === "undefined") return [];
  if (document.fonts === undefined) return [];
  return [{ label: "FONTS", weight: LOAD_WEIGHTS.fonts, promise: document.fonts.ready }];
}

/** Fired by the inline backstop in Preloader.astro (FAILSAFE_MS + 2s after parse). */
export const INTRO_BACKSTOP_EVENT = "phit:intro-backstop";

/** Removes the server-rendered overlay without running it (the intro is not shown). */
export function discardPreloader(): void {
  document.querySelector("[data-intro-root]")?.remove();
}

/** Mounts and runs the intro over the page. Returns a teardown (used on finish). */
export function runPreloader({ onDone, onStartExit, onWindowOpen, warmup }: PreloaderOptions): void {
  const root = document.querySelector<HTMLElement>("[data-intro-root]");
  if (!root) {
    // No markup to run: resolve the entrance at once (nothing may hold the page).
    onStartExit?.();
    onDone();
    return;
  }
  // The overlay is ours to show (the head script normally already said so; the
  // DEV `?intro=` freeze can override a set session key).
  document.documentElement.dataset.intro = "on";
  root.dataset.running = "";

  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const markEl = q("[data-intro-mark-box]");
  const breatheEl = q("[data-intro-breathe]");
  const pEl = q("[data-intro-p]");
  const accentEl = q("[data-intro-accent]");
  const dotsEl = q("[data-intro-dots]");
  const vignetteEl = q("[data-intro-vignette]");
  let barsEl = q("[data-intro-bars]");
  const barEl = q("[data-intro-progress]");
  const barFillEl = q("[data-intro-fill]");
  const percentEl = q<HTMLSpanElement>("[data-intro-percent]");
  const wordEl = q("[data-intro-word]");
  const wordmarkEl = q("[data-intro-wordmark]");
  const mottoEl = q("[data-intro-motto]");
  const skipEl = q<HTMLButtonElement>("[data-intro-skip]");
  const statusEl = q("[data-intro-status]");

  const reducedMql = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reducedMql.matches;

  const signals: LoadSignal[] = [...collectFontSignals(), ...(warmup ?? [])];
  // The weighted share of the blocking assets that has really arrived, 0..100.
  let loadedPercent = 0;
  let forced = false;
  let exiting = false;
  let dive: DiveController | null = null;
  // DEV-only frozen-frame mode (`?intro=<s>`); null — and folded away — in production.
  const freezeAt: number | null = import.meta.env.DEV ? readIntroFreeze() : null;
  let skipArmed = freezeAt !== null && freezeAt >= SKIP_AT_S;
  let barsGone = freezeAt !== null && freezeAt >= BARS_END_S;
  // A DEV frozen frame is held indefinitely; the page backstop leaves it alone.
  if (freezeAt !== null) root.dataset.frozen = "";

  let isDone = false;
  let exitStarted = false;
  let contentOut = false;
  // Which way the lockup is leaving ("full": the warm / gated leave; "skip": Escape, click, Skip, the stall cap).
  let leaveKind: "full" | "skip" | null = null;
  let diveScheduled = false;
  const timers: number[] = [];
  const holdRuns: { breath?: Run; track?: Run } = {};
  let entranceStartMs: number | null = null;
  let barSeg: BarSegment = { from: 0, to: 0, startS: 0, durationS: 0 };
  let barRun: Run | null = null;
  let gateTimer: number | null = null;
  let skipRun: Run | null = null;
  const teardowns: (() => void)[] = [];

  const later = (seconds: number, run: () => void) => {
    timers.push(window.setTimeout(run, Math.max(0, seconds * 1000)));
  };

  /* ── derived state (the render) ─────────────────────────── */
  const blockingCount = signals.reduce((n, sig) => (sig.blocking === false ? n : n + 1), 0);
  const allBackground = signals.length > 0 && blockingCount === 0;
  const progressPercent = () =>
    forced || signals.length === 0 || allBackground ? 100 : loadedPercent;
  const isComplete = () => progressPercent() >= 100 || forced;

  let lastRenderedPercent = -1;
  let lastComplete: boolean | null = null;
  const render = () => {
    if (isDone) return;
    const pct = progressPercent();
    root.dataset.progress = String(pct);
    if (statusEl) statusEl.textContent = isComplete() ? "Ready" : "Loading";
    if (exiting) root.dataset.exiting = "";
    if (forced) root.dataset.forced = "";
    if (pct !== lastRenderedPercent) {
      lastRenderedPercent = pct;
      onProgressChange();
    }
    const complete = isComplete();
    if (complete !== lastComplete || forced) {
      lastComplete = complete;
      onGateDepsChange();
    }
  };

  /* ── finish (once): the session key, unmount, onDone ─────── */
  const finish = () => {
    if (isDone) return;
    isDone = true;
    try {
      sessionStorage.setItem(PRELOADER_SESSION_KEY, "1");
    } catch {
      // sessionStorage is blocked in private mode and some embedded webviews.
    }
    // Unmount: every timer, tween and listener goes with the overlay.
    timers.forEach((t) => window.clearTimeout(t));
    timers.length = 0;
    if (gateTimer !== null) window.clearTimeout(gateTimer);
    teardowns.forEach((off) => off());
    barRun?.stop();
    skipRun?.stop();
    dive?.stop();
    root.remove();
    onDone();
  };

  // The mark's box (never moves or scales), so the dive's hole lands exactly
  // on the glyph's resting place even if a skip interrupts the entrance.
  const measureMark = (): Rect => {
    const r = markEl?.getBoundingClientRect();
    if (r && r.height > 0) return { left: r.left, top: r.top, height: r.height, width: r.width };
    return fallbackMarkRect(window.innerWidth || 1024, window.innerHeight || 768);
  };

  /* ── the load signals ───────────────────────────────────── */
  if (signals.length > 0) {
    const settled = new Set<number>();
    const blocking = signals.flatMap((sig, i) => (sig.blocking === false ? [] : [{ sig, i }]));
    const recompute = () => {
      if (isDone) return;
      const all = blocking.every(({ i }) => settled.has(i));
      const share = overallProgress(
        blocking.map(({ sig, i }) => ({ weight: sig.weight, settled: settled.has(i), progress: sig.progress })),
      );
      // 100 is reserved for "every blocking promise has settled".
      const next = Math.max(loadedPercent, all ? 100 : Math.min(99, Math.round(share * 100)));
      if (next !== loadedPercent) {
        loadedPercent = next;
        render();
      }
    };
    const unsubscribe = blocking.map(({ sig }) => sig.progress?.subscribe(recompute));
    teardowns.push(() => unsubscribe.forEach((off) => off?.()));
    signals.forEach((sig, i) => {
      const tick = () => {
        if (isDone) return;
        root.dataset.lastSignal = sig.label;
        settled.add(i);
        recompute();
      };
      sig.promise.then(tick).catch(tick);
    });
    // A source that already holds a reading (registered before this mounted).
    void Promise.resolve().then(recompute);
  }

  /* ── Escape: skip ──────────────────────────────────────── */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setForced();
  };
  window.addEventListener("keydown", onKeyDown);
  teardowns.push(() => window.removeEventListener("keydown", onKeyDown));

  /** Stop the held lockup's loops (its breath, and the finite breath track). */
  const stopHold = () => {
    holdRuns.breath?.stop();
    delete holdRuns.breath;
    holdRuns.track?.stop();
    delete holdRuns.track;
    // Through `animate`, so it is ordered after the stopped tween's pending render.
    if (breatheEl) animate(breatheEl, { transform: "scale(1)" } as never, { duration: 0 });
  };

  /** The lockup leaves (once): wordmark, motto, readout, Skip, vignette, dots AND the P mark fade to 0. */
  const fadeContent = (outS: number) => {
    if (contentOut) return;
    contentOut = true;
    const skipNow = skipArmed ? skipEl : null;
    [wordEl, barEl, skipNow, vignetteEl, dotsEl, markEl].forEach((el) => {
      if (el) animate(el, { opacity: 0 }, { duration: outS, ease: EASE_OUT_SOFT as unknown as Ease as never });
    });
  };

  const removeBars = () => {
    if (barsGone && !barsEl) return;
    barsGone = true;
    barsEl?.remove();
    barsEl = null;
  };

  /** THE ZOOM. The mark has faded; the hole opens. `onStartExit` fires now. */
  const startZoom = () => {
    if (exitStarted) return;
    exitStarted = true;
    exiting = true;
    render();
    onStartExit?.();
    const durationS = leaveKind === "skip" ? SKIP_DIVE_S : DIVE_S;
    dive?.setDuration(durationS);
    dive?.go();
    // Belt and braces: resolves even if the dive's promise never settles.
    later(durationS + DIVE_BACKUP_S, finish);
  };

  /** THE LEAVE, then the zoom. */
  const leave = (kind: "full" | "skip") => {
    if (exitStarted) return;
    if (reduced) {
      exitStarted = true;
      exiting = true;
      render();
      onStartExit?.();
      finish();
      return;
    }
    if (leaveKind !== null) {
      // Already fading: a skip only shortens the dive that follows.
      if (kind === "skip" && leaveKind === "full") {
        leaveKind = "skip";
        dive?.setDuration(SKIP_DIVE_S);
      }
      return;
    }
    leaveKind = kind;
    const outS = kind === "full" ? CONTENT_OUT_S : SKIP_CONTENT_OUT_S;
    stopHold();
    // An early Escape / click: the bars must not stand between the dive and the page.
    removeBars();
    fadeContent(outS);
    // THE DIVE — below everything else; replaces the CSS ground on the same frame.
    dive = mountPWindowDive(root, measureMark(), kind === "full" ? DIVE_S : SKIP_DIVE_S, finish);
    root.dataset.diving = "";
    // The window is now visible through the fading P: the film restarts inside it.
    onWindowOpen?.();
    later(outS, startZoom);
  };

  function setForced() {
    if (forced) return;
    forced = true;
    render();
    // Escape / click / Skip: straight to the short dive.
    if (!reduced && freezeAt === null) leave("skip");
  }

  // Reduced motion settling to `true` after mount: exit at once.
  const onReducedChange = (e: MediaQueryListEvent) => {
    reduced = e.matches;
    if (reduced) {
      onStartExit?.();
      finish();
    }
  };
  reducedMql.addEventListener("change", onReducedChange);
  teardowns.push(() => reducedMql.removeEventListener("change", onReducedChange));

  /* ── THE ENTRANCES ─────────────────────────────────────── */
  if (!reduced && freezeAt === null) {
    const startedAt = now();
    entranceStartMs = startedAt;
    const runs: Run[] = [];
    let cancelled = false;
    const play = (
      el: Element | null | undefined,
      keyframes: Record<string, unknown>,
      atS: number,
      durationS: number,
      ease: Ease,
    ) => {
      if (!el) return;
      runs.push(
        animate(el, keyframes as never, { duration: durationS, delay: Math.max(0, atS), ease: ease as never }),
      );
    };
    /** One property over a keyframe track (several keys, each segment with its own ease). */
    const playTrack = (
      el: Element | null | undefined,
      prop: "opacity" | "transform",
      keys: readonly Key[],
      format: (v: number) => string | number,
    ) => {
      if (!el) return undefined;
      const { values, options } = keysToTween(keys, format);
      const run = animate(el, { [prop]: values } as never, options as never);
      runs.push(run);
      return run;
    };

    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const rect = measureMark();
    const s0 = dotRestRadiusPx(rect) / terminalRadiusPx(rect);

    // Beat 1 (0.0-0.4): the white page is the bars at rest. Beat 2: they flip top to bottom.
    barsEl?.querySelectorAll<HTMLElement>("[data-intro-bar]").forEach((bar, i) => {
      play(bar, { transform: [barTransform(0), barTransform(1)] }, barStartS(i), BAR_FLIP_S, BAR_EASE);
    });

    // The lockup's first 0.3 s: the vignette; the readout's track 0.3 s later.
    play(vignetteEl, { opacity: [0, 1] }, VIGNETTE_AT_S, VIGNETTE_S, EASE_OUT_SOFT);
    play(barEl, { opacity: [0, 1] }, LINE_TRACK_AT_S, LINE_TRACK_S, EASE_OUT_SOFT);

    // The dots appear, breathe, travel on curves, grow to the terminals, and are removed.
    dotsEl?.querySelectorAll<HTMLElement>("[data-intro-dot]").forEach((dot, i) => {
      const start = dotStartOffset(i, rect, vw, vh);
      dot.style.transform = `translate(${px(start.x)}px, ${px(start.y)}px)`;
      const chords = Array.from({ length: TRAVEL_SAMPLES + 1 }, (_, j) => {
        const o = dotOffsetAt(i, travelEase(j / TRAVEL_SAMPLES), rect, vw, vh);
        return `translate(${px(o.x)}px, ${px(o.y)}px)`;
      });
      runs.push(
        animate(dot, { transform: chords } as never, {
          duration: DOTS_TRAVEL_S,
          delay: dotTravelStartS(i),
          ease: "linear",
        }),
      );
      const core = dot.querySelector("[data-dot-core]");
      playTrack(core, "transform", dotScaleKeys(i, s0), scaleOf);
      play(core, { opacity: [0, 1] }, dotAppearStartS(i), DOTS_APPEAR_S, EASE_OUT_SOFT);
    });
    playTrack(dotsEl, "opacity", DOTS_LAYER_KEYS, (v) => v);

    // The P emerges from below: it rises into place as it is uncovered bottom-up.
    play(
      pEl,
      {
        opacity: [0, 1],
        transform: [riseTransform(0), riseTransform(1)],
        clipPath: [revealClip(0), revealClip(1)],
      },
      P_IN_AT_S,
      P_IN_S,
      REVEAL_EASE,
    );
    // The gold accent ignites and settles around its own centre.
    play(
      accentEl,
      { opacity: [0, 1], transform: [scaleOf(ACCENT_FROM_SCALE), "scale(1)"] },
      ACCENT_AT_S,
      ACCENT_S,
      EASE_OUT_SOFT,
    );
    // The lockup breathes.
    const lockupBreath = playTrack(breatheEl, "transform", LOCKUP_BREATHE_KEYS, scaleOf);
    if (lockupBreath) holdRuns.track = lockupBreath;

    // The wordmark, then the motto, each uncovered by one clip wipe (font-gated).
    const playType = () => {
      if (cancelled) return;
      const waitedS = (now() - startedAt) / 1000;
      play(
        wordmarkEl,
        { clipPath: [revealClip(0), revealClip(1)], transform: [riseTransform(0), riseTransform(1)] },
        WORDMARK_AT_S - waitedS,
        WORDMARK_REVEAL_S,
        REVEAL_EASE,
      );
      play(
        mottoEl,
        { clipPath: [revealClip(0), revealClip(1)], transform: [riseTransform(0), riseTransform(1)] },
        MOTTO_AT_S - waitedS,
        MOTTO_REVEAL_S,
        REVEAL_EASE,
      );
    };
    const fonts = whenIntroFontsReady();
    if (fonts === null) playType();
    else void fonts.promise.then(playType);

    // THE HOLD: assets still out past the leave slot -> the formed lockup breathes slowly.
    const holdId = window.setTimeout(() => {
      if (exitStarted || diveScheduled || contentOut) return;
      if (breatheEl) {
        holdRuns.breath = animate(
          breatheEl,
          { transform: ["scale(1)", scaleOf(LOCKUP_BREATHE_PEAK), "scale(1)"] } as never,
          { duration: HOLD_BREATH_S, repeat: Infinity, ease: [EASE_OUT_SOFT, EASE_IN_SOFT] } as never,
        );
      }
    }, HOLD_AT_S * 1000);

    teardowns.push(() => {
      cancelled = true;
      fonts?.cancel();
      window.clearTimeout(holdId);
      runs.forEach((r) => r.stop());
      stopHold();
    });
  }

  /* ── THE READOUT ───────────────────────────────────────── */
  // Real blocking progress sets the TARGET; progressTweenS sets the pace. The
  // bar and the percentage are ONE tween's two outputs. Never backwards.
  function onProgressChange() {
    if (!barFillEl || reduced || freezeAt !== null) return;
    const target = progressPercent() / 100;
    const seg = barSeg;
    if (target <= seg.to) return;
    const elapsedS = entranceStartMs === null ? 0 : (now() - entranceStartMs) / 1000;
    // The readout counts from 000 when it APPEARS.
    const nowS = Math.max(elapsedS, LINE_TRACK_AT_S);
    const shown = barValueAt(seg, nowS);
    barRun?.stop();
    const durationS = progressTweenS(nowS, shown, target);
    const delayS = nowS - elapsedS;
    barSeg = { from: shown, to: target, startS: nowS, durationS };
    const writePercent = (v: number) => {
      if (percentEl) percentEl.textContent = formatPercent(v);
    };
    const fillRun = animate(
      barFillEl,
      { transform: [`scaleX(${shown})`, `scaleX(${target})`] } as never,
      { duration: durationS, delay: delayS, ease: "linear" },
    );
    const numberRun = animate(shown, target, {
      duration: durationS,
      delay: delayS,
      ease: "linear",
      onUpdate: writePercent,
      onComplete: () => writePercent(target),
    });
    barRun = {
      stop: () => {
        fillRun.stop();
        numberRun.stop();
      },
    };
  }

  /* ── THE GATE ──────────────────────────────────────────── */
  // Once the blocking signals are in, the leave starts at its earliest slot
  // (CONTENT_OUT_AT_S) — unless the readout is not yet visibly full, in which
  // case it waits for it plus the LOADED_HOLD_S rest at 100.
  function onGateDepsChange() {
    // Cleanup of the previous run.
    if (gateTimer !== null) {
      window.clearTimeout(gateTimer);
      gateTimer = null;
      diveScheduled = false;
    }
    if (!isComplete() || forced || reduced || freezeAt !== null) return;
    const anchor = entranceStartMs ?? now();
    diveScheduled = true;
    const sinceMs = now() - anchor;
    const seg = barSeg;
    const lineFullS = seg.to >= 1 ? seg.startS + seg.durationS : LINE_DONE_S;
    const readyS = lineFullS + LOADED_HOLD_S;
    gateTimer = window.setTimeout(
      () => {
        if (!reduced) leave("full");
      },
      Math.max(0, Math.max(CONTENT_OUT_AT_S, readyS) * 1000 - sinceMs),
    );
  }

  // The stall cap: blocking signals still out this long after the composition could have finished.
  if (!reduced && freezeAt === null) {
    later(CHOREO_END_S + SIGNAL_CAP_AFTER_CHOREO_MS / 1000, () => {
      if (!reduced && !diveScheduled) leave("skip");
    });
  }

  // The Skip button arms once the dots are under way; it never arms into an exit.
  const armSkip = () => {
    skipArmed = true;
    if (!skipEl) return;
    skipEl.hidden = false;
    if (freezeAt !== null || reduced) return;
    skipRun = animate(skipEl, { opacity: [0, SKIP_OPACITY] }, { duration: SKIP_FADE_S, ease: EASE_OUT_SOFT as never });
  };
  if (!reduced && freezeAt === null) {
    later(SKIP_AT_S, () => {
      if (!exitStarted) armSkip();
    });
    // The bars are removed once the last has flipped (a timer: a hidden tab still clears them).
    later(BARS_END_S + 0.05, removeBars);
  }
  skipEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!exitStarted) setForced();
  });
  // A click anywhere skips too.
  root.addEventListener("click", () => {
    if (!exitStarted) setForced();
  });

  // The page-level backstop (an inline timer in Preloader.astro, independent of
  // this bundle) asks a running intro to finish through this event.
  const onBackstop = () => {
    if (!isDone && freezeAt === null) {
      onStartExit?.();
      finish();
    }
  };
  document.addEventListener(INTRO_BACKSTOP_EVENT, onBackstop);
  teardowns.push(() => document.removeEventListener(INTRO_BACKSTOP_EVENT, onBackstop));

  // Unconditional. Nothing may leave this overlay mounted.
  if (freezeAt === null) {
    later(FAILSAFE_MS / 1000, () => {
      if (!isDone) {
        onStartExit?.();
        finish();
      }
    });
  }

  // First render (progress 0, "Loading").
  render();

  /* ── DEV `?intro=<s>`: pose every element as at `t`, with no timers and no rAF ── */
  if (import.meta.env.DEV && freezeAt !== null) {
    if (barsGone) removeBars();
    if (skipArmed) armSkip();
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const rect = measureMark();
    const pose = poseAt(freezeAt, dotRestRadiusPx(rect) / terminalRadiusPx(rect));
    const set = (el: HTMLElement | null | undefined, style: Partial<CSSStyleDeclaration>) => {
      if (el) Object.assign(el.style, style);
    };
    barsEl?.querySelectorAll<HTMLElement>("[data-intro-bar]").forEach((bar, i) => {
      bar.style.transform = barTransform(pose.bars[i] ?? 0);
    });
    set(vignetteEl, { opacity: String(pose.vignette * pose.contentOpacity) });
    set(barEl, { opacity: String(pose.track * pose.contentOpacity) });
    set(dotsEl, { opacity: String(pose.dotsLayer) });
    dotsEl?.querySelectorAll<HTMLElement>("[data-intro-dot]").forEach((dot, i) => {
      const dp = pose.dots[i];
      if (!dp) return;
      const o = dotOffsetAt(i, dp.travel, rect, vw, vh);
      dot.style.transform = `translate(${px(o.x)}px, ${px(o.y)}px)`;
      set(dot.querySelector<HTMLElement>("[data-dot-core]"), {
        opacity: String(dp.opacity),
        transform: scaleOf(dp.scale),
      });
    });
    set(pEl, { opacity: String(pose.p), transform: riseTransform(pose.p), clipPath: revealClip(pose.p) });
    set(accentEl, { opacity: String(pose.accent), transform: scaleOf(pose.accentScale) });
    set(breatheEl, { transform: scaleOf(pose.breathe) });
    set(markEl, { opacity: String(pose.markOpacity) });
    set(wordmarkEl, { clipPath: revealClip(pose.wordmark), transform: riseTransform(pose.wordmark) });
    set(mottoEl, { clipPath: revealClip(pose.motto), transform: riseTransform(pose.motto) });
    set(wordEl, { opacity: String(pose.contentOpacity) });
    set(skipEl, { opacity: String(SKIP_OPACITY * pose.skip * pose.contentOpacity) });
    // Real progress counts as 100% here; the readout follows the warm pacing.
    const seg: BarSegment = {
      from: 0,
      to: 1,
      startS: LINE_TRACK_AT_S,
      durationS: progressTweenS(LINE_TRACK_AT_S, 0, 1),
    };
    set(barFillEl, { transform: `scaleX(${barValueAt(seg, freezeAt)})` });
    if (percentEl) percentEl.textContent = formatPercent(barValueAt(seg, freezeAt));
    // The hole is in place from the leave's start (under the fading mark); the zoom is the dive's progress.
    if (pose.hole) {
      if (pose.dive !== null) {
        exitStarted = true;
        onStartExit?.();
      }
      window.setTimeout(() => {
        if (pose.dive !== null) {
          exiting = true;
          render();
        }
        dive = mountPWindowDive(root, measureMark(), DIVE_S, finish, pose.dive ?? 0);
        root.dataset.diving = "";
      }, 0);
    }
  }
}
