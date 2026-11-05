/**
 * DEV-only verification aid: `?intro=<seconds>` mounts the intro even when the
 * session key is set and renders it FROZEN at that timeline time (every
 * element posed by `poseAt(t)` with no timers and no rAF, the dive held at its
 * scale for `t`, real progress treated as 100%). Needed because some embedded preview panes
 * report `visibilityState: "hidden"` even while visibly active, where rAF
 * never fires.
 *
 * Every caller guards with `import.meta.env.DEV &&`, so in a production build
 * the call folds away and this module is tree-shaken out of `dist/`.
 */
export function readIntroFreeze(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("intro");
  if (raw === null || raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : null;
}
