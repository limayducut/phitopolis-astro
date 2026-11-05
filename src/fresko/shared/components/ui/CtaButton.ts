// Behaviour behind CtaButton.astro and the specular icon buttons.
//
// fresko: CtaButton → SpecularButton (MUI Button + <SpecularFx>), and
// SpecularIconButton (MUI IconButton + <SpecularFx> tuned for a small circle).
// Both kept MUI's touch ripple.

import attachSpecular from "./specular/SpecularFx";
import { attachTouchRipple } from "./touchRipple";

const wired = new WeakSet<Element>();

/** SpecularButton: rim with baseOpacity 0; the CTA passes its rim colour. */
export function wireCtaButton(el: HTMLElement): void {
  if (wired.has(el)) return;
  wired.add(el);
  attachTouchRipple(el);
  attachSpecular(el, { lineColor: el.dataset.specularLine ?? "#F4F7FC", baseOpacity: 0 });
}

/** SpecularIconButton: widened shine, halved proximity, centred ripple. */
export function wireIconButton(el: HTMLElement): void {
  if (wired.has(el)) return;
  wired.add(el);
  attachTouchRipple(el, { center: true });
  attachSpecular(el, {
    lineColor: "#FFC72C",
    baseOpacity: 0,
    shineSize: 26,
    shineFade: 55,
    proximity: 120,
  });
}

/** Wires every CTA / icon button under `root` (idempotent). */
export function initButtons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-cta]").forEach(wireCtaButton);
  root.querySelectorAll<HTMLElement>("[data-icon-button]").forEach(wireIconButton);
}
