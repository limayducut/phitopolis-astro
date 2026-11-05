/**
 * SpinningGlobe.tsx, ported. The Support globe, interactive: drag it sideways to turn the
 * earth; left alone it drifts slowly, only while on screen. Reduced motion: no drift, drag
 * still works. Its styles (grab cursor, the arcs' staggered draw cycle, the handoff hooks)
 * live in visuals-port.css under [data-spinning-globe].
 */
import { createGlobeStatic } from "@/features/home/rebuild/globe/globeStatic";
import { GLOBE_VIEW } from "@/features/home/rebuild/globe/globeData";
import { reducedMotion } from "@/runtime/media";
import { h } from "./dom";

/** Idle drift, degrees of longitude per second: one turn in two minutes. */
const DRIFT_DEG_PER_S = 3;
/** Drag: degrees of longitude per pixel of pointer travel. */
const DRAG_DEG_PER_PX = 0.4;
/** Repaints per second while drifting; the dot matrix is re-projected each time. */
const DRIFT_FPS = 24;

/** Set on an ancestor by the Support visual while the handoff holds the arcs back (undrawn). */
export const ARCS_HELD_ATTR = "data-arcs-held";
/** CSS variables the Support visual sets for the handoff's ring pulse on the hub. */
export const HQ_PULSE_ALPHA_VAR = "--pv-hq-pulse-alpha";
export const HQ_PULSE_SCALE_VAR = "--pv-hq-pulse-scale";
/** The arcs' opacity the Support visual sets while its collapse fades them. */
export const ARCS_ALPHA_VAR = "--pv-arcs-alpha";

export interface SpinningGlobeHandle {
  el: HTMLDivElement;
  destroy(): void;
}

export function createSpinningGlobe(): SpinningGlobeHandle {
  let lon: number = GLOBE_VIEW.lon;
  const globe = createGlobeStatic({ centerLon: ((lon + 540) % 360) - 180, centerLat: GLOBE_VIEW.lat });
  const el = h("div", { "data-spinning-globe": "" }, globe.el);
  const setLon = (next: number) => {
    lon = next;
    globe.update(((lon + 540) % 360) - 180, GLOBE_VIEW.lat);
  };

  let drag: { x: number; lon: number } | null = null;
  el.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, lon };
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (drag) setLon(drag.lon - (e.clientX - drag.x) * DRAG_DEG_PER_PX);
  });
  const onUp = () => {
    drag = null;
  };
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  // The idle drift, only while on screen and motion is allowed.
  const reduced = reducedMotion();
  let onScreen = false;
  let frame = 0;
  const stopDrift = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const startDrift = () => {
    stopDrift();
    if (reduced.matches || !onScreen) return;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < 1000 / DRIFT_FPS || drag) return;
      last = now;
      setLon(lon + (DRIFT_DEG_PER_S * dt) / 1000);
    };
    frame = requestAnimationFrame(tick);
  };
  const io =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          onScreen = !!entry?.isIntersecting;
          startDrift();
        });
  io?.observe(el);
  const offReduced = reduced.on(() => startDrift());

  return {
    el,
    destroy() {
      stopDrift();
      io?.disconnect();
      offReduced();
    },
  };
}
