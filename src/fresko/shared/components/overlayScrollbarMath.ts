/** Pure geometry for the page's overlay scrollbar (see OverlayScrollbar.tsx). */

/** Set on <html> while the overlay is in charge; theme/components.ts hides the native bar under it. */
export const OVERLAY_SCROLLBAR_CLASS = "has-overlay-scrollbar";

/** Gap between the rail and the top/bottom viewport edge, in px. */
export const RAIL_INSET = 8;
/** Shortest the thumb is allowed to get on very long pages, in px. */
export const MIN_THUMB = 40;
/** Fraction of a viewport a click on the empty rail pages by. */
export const PAGE_FRACTION = 0.9;

export interface ScrollMetrics {
  scrollY: number;
  scrollHeight: number;
  viewportHeight: number;
}

export interface ThumbGeometry {
  /** Thumb height in px. */
  height: number;
  /** Thumb top offset within the track, in px. */
  offset: number;
  /** Document scroll range: scrollHeight - viewportHeight. */
  maxScroll: number;
  /** Distance the thumb can travel: track height - thumb height. */
  travel: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Track height for a viewport: the rail is inset from both viewport edges. */
export function trackHeightFor(viewportHeight: number): number {
  return Math.max(0, viewportHeight - RAIL_INSET * 2);
}

/** Thumb size and position, or null when the page does not overflow. */
export function thumbGeometry({
  scrollY,
  scrollHeight,
  viewportHeight,
}: ScrollMetrics): ThumbGeometry | null {
  const maxScroll = scrollHeight - viewportHeight;
  const track = trackHeightFor(viewportHeight);
  if (maxScroll <= 1 || track <= 0) return null;
  const height = clamp((viewportHeight / scrollHeight) * track, Math.min(MIN_THUMB, track), track);
  const travel = track - height;
  const offset = travel * clamp(scrollY / maxScroll, 0, 1);
  return { height, offset, maxScroll, travel };
}

/** Document scrollTop for a thumb dragged `deltaY` px from where the drag began. */
export function scrollTopForDrag(startScroll: number, deltaY: number, g: ThumbGeometry): number {
  if (g.travel <= 0) return startScroll;
  return clamp(startScroll + (deltaY * g.maxScroll) / g.travel, 0, g.maxScroll);
}

/** Document scrollTop one page up (-1) or down (1) from `scrollY`. */
export function scrollTopForPage(scrollY: number, direction: 1 | -1, m: ScrollMetrics): number {
  const maxScroll = Math.max(0, m.scrollHeight - m.viewportHeight);
  return clamp(scrollY + direction * m.viewportHeight * PAGE_FRACTION, 0, maxScroll);
}
