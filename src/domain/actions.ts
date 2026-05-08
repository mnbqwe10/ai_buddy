import type { Action, AppState } from "./model";
import { normalizeAppState } from "./state";

function uniqueActionId(base: string, existingIds: Set<string>) {
  const normalized = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "custom-action";

  let candidate = normalized;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${normalized}-${index++}`;
  }
  return candidate;
}

export function getActionUsage(state: AppState, actionId: string) {
  return state.scenarios.filter((scenario) => scenario.actionIds.includes(actionId));
}

export function createCustomPromptAction(
  state: AppState,
  input: { name: string; instruction: string; icon?: string; iconSvg?: string; color?: string },
): AppState {
  const existingIds = new Set(state.actions.map((action) => action.id));
  const name = input.name.trim() || "Custom Action";
  const action: Action = {
    id: uniqueActionId(name, existingIds),
    name,
    type: "prompt",
    icon: input.icon || "wand",
    iconSvg: input.iconSvg,
    color: input.color || "#2563EB",
    instruction:
      input.instruction.trim() ||
      "Use the selected text below to complete the requested action.\n\nSelected text:\n\"{{selected_text}}\"",
  };

  return normalizeAppState({
    ...state,
    actions: [...state.actions, action],
  });
}

export function updateAction(
  state: AppState,
  actionId: string,
  patch: Partial<Pick<Action, "name" | "icon" | "iconSvg" | "color" | "instruction" | "config">>,
): AppState {
  return normalizeAppState({
    ...state,
    actions: state.actions.map((action) =>
      action.id === actionId
        ? {
            ...action,
            ...patch,
            config: patch.config ? { ...action.config, ...patch.config } : action.config,
          }
        : action,
    ),
  });
}

export function duplicateTranslateAction(state: AppState, targetLanguage: string): AppState {
  const translate = state.actions.find((action) => action.id === "translate");
  if (!translate) {
    return state;
  }

  const language = targetLanguage.trim() || "English";
  const existingIds = new Set(state.actions.map((action) => action.id));
  const action: Action = {
    ...translate,
    id: uniqueActionId(`translate-to-${language}`, existingIds),
    name: `Translate to ${language}`,
    config: {
      ...translate.config,
      translationTargetLanguage: language,
    },
    isBuiltIn: false,
  };

  return normalizeAppState({
    ...state,
    actions: [...state.actions, action],
  });
}

export function deleteAction(state: AppState, actionId: string): AppState {
  return normalizeAppState({
    ...state,
    actions: state.actions.filter((action) => action.id !== actionId),
    scenarios: state.scenarios.map((scenario) => ({
      ...scenario,
      actionIds: scenario.actionIds.filter((id) => id !== actionId),
    })),
  });
}
