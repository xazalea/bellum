/**
 * Kursor integration (lusaxweb/Kursor).
 *
 * Loaded at runtime from jsDelivr GitHub CDN for speed:
 * - https://cdn.jsdelivr.net/gh/lusaxweb/Kursor/dist/kursor.css
 * - https://cdn.jsdelivr.net/gh/lusaxweb/Kursor/dist/kursor.js
 */

declare global {
  interface Window {
    // Kursor exposes a global `kursor` constructor in the browser build.
    kursor?: new (opts: Record<string, unknown>) => unknown;
    __nachoKursorInstance?: unknown;
    __nachoKursorObserver?: MutationObserver;
  }
}

const KURSOR_CSS = "https://cdn.jsdelivr.net/gh/lusaxweb/Kursor/dist/kursor.css";
const KURSOR_JS = "https://cdn.jsdelivr.net/gh/lusaxweb/Kursor/dist/kursor.js";

function shouldEnableCustomCursor(): boolean {
  // Keep cursor fast by default on low-end devices / accessibility prefs.
  if (typeof window === "undefined") return false;
  try {
    const pref = window.localStorage?.getItem("nacho.cursor");
    if (pref === "native") return false;
    if (pref === "custom") {
      // Allow override, but still respect coarse pointer and reduced motion.
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return false;
      if (window.matchMedia?.("(pointer: coarse)")?.matches) return false;
      return true;
    }
  } catch {
    // ignore
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return false;
  const nav = navigator as any;
  const cores = typeof nav?.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 4;
  const mem = typeof nav?.deviceMemory === "number" ? nav.deviceMemory : 8;
  return cores >= 4 && mem >= 4;
}

function ensureStylesheet(href: string, id: string) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      // Best-effort: assume loaded/being loaded.
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load script"));
    document.head.appendChild(script);
  });
}

function markInteractive(root: ParentNode) {
  const nodes = root.querySelectorAll?.(
    "button, a, input, textarea, select, [role='button'], [data-kursor]"
  );
  nodes?.forEach((el) => {
    (el as HTMLElement).classList.add("k-hover1");
  });
}

export async function ensureKursor(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.__nachoKursorInstance) return;
  if (!shouldEnableCustomCursor()) return;

  ensureStylesheet(KURSOR_CSS, "nacho-kursor-css");
  await loadScript(KURSOR_JS, "nacho-kursor-js");

  if (!window.kursor) return;

  // Create cursor instance (type 1 is the default demo style).
  window.__nachoKursorInstance = new window.kursor({
    type: 1,
  });

  // Only hide the native cursor once we have a custom cursor instance.
  document.documentElement.classList.add("kursor-enabled");

  // Make interactive elements trigger hover visuals.
  markInteractive(document);
  if (!window.__nachoKursorObserver) {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) {
            markInteractive(n);
          }
        });
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.__nachoKursorObserver = obs;
  }
}

