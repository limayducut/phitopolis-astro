// OWNER: chrome fork. Navbar, mega drawer, command palette, cookie notice,
// back-to-top, overlay scrollbar, specular buttons, footer, glass gate.

import { observeNavAnchor } from "../runtime/store";
import { NAV_ANCHORS } from "@/shared/components/navbarAnchors";
import { initSiteNavbar } from "@/shared/components/SiteNavbar";
import { initTopNavMegaDrawer } from "@/shared/components/TopNavMegaDrawer";
import { initButtons } from "@/shared/components/ui/CtaButton";
import { initReveals } from "@/shared/components/ui/reveal";
import { initBackToTop } from "@/shared/components/BackToTop";
import { initOverlayScrollbar } from "@/shared/components/OverlayScrollbar";
import { initCommandPalette } from "@/shared/components/CommandPalette";
import { initCookieNotice } from "@/shared/components/CookieNotice";
import { initGlassGate } from "@/shared/theme/useGlassGate";

/** Each piece is isolated: one failing must never take the navbar down with it. */
function safely(name: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    console.error(`[chrome] ${name} failed`, error);
  }
}

let started = false;

/** Idempotent: boot.ts calls it; SiteNavbar.astro calls it again as a fallback
 *  (DOMContentLoaded) so the chrome survives another subsystem failing to load. */
export function initChrome(): void {
  if (started) return;
  started = true;
  safely("glass gate", initGlassGate);
  safely("navbar", initSiteNavbar);
  safely("mega drawer", initTopNavMegaDrawer);
  safely("buttons", () => initButtons());
  safely("footer", () => {
    const footer = document.querySelector("[data-site-footer]");
    // AppShell: useNavbarAnchor(NAV_ANCHORS.SITE_FOOTER, { dark: true })
    if (footer) observeNavAnchor(footer, NAV_ANCHORS.SITE_FOOTER, { dark: true });
    if (footer) initReveals(footer);
  });
  safely("back to top", initBackToTop);
  safely("overlay scrollbar", initOverlayScrollbar);
  safely("command palette", initCommandPalette);
  safely("cookie notice", initCookieNotice);
}
