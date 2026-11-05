// Vanilla port of fresko editorial/filmPlayback.ts (useFilmPlayback +
// useFilmLoadReport). Same events, same grace timings, same ledger reporting.

import { measureFilm, type StreamLoad } from "../introLoadSignals";

/** How long a `waiting` stall may last before the still is shown again. */
export const WAITING_GRACE_MS = 250;

/** Pauses we asked for: their `pause` event must not drop the playing state. */
const requestedPauses = new WeakSet<HTMLVideoElement>();

export interface FilmPlaybackOptions {
  shouldPlay?: () => boolean;
  startAt?: number;
}

export interface FilmPlayback {
  readonly playing: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
  /** Called whenever `playing` changes. */
  onChange: (cb: (playing: boolean) => void) => () => void;
  dispose: () => void;
}

export function createFilmPlayback(
  video: HTMLVideoElement,
  options: FilmPlaybackOptions = {},
): FilmPlayback {
  let playing = false;
  const listeners = new Set<(playing: boolean) => void>();
  const setPlaying = (next: boolean) => {
    if (next === playing) return;
    playing = next;
    listeners.forEach((cb) => cb(next));
  };
  let waitingTimer: ReturnType<typeof setTimeout> | null = null;
  const clearWaiting = () => {
    if (waitingTimer !== null) clearTimeout(waitingTimer);
    waitingTimer = null;
  };

  const play = () => {
    try {
      const result = video.play() as Promise<void> | undefined;
      if (result && typeof result.catch === "function") result.catch(() => setPlaying(false));
    } catch {
      setPlaying(false);
    }
  };
  const pause = () => {
    if (video.paused) return;
    requestedPauses.add(video);
    video.pause();
  };

  const onPlaying = () => {
    clearWaiting();
    setPlaying(true);
  };
  const onPause = () => {
    if (requestedPauses.delete(video)) return;
    if (video.ended) return;
    clearWaiting();
    setPlaying(false);
  };
  const onWaiting = () => {
    if (waitingTimer !== null) return;
    waitingTimer = setTimeout(() => {
      waitingTimer = null;
      setPlaying(false);
    }, WAITING_GRACE_MS);
  };
  const onEmptied = () => {
    clearWaiting();
    setPlaying(false);
  };
  const onCanPlay = () => {
    if (video.paused && (options.shouldPlay?.() ?? true)) play();
  };
  const onLoadedMetadata = () => {
    const startAt = options.startAt;
    if (startAt !== undefined && video.currentTime < startAt - 0.5) video.currentTime = startAt;
  };

  video.addEventListener("playing", onPlaying);
  video.addEventListener("pause", onPause);
  video.addEventListener("waiting", onWaiting);
  video.addEventListener("emptied", onEmptied);
  video.addEventListener("canplay", onCanPlay);
  video.addEventListener("loadedmetadata", onLoadedMetadata);

  return {
    get playing() {
      return playing;
    },
    play,
    pause,
    reset: () => {
      clearWaiting();
      setPlaying(false);
    },
    onChange: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose: () => {
      clearWaiting();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("emptied", onEmptied);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    },
  };
}

/** HTMLMediaElement.networkState NETWORK_IDLE: the browser stopped fetching. */
const NETWORK_IDLE = 1;

const LOAD_EVENTS = [
  "loadedmetadata",
  "loadeddata",
  "durationchange",
  "progress",
  "canplay",
] as const;

/**
 * useFilmLoadReport: reports a real film's buffering into the intro's load
 * ledger and settles it once the film can play through (or fails, or is not
 * wanted). Returns a disposer.
 */
export function attachFilmLoadReport(
  video: HTMLVideoElement | null,
  load: StreamLoad,
  startAt: number,
  unwanted: boolean,
): () => void {
  if (unwanted) {
    load.settle();
    return () => {};
  }
  if (!video) return () => {};
  let canPlayThrough = false;
  const check = () => {
    const r = measureFilm(video, startAt, canPlayThrough);
    if (r.ready) load.settle();
    else load.report(r.fraction);
  };
  const onCanPlayThrough = () => {
    canPlayThrough = true;
    check();
  };
  const onSuspend = () => {
    if (video.readyState >= 3) canPlayThrough = true;
    check();
    if (load.settled || video.readyState >= 3 || video.networkState !== NETWORK_IDLE) return;
    try {
      const result = video.play() as Promise<void> | undefined;
      if (result && typeof result.catch === "function") result.catch(() => load.settle());
    } catch {
      load.settle();
    }
  };
  const onError = () => load.settle();
  LOAD_EVENTS.forEach((name) => video.addEventListener(name, check));
  video.addEventListener("canplaythrough", onCanPlayThrough);
  video.addEventListener("suspend", onSuspend);
  video.addEventListener("error", onError);
  check();
  return () => {
    LOAD_EVENTS.forEach((name) => video.removeEventListener(name, check));
    video.removeEventListener("canplaythrough", onCanPlayThrough);
    video.removeEventListener("suspend", onSuspend);
    video.removeEventListener("error", onError);
  };
}
