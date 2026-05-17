/**
 * useDemoMode.ts
 *
 * Global Demo Mode toggle. When ON (default), Riset components render from the
 * pre-loaded fixtures in `src/data/risetData.ts` — guarantees a stable demo
 * experience offline. When OFF, components call live services (currently the
 * `web-search` edge function).
 *
 * Persists in localStorage under `galen-demo-mode`. Uses useSyncExternalStore
 * so every subscribed component re-renders when the toggle flips, no Context.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "galen-demo-mode";
const DEFAULT_VALUE = true; // Default ON so existing demos / first-load UX is unchanged

type Listener = () => void;
const listeners = new Set<Listener>();

function readFromStorage(): boolean {
  if (typeof window === "undefined") return DEFAULT_VALUE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_VALUE;
    return raw === "true";
  } catch {
    return DEFAULT_VALUE;
  }
}

function writeToStorage(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  } catch {
    // ignore — quota / disabled
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  return readFromStorage();
}

function getServerSnapshot(): boolean {
  return DEFAULT_VALUE;
}

function notify(): void {
  listeners.forEach((l) => l());
}

export function setDemoMode(value: boolean): void {
  writeToStorage(value);
  notify();
}

export function toggleDemoMode(): void {
  setDemoMode(!readFromStorage());
}

export function useDemoMode(): {
  isDemoMode: boolean;
  setDemoMode: (v: boolean) => void;
  toggle: () => void;
} {
  const isDemoMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isDemoMode, setDemoMode, toggle: toggleDemoMode };
}
