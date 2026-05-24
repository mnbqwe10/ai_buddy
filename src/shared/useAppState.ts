import { useEffect, useState } from "react";
import type { AppState, UserSettings } from "../domain/model";
import { appStateKey, ensureAppState, getAppState, saveAppState, updateSettings } from "./storage";

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

  useEffect(() => {
    if (!chrome.storage?.onChanged) {
      return;
    }

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local" || !changes[appStateKey]?.newValue) {
        return;
      }

      setState(changes[appStateKey].newValue as AppState);
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return { state, isLoading, setSettings, replaceState, refresh };
}
