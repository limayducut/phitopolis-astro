// TopNavMegaDrawer.tsx + AppShell's mega-nav intent handling, ported.
//
// AppShell: hover-intent open after 180ms, hover-leave close after 180ms, and
// a 700ms grace after a hover-open during which a click on the trigger (or the
// card's Close, which sits where the trigger was) does not shut it.
// Drawer: Escape closes; focus moves to the first row on open and back to the
// trigger on close; the page (documentElement) and Lenis are locked while
// open; rows carry a sprung hover pill (motion layoutId, stiffness 420,
// damping 36) that rests on the active route when nothing is hovered.

import { animate } from "motion";

import { store } from "../../runtime/store";
import { prefersReducedMotion } from "../../runtime/media";
import { startLenis, stopLenis } from "./smoothScrollControls";

const HOVER_DELAY_MS = 180;
/** MEGA_NAV_HOVER_CLICK_GRACE_MS */
const HOVER_CLICK_GRACE_MS = 700;
/** The card's exit (motion 0.42s; 0.16s reduced). */
const EXIT_MS = 420;
const EXIT_REDUCED_MS = 160;

let hoverTimer: number | null = null;
let hoverOpenedAt = 0;

const clearHover = () => {
  if (hoverTimer !== null) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }
};

/** AppShell's open/close intent, shared by the trigger and the card. */
export const megaNav = {
  openOnHover(): void {
    clearHover();
    hoverTimer = window.setTimeout(() => {
      hoverOpenedAt = performance.now();
      store.set({ megaNavOpen: true });
    }, HOVER_DELAY_MS);
  },
  toggle(): void {
    clearHover();
    const keepOpen = performance.now() - hoverOpenedAt < HOVER_CLICK_GRACE_MS;
    hoverOpenedAt = 0;
    const open = store.get().megaNavOpen;
    store.set({ megaNavOpen: open && keepOpen ? true : !open });
  },
  close(): void {
    clearHover();
    if (performance.now() - hoverOpenedAt < HOVER_CLICK_GRACE_MS) return;
    store.set({ megaNavOpen: false });
  },
  closeOnHover(): void {
    clearHover();
    hoverTimer = window.setTimeout(() => store.set({ megaNavOpen: false }), HOVER_DELAY_MS);
  },
  clearHover,
};

export function initTopNavMegaDrawer(): void {
  const root = document.querySelector<HTMLElement>("[data-mega-nav]");
  const card = root?.querySelector<HTMLElement>("[data-mega-card]");
  if (!root || !card) return;
  const reduced = prefersReducedMotion();
  const backdrop = root.querySelector<HTMLElement>("[data-mega-backdrop]");
  const scroll = root.querySelector<HTMLElement>("[data-mega-scroll]");
  const pill = root.querySelector<HTMLElement>("[data-mega-pill]");
  const rowsBox = pill?.parentElement ?? null;
  const rows = [...root.querySelectorAll<HTMLElement>("[data-nav-row]")];
  const active = rows.find((r) => r.dataset.active === "true") ?? null;

  backdrop?.addEventListener("click", () => megaNav.close());
  root.querySelector("[data-mega-close]")?.addEventListener("click", () => megaNav.close());
  card.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") megaNav.clearHover();
  });
  card.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") megaNav.closeOnHover();
  });
  // Plain left-click on a destination closes the card (then the link follows).
  rows.forEach((row) =>
    row.addEventListener("click", (e) => {
      if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) megaNav.close();
    }),
  );

  /* ── The hover pill ─────────────────────────────────────── */
  let pillAt: HTMLElement | null = null;
  const placePill = (row: HTMLElement | null, instant: boolean) => {
    if (!pill || !rowsBox) return;
    if (!row) {
      pill.dataset.on = "false";
      pillAt = null;
      return;
    }
    const a = row.getBoundingClientRect();
    const b = rowsBox.getBoundingClientRect();
    const target = {
      transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)`,
      width: `${a.width}px`,
      height: `${a.height}px`,
    };
    if (instant || reduced || pillAt === null) Object.assign(pill.style, target);
    else if (pillAt !== row) animate(pill, target, { type: "spring", stiffness: 420, damping: 36 });
    pill.dataset.on = "true";
    pillAt = row;
  };
  const setHovered = (row: HTMLElement | null) => {
    rows.forEach((r) => (r.dataset.hot = String(r === row)));
    placePill(row ?? active, false);
  };
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => setHovered(row));
    row.addEventListener("focus", () => setHovered(row));
  });
  scroll?.addEventListener("mouseleave", () => setHovered(null));

  /* ── Open / close ───────────────────────────────────────── */
  let trigger: Element | null = null;
  let exitTimer = 0;
  let previousOverflow = "";
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      megaNav.close();
    }
  };

  const open = () => {
    window.clearTimeout(exitTimer);
    trigger = document.activeElement;
    root.hidden = false;
    root.dataset.state = "closed";
    rows.forEach((r) => (r.dataset.hot = "false"));
    // Commit the hidden pose before animating in (AnimatePresence initial).
    void card.offsetWidth;
    root.dataset.state = "open";
    placePill(active, true);
    rows[0]?.focus();
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    stopLenis();
  };

  const close = () => {
    if (root.hidden) return;
    window.removeEventListener("keydown", onKey);
    if (trigger instanceof HTMLElement) trigger.focus();
    document.documentElement.style.overflow = previousOverflow;
    startLenis();
    root.dataset.state = "closing";
    exitTimer = window.setTimeout(
      () => {
        root.hidden = true;
        root.dataset.state = "closed";
      },
      reduced ? EXIT_REDUCED_MS : EXIT_MS,
    );
  };

  let first = true;
  store.on("megaNavOpen", (isOpen) => {
    if (first) {
      first = false;
      if (!isOpen) return;
    }
    if (isOpen) open();
    else close();
  });
}
