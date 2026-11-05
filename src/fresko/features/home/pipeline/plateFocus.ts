import type { PlateFocus } from "@/features/home/rebuild/aperture";

/**
 * One person's face in a photo, as shares of the image's own height (0 top, 1 bottom):
 * `top` is the forehead (where the hair meets it), `chin` the bottom of the chin.
 */
export interface PlateFace {
  top: number;
  chin: number;
}

/**
 * Every prominent face in each opener photo, measured on the files in
 * `public/images/pillars-hd/` against a 1%-step grid (the faces on the monitor behind the
 * operator are far too small to count). Listed from the top of the frame down.
 */
export const PLATE_FACES = {
  // research-desk-team-hd.webp (2026-10-23): the standing man, the woman, the seated man in the cap.
  research: [
    { top: 0.14, chin: 0.3 },
    { top: 0.47, chin: 0.585 },
    // Under the cap's brim: from the eye line, the forehead is hidden.
    { top: 0.62, chin: 0.765 },
  ],
  // development-whiteboard-hd.webp: the standing man, the seated man on the right, the woman, the man on the left.
  development: [
    { top: 0.18, chin: 0.32 },
    { top: 0.43, chin: 0.615 },
    { top: 0.47, chin: 0.63 },
    { top: 0.48, chin: 0.615 },
  ],
  // support-meeting-hd.webp (2026-10-30): the standing woman on the left, the standing man
  // in the hoodie, the woman in the centre, the man on the right, the seated woman in glasses.
  support: [
    { top: 0.17, chin: 0.275 },
    { top: 0.165, chin: 0.255 },
    { top: 0.245, chin: 0.355 },
    { top: 0.29, chin: 0.42 },
    // Hair covers her forehead: from the eye line.
    { top: 0.38, chin: 0.455 },
  ],
} as const satisfies Record<string, readonly PlateFace[]>;

/**
 * The vertical `object-position` every opener photo rests at (0 shows the top, 1 the bottom):
 * the CSS crop on phones and with reduced motion. The desktop arrival refits it per window so
 * the faces clear the floating navbar (`fitPositionY`), staying as near to this as that allows.
 */
const POSITION_Y = 0.4;

/**
 * The stretch of each photo that holds every face, from the highest forehead to the lowest
 * chin, set per photo beside its resting object-position (`ChapterOpener` writes `facesTop`,
 * `facesBottom` and `positionY` onto the image, and the arrival reads them back). The
 * aperture's closed band always contains it whole, so no shutter edge ever falls across a face.
 */
const facesOf = (faces: readonly PlateFace[]): PlateFocus => ({
  facesTop: Math.min(...faces.map((face) => face.top)),
  facesBottom: Math.max(...faces.map((face) => face.chin)),
  positionY: POSITION_Y,
});

export const PLATE_FOCUS = {
  research: facesOf(PLATE_FACES.research),
  development: facesOf(PLATE_FACES.development),
  support: facesOf(PLATE_FACES.support),
} as const satisfies Record<keyof typeof PLATE_FACES, PlateFocus>;

/**
 * The horizontal `object-position` each photo takes on a phone, where the portrait plate
 * shows under half the landscape frame: centred, Development showed the empty whiteboard
 * and the old Support photo cut its monitors in half. Each value keeps the photo's subject
 * (the laptop huddle, the team around the table) in the window. From 768px the plate is wide and
 * the photo stays centred (owner, 2026-10-16).
 */
export const PLATE_PHONE_POSITION_X = {
  // Research (2026-10-23): the three at the desk, left of the monitors.
  research: 0.42,
  development: 0.12,
  // Support (2026-10-29): the middle of the table, from the woman in glasses to the
  // woman in the centre.
  support: 0.5,
} as const satisfies Record<keyof typeof PLATE_FACES, number>;
