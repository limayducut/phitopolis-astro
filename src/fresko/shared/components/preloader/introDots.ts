// From fresko intro/IntroDots.tsx: the dot's full-size diameter as CSS over
// the overlay's `--mark-h` (exactly the P terminal's diameter). The markup
// itself is server-rendered by src/components/intro/Preloader.astro.

import { MARK_VIEWBOX } from "../intro/diveGeometry";
import { TERMINAL_R } from "../intro/dotAnchors";

export const DOT_DIAMETER_RATIO = (2 * TERMINAL_R) / MARK_VIEWBOX.h;
export const DOT_DIAMETER_CSS = `calc(var(--mark-h) * ${DOT_DIAMETER_RATIO.toFixed(6)})`;
