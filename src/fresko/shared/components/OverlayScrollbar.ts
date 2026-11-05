// OverlayScrollbar.tsx behaviour, ported (markup: components/chrome/OverlayScrollbar.astro).
//
// Active on a fine-pointer device whose root scrollbar really takes width:
// html.has-overlay-scrollbar hides the native bar, and the rail draws a thumb
// whose size/position are written straight to the DOM. Dragging the thumb or
// clicking the rail scrolls through Lenis where it runs.

import {
  OVERLAY_SCROLLBAR_CLASS,
  scrollTopForDrag,
  scrollTopForPage,
  thumbGeometry,
  type ScrollMetrics,
  type ThumbGeometry,
} from "./overlayScrollbarMath";
import { getLenis } from "./smoothScrollControls";

const FINE_POINTER = "(pointer: fine) and (hover: hover)";

function readMetrics(): ScrollMetrics {
  return {
    scrollY: window.scrollY,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  };
}

/** Width of the root's native gutter, read with the overlay class lifted. */
function nativeGutter(root: HTMLElement): number {
  const had = root.classList.contains(OVERLAY_SCROLLBAR_CLASS);
  if (had) root.classList.remove(OVERLAY_SCROLLBAR_CLASS);
  const gutter = window.innerWidth - root.clientWidth;
  if (had) root.classList.add(OVERLAY_SCROLLBAR_CLASS);
  return gutter;
}

/** Jump the page to `top` (through Lenis where it runs). */
function scrollPageTo(top: number) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: "instant" });
}

export function initOverlayScrollbar(): void {
  const rail = document.querySelector<HTMLElement>("[data-overlay-scrollbar]");
  const thumb = rail?.querySelector<HTMLElement>(".overlay-scrollbar__thumb");
  if (!rail || !thumb || typeof window.matchMedia !== "function") return;
  const root = document.documentElement;
  const mq = window.matchMedia(FINE_POINTER);

  /* ── Painting (only while active) ───────────────────────── */
  let geometry: ThumbGeometry | null = null;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const g = thumbGeometry(readMetrics());
    geometry = g;
    rail.hidden = g === null;
    if (!g) return;
    thumb.style.height = `${g.height}px`;
    thumb.style.transform = `translate3d(0, ${g.offset}px, 0)`;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };
  let painting = false;
  const paintRo = new ResizeObserver(schedule);
  const startPainting = () => {
    if (painting) return;
    painting = true;
    rail.dataset.active = "";
    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    paintRo.observe(root);
    paintRo.observe(document.body);
  };
  const stopPainting = () => {
    if (!painting) return;
    painting = false;
    delete rail.dataset.active;
    rail.hidden = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    paintRo.disconnect();
  };

  /* ── useOverlayScrollbarActive ──────────────────────────── */
  let on = false;
  let key = "";
  const evaluate = () => {
    const next = mq.matches && nativeGutter(root) > 0;
    key = `${window.innerWidth}|${root.scrollHeight > window.innerHeight}`;
    root.classList.toggle(OVERLAY_SCROLLBAR_CLASS, next);
    if (next !== on) {
      on = next;
      if (on) startPainting();
      else stopPainting();
      // The gutter change resizes the layout without a window resize; let
      // ScrollTrigger/Lenis re-measure through their own resize listeners.
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  };
  const onObserved = () => {
    if (on && key === `${window.innerWidth}|${root.scrollHeight > window.innerHeight}`) return;
    evaluate();
  };
  evaluate();
  window.addEventListener("resize", evaluate);
  mq.addEventListener?.("change", evaluate);
  const ro = new ResizeObserver(onObserved);
  ro.observe(root);
  ro.observe(document.body);

  /* ── Drag / page ────────────────────────────────────────── */
  let drag: { startY: number; startScroll: number } | null = null;
  thumb.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    drag = { startY: e.clientY, startScroll: window.scrollY };
    thumb.dataset.dragging = "";
    try {
      thumb.setPointerCapture(e.pointerId);
    } catch {
      // No capture: the drag still tracks while the pointer is over the thumb.
    }
  });
  thumb.addEventListener("pointermove", (e) => {
    if (!drag || !geometry) return;
    scrollPageTo(scrollTopForDrag(drag.startScroll, e.clientY - drag.startY, geometry));
  });
  const end = () => {
    drag = null;
    delete thumb.dataset.dragging;
  };
  thumb.addEventListener("pointerup", end);
  thumb.addEventListener("pointercancel", end);
  rail.addEventListener("pointerdown", (e) => {
    if (e.target !== rail || e.button !== 0) return;
    const direction = e.clientY < thumb.getBoundingClientRect().top ? -1 : 1;
    const metrics = readMetrics();
    scrollPageTo(scrollTopForPage(metrics.scrollY, direction, metrics));
  });
}
