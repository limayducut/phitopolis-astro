import { PRELOADER_SESSION_KEY } from "./Preloader";
import { readIntroFreeze } from "./intro/devFreeze";

/** Gates the choreographed intro (~6s warm: dots, mark, wordmark, tagline, P-window dive)
 *  to a visitor's genuine first load of a session — Preloader writes
 *  PRELOADER_SESSION_KEY to sessionStorage once its exit finishes (see
 *  Preloader.tsx), and this reads it back, so the intro (and the overlay that
 *  blocks pointer input while it plays) does not replay on every hard refresh
 *  and hard navigation, only on a visitor's first.
 *
 *  Called from a useState lazy initializer, which runs during render — `sessionStorage`
 *  access must be guarded here rather than left to bubble, since it throws in Safari
 *  private browsing and some sandboxed/embedded contexts, and an uncaught throw during
 *  a lazy initializer would take the whole render down with it. Failing open (treat the
 *  read as "no key yet" and show the intro) is the safe default: worst case a returning
 *  visitor sees the intro again, never a broken page.
 *
 *  A deep-link first visit never plays the intro and never writes the session key
 *  (only a finished intro does), so the visitor's first visit to "/" later in the
 *  session still gets it. */
export function shouldShowPreloader(reduced: boolean, pathname: string): boolean {
  if (reduced) return false;
  // DEV-only `?intro=<s>` frozen-frame verification (see intro/devFreeze.ts); folded out of prod.
  if (import.meta.env.DEV && readIntroFreeze() !== null) return true;
  // The intro is the home page's front door only (user call, 2026-10-05): a deep
  // link (/about, /careers, a blog post...) shows its page straight away instead
  // of holding the visitor behind a multi-second overlay.
  // Normalised first: trailing slashes stripped, empty means "/".
  if ((pathname.replace(/\/+$/, "") || "/") !== "/") return false;
  try {
    return (
      typeof window !== "undefined" && window.sessionStorage.getItem(PRELOADER_SESSION_KEY) !== "1"
    );
  } catch {
    return true;
  }
}
