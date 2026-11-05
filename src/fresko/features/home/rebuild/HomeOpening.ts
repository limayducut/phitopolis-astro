// Vanilla port of fresko rebuild/HomeOpening.tsx (HomeResearchHero) behaviour:
//  - the film is a loader citizen of the intro: it starts loading AND playing
//    (muted) at once, under the overlay, and reports its real buffering into
//    the intro's ledger (getHomeFilmLoad) — the preloader's bar waits on it;
//  - when the P-window shows (heroFilmUncovered) it rewinds to `startAt` and plays;
//  - phones get the office still alone (no film, ledger settled at once);
//  - no `loop`: `ended` rewinds to `startAt`;
//  - the post-intro cascade (steps 2 and 3) from store.heroCascadeStep;
//  - WCAG 2.4.11: keyboard focus on the covered CTA takes the page back to the top.

import { getHomeFilmLoad } from "@/shared/components/introLoadSignals";
import { attachFilmLoadReport } from "@/shared/components/editorial/filmPlayback";
import {
  HERO_OPENING_FILM,
  HERO_PHONE_QUERY,
  createBackgroundVideo,
} from "@/shared/components/useBackgroundVideo";
import { getLenis } from "@/shared/components/smoothScrollControls";
import { heroFilmUncovered, store } from "@/runtime/store";
import { media } from "@/runtime/media";

/** Keyboard (not pointer) focus, by `:focus-visible`. */
function isKeyboardFocus(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

/** In view but painted over: the topmost element at its centre is something else. */
function isCovered(el: Element): boolean {
  const box = el.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return hit !== null && !el.contains(hit) && !hit.contains(el);
}

function showHeroOnKeyboardFocus(event: FocusEvent) {
  const cta = event.target;
  if (!(cta instanceof HTMLElement) || !isKeyboardFocus(cta)) return;
  const lenis = getLenis();
  if (lenis && !lenis.isStopped && lenis.isScrolling === "smooth") {
    lenis.stop();
    lenis.start();
  }
  requestAnimationFrame(() => {
    if (document.activeElement !== cta || window.scrollY <= 0 || !isCovered(cta)) return;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo({ top: 0, behavior: "auto" });
  });
}

export function initHero(): void {
  const root = document.getElementById("hero-sequence");
  if (!root) return;
  const container = root.querySelector<HTMLElement>("[data-hero-container]");
  const filmLayer = root.querySelector<HTMLElement>(".hero-film");
  const video = root.querySelector<HTMLVideoElement>("[data-hero-video]");

  /* ── Cascade steps ── */
  const steps = [...root.querySelectorAll<HTMLElement>("[data-cascade-step]")];
  store.on("heroCascadeStep", (cascade) => {
    for (const el of steps) {
      el.dataset.shown = String(cascade >= Number(el.dataset.cascadeStep));
    }
  });

  /* ── Keyboard focus on the covered CTA ── */
  root
    .querySelector<HTMLElement>("[data-hero-cta]")
    ?.addEventListener("focusin", showHeroOnKeyboardFocus);

  /* ── The film ── */
  const load = getHomeFilmLoad();
  if (!container || !filmLayer || !video) {
    load.settle();
    return;
  }
  const phone = media(HERO_PHONE_QUERY);
  const src = video.dataset.src ?? `${HERO_OPENING_FILM.mp4}#t=${String(HERO_OPENING_FILM.startAt)}`;
  const bg = createBackgroundVideo({
    container,
    video,
    src,
    eager: true,
    covered: () => !heroFilmUncovered(),
    stillOnly: () => phone.matches,
    // A 4-thread laptop read as low power and got the still alone (2026-10-27).
    filmOnLowPower: true,
    startAt: HERO_OPENING_FILM.startAt,
  });

  const writePlaying = (playing: boolean) => {
    filmLayer.dataset.playing = String(playing);
    video.dataset.playing = String(playing);
  };
  writePlaying(bg.playing);
  bg.onPlayingChange(writePlaying);

  // useFilmLoadReport(videoRef, getHomeFilmLoad(), startAt, posterOnly): re-armed when posterOnly flips.
  let disposeReport = attachFilmLoadReport(video, load, HERO_OPENING_FILM.startAt, bg.posterOnly);
  let reportedPoster = bg.posterOnly;
  const syncReport = () => {
    if (bg.posterOnly === reportedPoster) return;
    reportedPoster = bg.posterOnly;
    disposeReport();
    disposeReport = attachFilmLoadReport(video, load, HERO_OPENING_FILM.startAt, bg.posterOnly);
  };

  phone.on(() => {
    bg.update();
    syncReport();
  });
  store.on("phase", () => bg.update());
  store.on("introWindowOpen", () => bg.update());

  // No `loop`: it would rewind to 0, onto the frozen logo card.
  video.addEventListener("ended", () => {
    video.currentTime = HERO_OPENING_FILM.startAt;
    bg.play();
  });
}
