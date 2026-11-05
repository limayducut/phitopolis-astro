// CookieNotice.tsx behaviour: mounts the consent card (slide up 32px + fade,
// 0.35s easeOut) when a provider exists and no choice is stored; either button
// records the choice and the card exits the same way.

import { animate } from "motion";

import {
  ANALYTICS_PROVIDER_ENABLED,
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
} from "../consent";
import { attachTouchRipple } from "./ui/touchRipple";

export function initCookieNotice(): void {
  const template = document.querySelector<HTMLTemplateElement>("[data-cookie-notice-template]");
  if (!template) return;
  let mounted: HTMLElement | null = null;

  const sync = () => {
    const show = ANALYTICS_PROVIDER_ENABLED && getAnalyticsConsent() === null;
    if (show && !mounted) {
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      mounted = fragment.querySelector<HTMLElement>("[data-cookie-notice]");
      if (!mounted) return;
      mounted.querySelectorAll<HTMLButtonElement>("[data-consent]").forEach((btn) => {
        attachTouchRipple(btn);
        btn.addEventListener("click", () =>
          setAnalyticsConsent(btn.dataset.consent as AnalyticsConsent),
        );
      });
      template.after(mounted);
      animate(mounted, { transform: ["translateY(32px)", "translateY(0px)"], opacity: [0, 1] }, { duration: 0.35, ease: "easeOut" });
    } else if (!show && mounted) {
      const leaving = mounted;
      mounted = null;
      void animate(leaving, { transform: "translateY(32px)", opacity: 0 }, { duration: 0.35, ease: "easeOut" }).then(() =>
        leaving.remove(),
      );
    }
  };
  sync();
  subscribeAnalyticsConsent(sync);
}
