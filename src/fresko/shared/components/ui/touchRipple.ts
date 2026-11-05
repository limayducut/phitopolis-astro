// MUI ButtonBase's TouchRipple, ported to the DOM. fresko renders every CTA and
// icon button through MUI Button/IconButton with the ripple left on (the theme
// only disables it for Switch), so a press grows a currentColor disc from the
// pointer and a keyboard focus pulsates one in the centre.
//
// Geometry, timings and classes follow @mui/material/ButtonBase/TouchRipple.

const DURATION_MS = 550;
const DELAY_RIPPLE_MS = 80;

function rippleRoot(host: HTMLElement): HTMLElement {
  let root = host.querySelector<HTMLElement>(":scope > .touch-ripple");
  if (!root) {
    root = document.createElement("span");
    root.className = "touch-ripple";
    root.setAttribute("aria-hidden", "true");
    host.appendChild(root);
  }
  return root;
}

interface Ripple {
  el: HTMLElement;
  child: HTMLElement;
}

function spawn(
  host: HTMLElement,
  opts: { center: boolean; pulsate: boolean; clientX?: number; clientY?: number },
): Ripple {
  const root = rippleRoot(host);
  const rect = host.getBoundingClientRect();
  let x: number;
  let y: number;
  if (opts.center || opts.clientX === undefined || opts.clientY === undefined) {
    x = Math.round(rect.width / 2);
    y = Math.round(rect.height / 2);
  } else {
    x = Math.round(opts.clientX - rect.left);
    y = Math.round(opts.clientY - rect.top);
  }
  let size: number;
  if (opts.center) {
    size = Math.sqrt((2 * rect.width ** 2 + rect.height ** 2) / 3);
    if (size % 2 === 0) size += 1;
  } else {
    const sizeX = Math.max(Math.abs(root.clientWidth - x), x) * 2 + 2;
    const sizeY = Math.max(Math.abs(root.clientHeight - y), y) * 2 + 2;
    size = Math.sqrt(sizeX ** 2 + sizeY ** 2);
  }
  const el = document.createElement("span");
  el.className = `touch-ripple__ripple is-visible${opts.pulsate ? " is-pulsate" : ""}`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.top = `${-(size / 2) + y}px`;
  el.style.left = `${-(size / 2) + x}px`;
  const child = document.createElement("span");
  child.className = `touch-ripple__child${opts.pulsate ? " is-pulsate" : ""}`;
  el.appendChild(child);
  root.appendChild(el);
  return { el, child };
}

function release(r: Ripple | null) {
  if (!r) return;
  r.child.classList.add("is-leaving");
  window.setTimeout(() => r.el.remove(), DURATION_MS);
}

/** Wires the ripple on a button-like host. `center` = IconButton's centerRipple. */
export function attachTouchRipple(host: HTMLElement, { center = false } = {}): () => void {
  let active: Ripple | null = null;
  let focusRipple: Ripple | null = null;
  let touchTimer = 0;

  const start = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent && e.button !== 0) return;
    const point = e instanceof MouseEvent ? e : e.touches[0];
    const make = () => {
      release(active);
      active = spawn(host, {
        center,
        pulsate: false,
        ...(point ? { clientX: point.clientX, clientY: point.clientY } : {}),
      });
    };
    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent) {
      // A touch may become a scroll: wait a beat before showing (MUI DELAY_RIPPLE).
      touchTimer = window.setTimeout(make, DELAY_RIPPLE_MS);
    } else make();
  };
  const stop = () => {
    window.clearTimeout(touchTimer);
    release(active);
    active = null;
  };
  const onFocus = () => {
    let keyboard = false;
    try {
      keyboard = host.matches(":focus-visible");
    } catch {
      keyboard = false;
    }
    if (!keyboard || focusRipple) return;
    focusRipple = spawn(host, { center: true, pulsate: true });
  };
  const onBlur = () => {
    release(focusRipple);
    focusRipple = null;
    stop();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || (e.key !== " " && e.key !== "Enter") || !focusRipple) return;
    release(focusRipple);
    focusRipple = null;
    active = spawn(host, { center: true, pulsate: false });
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    stop();
    onFocus();
  };

  host.addEventListener("mousedown", start);
  host.addEventListener("touchstart", start, { passive: true });
  for (const ev of ["mouseup", "mouseleave", "touchend", "touchmove", "dragleave", "contextmenu"])
    host.addEventListener(ev, stop);
  host.addEventListener("focus", onFocus);
  host.addEventListener("blur", onBlur);
  host.addEventListener("keydown", onKeyDown);
  host.addEventListener("keyup", onKeyUp);
  return () => {
    host.removeEventListener("mousedown", start);
    host.removeEventListener("touchstart", start);
    for (const ev of ["mouseup", "mouseleave", "touchend", "touchmove", "dragleave", "contextmenu"])
      host.removeEventListener(ev, stop);
    host.removeEventListener("focus", onFocus);
    host.removeEventListener("blur", onBlur);
    host.removeEventListener("keydown", onKeyDown);
    host.removeEventListener("keyup", onKeyUp);
  };
}
