# Phitopolis — static home page (Astro)

A static Astro port of the home page of https://uat.phitopolis.io, built from
the `phitopolis-fresko` React app (`main` @ `f7d22d8`). Only `/` exists; every
other page link points to `#` (the `mailto:` addresses in the footer are kept).

The goal is full fidelity with UAT — preloader intro, Lenis smooth scroll,
pinned chapters with live diagrams, the gold handoff point, mega menu, cookie
notice and the rest — with no React or MUI: Astro renders the markup, and plain
TypeScript drives it with GSAP, Lenis, Motion and ogl at fresko's exact versions.

> **Status:** port in progress. Done: the intro (preloader).
> In progress: home sections, chapter diagrams + handoff, site chrome.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run preview
```

Requires Node ≥ 22.12. Astro is pinned to 7.3.8 (newer 7.4.x needs Node ≥ 22.23).

## Layout

| Path | What |
| --- | --- |
| `src/pages/index.astro` | The page (fresko's AppShell + home route as markup) |
| `src/layouts/BaseLayout.astro` | `<head>`, SEO tags, pre-paint intro gate |
| `src/components/{chrome,home,intro,visuals}/` | Markup + styles per subsystem |
| `src/fresko/` | Ported fresko source, mirroring its `src/` tree (`@/` alias) |
| `src/fresko/runtime/` | Vanilla replacements for the React contexts: store, media queries, smooth scroll, entrance phases, chapter clocks |
| `src/fresko/ports/` | One `init` entry per subsystem |
| `src/fresko/boot.ts` | Page bootstrap |
| `src/styles/` | Tokens, baseline (MUI CssBaseline port) |
| `public/` | Fonts, images, videos, icons from fresko |

React-free fresko modules (geometry, timelines, layouts, copy) are copied
verbatim under `src/fresko/`; React components are rewritten as Astro markup
plus TypeScript that keeps fresko's DOM classes, constants, timings and
ScrollTrigger settings.
