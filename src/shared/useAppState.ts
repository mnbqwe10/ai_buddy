import { useEffect, useState } from "react";
import type { AppState, UserSettings } from "../domain/model";
import { ensureAppState, getAppState, saveAppState, updateSettings } from "./storage";

export interface AppStateView {
  state: AppState | null;
  isLoading: boolean;
  setSettings: (patch: Partial<UserSettings>) => Promise<void>;
  replaceState: (nextState: AppState) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAppState(): AppStateView {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    const next = await getAppState();
    setState(next);
    setIsLoading(false);
  }

  async function setSettings(patch: Partial<UserSettings>) {
    const next = await updateSettings(patch);
    setState(next);
  }

  async function replaceState(nextState: AppState) {
    await saveAppState(nextState);
    setState(nextState);
  }

  useEffect(() => {
    ensureAppState().then((next) => {
      setState(next);
      setIsLoading(false);
    });
  }, []);

  return { state, isLoading, setSettings, replaceState, refresh };
}
