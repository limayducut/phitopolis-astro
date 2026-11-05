// SiteNavbar.tsx behaviour, ported to the DOM (markup: components/chrome/SiteNavbar.astro).
//
//  - gated while the preloader is up or the hero cascade is below step 2
//    (opacity 0, lifted, no pointer events);
//  - items run their staggered entrance once the header is released
//    (store.headerReleased), via per-item CSS delays matching the motion variants;
//  - transparent at the top of "/" (until #hero-sequence's bottom passes the
//    viewport bottom), then the floating compact bar with the glass surface;
//  - ink and surface follow store.overDark; background mode follows store.navBgMode;
//  - autohide (useNavAutohide) from store.autohideEnabled;
//  - the hover pill (motion layoutId "siteNavHoverPill") springs between links
//    (stiffness 420, damping 36);
//  - publishes --nav-h and html[data-nav-hidden] (useNavClearancePublisher);
//  - the motto (store.showMotto, Alt+M) grows the mark to the lockup height.

import { animate } from "motion";

import { headerReleasedNow, store } from "../../runtime/store";
import { prefersReducedMotion } from "../../runtime/media";
import { createNavAutohide } from "./useNavAutohide";
import { megaNav } from "./TopNavMegaDrawer";

/** Scroll offset at which non-home routes leave the transparent top state. */
const NAV_SOLID_AFTER_PX = 50;

const set = (el: HTMLElement, key: string, value: boolean | string) => {
  const v = String(value);
  if (el.dataset[key] !== v) el.dataset[key] = v;
};

export function initSiteNavbar(): void {
  const header = document.querySelector<HTMLElement>("[data-nav]");
  const bar = header?.querySelector<HTMLElement>("[data-nav-bar]");
  if (!header || !bar) return;
  const reduced = prefersReducedMotion();

  /* ── State → attributes ─────────────────────────────────── */
  let autohidden = false;
  let floating = false;

  const render = () => {
    const s = store.get();
    const gated = s.showPreloader || s.heroCascadeStep < 2;
    const hidden = autohidden || gated;
    // AppShell: headerEverReleased || phase is "header" | "open".
    const revealed = !gated && (s.headerReleased || headerReleasedNow(s));
    set(header, "gated", gated);
    set(header, "hidden", hidden);
    set(header, "revealed", revealed);
    set(header, "floating", floating);
    set(header, "dark", s.overDark);
    set(header, "bg", s.navBgMode);
    set(header, "motto", s.showMotto);
    set(bar, "floating", floating);
    set(bar, "dark", s.overDark);
    set(bar, "bg", s.navBgMode);
    set(bar, "hidden", hidden);
    document.documentElement.dataset.navHidden = hidden ? "true" : "false";
  };

  const autohide = createNavAutohide((h) => {
    autohidden = h;
    render();
  });
  store.on("autohideEnabled", (enabled) => autohide.setEnabled(enabled));

  store.subscribe((_s, changed) => {
    if (
      changed.some((k) =>
        ["showPreloader", "heroCascadeStep", "headerReleased", "phase", "overDark", "navBgMode", "showMotto"].includes(k),
      )
    )
      render();
  });

  /* ── useIsAtTop ("/": the hero sequence still reaches below the fold) ── */
  const hero = document.getElementById("hero-sequence");
  const onScroll = () => {
    const atTop = hero
      ? hero.getBoundingClientRect().bottom > window.innerHeight
      : window.scrollY < NAV_SOLID_AFTER_PX;
    if (floating !== !atTop) {
      floating = !atTop;
      render();
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  render();

  /* ── useNavClearancePublisher: --nav-h ───────────────────── */
  const root = document.documentElement;
  const publish = () => root.style.setProperty("--nav-h", `${bar.getBoundingClientRect().height}px`);
  publish();
  new ResizeObserver(publish).observe(bar);

  /* ── Hover pill ──────────────────────────────────────────── */
  const list = header.querySelector<HTMLElement>("[data-nav-list]");
  const pill = header.querySelector<HTMLElement>("[data-nav-pill]");
  if (list && pill) {
    let current: HTMLElement | null = null;
    const geometry = (link: HTMLElement) => {
      const a = link.getBoundingClientRect();
      const b = list.getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top, width: a.width, height: a.height };
    };
    const show = (link: HTMLElement) => {
      const g = geometry(link);
      if (current === null || reduced) {
        pill.style.transform = `translate(${g.x}px, ${g.y}px)`;
        pill.style.width = `${g.width}px`;
        pill.style.height = `${g.height}px`;
        pill.dataset.on = "true";
      } else if (current !== link) {
        animate(
          pill,
          { transform: `translate(${g.x}px, ${g.y}px)`, width: `${g.width}px`, height: `${g.height}px` },
          { type: "spring", stiffness: 420, damping: 36 },
        );
      }
      current = link;
    };
    const hide = () => {
      current = null;
      pill.dataset.on = "false";
    };
    list.querySelectorAll<HTMLElement>("[data-nav-link]").forEach((link) => {
      link.addEventListener("mouseenter", () => show(link));
      link.addEventListener("focus", () => show(link));
      link.addEventListener("blur", hide);
    });
    list.addEventListener("mouseleave", hide);
  }

  /* ── Menu trigger → the mega drawer (AppShell's hover/click intent) ── */
  const trigger = header.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  if (trigger) {
    trigger.addEventListener("click", () => megaNav.toggle());
    trigger.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") megaNav.openOnHover();
    });
    trigger.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") megaNav.closeOnHover();
    });
    store.on("megaNavOpen", (open) => trigger.setAttribute("aria-expanded", String(open)));
  }
}
