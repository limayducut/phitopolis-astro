// CommandPalette.tsx behaviour, ported (markup: components/chrome/CommandPalette.astro).
//
// ⌘K / Ctrl+K toggles (opening suppressed while an editable element has
// focus), Esc closes. Arrow/Home/End move the selection, Enter runs, hover
// selects, click runs. The MUI Modal's own behaviour is reproduced: backdrop
// click closes, focus is trapped inside and restored on close, body scroll is
// locked while open.

import {
  GROUP_ORDER,
  SIGNAL_TEXT,
  commandHint,
  createCommandExecutor,
  filterCommands,
  getHeroBgMode,
  type Cmd,
  type CommandRuntime,
} from "./commandActions";
import { store } from "../../runtime/store";

const optId = (id: string) => `cmdk-opt-${id}`;
const isEditableTarget = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

export function initCommandPalette(): void {
  const root = document.querySelector<HTMLElement>("[data-cmdk]");
  const dialog = root?.querySelector<HTMLElement>("[data-cmdk-dialog]");
  const input = root?.querySelector<HTMLInputElement>("[data-cmdk-input]");
  const list = root?.querySelector<HTMLElement>("[data-cmdk-list]");
  if (!root || !dialog || !input || !list) return;
  const signal = root.querySelector<HTMLElement>("[data-cmdk-signal]");
  const signalText = root.querySelector<HTMLElement>("[data-cmdk-signal-text]");
  const signalStatus = root.querySelector<HTMLElement>("[data-cmdk-signal-status]");

  let open = false;
  let query = "";
  let activeIndex = 0;
  let filtered: Cmd[] = filterCommands("");
  let runtime: CommandRuntime = { copiedId: null, signalChars: null };
  let restoreFocus: Element | null = null;
  let closeTimer = 0;
  let previousBodyOverflow = "";

  // Navigation in this home-only build: "/" is the page itself, every other route is "#".
  const navigate = ({ to }: { to: string }) => {
    if (to === "/") window.location.assign("/");
    else window.location.assign("#");
  };
  const executor = createCommandExecutor(navigate, (next) => {
    runtime = next;
    render();
  });

  const mono = (text: string, extra = "") => {
    const p = document.createElement("p");
    p.className = `cmdk__mono ${extra}`.trim();
    p.textContent = text;
    return p;
  };

  function render() {
    list!.replaceChildren();
    if (filtered.length === 0) {
      const li = mono("no match — 0 results", "cmdk__empty");
      const item = document.createElement("li");
      item.setAttribute("role", "presentation");
      item.className = "cmdk__mono cmdk__empty";
      item.textContent = li.textContent;
      list!.appendChild(item);
    }
    for (const group of GROUP_ORDER) {
      const rows = filtered.filter((c) => c.group === group);
      if (rows.length === 0) continue;
      const li = document.createElement("li");
      li.setAttribute("role", "group");
      li.setAttribute("aria-label", group);
      const label = mono(group, "cmdk__group-label");
      label.setAttribute("aria-hidden", "true");
      li.appendChild(label);
      const ul = document.createElement("ul");
      ul.className = "cmdk__rows";
      for (const cmd of rows) {
        const index = filtered.indexOf(cmd);
        const selected = index === activeIndex;
        const hint = commandHint(cmd, {
          copied: runtime.copiedId === cmd.id,
          heroBgMode: getHeroBgMode(),
          navBgMode: store.get().navBgMode,
        });
        const row = document.createElement("li");
        row.className = "cmdk__row";
        row.id = optId(cmd.id);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", String(selected));
        if (hint.active) row.setAttribute("aria-current", "true");
        const name = document.createElement("p");
        name.className = "cmdk__row-label";
        name.textContent = cmd.label;
        const h = document.createElement("span");
        h.className = "cmdk__mono cmdk__hint";
        h.textContent = hint.text;
        if (hint.active) h.dataset.active = "";
        if (runtime.copiedId === cmd.id) h.dataset.copied = "";
        row.append(name, h);
        row.addEventListener("mousedown", (e) => e.preventDefault());
        row.addEventListener("click", () => executor.execute(cmd, close));
        row.addEventListener("mousemove", () => {
          if (activeIndex !== index) {
            activeIndex = index;
            render();
          }
        });
        ul.appendChild(row);
      }
      li.appendChild(ul);
      list!.appendChild(li);
    }

    const active = filtered[activeIndex];
    if (active) input!.setAttribute("aria-activedescendant", optId(active.id));
    else input!.removeAttribute("aria-activedescendant");
    if (open && active) document.getElementById(optId(active.id))?.scrollIntoView({ block: "nearest" });

    if (signal && signalText && signalStatus) {
      signal.hidden = runtime.signalChars === null;
      if (runtime.signalChars !== null) {
        signalText.textContent = SIGNAL_TEXT.slice(0, runtime.signalChars);
        signalStatus.textContent = runtime.signalChars >= SIGNAL_TEXT.length ? SIGNAL_TEXT : "";
      }
    }
  }

  function show() {
    if (open) return;
    open = true;
    window.clearTimeout(closeTimer);
    restoreFocus = document.activeElement;
    root!.hidden = false;
    root!.dataset.state = "closed";
    // Restart the dialog's cmdkIn keyframes on every open.
    dialog!.style.animation = "none";
    void dialog!.offsetWidth;
    dialog!.style.animation = "";
    root!.dataset.state = "open";
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    filtered = filterCommands(query);
    render();
    input!.focus();
  }

  function close() {
    if (!open) return;
    open = false;
    query = "";
    input!.value = "";
    activeIndex = 0;
    filtered = filterCommands("");
    executor.resetRuntime();
    document.body.style.overflow = previousBodyOverflow;
    root!.dataset.state = "closing";
    closeTimer = window.setTimeout(() => {
      root!.hidden = true;
    }, 195);
    if (restoreFocus instanceof HTMLElement) restoreFocus.focus();
  }

  // Global hotkeys.
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      if (!open && isEditableTarget(e.target)) return;
      e.preventDefault();
      if (open) close();
      else show();
    } else if (e.key === "Escape" && open) {
      close();
    } else if (e.key === "Tab" && open) {
      // MUI Modal focus trap: keep focus inside the dialog.
      const focusables = [...dialog!.querySelectorAll<HTMLElement>("input, [tabindex='-1']")];
      if (!dialog!.contains(document.activeElement)) {
        e.preventDefault();
        (focusables[0] ?? dialog!).focus();
      } else if (focusables.length <= 1) {
        e.preventDefault();
      }
    }
  });

  root.querySelector("[data-cmdk-backdrop]")?.addEventListener("click", close);
  input.addEventListener("input", () => {
    query = input.value;
    activeIndex = 0;
    filtered = filterCommands(query);
    render();
  });
  input.addEventListener("keydown", (e) => {
    const n = filtered.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = n ? (activeIndex + 1) % n : 0;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = n ? (activeIndex - 1 + n) % n : 0;
    } else if (e.key === "Home" && n) {
      e.preventDefault();
      activeIndex = 0;
    } else if (e.key === "End" && n) {
      e.preventDefault();
      activeIndex = n - 1;
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) executor.execute(cmd, close);
      return;
    } else return;
    render();
  });

  const chip = document.querySelector<HTMLButtonElement>("[data-cmdk-chip]");
  if (chip) {
    const isMac = /Mac|iPhone|iPad/i.test(navigator.platform);
    chip.textContent = isMac ? "⌘K" : "Ctrl K";
    chip.setAttribute("aria-label", `Open command palette (${isMac ? "Command" : "Control"} K)`);
    chip.addEventListener("click", show);
  }
}
