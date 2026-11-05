// useGlassGate.ts, ported: the single gate on glass cost. One attribute on
// <html>; glass.css owns what it means (blur 0, saturate 100%, opaque
// understudy). Off on low-power devices and under reduced motion.

import { isLowPowerDevice, reducedMotion } from "../../runtime/media";

export function initGlassGate(): void {
  const root = document.documentElement;
  reducedMotion().on((reduced) => {
    if (isLowPowerDevice() || reduced) root.dataset.glass = "off";
    else delete root.dataset.glass;
  });
}
