import { DISPLAY_FONT } from "@/shared/theme/theme";

import { STATEMENT_LINES, WORDMARK } from "../preloaderChoreo";

/**
 * The most the type entrances wait for the display font. It must stay under
 * `LETTER_AT_S` (pinned by a test): the letters and tagline are scheduled on the entrance clock
 * (`at - waited`), so within this cap the wait is absorbed by the dots and
 * mark beats ahead of them and the lockup still lands by `LOCKUP_LANDED_S` —
 * the dive never has to move for it.
 */
export const FONT_WAIT_CAP_MS = 400;

/** The faces the intro actually sets: the wordmark (600) and the tagline (400). */
const faces = () => [
  { spec: `600 1em ${DISPLAY_FONT}`, text: WORDMARK },
  {
    spec: `400 1em ${DISPLAY_FONT}`,
    text: STATEMENT_LINES.find((l) => l.id === "tagline")?.text ?? "",
  },
];

/**
 * Resolves once the wordmark and tagline faces are loaded, or after
 * `FONT_WAIT_CAP_MS` (a slow or failed font never holds the intro). `null`
 * when the Font Loading API is missing: the caller then starts at once.
 * `document.fonts.ready` is not enough here — captured at mount it is usually
 * already resolved, before the face has been requested at all.
 */
export function whenIntroFontsReady(): { promise: Promise<void>; cancel: () => void } | null {
  if (typeof document === "undefined" || typeof document.fonts?.load !== "function") return null;
  const fonts = document.fonts;
  let timer = 0;
  const cap = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, FONT_WAIT_CAP_MS);
  });
  const loaded = Promise.all(faces().map((f) => fonts.load(f.spec, f.text))).then(
    () => undefined,
    () => undefined,
  );
  return {
    promise: Promise.race([loaded, cap]),
    cancel: () => window.clearTimeout(timer),
  };
}
