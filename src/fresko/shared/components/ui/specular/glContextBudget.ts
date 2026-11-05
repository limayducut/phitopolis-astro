/**
 * A page-wide budget for the per-button WebGL contexts that draw the specular rim.
 *
 * Why this exists
 * ---------------
 * `SpecularFx` follows the upstream React Bits design: one `Renderer`, one
 * canvas, one rAF loop *per button*. That is fine for the component's demo page,
 * which shows a single button. This site puts 43 of them across the routes, on
 * top of the hero's R3F canvases, the ground layer and the logo particle field.
 *
 * Browsers cap live WebGL contexts per page — Chrome at ~16, and it evicts the
 * *oldest* context when you exceed it, firing `webglcontextlost` on a canvas
 * that is very much still on screen. The failure mode is not a crash: it is a
 * button whose rim silently stops drawing, which is worse because it looks like
 * a flaky effect rather than a bug.
 *
 * The insight that makes a budget invisible
 * -----------------------------------------
 * The rim only *renders* within `proximity` px of the pointer (`bright` fades to
 * 0 outside it, so the shader outputs a fully transparent frame). A button on
 * the far side of the viewport is paying for a context, a canvas and a 60fps rAF
 * loop to draw nothing at all. So we rank every registered button by pointer
 * distance and hand the small pool of contexts to the closest ones. A button
 * that loses its context was drawing nothing when it lost it.
 *
 * `autoAnimate` buttons are the exception — their rim is on regardless of the
 * pointer, so they rank as distance 0 and effectively pin a slot.
 *
 * Hysteresis
 * ----------
 * Straight "closest N wins" thrashes: two buttons a pixel apart would trade a
 * context on every pointer move, and each trade is a full GL teardown plus
 * shader recompile. A challenger must beat the incumbent by `SWAP_MARGIN_PX`
 * before it takes the slot.
 *
 * Proximity cutoff
 * ----------------
 * "Closest N wins" alone still handed all N slots out to whichever buttons were
 * on screen, with the pointer nowhere near them, so the page paid for six live
 * contexts to draw transparent frames. A slot is now only granted to a holder
 * whose pointer distance is inside its own `radius` (the same radius the
 * shader's brightness falloff uses). Once granted it is kept until the pointer
 * is `RELEASE_MARGIN_PX` past that radius, so hovering right on the boundary
 * does not flip it on and off.
 *
 * Lingering
 * ---------
 * A holder that loses its slot keeps its GL context for `LINGER_MS` before it is
 * destroyed, so scrolling or sweeping the pointer back over a button does not
 * pay for a teardown plus shader recompile each time. A lingering context
 * still counts against `MAX_CONTEXTS` and is the first thing evicted when an
 * eligible holder needs the slot, so the cap on live contexts is never
 * exceeded. (An idle live context costs memory only: `SpecularFx` stops its
 * own rAF loop while the rim is dark.)
 */

/** Contexts this pool will hand out at once.
 *
 *  Deliberately well under Chrome's ~16: the hero owns up to three R3F canvases
 *  and the ground layer owns one, and those must never be the contexts that get
 *  evicted — they are full-viewport and their loss is unmissable. Six is enough
 *  that every button under the cursor and its neighbours are live, since the rim
 *  is invisible past `proximity` (250px by default) anyway. */
const MAX_CONTEXTS = 6;

/** How much closer (px) a challenger must be before it takes a live slot. */
const SWAP_MARGIN_PX = 48;

/** How far (px) past its radius a live holder may drift before it counts as
 *  out of range. Stops a pointer resting on the radius from flipping it. */
const RELEASE_MARGIN_PX = 48;

/** How long (ms) a holder that is out of range keeps its GL context. */
export const LINGER_MS = 2000;
/** GL contexts created per frame at most (each is a Renderer + shader compile). */
export const MAX_STARTS_PER_FRAME = 2;

export interface SpecularHolder {
  /** Pointer distance in px, 0 when the rim is on regardless of the pointer. */
  distance: number;
  /** Distance in px inside which the rim is visible (the shader's proximity).
   *  `Infinity` for an always-on rim. */
  radius: number;
  /** Create the GL context and start the loop. Must be idempotent. */
  start: () => void;
  /** Destroy the GL context and stop the loop. Must be idempotent. */
  stop: () => void;
  /** Owned by the pool — do not set from the holder. */
  live: boolean;
  /** Owned by the pool: when a live holder fell out of range (Date.now()). */
  idleSince?: number | undefined;
}

const holders = new Set<SpecularHolder>();
let rebalanceQueued = false;
let lingerTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Give slots to the closest in-range holders.
 *
 * Runs on a rAF tick rather than per pointer event: a pointer move can register
 * at 1000Hz on a high-polling mouse, and rebalancing is O(n log n) plus possible
 * GL teardown.
 */
function rebalance(): void {
  rebalanceQueued = false;
  const now = Date.now();

  // Only holders whose rim could be visible are candidates: inside the radius,
  // or (for one that already has a context) within the release margin of it.
  const ranked = [...holders]
    .filter((h) => h.distance < h.radius || (h.live && h.distance < h.radius + RELEASE_MARGIN_PX))
    .sort((a, b) => a.distance - b.distance);
  const winners = new Set(ranked.slice(0, MAX_CONTEXTS));

  // Hysteresis. Only two groups can churn: holders this pass would promote
  // (in the top N, no context yet) and holders it would displace (outside the
  // top N, holding one). Both stay distance-sorted, so it is enough to compare
  // the *weakest* promotion against the *strongest* displacement: if even that
  // pairing is a decisive win, every other pairing is too.
  const promoted = ranked.slice(0, MAX_CONTEXTS).filter((h) => !h.live);
  const displaced = ranked.slice(MAX_CONTEXTS).filter((h) => h.live);
  while (promoted.length > 0 && displaced.length > 0) {
    const challenger = promoted[promoted.length - 1]!;
    const incumbent = displaced[0]!;
    if (challenger.distance + SWAP_MARGIN_PX < incumbent.distance) break;
    // Too close to justify a teardown plus a shader recompile. Keep the incumbent.
    winners.delete(challenger);
    winners.add(incumbent);
    promoted.pop();
    displaced.shift();
  }

  // Lingering: live holders that are not winners keep their context while there
  // is spare capacity and their grace period has not run out. Winners claim
  // their slots first, so the total never exceeds MAX_CONTEXTS.
  const keep = new Set(winners);
  let spare = MAX_CONTEXTS - winners.size;
  let nextExpiry = Number.POSITIVE_INFINITY;
  const idle = [...holders]
    .filter((h) => h.live && !winners.has(h))
    .sort((a, b) => a.distance - b.distance);
  for (const holder of idle) {
    holder.idleSince ??= now;
    const expiry = holder.idleSince + LINGER_MS;
    if (spare > 0 && now < expiry) {
      keep.add(holder);
      spare--;
      nextExpiry = Math.min(nextExpiry, expiry);
    }
  }
  for (const holder of winners) holder.idleSince = undefined;

  // Stops before starts, so the live count never overshoots mid-pass.
  const stops: SpecularHolder[] = [];
  const starts: SpecularHolder[] = [];
  for (const holder of holders) {
    const shouldBeLive = keep.has(holder);
    if (shouldBeLive === holder.live) continue;
    (shouldBeLive ? starts : stops).push(holder);
  }
  for (const holder of stops) {
    holder.live = false;
    holder.idleSince = undefined;
    holder.stop();
  }
  // Each start is a new Renderer plus a shader compile. Sweeping the pointer onto
  // a cluster of CTAs can bring several into range in one pass, so start at most
  // MAX_STARTS_PER_FRAME here and finish the rest on the next frames: one long
  // task becomes a few short ones, and the rims fade in from 0 so the stagger
  // isn't visible. Starts are taken nearest-first.
  starts.sort((a, b) => a.distance - b.distance);
  for (const holder of starts.slice(0, MAX_STARTS_PER_FRAME)) {
    holder.live = true;
    holder.start();
  }
  const startsPending = starts.length > MAX_STARTS_PER_FRAME;

  // Come back when the soonest lingering context is due to be released.
  if (lingerTimer) clearTimeout(lingerTimer);
  lingerTimer = null;
  if (Number.isFinite(nextExpiry)) {
    lingerTimer = setTimeout(requestRebalance, Math.max(0, nextExpiry - now) + 1);
  }
  if (startsPending) requestRebalance();
}

/** Coalesce rebalances to one per frame. */
export function requestRebalance(): void {
  if (rebalanceQueued) return;
  rebalanceQueued = true;
  requestAnimationFrame(rebalance);
}

/**
 * Enter the pool. Call when the button scrolls into view; the returned function
 * leaves the pool and is safe to call from an effect cleanup.
 */
export function registerSpecular(holder: SpecularHolder): () => void {
  holders.add(holder);
  requestRebalance();
  return () => {
    holders.delete(holder);
    if (holder.live) {
      holder.live = false;
      holder.stop();
    }
    requestRebalance();
  };
}
