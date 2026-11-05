/**
 * Subsolar point (where the sun is directly overhead) for a given instant,
 * from the NOAA / USNO low-precision solar coordinates (good to about 0.01°
 * in declination for dates within a few centuries of J2000), plus Greenwich
 * mean sidereal time for the longitude. Pure: no clock reads, the caller
 * passes the Date. Drives the globe's real day/night terminator.
 */

const DEG = Math.PI / 180;
const J2000 = 2451545.0;
const UNIX_EPOCH_JD = 2440587.5;
const MS_PER_DAY = 86_400_000;

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
function wrap180(deg: number): number {
  const w = wrap360(deg);
  return w > 180 ? w - 360 : w;
}

/** Days since J2000.0 (fractional). */
export function daysSinceJ2000(date: Date): number {
  return date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD - J2000;
}

/** Sun's declination and right ascension (degrees). */
export function solarCoordinates(date: Date): { declination: number; rightAscension: number } {
  const n = daysSinceJ2000(date);
  const meanLongitude = wrap360(280.46 + 0.9856474 * n);
  const meanAnomaly = wrap360(357.528 + 0.9856003 * n) * DEG;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.0000004 * n) * DEG;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) / DEG;
  const rightAscension = wrap360(
    Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude)) /
      DEG,
  );
  return { declination, rightAscension };
}

/** Greenwich mean sidereal time, in degrees. */
export function gmstDegrees(date: Date): number {
  const n = daysSinceJ2000(date);
  return wrap360(280.46061837 + 360.98564736629 * n);
}

/** Subsolar point: `lat` = solar declination, `lon` = RA - GMST (-180..180). */
export function subsolarPoint(date: Date): { lon: number; lat: number } {
  const { declination, rightAscension } = solarCoordinates(date);
  return { lon: wrap180(rightAscension - gmstDegrees(date)), lat: declination };
}
