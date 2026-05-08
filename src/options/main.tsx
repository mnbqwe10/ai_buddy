import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createCustomPromptAction, deleteAction, getActionUsage, updateAction } from "../domain/actions";
import { getFallbackActionIcon, type ActionIconDefinition } from "../domain/icons";
import { responseLanguageOptions, translationLanguageOptions } from "../domain/languages";
import type { Action, ActionButtonStyle, Scenario } from "../domain/model";
import { appLogoPath, appName } from "../shared/app";
import { resetEverything, restoreMissingDefaults } from "../domain/state";
import { createBlankScenario, deleteScenario, updateScenario } from "../domain/scenarios";
import { useAppState } from "../shared/useAppState";
import { getTablerIcon, tablerIconCatalog } from "./iconCatalog";
import "./styles.css";

type ScenarioDraft = Pick<Scenario, "id" | "name" | "color" | "actionIds">;

interface ActionDraft {
  id: string;
  name: string;
  icon: string;
  iconSvg?: string;
  color: string;
  instruction: string;
  translationTargetLanguage?: string;
}

function scenarioToDraft(scenario: Scenario): ScenarioDraft {
  return {
    id: scenario.id,
    name: scenario.name,
    color: scenario.color,
    actionIds: [...scenario.actionIds],
  };
}

function actionToDraft(action: Action): ActionDraft {
  return {
    id: action.id,
    name: action.name,
    icon: action.icon,
    iconSvg: action.iconSvg,
    color: action.color,
    instruction: action.instruction ?? "",
    translationTargetLanguage: action.config?.translationTargetLanguage,
  };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function getActionIcon(iconId: string, iconSvg?: string): ActionIconDefinition | undefined {
  if (iconSvg) {
    return {
      id: iconId,
      name: getTablerIcon(iconId)?.name ?? getFallbackActionIcon(iconId)?.name ?? iconId,
      keywords: [],
      svg: iconSvg,
    };
  }

  return getTablerIcon(iconId) ?? getFallbackActionIcon(iconId);
}

function IconPreview({ iconId, iconSvg }: { iconId: string; iconSvg?: string }) {
  const icon = getActionIcon(iconId, iconSvg);

  if (!icon?.svg) {
    return <span className="action-icon-fallback">{iconId.slice(0, 2)}</span>;
  }

  return (
    <svg
      aria-hidden="true"
      className="action-icon-svg"
      viewBox="0 0 24 24"
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}

function IconPicker({
  value,
  valueSvg,
  onChange,
}: {
  value: string;
  valueSvg?: string;
  onChange: (icon: ActionIconDefinition) => void;
}) {
  const [query, setQuery] = useState(getActionIcon(value, valueSvg)?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(getActionIcon(value, valueSvg)?.name ?? "");
  }, [value, valueSvg]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingIcons = tablerIconCatalog.filter((icon) => {
    if (!normalizedQuery) {
      return true;
    }

    return [icon.name, icon.id, ...icon.keywords].some((term) =>
      term.toLowerCase().includes(normalizedQuery),
    );
  });
  const filteredIcons = matchingIcons.slice(0, 240);

  function selectIcon(icon: ActionIconDefinition) {
    onChange(icon);
    setQuery(icon.name);
    setIsOpen(false);
  }

  return (
    <div className="icon-picker">
      <div className="icon-picker-control">
        <span className="icon-picker-current">
          <IconPreview iconId={value} iconSvg={valueSvg} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && filteredIcons[0]) {
              event.preventDefault();
              selectIcon(filteredIcons[0]);
            }
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder="Search icons"
        />
        <button
          type="button"
          className="secondary-button icon-picker-browse"
          onClick={() => setIsOpen(true)}
        >
          Browse
        </button>
      </div>
      {isOpen && (
        <div className="icon-browser-backdrop" onMouseDown={() => setIsOpen(false)}>
          <section
            aria-label="Choose an icon"
            aria-modal="true"
            className="icon-browser-panel"
            role="dialog"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="icon-browser-header">
              <div>
                <h3>Choose Icon</h3>
                <p>{matchingIcons.length} matching icons</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close icon browser"
                onClick={() => setIsOpen(false)}
              >
                x
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredIcons[0]) {
                  event.preventDefault();
                  selectIcon(filteredIcons[0]);
                }
              }}
              placeholder="Search by icon name or keyword"
            />
            <div className="icon-grid">
              {filteredIcons.length === 0 && (
                <div className="icon-picker-empty">No matching icons</div>
              )}
              {filteredIcons.map((icon) => (
                <button
                  type="button"
                  className={`icon-grid-option ${icon.id === value ? "is-selected" : ""}`}
                  key={icon.id}
                  onClick={() => selectIcon(icon)}
                >
                  <IconPreview iconId={icon.id} iconSvg={icon.svg} />
                  <span>{icon.name}</span>
                </button>
              ))}
            </div>
            {matchingIcons.length > filteredIcons.length && (
              <p className="icon-browser-count">
                Showing first {filteredIcons.length}. Type more letters to narrow the results.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ActionButtonPreview({
  action,
  buttonStyle,
}: {
  action: Pick<Action, "name" | "icon" | "iconSvg" | "color">;
  buttonStyle: ActionButtonStyle;
}) {
  return (
    <span
      className={`action-button-preview ${buttonStyle === "iconOnly" ? "is-icon-only" : ""}`}
      style={{ backgroundColor: action.color }}
      title={action.name}
    >
      <IconPreview iconId={action.icon} iconSvg={action.iconSvg} />
      {buttonStyle !== "iconOnly" && <span>{action.name}</span>}
    </span>
  );
}

function PromptTemplateHelp({ action }: { action: Action }) {
  const placeholders = [
    { token: "{{selected_text}}", description: "selected browser text" },
    { token: "{{page_title}}", description: "current page title" },
  ];

  if (action.type === "inputPrompt") {
    placeholders.push({ token: "{{user_input}}", description: "question typed after clicking the action" });
  }

  if (action.config?.translationTargetLanguage !== undefined) {
    placeholders.push({ token: "{{target_language}}", description: "translation target language" });
  }

  return (
    <div className="template-help">
      <span>Available placeholders:</span>
      {placeholders.map((placeholder) => (
        <span key={placeholder.token}>
          <code>{placeholder.token}</code> {placeholder.description}
        </span>
      ))}
      <span>Page URL is not included.</span>
    </div>
  );
}

function OptionsApp() {
  const { state, isLoading, setSettings, replaceState } = useAppState();
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [selectedActionId, setSelectedActionId] = useState("");
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);

  const activeScenario = state?.scenarios.find(
    (scenario) => scenario.id === state.settings.activeScenarioId,
  );
  const selectedScenario =
    state?.scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    activeScenario ??
    state?.scenarios[0];
  const selectedAction =
    state?.actions.find((action) => action.id === selectedActionId) ?? state?.actions[0];
  const actionsById = new Map((state?.actions ?? []).map((action) => [action.id, action]));

  useEffect(() => {
    if (!state) {
      return;
    }

    if (!selectedScenarioId || !state.scenarios.some((scenario) => scenario.id === selectedScenarioId)) {
      setSelectedScenarioId(activeScenario?.id ?? state.scenarios[0]?.id ?? "");
    }
  }, [activeScenario?.id, selectedScenarioId, state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    if (!selectedActionId || !state.actions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(state.actions[0]?.id ?? "");
    }
  }, [selectedActionId, state]);

  useEffect(() => {
    setScenarioDraft(selectedScenario ? scenarioToDraft(selectedScenario) : null);
  }, [
    selectedScenario?.id,
    selectedScenario?.name,
    selectedScenario?.color,
    selectedScenario?.actionIds.join("|"),
  ]);

  useEffect(() => {
    setActionDraft(selectedAction ? actionToDraft(selectedAction) : null);
  }, [
    selectedAction?.id,
    selectedAction?.name,
    selectedAction?.icon,
    selectedAction?.iconSvg,
    selectedAction?.color,
    selectedAction?.instruction,
    selectedAction?.config?.translationTargetLanguage,
  ]);

  if (isLoading || !state) {
    return <main className="options-shell">Loading...</main>;
  }

  async function restoreDefaults() {
    await replaceState(restoreMissingDefaults(state!));
  }

  async function resetDefaults() {
    if (window.confirm("Reset all Scenarios, Actions, and settings to starter defaults?")) {
      await replaceState(resetEverything());
      setSelectedScenarioId("");
      setSelectedActionId("");
    }
  }

  async function createScenario() {
    const nextState = createBlankScenario(state!);
    await replaceState(nextState);
    setSelectedScenarioId(nextState.settings.activeScenarioId);
  }

  async function deleteSelectedScenario() {
    if (!selectedScenario || !window.confirm(`Delete ${selectedScenario.name}?`)) {
      return;
    }

    const currentIndex = state!.scenarios.findIndex((scenario) => scenario.id === selectedScenario.id);
    const nextState = deleteScenario(state!, selectedScenario.id);
    await replaceState(nextState);
    setSelectedScenarioId(
      nextState.scenarios[Math.min(currentIndex, nextState.scenarios.length - 1)]?.id ??
        nextState.settings.activeScenarioId,
    );
  }

  async function saveScenarioDraft() {
    if (!selectedScenario || !scenarioDraft) {
      return;
    }

    await replaceState(
      updateScenario(state!, selectedScenario.id, {
        name: scenarioDraft.name.trim() || "Untitled Scenario",
        color: scenarioDraft.color,
        actionIds: scenarioDraft.actionIds,
      }),
    );
  }

  function moveDraftScenarioAction(actionId: string, direction: -1 | 1) {
    setScenarioDraft((draft) => {
      if (!draft) {
        return draft;
      }

      const index = draft.actionIds.indexOf(actionId);
      return {
        ...draft,
        actionIds: moveItem(draft.actionIds, index, direction),
      };
    });
  }

  function removeDraftScenarioAction(actionId: string) {
    setScenarioDraft((draft) =>
      draft
        ? {
            ...draft,
            actionIds: draft.actionIds.filter((id) => id !== actionId),
          }
        : draft,
    );
  }

  function addDraftScenarioAction(actionId: string) {
    setScenarioDraft((draft) => {
      if (!draft || !actionId || draft.actionIds.includes(actionId)) {
        return draft;
      }

      return {
        ...draft,
        actionIds: [...draft.actionIds, actionId],
      };
    });
  }

  async function createAction() {
    const previousActionCount = state!.actions.length;
    const defaultIcon = getTablerIcon("wand");
    const nextState = createCustomPromptAction(state!, {
      name: "New Action",
      icon: defaultIcon?.id,
      iconSvg: defaultIcon?.svg,
      instruction:
        "Describe what this Action should do with the selected text.\n\nSelected text:\n\"{{selected_text}}\"",
    });
    await replaceState(nextState);
    if (nextState.actions.length > previousActionCount) {
      setSelectedActionId(nextState.actions.at(-1)?.id ?? "");
    }
  }

  async function removeSelectedAction() {
    if (!selectedAction) {
      return;
    }

    const usage = getActionUsage(state!, selectedAction.id);
    const usageText = usage.length > 0
      ? ` This Action is used by ${usage.map((scenario) => scenario.name).join(", ")}.`
      : "";
    if (!window.confirm(`Delete ${selectedAction.name}?${usageText}`)) {
      return;
    }

    const currentIndex = state!.actions.findIndex((action) => action.id === selectedAction.id);
    const nextState = deleteAction(state!, selectedAction.id);
    await replaceState(nextState);
    setSelectedActionId(nextState.actions[Math.min(currentIndex, nextState.actions.length - 1)]?.id ?? "");
  }

  async function saveActionDraft() {
    if (!selectedAction || !actionDraft) {
      return;
    }

    await replaceState(
      updateAction(state!, selectedAction.id, {
        name: actionDraft.name.trim() || "Untitled Action",
        icon: actionDraft.icon,
        iconSvg: actionDraft.iconSvg,
        color: actionDraft.color,
        instruction: selectedAction.type === "local" ? selectedAction.instruction : actionDraft.instruction,
        config:
          actionDraft.translationTargetLanguage !== undefined
            ? { translationTargetLanguage: actionDraft.translationTargetLanguage }
            : undefined,
      }),
    );
  }

  return (
    <main className="options-shell">
      <header className="page-header">
        <div className="options-brand">
          <img src={appLogoPath} alt="" />
          <div>
            <p className="eyebrow">{appName}</p>
            <h1>Options</h1>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" onClick={restoreDefaults}>
            Restore missing defaults
          </button>
          <button type="button" className="secondary-button" onClick={resetDefaults}>
            Reset everything
          </button>
        </div>
      </header>

      <section className="panel">
        <h2>Preferences</h2>
        <div className="settings-grid">
          <label>
            Active Scenario
            <select
              value={state.settings.activeScenarioId}
              onChange={(event) => {
                setSelectedScenarioId(event.target.value);
                setSettings({ activeScenarioId: event.target.value });
              }}
            >
              {state.scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Active Chat Platform
            <select
              value={state.settings.activePlatformId}
              onChange={(event) => setSettings({ activePlatformId: event.target.value })}
            >
              {state.platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Response Language
            <select
              value={state.settings.responseLanguage}
              onChange={(event) => setSettings({ responseLanguage: event.target.value })}
            >
              {responseLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Button Text
            <select
              value={state.settings.actionButtonStyle}
              onChange={(event) =>
                setSettings({ actionButtonStyle: event.target.value as ActionButtonStyle })
              }
            >
              <option value="iconText">Icon + Text</option>
              <option value="iconOnly">Icon only</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>Scenarios</h2>
            <p>{state.scenarios.length} configured.</p>
          </div>
        </div>
        <div className="split-editor">
          <aside className="item-list-panel">
            <div className="item-list">
              {state.scenarios.map((scenario) => (
                <button
                  type="button"
                  className={`item-list-row ${selectedScenario?.id === scenario.id ? "is-selected" : ""}`}
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                >
                  <span className="list-color" style={{ backgroundColor: scenario.color }} />
                  <span>{scenario.name}</span>
                </button>
              ))}
            </div>
            <div className="list-actions">
              <button type="button" onClick={createScenario}>
                Add
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={!selectedScenario}
                onClick={deleteSelectedScenario}
              >
                Delete
              </button>
            </div>
          </aside>

          <article className="editor-pane">
            {scenarioDraft ? (
              <>
                <div className="editor-grid">
                  <label>
                    Name
                    <input
                      type="text"
                      value={scenarioDraft.name}
                      onChange={(event) =>
                        setScenarioDraft({ ...scenarioDraft, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={scenarioDraft.color}
                      onChange={(event) =>
                        setScenarioDraft({ ...scenarioDraft, color: event.target.value })
                      }
                    />
                  </label>
                </div>
                <small>{scenarioDraft.actionIds.length} Actions</small>
                <div className="scenario-action-list">
                  {scenarioDraft.actionIds.map((actionId, actionIndex) => {
                    const action = actionsById.get(actionId);
                    if (!action) {
                      return null;
                    }

                    return (
                      <div className="scenario-action-row" key={actionId}>
                        <ActionButtonPreview
                          action={action}
                          buttonStyle={state.settings.actionButtonStyle}
                        />
                        <div>
                          <button
                            type="button"
                            className="icon-button"
                            disabled={actionIndex === 0}
                            aria-label={`Move ${action.name} earlier`}
                            onClick={() => moveDraftScenarioAction(action.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            disabled={actionIndex === scenarioDraft.actionIds.length - 1}
                            aria-label={`Move ${action.name} later`}
                            onClick={() => moveDraftScenarioAction(action.id, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Remove ${action.name}`}
                            onClick={() => removeDraftScenarioAction(action.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <label>
                  Add Action
                  <select
                    value=""
                    onChange={(event) => {
                      addDraftScenarioAction(event.target.value);
                      event.target.value = "";
                    }}
                  >
                    <option value="">Choose an Action</option>
                    {state.actions
                      .filter((action) => !scenarioDraft.actionIds.includes(action.id))
                      .map((action) => (
                        <option key={action.id} value={action.id}>
                          {action.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="editor-footer">
                  <button type="button" onClick={saveScenarioDraft}>
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <p className="active-note">No Scenario selected.</p>
            )}
          </article>
        </div>
      </section>

      <section className="panel action-library-panel">
        <div className="panel-title-row">
          <div>
            <h2>Action Library</h2>
            <p>{state.actions.length} reusable Actions seeded.</p>
          </div>
        </div>
        <div className="split-editor">
          <aside className="item-list-panel">
            <div className="item-list">
              {state.actions.map((action) => (
                <button
                  type="button"
                  className={`item-list-row ${selectedAction?.id === action.id ? "is-selected" : ""}`}
                  key={action.id}
                  onClick={() => setSelectedActionId(action.id)}
                >
                  <span className="action-icon-preview" style={{ backgroundColor: action.color }}>
                    <IconPreview iconId={action.icon} iconSvg={action.iconSvg} />
                  </span>
                  <span>{action.name}</span>
                </button>
              ))}
            </div>
            <div className="list-actions">
              <button type="button" onClick={createAction}>
                Add
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={!selectedAction}
                onClick={removeSelectedAction}
              >
                Delete
              </button>
            </div>
          </aside>

          <article className="editor-pane">
            {selectedAction && actionDraft ? (
              <>
                <div className="editor-grid">
                  <label>
                    Name
                    <input
                      type="text"
                      value={actionDraft.name}
                      onChange={(event) =>
                        setActionDraft({ ...actionDraft, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Icon
                    <IconPicker
                      value={actionDraft.icon}
                      valueSvg={actionDraft.iconSvg}
                      onChange={(icon) =>
                        setActionDraft({ ...actionDraft, icon: icon.id, iconSvg: icon.svg })
                      }
                    />
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={actionDraft.color}
                      onChange={(event) =>
                        setActionDraft({ ...actionDraft, color: event.target.value })
                      }
                    />
                  </label>
                </div>
                {selectedAction.type !== "local" && (
                  <label className="template-editor">
                    Prompt Template
                    <PromptTemplateHelp action={selectedAction} />
                    <textarea
                      value={actionDraft.instruction}
                      onChange={(event) =>
                        setActionDraft({ ...actionDraft, instruction: event.target.value })
                      }
                    />
                  </label>
                )}
                {actionDraft.translationTargetLanguage !== undefined && (
                  <label>
                    Translation Target Language
                    <select
                      value={actionDraft.translationTargetLanguage}
                      onChange={(event) =>
                        setActionDraft({
                          ...actionDraft,
                          translationTargetLanguage: event.target.value,
                        })
                      }
                    >
                      {translationLanguageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {!translationLanguageOptions.some(
                        (option) => option.value === actionDraft.translationTargetLanguage,
                      ) && (
                        <option value={actionDraft.translationTargetLanguage}>
                          {actionDraft.translationTargetLanguage}
                        </option>
                      )}
                    </select>
                  </label>
                )}
                <div className="editor-footer">
                  <button type="button" onClick={saveActionDraft}>
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <p className="active-note">No Action selected.</p>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
