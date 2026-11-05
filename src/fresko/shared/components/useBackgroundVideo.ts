// Vanilla port of fresko useBackgroundVideo.ts. One controller per film:
// loads when in view (or at once when `eager`), plays only in view and with the
// tab visible, pauses off-screen, falls back to the still under reduced motion,
// saveData/low power, or `stillOnly`; resumes from `startAt` when uncovered.

import { createFilmPlayback, type FilmPlayback } from "./editorial/filmPlayback";
import { isLowPowerDevice, prefersReducedMotion, savesData } from "@/runtime/media";

const PRELOAD_MARGIN = "200px";

export interface BackgroundVideoOptions {
  container: HTMLElement;
  video: HTMLVideoElement;
  /** The film's src (with any media fragment). Attached once `shouldLoad`. */
  src: string;
  eager?: boolean;
  /** Reads whether something still covers the film (the intro overlay). */
  covered?: () => boolean;
  /** Reads the still-only condition (the phone hero). */
  stillOnly?: () => boolean;
  filmOnLowPower?: boolean;
  startAt?: number;
}

export interface BackgroundVideo {
  readonly posterOnly: boolean;
  readonly playing: boolean;
  play: () => void;
  film: FilmPlayback;
  /** Re-evaluate `covered` / `stillOnly` (call when either input changes). */
  update: () => void;
  onPlayingChange: (cb: (playing: boolean) => void) => () => void;
}

export function createBackgroundVideo({
  container,
  video,
  src,
  eager = false,
  covered = () => false,
  stillOnly = () => false,
  filmOnLowPower = false,
  startAt,
}: BackgroundVideoOptions): BackgroundVideo {
  let shouldLoad = eager;
  let inView = true;
  const computePosterOnly = () =>
    stillOnly() || prefersReducedMotion() || (filmOnLowPower ? savesData() : isLowPowerDevice());
  let posterOnly = computePosterOnly();

  const shouldPlay = () => inView && !document.hidden;
  const film = createFilmPlayback(
    video,
    startAt === undefined ? { shouldPlay } : { shouldPlay, startAt },
  );
  const playingListeners = new Set<(playing: boolean) => void>();
  const isPlaying = () => film.playing && !posterOnly;
  let lastPlaying = isPlaying();
  const emitPlaying = () => {
    const now = isPlaying();
    if (now === lastPlaying) return;
    lastPlaying = now;
    playingListeners.forEach((cb) => cb(now));
    syncGesture();
  };
  film.onChange(emitPlaying);

  // The <video> exists only while the film is wanted (React rendered it as `!posterOnly && <video>`).
  const mountState = () => {
    if (posterOnly) {
      if (!video.hidden) {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.hidden = true;
      }
      return;
    }
    video.hidden = false;
    if (shouldLoad && video.getAttribute("src") !== src) video.setAttribute("src", src);
  };

  // Gesture fallback: a blocked autoplay starts on the first pointer/key interaction.
  const gestureEvents = ["pointerdown", "touchstart", "keydown"] as const;
  let gestureArmed = false;
  const onGesture = () => {
    if (video.paused && shouldPlay()) film.play();
  };
  function syncGesture() {
    const want = !posterOnly && !isPlaying();
    if (want === gestureArmed) return;
    gestureArmed = want;
    for (const name of gestureEvents) {
      if (want) window.addEventListener(name, onGesture, { capture: true, passive: true });
      else window.removeEventListener(name, onGesture, { capture: true });
    }
  }

  let observer: IntersectionObserver | null = null;
  const armObserver = () => {
    observer?.disconnect();
    observer = null;
    if (posterOnly) return;
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        inView = entry.isIntersecting;
        if (entry.isIntersecting) {
          if (!shouldLoad) {
            shouldLoad = true;
            mountState();
          }
          film.play();
        } else {
          film.pause();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(container);
  };

  document.addEventListener("visibilitychange", () => {
    if (posterOnly) return;
    if (document.hidden) film.pause();
    else if (shouldPlay()) film.play();
  });

  // Covered → uncovered: rewind to the start mark and play (the intro's P-window reveal).
  let wasCovered = covered();
  const update = () => {
    const nextPoster = computePosterOnly();
    if (nextPoster !== posterOnly) {
      posterOnly = nextPoster;
      if (posterOnly) film.reset();
      mountState();
      armObserver();
      emitPlaying();
      syncGesture();
    }
    const isCovered = covered();
    if (isCovered) {
      wasCovered = true;
      return;
    }
    if (!wasCovered) return;
    wasCovered = false;
    if (posterOnly) return;
    if (startAt !== undefined && Math.abs(video.currentTime - startAt) > 0.25) video.currentTime = startAt;
    if (inView) film.play();
  };

  mountState();
  armObserver();
  syncGesture();

  return {
    get posterOnly() {
      return posterOnly;
    },
    get playing() {
      return isPlaying();
    },
    play: film.play,
    film,
    update,
    onPlayingChange: (cb) => {
      playingListeners.add(cb);
      return () => playingListeners.delete(cb);
    },
  };
}

export const HERO_OPENING_FILM = {
  mp4: "/videos/hero-opening.mp4",
  poster: "/videos/hero-opening-poster.jpg",
  /** Past the film's frozen logo card. */
  startAt: 5.75,
  /** Phones get an office photo instead of the street film. */
  phoneStill: "/images/AboutPage1.webp",
} as const;

/** Below Home's wide breakpoint (`HOME_WIDE_MQ`, 768px): the phone hero. */
export const HERO_PHONE_QUERY = "(max-width: 767.95px)";
