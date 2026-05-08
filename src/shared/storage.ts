import { createDefaultAppState } from "../domain/defaults";
import type { AppState, UserSettings } from "../domain/model";
import { normalizeAppState, restoreMissingDefaults } from "../domain/state";

export const appStateKey = "aiBuddyAppState";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

function getLocalFallback(): AppState {
  return normalizeAppState(createDefaultAppState());
}

export async function getAppState(): Promise<AppState> {
  if (!hasChromeStorage()) {
    return getLocalFallback();
  }

  const data = await chrome.storage.local.get(appStateKey);
  const state = normalizeAppState(data[appStateKey] as Partial<AppState> | undefined);

  if (!data[appStateKey]) {
    await saveAppState(state);
  }

  return state;
}

export async function saveAppState(state: AppState): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({ [appStateKey]: normalizeAppState(state) });
}

export async function ensureAppState(): Promise<AppState> {
  const state = await getAppState();
  const restored = restoreMissingDefaults(state);
  await saveAppState(restored);
  return restored;
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<AppState> {
  const state = await getAppState();
  const next = normalizeAppState({
    ...state,
    settings: {
      ...state.settings,
      ...patch,
    },
  });
  await saveAppState(next);
  return next;
}
