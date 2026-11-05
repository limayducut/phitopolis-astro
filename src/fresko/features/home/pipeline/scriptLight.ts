import { clamp01, smoothstep } from "./chapterTimeline";

/**
 * The pinned stage shows ONE sentence at a time. Pure: where a sentence is, and how
 * lit each of its words is, as functions of the script position `s` (0 when the
 * pin starts, `beatCount` when it ends; negative while the body is still rising).
 *
 * Sentence k owns the span [k, k + 1]. It arrives at the start of that span (the
 * first one arrives during the last half unit of the rise, so the stage lands with
 * its sentence already on it), holds, and leaves in the span's last stretch; the next
 * one arrives only once it has gone. The last sentence never leaves.
 */
export const WORD_DIM = 0.16; // the floor a not-yet-read word rests at
/** Units a sentence takes to arrive (the first: from this far into the rise). */
export const ENTER_SPAN = 0.22;
export const FIRST_ENTER_SPAN = 0.5;
/** Units a sentence takes to leave. */
export const EXIT_SPAN = 0.2;
/** Words light over this many units, starting just after the sentence has arrived. */
export const LIGHT_SPAN = 0.5;
/** Each word's own fade, as a share of the sweep. */
export const WORD_SHARE = 0.35;

const enterStart = (k: number): number => (k === 0 ? -FIRST_ENTER_SPAN : k);
const enterSpan = (k: number): number => (k === 0 ? FIRST_ENTER_SPAN : ENTER_SPAN);

export interface SentencePose {
  /** 0 hidden, 1 fully on screen. */
  alpha: number;
  /**
   * Travel along the chapter's signal axis, -1 .. 1: -1 not yet arrived (behind the
   * signal), 0 at rest, 1 departed (ahead of it). The caller scales it to pixels.
   */
  travel: number;
}

export function sentencePose(s: number, k: number, beatCount: number): SentencePose {
  const arrived = smoothstep((s - enterStart(k)) / enterSpan(k));
  const leaving = k >= beatCount - 1 ? 0 : smoothstep((s - (k + 1 - EXIT_SPAN)) / EXIT_SPAN);
  return { alpha: arrived * (1 - leaving), travel: leaving - (1 - arrived) };
}

/** Word `i` of `m` in sentence `k`: dim until the sweep reaches it, then lit; words light in order. */
export function wordAlpha(s: number, k: number, i: number, m: number): number {
  const from = k === 0 ? -FIRST_ENTER_SPAN * 0.7 : k + 0.05;
  const sweep = clamp01((s - from) / LIGHT_SPAN);
  const wordStart = m <= 1 ? 0 : (i / (m - 1)) * (1 - WORD_SHARE);
  return WORD_DIM + (1 - WORD_DIM) * smoothstep((sweep - wordStart) / WORD_SHARE);
}
