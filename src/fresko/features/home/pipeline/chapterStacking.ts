/** One chapter's paint order (the chapter section is its own stacking context). */
export const CHAPTER_Z = {
  /** The desktop body, which rises over the opener. */
  body: 2,
  /** The opener on desktop, below the body: the body rises over the drifting photo. */
  openerResting: 1,
  /** The opener in flow (phones, reduced motion). */
  opener: 4,
} as const;
