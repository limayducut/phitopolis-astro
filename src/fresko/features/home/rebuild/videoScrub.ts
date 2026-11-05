/**
 * Coalesce seeks while the decoder is busy; the latest scroll target always wins.
 *
 * A slow seek is never a failure. On a slow link (UAT serves this film at
 * ~400 KB/s) a seek into bytes not yet downloaded waits seconds for its range
 * request; it used to trip a 2.5s deadline that hid the film for good, leaving
 * the poster (frame 0) on screen while the scroll moved on. Only a decoder
 * `error` or a rejected `currentTime` assignment hands over to the poster.
 */
export function createVideoScrubber(video: HTMLVideoElement, onFailure: () => void) {
  let target = 0;
  let frame = 0;
  let disposed = false;
  let failed = false;
  const fail = () => {
    if (disposed || failed) return;
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onFailure();
  };
  const schedule = () => {
    if (
      disposed ||
      failed ||
      frame ||
      video.seeking ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    )
      return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (disposed || failed || video.seeking) return;
      const time = Math.min(Math.max(0, video.duration - 1 / 60), target * video.duration);
      if (Math.abs(video.currentTime - time) < 1 / 30) return;
      try {
        video.currentTime = time;
      } catch {
        fail();
      }
    });
  };
  video.addEventListener("loadedmetadata", schedule);
  video.addEventListener("loadeddata", schedule);
  video.addEventListener("seeked", schedule);
  video.addEventListener("error", fail);
  return {
    seek(progress: number) {
      target = Math.max(0, Math.min(1, progress));
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", schedule);
      video.removeEventListener("loadeddata", schedule);
      video.removeEventListener("seeked", schedule);
      video.removeEventListener("error", fail);
    },
  };
}
