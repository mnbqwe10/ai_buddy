import type { Action, UserSettings } from "./model";

export interface PromptContext {
  selectedText: string;
  pageTitle: string;
  userInput?: string;
}

export interface RenderedPrompt {
  actionId: string;
  actionName: string;
  promptText: string;
}

export const longSelectionCharacterLimit = 12_000;

export function isLongSelection(selectedText: string) {
  return selectedText.length > longSelectionCharacterLimit;
}

function responseLanguageInstruction(settings: UserSettings) {
  return settings.responseLanguage === "auto"
    ? ""
    : `Respond in ${settings.responseLanguage}.`;
}

function actionTemplate(action: Action) {
  return (
    action.instruction ??
    `Perform the ${action.name} action on the selected text.\n\nSelected text:\n"{{selected_text}}"`
  );
}

function expandPromptTemplate(action: Action, context: PromptContext) {
  const replacements: Record<string, string> = {
    selected_text: context.selectedText,
    page_title: context.pageTitle || "Untitled page",
    target_language: action.config?.translationTargetLanguage ?? "",
    user_input: context.userInput ?? "",
  };

  return actionTemplate(action).replace(/\{\{\s*(selected_text|page_title|target_language|user_input)\s*\}\}/g, (
    _match,
    key: string,
  ) => replacements[key] ?? "");
}

export function renderPrompt(
  action: Action,
  context: PromptContext,
  settings: UserSettings,
): RenderedPrompt {
  const promptText = [
    expandPromptTemplate(action, context).trim(),
    responseLanguageInstruction(settings),
  ]
    .filter((part) => part !== "")
    .join("\n\n");

  return {
    actionId: action.id,
    actionName: action.name,
    promptText,
  };
}
