// Ported from fresko commandActions.ts (React hook → plain executor).
/**
 * The command registry and its one dispatch implementation.
 *
 * `CommandPalette.tsx` (⌘K) and `TopNavMegaDrawer.tsx` (the mega-nav's own
 * command search) are two surfaces over the same command set, and until this
 * file existed each carried its own copy of the filter, the `execute` switch
 * and the results-row hint text — so adding a `run.kind` meant remembering to
 * edit both, and nothing enforced it. `TopNavMegaDrawer.tsx` had already
 * drifted once (its `sys-nav-*` entries only ever reached one of the two
 * switches at a time in review). This is the shared implementation; both
 * files call into it rather than keeping their own.
 *
 * `COMMANDS` lives here now, not in `CommandPalette.tsx` — `TopNavMegaDrawer`
 * used to import it from there, which meant the registry's "real" home was
 * just whichever file got it first. Both files now import it from here.
 */

import { store, type NavBgMode } from "../../runtime/store";

/* ── heroBgModeStore (features/hero), inlined: the DEV-only HERO commands are
      its only writers on "/", and nothing on the home page reads it. ── */
export type HeroBgMode = "static" | "video";
const HERO_BG_MODES: readonly HeroBgMode[] = ["static", "video"];
const MODE_STORAGE_KEY = "phit:hero:bgMode";
function readHeroBgMode(): HeroBgMode {
  try {
    const stored = sessionStorage.getItem(MODE_STORAGE_KEY);
    if (stored && (HERO_BG_MODES as readonly string[]).includes(stored)) return stored as HeroBgMode;
  } catch {
    /* Safari private mode throws on access. The default is a fine answer. */
  }
  return "static";
}
let heroBgMode: HeroBgMode = readHeroBgMode();
export const getHeroBgMode = (): HeroBgMode => heroBgMode;
function setHeroBgMode(mode: HeroBgMode): void {
  if (heroBgMode === mode) return;
  heroBgMode = mode;
  try {
    sessionStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* Losing the memory is not worth losing the interaction over. */
  }
}

export const GROUP_ORDER = ["NAVIGATE", "ACTION", "HERO", "SYSTEM"] as const;
export type Group = (typeof GROUP_ORDER)[number];

/**
 * The navigation-only surface visitors get in production: NAVIGATE (site
 * routes) and ACTION (contact/copy-email helpers). Always present.
 */
const NAV_ACTION_COMMANDS = [
  {
    id: "nav-home",
    group: "NAVIGATE",
    label: "Home",
    keywords: "index landing start root",
    run: { kind: "nav", to: "/" },
  },
  {
    id: "nav-about",
    group: "NAVIGATE",
    label: "About",
    keywords: "firm team story who we are",
    run: { kind: "nav", to: "/about" },
  },
  {
    id: "nav-careers",
    group: "NAVIGATE",
    label: "Careers",
    keywords: "jobs hiring positions open roles",
    run: { kind: "nav", to: "/careers" },
  },
  {
    id: "nav-blog",
    group: "NAVIGATE",
    label: "Blog",
    keywords: "posts articles writing news",
    run: { kind: "nav", to: "/blog" },
  },
  {
    id: "nav-contact",
    group: "NAVIGATE",
    label: "Contact",
    keywords: "reach email talk address",
    run: { kind: "nav", to: "/contact" },
  },
  {
    id: "act-conversation",
    group: "ACTION",
    label: "Start a conversation",
    keywords: "contact talk hire enquiry inquiry",
    run: { kind: "nav", to: "/contact" },
  },
  {
    id: "act-careers",
    group: "ACTION",
    label: "Copy careers email",
    keywords: "jobs hiring recruiting jobs@phitopolis.com",
    run: { kind: "copy", address: "jobs@phitopolis.com" },
  },
  {
    id: "act-inquiries",
    group: "ACTION",
    label: "Copy general inquiries email",
    keywords: "info hello support info@phitopolis.com",
    run: { kind: "copy", address: "info@phitopolis.com" },
  },
] as const;

/**
 * The power-user-only surface: HERO's background-mode switch, SYSTEM's
 * navbar/motto/ID-overlay toggles and the "Signal check" easter egg — all of
 * them let a visitor alter the live site or trigger a gimmick, which is fine
 * for local development but not for production visitors.
 *
 * Declared behind a literal `import.meta.env.DEV` ternary (not a function
 * call) so Vite's `define` replaces it with the literal `false` in a
 * production build and esbuild's minifier folds the whole branch — including
 * every label/keyword string below — out of the bundle. `commandsFor()`
 * below is the *testable* version of this same split: it takes `isDev` as a
 * plain argument so tests can assert prod-mode filtering even though vitest
 * itself runs with `import.meta.env.DEV === true` (see vitest.config.ts).
 */
const DEV_ONLY_COMMANDS = import.meta.env.DEV
  ? ([
      {
        id: "hero-bg-static",
        group: "HERO",
        label: "Hero Background: Static",
        keywords: "hero background sky shader static day night cycle",
        run: { kind: "hero-bg-mode", mode: "static" },
      },
      {
        id: "hero-bg-video",
        group: "HERO",
        label: "Hero Background: Video",
        keywords: "hero background video night dawn film loop",
        run: { kind: "hero-bg-mode", mode: "video" },
      },
      {
        id: "sys-signal",
        group: "SYSTEM",
        label: "Signal check",
        keywords: "ping latency status desk easter",
        run: { kind: "signal" },
      },
      {
        id: "sys-nav-autohide",
        group: "SYSTEM",
        label: "Toggle Navigation Autohide",
        keywords: "navigation autohide navbar scroll hide show toggle",
        run: { kind: "toggle-autohide" },
      },
      {
        id: "sys-toggle-motto",
        group: "SYSTEM",
        label: "Toggle Logo Motto",
        keywords: "motto slogan tagline company header show hide toggle brand text",
        run: { kind: "toggle-motto" },
      },
      {
        id: "sys-nav-bg-glass",
        group: "SYSTEM",
        label: "Navbar Background: Glass",
        keywords: "navbar navigation background glass frosted blur bar surface",
        run: { kind: "nav-bg-mode", mode: "glass" },
      },
      {
        id: "sys-nav-bg-none",
        group: "SYSTEM",
        label: "Navbar Background: None",
        keywords: "navbar navigation background none transparent clear bar surface",
        run: { kind: "nav-bg-mode", mode: "none" },
      },
      {
        id: "sys-nav-bg-fade",
        group: "SYSTEM",
        label: "Navbar Background: Fade",
        keywords:
          "navbar navigation background fade progressive blur gradient dissolve bar surface",
        run: { kind: "nav-bg-mode", mode: "fade" },
      },
      {
        id: "sys-toggle-id-overlay",
        group: "SYSTEM",
        label: "Toggle ID Overlay",
        keywords: "id overlay developer outline tag inspect elements box layout toggle",
        run: { kind: "toggle-id-overlay" },
      },
    ] as const)
  : ([] as const);

const ALL_COMMANDS = [...NAV_ACTION_COMMANDS, ...DEV_ONLY_COMMANDS];

export type Cmd = (typeof NAV_ACTION_COMMANDS)[number] | (typeof DEV_ONLY_COMMANDS)[number];

/**
 * What the app actually mounts. In a production build this is exactly
 * `NAV_ACTION_COMMANDS` — `DEV_ONLY_COMMANDS` has already been folded to `[]`
 * at build time, so this array (and the strings inside it) never exist in
 * the runtime that ships.
 */
export const COMMANDS: readonly Cmd[] = ALL_COMMANDS;

export const SIGNAL_TEXT = import.meta.env.DEV
  ? ["> pinging desk… ", "> latency: 87µs", "> signal acquired ▲"].join("\n")
  : "";

const DEV_ONLY_COMMAND_IDS = new Set<string>([
  "hero-bg-static",
  "hero-bg-video",
  "sys-signal",
  "sys-nav-autohide",
  "sys-toggle-motto",
  "sys-nav-bg-glass",
  "sys-nav-bg-none",
  "sys-nav-bg-fade",
  "sys-toggle-id-overlay",
]);

/**
 * The testable half of the DEV/prod split: given an explicit `isDev` flag
 * (rather than reading `import.meta.env.DEV` itself), returns the command
 * pool that mode should see. Under vitest, `import.meta.env.DEV` is `true`
 * (see vitest.config.ts), so `COMMANDS` always contains the full set there —
 * this function is what lets a test assert "no SYSTEM/HERO/signal entries"
 * for `isDev: false` without needing a separate production build.
 */
export function commandsFor(isDev: boolean): Cmd[] {
  return isDev ? [...COMMANDS] : COMMANDS.filter((c) => !DEV_ONLY_COMMAND_IDS.has(c.id));
}

/**
 * The filtered, mode-aware command list. Defaults to the real build-time
 * flag; tests pass `isDev` explicitly.
 */
export function filterCommands(query: string, isDev: boolean = import.meta.env.DEV): Cmd[] {
  const pool = commandsFor(isDev);
  const q = query.trim().toLowerCase();
  return q ? pool.filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(q)) : pool;
}

/**
 * The right-hand hint column's text, and whether this row reflects the
 * *current* state (rendered as `● active`, in gold, by each caller).
 *
 * `active` is a separate concern from keyboard/mouse selection (`aria-selected`
 * in both callers) — a command can be the live hero mode without being the
 * row the arrow keys are currently on. Callers should mark it with
 * `aria-current="true"` rather than overloading `aria-selected`.
 */
export function commandHint(
  cmd: Cmd,
  ctx: { copied: boolean; heroBgMode: HeroBgMode; navBgMode: NavBgMode },
): { text: string; active: boolean } {
  if (ctx.copied) return { text: "copied ✓", active: false };
  switch (cmd.run.kind) {
    case "nav":
      return { text: cmd.run.to, active: false };
    case "copy":
      return { text: cmd.run.address, active: false };
    case "hero-bg-mode": {
      const active = ctx.heroBgMode === cmd.run.mode;
      return { text: active ? "● active" : "run", active };
    }
    case "nav-bg-mode": {
      const active = ctx.navBgMode === cmd.run.mode;
      return { text: active ? "● active" : "run", active };
    }
    default:
      return { text: "run", active: false };
  }
}

/**
 * The one `execute` implementation, and the runtime state its two special
 * commands need (the signal-check typewriter, the copy-to-clipboard toast).
 *
 * `navigate` is passed in rather than imported, since the two callers reach
 * the router through slightly different entry points (`useNavigate()`'s
 * returned function vs `useRouter().navigate`). `close` is a per-call argument
 * to `execute`, not a hook argument — the two callers also close differently
 * (`CommandPalette` resets its own query/index state alongside closing;
 * `TopNavMegaDrawer` just calls `onClose`), and each caller's own `close`
 * function commonly wants to call this hook's `resetRuntime` too, which would
 * be a circular dependency if `close` were baked in at the `useCommandExecutor`
 * call instead.
 */
export interface CommandRuntime {
  copiedId: string | null;
  /** null = signal check not run; otherwise chars of SIGNAL_TEXT revealed. */
  signalChars: number | null;
}

/**
 * Ported from the `useCommandExecutor` hook: same execute switch and runtime
 * state (copy toast 1600ms, signal typewriter at 28ms/char), reported through
 * `onChange` instead of React state. Navbar toggles write the vanilla store.
 */
export function createCommandExecutor(
  navigate: (opts: { to: string }) => void,
  onChange: (runtime: CommandRuntime) => void,
) {
  const runtime: CommandRuntime = { copiedId: null, signalChars: null };
  let copyTimer: number | null = null;
  let twTimer: number | null = null;
  const emit = () => onChange({ ...runtime });

  const stopTypewriter = () => {
    if (twTimer !== null) {
      window.clearInterval(twTimer);
      twTimer = null;
    }
  };

  /** Reset both special commands' state — call this alongside closing. */
  const resetRuntime = () => {
    runtime.signalChars = null;
    runtime.copiedId = null;
    stopTypewriter();
    emit();
  };

  const runSignal = () => {
    stopTypewriter();
    runtime.signalChars = 0;
    emit();
    twTimer = window.setInterval(() => {
      const next = Math.min((runtime.signalChars ?? 0) + 1, SIGNAL_TEXT.length);
      runtime.signalChars = next;
      if (next >= SIGNAL_TEXT.length) stopTypewriter();
      emit();
    }, 28);
  };

  const copyAddress = (id: string, address: string) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        runtime.copiedId = id;
        emit();
        if (copyTimer !== null) window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(() => {
          runtime.copiedId = null;
          emit();
        }, 1600);
      })
      .catch(() => {});
  };

  const execute = (cmd: Cmd, close: () => void) => {
    switch (cmd.run.kind) {
      case "nav":
        close();
        navigate({ to: cmd.run.to });
        break;
      case "copy":
        copyAddress(cmd.id, cmd.run.address);
        break;
      case "signal":
        runSignal();
        break;
      case "toggle-autohide":
        close();
        store.set({ autohideEnabled: !store.get().autohideEnabled });
        break;
      case "toggle-motto":
        close();
        store.set({ showMotto: !store.get().showMotto });
        break;
      case "toggle-id-overlay":
        close();
        window.dispatchEvent(new CustomEvent("phitopolis-toggle-id-overlay"));
        break;
      case "nav-bg-mode":
        close();
        store.set({ navBgMode: cmd.run.mode });
        break;
      case "hero-bg-mode":
        close();
        setHeroBgMode(cmd.run.mode as HeroBgMode);
        break;
    }
  };

  return { execute, resetRuntime, get runtime() { return { ...runtime }; } };
}
