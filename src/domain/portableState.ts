import type { AppState } from "./model";
import { normalizeAppState } from "./state";

export interface PortableAppState {
  app: "AI Buddy";
  kind: "app-state-export";
  version: 1;
  exportedAt: string;
  state: AppState;
}

export function createPortableAppState(state: AppState, exportedAt = new Date().toISOString()): PortableAppState {
  return {
    app: "AI Buddy",
    kind: "app-state-export",
    version: 1,
    exportedAt,
    state: normalizeAppState(state),
  };
}

export function serializePortableAppState(state: AppState) {
  return JSON.stringify(createPortableAppState(state), null, 2);
}

export function parsePortableAppState(jsonText: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Import file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Import file does not contain AI Buddy settings.");
  }

  const candidate = parsed as Partial<PortableAppState> & { state?: unknown };
  if (candidate.kind !== "app-state-export" || candidate.app !== "AI Buddy" || !candidate.state) {
    throw new Error("Import file is not an AI Buddy settings export.");
  }

  return normalizeAppState(candidate.state as Partial<AppState>);
}
