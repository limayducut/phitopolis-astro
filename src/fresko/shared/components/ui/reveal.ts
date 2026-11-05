// Reveal.tsx (Reveal / StaggerGroup / StaggerItem), ported to the DOM.
//
// Curtain-mask reveal: clip-path inset(100% 0 0 0) → inset(0) while lifting
// 16px, EASE_OUT_EXPO. Waits for the entrance to settle (store.phase "open")
// or a 1200ms failsafe, and for the element to come in view (once, 100px
// bottom margin, any amount). Fails open without IntersectionObserver.
//
//   [data-reveal-clip]           Reveal: 0.4s
//   [data-stagger-group]         StaggerGroup: its [data-stagger-item]s run
//                                0.7s each, 0.08s apart

import { animate, inView } from "motion";

import { EASE_OUT_EXPO } from "@/shared/motion/easing";
import { store } from "../../../runtime/store";

const CLIP_HIDDEN = "inset(100% 0% 0% 0%)";
const CLIP_VISIBLE = "inset(0% 0% 0% 0%)";
const LIFT = 16;
const ENTRANCE_FAILSAFE_MS = 1200;
const IN_VIEW = { margin: "0px 0px 100px 0px", amount: "some" } as const;

/** Resolves once the entrance gate is open (or the failsafe expires). */
function entranceSettled(): Promise<void> {
  return new Promise((resolve) => {
    if (store.get().phase === "open") return resolve();
    const timer = window.setTimeout(resolve, ENTRANCE_FAILSAFE_MS);
    const off = store.on("phase", (phase) => {
      if (phase !== "open") return;
      window.clearTimeout(timer);
      queueMicrotask(() => off());
      resolve();
    });
  });
}

const hide = (el: HTMLElement) => {
  el.style.clipPath = CLIP_HIDDEN;
  el.style.transform = `translateY(${LIFT}px)`;
};

function whenShown(el: Element, run: () => void) {
  if (typeof IntersectionObserver === "undefined") return run();
  const gate = entranceSettled();
  const stop = inView(
    el,
    () => {
      stop();
      void gate.then(run);
    },
    IN_VIEW,
  );
}

export function initReveals(root: ParentNode = document): void {
  const noIO = typeof IntersectionObserver === "undefined";

  root.querySelectorAll<HTMLElement>("[data-reveal-clip]").forEach((el) => {
    if (noIO) return;
    hide(el);
    whenShown(el, () => {
      animate(
        el,
        { clipPath: CLIP_VISIBLE, transform: "translateY(0px)" },
        { duration: 0.4, ease: EASE_OUT_EXPO as unknown as [number, number, number, number] },
      );
    });
  });

  root.querySelectorAll<HTMLElement>("[data-stagger-group]").forEach((group) => {
    const items = [...group.querySelectorAll<HTMLElement>("[data-stagger-item]")];
    if (noIO) return;
    items.forEach(hide);
    whenShown(group, () => {
      items.forEach((item, i) =>
        animate(
          item,
          { clipPath: CLIP_VISIBLE, transform: "translateY(0px)" },
          {
            duration: 0.7,
            delay: i * 0.08,
            ease: EASE_OUT_EXPO as unknown as [number, number, number, number],
          },
        ),
      );
    });
  });
}
