import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const WEEKLY_EMERGENCIES = 3;

export type State = {
  onboarded: boolean;
  locked: boolean;
  lockedAt: number | null;
  apps: string[]; // Android package names (iOS keeps its selection natively)
  appCount: number;
  emergency: { week: string; used: number };
};

const initial: State = {
  onboarded: false,
  locked: false,
  lockedAt: null,
  apps: [],
  appCount: 0,
  emergency: { week: '', used: 0 },
};

/** Monday (local) of the current week, e.g. "2026-09-21". */
export function weekStart(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${m.getFullYear()}-${m.getMonth() + 1}-${m.getDate()}`;
}

export const emergenciesLeft = (s: State) =>
  s.emergency.week === weekStart() ? WEEKLY_EMERGENCIES - s.emergency.used : WEEKLY_EMERGENCIES;

export function nextReset(d = new Date()) {
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 - ((d.getDay() + 6) % 7));
  return n.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

const KEY = 'timeout-state';

export function useStore() {
  const [s, setS] = useState<State | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setS({ ...initial, ...(v ? JSON.parse(v) : {}) }));
  }, []);
  const set = (patch: Partial<State>) =>
    setS((prev) => {
      const next = { ...prev!, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  return [s, set] as const;
}
