/** Reach cities, moved verbatim from `ReachMap.tsx` (2026-09-23) so the home
 *  Credibility section can place them on the globe without importing a
 *  component module (react-refresh lint). `tz` is the IANA zone the retired
 *  live city-clock strip read; nothing reads it now. */
export interface City {
  label: string;
  lon: number;
  lat: number;
  labelDx: number;
  labelDy: number;
  anchor: "start" | "middle" | "end";
  hideArc?: boolean;
  tz?: string;
}

export const HQ: City = {
  label: "MANILA",
  lon: 121.0,
  lat: 14.6,
  labelDx: 30,
  labelDy: -2,
  anchor: "start",
  tz: "Asia/Manila",
};

export const REACH: City[] = [
  {
    label: "NEW YORK",
    lon: -74.0,
    lat: 40.7,
    labelDx: 0,
    labelDy: -38,
    anchor: "middle",
    tz: "America/New_York",
  },
  {
    label: "NEW JERSEY",
    lon: -74.0,
    lat: 40.7,
    labelDx: -20,
    labelDy: 16,
    anchor: "end",
    hideArc: true,
    tz: "America/New_York",
  },
  {
    label: "CONNECTICUT",
    lon: -74.0,
    lat: 40.7,
    labelDx: 20,
    labelDy: 16,
    anchor: "start",
    hideArc: true,
    tz: "America/New_York",
  },
  {
    label: "MIAMI",
    lon: -80.2,
    lat: 25.7,
    labelDx: 0,
    labelDy: 26,
    anchor: "middle",
    tz: "America/New_York",
  },
  {
    label: "LONDON",
    lon: -0.13,
    lat: 51.5,
    labelDx: -16,
    labelDy: 8,
    anchor: "end",
    tz: "Europe/London",
  },
  {
    label: "HONG KONG",
    lon: 114.17,
    lat: 22.32,
    labelDx: 22,
    labelDy: -24,
    anchor: "start",
    tz: "Asia/Hong_Kong",
  },
];
