/**
 * The intro's loading ledger — eager-safe (no React, no gsap, no motion).
 *
 * The intro is a real asset loader: its progress readout is the weighted share
 * of the landing route's key assets that have actually arrived. Two kinds of
 * asset report here:
 *
 *  - ONE-SHOT assets (fonts, the hero poster): a promise. Not loaded -> 0,
 *    settled -> 1.
 *  - STREAMED assets (the hero film): a {@link LoadProgress} source that
 *    reports 0..1 while the bytes arrive, measured from the REAL `<video>`
 *    element (never from a second `fetch()` — that would download the file
 *    twice), plus a promise that settles when the film can play through.
 *
 * `overallProgress` folds them into one number. Weights are relative, so only
 * their ratios matter; the home page uses {@link LOAD_WEIGHTS}.
 */

/** A live 0..1 progress value that can be read and subscribed to. */
export interface LoadProgress {
  get(): number;
  subscribe(listener: () => void): () => void;
}

/** The home page's weights: fonts 15%, hero poster 15%, hero film 70%. */
export const LOAD_WEIGHTS = { fonts: 0.15, poster: 0.15, video: 0.7 } as const;
/** A signal with no weight of its own counts like one of the small assets. */
export const DEFAULT_SIGNAL_WEIGHT = LOAD_WEIGHTS.poster;

/** One term of the weighted sum. */
export interface ProgressEntry {
  weight?: number | undefined;
  /** The signal's promise has settled (resolved or rejected). */
  settled: boolean;
  progress?: LoadProgress | undefined;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/**
 * The weighted share, 0..1, of `entries` that has loaded. A settled entry is
 * 1; an unsettled one with a progress source is that source's value (held
 * under 1 until its promise settles, so a source can never claim "done"
 * before the gate agrees); an unsettled one-shot is 0. No entries -> 1.
 */
export function overallProgress(entries: readonly ProgressEntry[]): number {
  let total = 0;
  let loaded = 0;
  for (const e of entries) {
    const w = e.weight !== undefined && e.weight > 0 ? e.weight : DEFAULT_SIGNAL_WEIGHT;
    total += w;
    loaded += w * (e.settled ? 1 : Math.min(0.99, clamp01(e.progress?.get() ?? 0)));
  }
  return total <= 0 ? 1 : clamp01(loaded / total);
}

/* ── the hero film's ledger entry ── */

/** A streamed asset's reporting side. `get`/`subscribe` make it a {@link LoadProgress}. */
export interface StreamLoad extends LoadProgress {
  /** Report a fraction; it never moves backwards and never reaches 1 (only `settle` does). */
  report(fraction: number): void;
  /** The asset can play through (or gave up: failed, or is not wanted). Idempotent. */
  settle(): void;
  readonly settled: boolean;
  /** Resolves once `settle` has run. Never rejects. */
  readonly ready: Promise<void>;
}

export function createStreamLoad(): StreamLoad {
  let value = 0;
  let isSettled = false;
  let resolve: () => void = () => {};
  const ready = new Promise<void>((r) => {
    resolve = r;
  });
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    report(fraction) {
      if (isSettled) return;
      const next = Math.min(0.99, clamp01(fraction));
      if (next <= value) return;
      value = next;
      emit();
    },
    settle() {
      if (isSettled) return;
      isSettled = true;
      value = 1;
      resolve();
      emit();
    },
    get settled() {
      return isSettled;
    },
    ready,
  };
}

let homeFilm: StreamLoad = createStreamLoad();

/** The home hero film's ledger entry: `AppShell` registers it as a blocking signal for "/", `HomeOpening` reports into it. */
export const getHomeFilmLoad = (): StreamLoad => homeFilm;

/** Test seam: the entry is module state, so a test starts each case from a fresh one. */
export function resetHomeFilmLoad(): StreamLoad {
  homeFilm = createStreamLoad();
  return homeFilm;
}

/* ── measuring a real <video> ── */

/** Seconds of film buffered past the start that count as "can play through". */
export const FILM_AHEAD_S = 6;

/** The slice of an `HTMLVideoElement` the measurement reads (so tests can hand it a plain object). */
export interface FilmElementState {
  readyState: number;
  currentTime: number;
  duration: number;
  buffered: Pick<TimeRanges, "length" | "start" | "end">;
}

export interface FilmReadiness {
  /** 0..1, buffered seconds ahead of the start over what "can play through" needs. */
  fraction: number;
  /** HAVE_ENOUGH_DATA, or HAVE_FUTURE_DATA with the target buffered. */
  ready: boolean;
}

/**
 * How loaded a film is, measured around `startAt` (playback begins there, so
 * the bytes before it do not count). `canPlayThrough` is the element's own
 * verdict (`canplaythrough` fired, or the browser stopped fetching on purpose
 * with enough to play); `readyState >= 3` plus the target buffered is the
 * fallback for engines that never fire `canplaythrough`.
 */
export function measureFilm(
  v: FilmElementState,
  startAt: number,
  canPlayThrough = false,
): FilmReadiness {
  const at = Math.max(startAt, v.currentTime);
  let ahead = 0;
  for (let i = 0; i < v.buffered.length; i++) {
    const start = v.buffered.start(i);
    const end = v.buffered.end(i);
    if (start <= at + 0.25 && end > at) ahead = Math.max(ahead, end - at);
  }
  const remaining = Number.isFinite(v.duration) && v.duration > at ? v.duration - at : FILM_AHEAD_S;
  const need = Math.max(0.1, Math.min(FILM_AHEAD_S, remaining));
  const fraction = clamp01(ahead / need);
  const ready = v.readyState >= 4 || (v.readyState >= 3 && (canPlayThrough || fraction >= 1));
  return { fraction: ready ? 1 : Math.min(0.98, fraction), ready };
}
