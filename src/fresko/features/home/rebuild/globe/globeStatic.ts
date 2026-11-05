/**
 * GlobeStatic.tsx, ported: an orthographic dot-matrix earth viewed from over the Pacific with
 * the Manila HQ low-left of centre, lit by the real sun (day dots bright, night dots dim),
 * with elevated gold great-circle arcs from Manila to the reach cities and a marker per city
 * on the near side.
 *
 * `update(lon, lat)` re-projects in place. Like React's keyed reconciliation, an arc's <path>
 * (keyed by its city index) and a marker's <g> (keyed by label) persist while they stay
 * visible, so the arcs' CSS draw cycle is never restarted by the globe turning; new ones are
 * inserted in order, gone ones removed. An arc's fade gradient <defs> comes and goes in front
 * of its path, as the Fragment did.
 */
import { HQ, REACH } from "@/shared/content/reachCities";
import { NOIR } from "@/shared/theme/palette";
import {
  GLOBE_SVG,
  GLOBE_VIEW,
  HQ_DOT_R,
  LAND_DOTS,
  cosAngleBetween,
  hubArcs,
  projectOrtho,
  type ArcPoint,
} from "./globeData";
import { subsolarPoint } from "./sun";
import { nextId, s } from "@/features/home/pipeline/visuals/dom";

const {
  r: R,
  view: VIEW,
  dayDotOpacity: DAY_DOT_OPACITY,
  nightDotOpacity: NIGHT_DOT_OPACITY,
} = GLOBE_SVG;
const DOT_WIDTH = 1.7;
/** An arc that goes over the horizon is drawn full strength to this share of its run, then fades out. */
const ARC_FADE_FROM = 0.55;
/** The HQ marker's ring radius; the handoff's pulse ring starts from it. */
const HQ_RING_R = 5.5;

/** Arc targets: the reach cities that draw an arc on the map (NJ/CT share New York's
 *  coordinates and set `hideArc`). */
const ARC_CITIES = REACH.filter((city) => !city.hideArc);

const fmt = (n: number) => n.toFixed(1);

function dotsPath(dots: ReadonlyArray<{ x: number; y: number }>): string {
  return dots.map((d) => `M${fmt(d.x * R)} ${fmt(-d.y * R)}h.01`).join("");
}

const runPath = (run: readonly ArcPoint[]): string =>
  run.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x * R)} ${fmt(-p.y * R)}`).join("");

/** The fade's axis for an arc that goes over the horizon: from its start to the end of its run. */
function fadeAxis(run: readonly ArcPoint[]) {
  const a = run[0];
  const b = run.at(-1);
  if (!a || !b) return null;
  return { x1: a.x * R, y1: -a.y * R, x2: b.x * R, y2: -b.y * R };
}

interface ArcGeom {
  i: number;
  d: string;
  fade: { x1: number; y1: number; x2: number; y2: number } | null;
}

function geometryOf(centerLon: number, centerLat: number, time: number, places: boolean) {
  const sun = subsolarPoint(new Date(time));
  const day: Array<{ x: number; y: number }> = [];
  const night: Array<{ x: number; y: number }> = [];
  for (const dot of LAND_DOTS) {
    const p = projectOrtho(dot.lon, dot.lat, centerLon, centerLat);
    if (!p.visible) continue;
    (cosAngleBetween(dot, sun) > 0 ? day : night).push(p);
  }
  const arcs: ArcGeom[] = places
    ? hubArcs(HQ, ARC_CITIES, centerLon, centerLat).flatMap((arc, i) =>
        arc ? [{ i, d: runPath(arc.points), fade: arc.landed ? null : fadeAxis(arc.points) }] : [],
      )
    : [];
  const markers = places
    ? [HQ, ...ARC_CITIES]
        .map((city) => ({ city, p: projectOrtho(city.lon, city.lat, centerLon, centerLat) }))
        .filter(({ p }) => p.visible)
        .map(({ city, p }) => ({ key: city.label, hq: city === HQ, x: p.x * R, y: -p.y * R }))
    : [];
  return { dayPath: dotsPath(day), nightPath: dotsPath(night), arcs, markers };
}

interface ArcNodes {
  defs: SVGDefsElement | null;
  gradient: SVGLinearGradientElement | null;
  path: SVGPathElement;
}

export interface GlobeStaticHandle {
  el: SVGSVGElement;
  update(centerLon: number, centerLat: number): void;
}

export function createGlobeStatic({
  centerLon = GLOBE_VIEW.lon,
  centerLat = GLOBE_VIEW.lat,
  at,
  places = true,
}: {
  centerLon?: number;
  centerLat?: number;
  /** The instant whose sun position lights the globe. Defaults to mount time. */
  at?: Date;
  places?: boolean;
} = {}): GlobeStaticHandle {
  const time = (at ?? new Date()).getTime();
  const arcFadeId = `globe-arc-fade-${nextId()}`;

  const night = s("path", {
    className: "globe-night",
    fill: "none",
    strokeOpacity: NIGHT_DOT_OPACITY,
    strokeWidth: DOT_WIDTH,
    strokeLinecap: "round",
  });
  const day = s("path", {
    className: "globe-day",
    fill: "none",
    strokeOpacity: DAY_DOT_OPACITY,
    strokeWidth: DOT_WIDTH,
    strokeLinecap: "round",
  });
  const arcsG = s("g", { className: "globe-arcs" });
  const el = s(
    "svg",
    {
      className: "globe-static",
      viewBox: `${String(-VIEW)} ${String(-VIEW)} ${String(2 * VIEW)} ${String(2 * VIEW)}`,
      "aria-hidden": "true",
      focusable: "false",
    },
    s("circle", {
      className: "globe-disc",
      r: R,
      fill: NOIR.navyDeep,
      strokeOpacity: 0.14,
      strokeWidth: 0.6,
    }),
    night,
    day,
    arcsG,
  );

  const arcNodes = new Map<number, ArcNodes>();
  const markerNodes = new Map<string, SVGGElement>();

  const makeGradient = (id: string, fade: NonNullable<ArcGeom["fade"]>) => {
    const gradient = s(
      "linearGradient",
      { id, gradientUnits: "userSpaceOnUse", ...fade },
      s("stop", { offset: 0, stopColor: NOIR.gold }),
      s("stop", { offset: ARC_FADE_FROM, stopColor: NOIR.gold }),
      s("stop", { offset: 1, stopColor: NOIR.gold, stopOpacity: 0 }),
    );
    return { defs: s("defs", null, gradient), gradient };
  };

  const makeMarker = (m: { hq: boolean }) =>
    s(
      "g",
      { className: m.hq ? "globe-marker globe-marker-hq" : "globe-marker" },
      m.hq
        ? [
            // the handoff's single ring pulse; hidden unless the Support visual drives it
            s("circle", {
              className: "globe-hq-pulse",
              r: HQ_RING_R,
              fill: "none",
              stroke: NOIR.gold,
              strokeWidth: 0.8,
              opacity: 0,
            }),
            s("circle", { r: HQ_RING_R, fill: "none", stroke: NOIR.gold, strokeOpacity: 0.5, strokeWidth: 0.8 }),
          ]
        : null,
      // The hub's dot is where the handoff's carrier lands on the Support visual.
      s("circle", {
        r: m.hq ? HQ_DOT_R : 1.8,
        fill: NOIR.gold,
        ...(m.hq ? { "data-handoff-in": "live" } : {}),
      }),
    );

  const update = (lon: number, lat: number) => {
    const geometry = geometryOf(lon, lat, time, places);
    night.setAttribute("d", geometry.nightPath);
    day.setAttribute("d", geometry.dayPath);

    // arcs, keyed by city index, kept in array order
    const live = new Set<number>();
    let cursor: ChildNode | null = arcsG.firstChild;
    for (const arc of geometry.arcs) {
      live.add(arc.i);
      const fadeId = `${arcFadeId}-${String(arc.i)}`;
      let nodes = arcNodes.get(arc.i);
      if (!nodes) {
        nodes = {
          defs: null,
          gradient: null,
          path: s("path", {
            className: "globe-arc",
            "data-arc": arc.i,
            fill: "none",
            strokeOpacity: 0.85,
            strokeWidth: 0.9,
            // Butt caps: a round cap would paint a dot at each end of an arc whose dash is
            // fully offset (undrawn).
            strokeLinecap: "butt",
            strokeLinejoin: "round",
            pathLength: 1,
            strokeDasharray: "1 1",
          }),
        };
        arcNodes.set(arc.i, nodes);
      }
      if (arc.fade) {
        if (!nodes.defs || !nodes.gradient) {
          const made = makeGradient(fadeId, arc.fade);
          nodes.defs = made.defs;
          nodes.gradient = made.gradient;
        } else {
          for (const [k, v] of Object.entries(arc.fade)) nodes.gradient.setAttribute(k, String(v));
        }
      } else if (nodes.defs) {
        nodes.defs.remove();
        nodes.defs = null;
        nodes.gradient = null;
      }
      nodes.path.setAttribute("d", arc.d);
      nodes.path.setAttribute("stroke", arc.fade ? `url(#${fadeId})` : NOIR.gold);
      // place [defs?, path] at the cursor
      for (const node of [nodes.defs, nodes.path]) {
        if (!node) continue;
        if (node === cursor) cursor = cursor.nextSibling;
        else arcsG.insertBefore(node, cursor);
      }
    }
    for (const [i, nodes] of arcNodes) {
      if (live.has(i)) continue;
      nodes.defs?.remove();
      nodes.path.remove();
      arcNodes.delete(i);
    }

    // markers, keyed by label, after the arcs in array order
    const liveMarkers = new Set<string>();
    let anchor: ChildNode | null = arcsG.nextSibling;
    for (const m of geometry.markers) {
      liveMarkers.add(m.key);
      let g = markerNodes.get(m.key);
      if (!g) {
        g = makeMarker(m);
        markerNodes.set(m.key, g);
      }
      g.setAttribute("transform", `translate(${fmt(m.x)} ${fmt(m.y)})`);
      if (g !== anchor) el.insertBefore(g, anchor);
      anchor = g.nextSibling;
    }
    for (const [key, g] of markerNodes) {
      if (liveMarkers.has(key)) continue;
      g.remove();
      markerNodes.delete(key);
    }
  };

  update(centerLon, centerLat);
  return { el, update };
}
