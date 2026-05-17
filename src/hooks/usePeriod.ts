/**
 * usePeriod.ts
 *
 * Global scraping/research period selection. Persisted in localStorage so the
 * choice made in MulaiSesi (research creation) propagates to BriefingDetail and
 * any future Live-mode view.
 *
 * Period options are inclusive lookback windows ending "now". The edge function
 * uses the selected window to constrain the web search ("kembalikan hanya artikel
 * dalam N hari terakhir"), and the FE uses it to:
 *   - label the timeline ("Volume percakapan 30 hari terakhir")
 *   - bucket citation dates (daily for 7d, weekly for 30d, etc.)
 */

import { useSyncExternalStore } from "react";

export type PeriodKey = "7d" | "30d" | "90d" | "12m";

export interface PeriodOption {
  key: PeriodKey;
  label: string; // user-facing
  shortLabel: string; // for tight chips
  days: number; // exact lookback in days (used by edge function + adapter)
  bucket: "daily" | "weekly" | "monthly";
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "7d", label: "7 hari terakhir", shortLabel: "7 hari", days: 7, bucket: "daily" },
  { key: "30d", label: "30 hari terakhir", shortLabel: "30 hari", days: 30, bucket: "weekly" },
  { key: "90d", label: "90 hari terakhir", shortLabel: "3 bulan", days: 90, bucket: "weekly" },
  { key: "12m", label: "12 bulan terakhir", shortLabel: "12 bulan", days: 365, bucket: "monthly" },
];

const STORAGE_KEY = "galen-research-period";
const DEFAULT_KEY: PeriodKey = "30d";

const listeners = new Set<() => void>();

function readFromStorage(): PeriodKey {
  if (typeof window === "undefined") return DEFAULT_KEY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KEY;
    return PERIOD_OPTIONS.some((p) => p.key === raw) ? (raw as PeriodKey) : DEFAULT_KEY;
  } catch {
    return DEFAULT_KEY;
  }
}

function writeToStorage(key: PeriodKey): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // quota / disabled — silent
  }
}

function subscribe(listener: () => void): () => void {
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

function notify(): void {
  listeners.forEach((l) => l());
}

export function setPeriod(key: PeriodKey): void {
  writeToStorage(key);
  notify();
}

export function getPeriodOption(key: PeriodKey): PeriodOption {
  return PERIOD_OPTIONS.find((p) => p.key === key) ?? PERIOD_OPTIONS[1];
}

export function usePeriod(): {
  period: PeriodOption;
  periodKey: PeriodKey;
  setPeriod: (key: PeriodKey) => void;
  options: PeriodOption[];
} {
  const key = useSyncExternalStore(subscribe, readFromStorage, () => DEFAULT_KEY);
  return {
    period: getPeriodOption(key),
    periodKey: key,
    setPeriod,
    options: PERIOD_OPTIONS,
  };
}
