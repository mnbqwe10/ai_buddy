import type { Action, AppState } from "../domain/model";
import { transformActionIds } from "../domain/defaults";
import { getFallbackActionIcon } from "../domain/icons";
import { isLongSelection, longSelectionCharacterLimit, renderPrompt } from "../domain/prompt";
import { findSensitiveData, sensitiveDataWarningText } from "../domain/sensitiveData";
import { normalizeAppState } from "../domain/state";
import { getActiveScenario, getToolbarActions } from "../domain/toolbar";
import type { PromptAttachment, RuntimeMessage, ScreenshotCaptureRegion } from "../shared/messages";
import { appStateKey, getAppState, saveAppState } from "../shared/storage";
import {
  createContentScriptErrorHandler,
  handleExtensionContextUnhandledRejection,
} from "./extensionContext";
import { createInputPromptForm, focusInputPromptForm, setInputPromptFormVisible } from "./inputPromptForm";
import { annotateScreenshotAttachment } from "./screenshotAnnotation";
import { shouldPreventToolbarMouseDown, targetIsNativeToolbarControl } from "./toolbarEvents";

const rootId = "ai-buddy-toolbar-root";
const styleId = "ai-buddy-toolbar-style";
const screenshotOverlayId = "ai-buddy-screenshot-overlay";
const directActionLimit = 5;
const minimumVisibleActionCount = 0;
const screenshotActionId = "screenshot";
const minimumScreenshotRegionSize = 8;
const screenshotContextText = "See attached screenshot.";
const screenshotButtonColor = "#0D9488";

type PromptContextKind = "text" | "screenshot";

let appState: AppState | null = null;
let toolbarRoot: HTMLDivElement | null = null;
let lastSelectionText = "";
let lastSelectionRect: DOMRect | null = null;
let lastPromptAttachments: PromptAttachment[] = [];
let pendingScreenshotRegion: ScreenshotCaptureRegion | null = null;
let activeContextKind: PromptContextKind = "text";
let selectionUpdateTimer: number | null = null;
let isPointerSelecting = false;
let isToolbarInteracting = false;
let extensionContextIsInvalidated = false;
let activeInputPromptAction: Action | null = null;
let pendingScreenshotCancelHandler: ((event: KeyboardEvent) => void) | null = null;

function removeExistingToolbarDom() {
  document.getElementById(rootId)?.remove();
  document.getElementById(styleId)?.remove();
}

removeExistingToolbarDom();

function currentHostIsBlocked(state: AppState) {
  const host = window.location.hostname;
  return state.settings.blockedSites.some((site) => site === host || host.endsWith(`.${site}`));
}

function injectStyles() {
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    #${rootId} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      max-width: min(680px, calc(100vw - 16px));
      border: 1px solid #d8deea;
      border-left: 5px solid var(--ai-buddy-scenario-color, #2563eb);
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
      background: #ffffff;
      color: #172033;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
    }

    #${rootId}[data-visible="true"] {
      display: flex;
      flex-direction: column;
    }

    #${rootId} .ai-buddy-inner {
      display: flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      padding: 7px;
      overflow: visible;
    }

    #${rootId} select,
    #${rootId} button {
      min-height: 32px;
      border: 1px solid #d8deea;
      border-radius: 7px;
      padding: 0 9px;
      font: inherit;
      background: #ffffff;
      color: #172033;
    }

    #${rootId} .ai-buddy-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-color: var(--ai-buddy-action-color, #2563eb);
      background: var(--ai-buddy-action-color, #2563eb);
      color: #ffffff;
      font-weight: 700;
    }

    #${rootId} .ai-buddy-action-button:hover {
      filter: brightness(0.96);
    }

    #${rootId} .ai-buddy-action-button[data-style="iconOnly"] {
      width: 34px;
      padding: 0;
    }

    #${rootId} .ai-buddy-action-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.4em;
      font-weight: 800;
    }

    #${rootId} .ai-buddy-action-icon svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }

    #${rootId} select {
      max-width: 132px;
      border-color: var(--ai-buddy-scenario-color, #2563eb);
      color: var(--ai-buddy-scenario-color, #2563eb);
      font-weight: 700;
    }

    #${rootId} button {
      cursor: pointer;
      white-space: nowrap;
    }

    #${rootId} button:not(.ai-buddy-action-button):hover,
    #${rootId} select:hover {
      background: #f6f8fc;
    }

    #${rootId} .ai-buddy-more {
      position: relative;
    }

    #${rootId} .ai-buddy-menu {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      display: none;
      z-index: 1;
      min-width: 150px;
      max-width: min(240px, calc(100vw - 24px));
      border: 1px solid #d8deea;
      border-radius: 8px;
      padding: 6px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
      background: #ffffff;
    }

    #${rootId} .ai-buddy-more:focus-within .ai-buddy-menu,
    #${rootId} .ai-buddy-more:hover .ai-buddy-menu {
      display: grid;
      gap: 5px;
    }

    #${rootId} .ai-buddy-menu button {
      width: 100%;
      text-align: left;
    }

    #${rootId} .ai-buddy-input-panel {
      display: flex;
      width: 100%;
      box-sizing: border-box;
      padding: 0 7px 7px;
    }

    #${rootId} .ai-buddy-input-panel[hidden] {
      display: none;
    }

    #${rootId} .ai-buddy-input {
      width: 100%;
      min-width: min(320px, calc(100vw - 48px));
      min-height: 34px;
      box-sizing: border-box;
      border: 1px solid #d8deea;
      border-radius: 7px;
      padding: 0 10px;
      outline: none;
      background: #f8fafc;
      color: #172033;
      font: inherit;
    }

    #${rootId} .ai-buddy-input:focus {
      border-color: var(--ai-buddy-scenario-color, #2563eb);
      background: #ffffff;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--ai-buddy-scenario-color, #2563eb) 18%, transparent);
    }

    #${screenshotOverlayId} {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      cursor: crosshair;
      user-select: none;
      background: rgba(15, 23, 42, 0.18);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${screenshotOverlayId}[data-pending="true"] {
      pointer-events: none;
      cursor: default;
    }

    #${screenshotOverlayId} .ai-buddy-screenshot-region {
      position: fixed;
      display: none;
      box-sizing: border-box;
      border: 2px solid #0d9488;
      background: rgba(13, 148, 136, 0.14);
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.34);
      pointer-events: none;
    }

  `;
  document.documentElement.appendChild(style);
}

function maintainToolbarInteraction(durationMs: number) {
  isToolbarInteracting = true;
  window.setTimeout(() => {
    isToolbarInteracting = false;
  }, durationMs);
}

function ensureToolbarRoot() {
  if (toolbarRoot) {
    return toolbarRoot;
  }

  injectStyles();
  toolbarRoot = document.createElement("div");
  toolbarRoot.id = rootId;
  toolbarRoot.dataset.visible = "false";
  toolbarRoot.addEventListener("mousedown", (event) => {
    maintainToolbarInteraction(targetIsNativeToolbarControl(event.target) ? 800 : 120);

    if (shouldPreventToolbarMouseDown(event.target)) {
      event.preventDefault();
    }
  });
  document.documentElement.appendChild(toolbarRoot);
  return toolbarRoot;
}

function getSelectionInfo() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return {
    text: selection.toString().trim(),
    rect,
  };
}

function positionToolbar(root: HTMLDivElement, rect: DOMRect) {
  const toolbarRect = root.getBoundingClientRect();
  const below = rect.bottom + 8;
  const above = rect.top - toolbarRect.height - 8;
  const top =
    below + toolbarRect.height <= window.innerHeight - 8
      ? below
      : above >= 8
        ? above
        : Math.min(window.innerHeight - toolbarRect.height - 8, below);
  let left = rect.left + rect.width / 2 - toolbarRect.width / 2;

  left = Math.max(8, left);
  left = Math.min(window.innerWidth - toolbarRect.width - 8, left);

  root.style.top = `${Math.max(8, top)}px`;
  root.style.left = `${Math.max(8, left)}px`;
}

function hideToolbar() {
  if (toolbarRoot) {
    toolbarRoot.dataset.visible = "false";
    toolbarRoot.dataset.inputMode = "false";
  }
  if (activeContextKind === "screenshot") {
    removeScreenshotOverlay();
    pendingScreenshotRegion = null;
    lastPromptAttachments = [];
    lastSelectionText = "";
    lastSelectionRect = null;
    activeContextKind = "text";
  }
  activeInputPromptAction = null;
}

function clearPendingScreenshotCancelHandler() {
  if (pendingScreenshotCancelHandler) {
    document.removeEventListener("keydown", pendingScreenshotCancelHandler, true);
    pendingScreenshotCancelHandler = null;
  }
}

function removeScreenshotOverlay() {
  clearPendingScreenshotCancelHandler();
  document.getElementById(screenshotOverlayId)?.remove();
}

function destroyToolbar() {
  toolbarRoot?.remove();
  toolbarRoot = null;
  removeScreenshotOverlay();
  removeExistingToolbarDom();
}

function clearSelectionUpdateTimer() {
  if (selectionUpdateTimer !== null) {
    window.clearTimeout(selectionUpdateTimer);
    selectionUpdateTimer = null;
  }
}

function markExtensionContextInvalidated() {
  extensionContextIsInvalidated = true;
  appState = null;
  lastSelectionText = "";
  lastSelectionRect = null;
  lastPromptAttachments = [];
  pendingScreenshotRegion = null;
  activeContextKind = "text";
  clearSelectionUpdateTimer();
  destroyToolbar();
}

const handleContentScriptError = createContentScriptErrorHandler({
  onContextInvalidated: markExtensionContextInvalidated,
  onUnexpectedError: (error) => {
    console.error("[AI Buddy] Content script error", error);
  },
});

function scheduleToolbarForCurrentSelection(delayMs = 80) {
  if (extensionContextIsInvalidated) {
    return;
  }

  clearSelectionUpdateTimer();
  selectionUpdateTimer = window.setTimeout(() => {
    selectionUpdateTimer = null;
    void showToolbarForCurrentSelection().catch(handleContentScriptError);
  }, delayMs);
}

function eventTargetIsToolbar(target: EventTarget | null) {
  return Boolean(target instanceof Node && toolbarRoot?.contains(target));
}

function hideToolbarForPageScroll(event: Event) {
  if (eventTargetIsToolbar(event.target)) {
    return;
  }

  hideToolbar();
}

async function setActiveScenario(scenarioId: string) {
  if (!appState || extensionContextIsInvalidated) {
    return;
  }

  appState = normalizeAppState({
    ...appState,
    settings: {
      ...appState.settings,
      activeScenarioId: scenarioId,
    },
  });
  await saveAppState(appState);
  renderToolbar();
}

async function copySelection() {
  if (!lastSelectionText) {
    return;
  }

  await navigator.clipboard.writeText(lastSelectionText);
  hideToolbar();
}

function hideInputPrompt(options: { clear?: boolean } = {}) {
  if (!toolbarRoot) {
    return;
  }

  const form = toolbarRoot.querySelector<HTMLFormElement>(".ai-buddy-input-panel");
  if (form) {
    setInputPromptFormVisible(form, false, options);
  }
  toolbarRoot.dataset.inputMode = "false";
  activeInputPromptAction = null;

  if (lastSelectionRect) {
    positionToolbar(toolbarRoot, lastSelectionRect);
  }
}

function showInputPrompt(action: Action) {
  if (!toolbarRoot || (!lastSelectionText && lastPromptAttachments.length === 0)) {
    return;
  }

  const form = toolbarRoot.querySelector<HTMLFormElement>(".ai-buddy-input-panel");
  if (!form) {
    return;
  }

  activeInputPromptAction = action;
  toolbarRoot.dataset.inputMode = "true";
  setInputPromptFormVisible(form, true, { clear: true });

  if (lastSelectionRect) {
    positionToolbar(toolbarRoot, lastSelectionRect);
  }

  maintainToolbarInteraction(800);
  window.setTimeout(() => {
    focusInputPromptForm(form);
  }, 0);
}

function submitInputPrompt(userInput: string) {
  const action = activeInputPromptAction;
  if (!action) {
    return;
  }

  void sendPromptAction(action, userInput).catch((error: unknown) => {
    handleContentScriptError(error);
    window.alert(error instanceof Error ? error.message : "Unable to send prompt.");
  });
}

async function sendPromptAction(action: Action, userInput?: string) {
  if (extensionContextIsInvalidated) {
    hideToolbar();
    return;
  }

  if (!appState || (!lastSelectionText && lastPromptAttachments.length === 0)) {
    return;
  }

  if (activeContextKind === "text" && isLongSelection(lastSelectionText)) {
    const shouldContinue = window.confirm(
      `The selected text is longer than ${longSelectionCharacterLimit.toLocaleString()} characters. It may be slow or rejected by the Chat Platform. Continue?`,
    );
    if (!shouldContinue) {
      hideToolbar();
      return;
    }
  }

  const sensitiveFindings = findSensitiveData([lastSelectionText, userInput ?? ""].join("\n"));
  const sensitiveWarning = sensitiveDataWarningText(sensitiveFindings);
  if (sensitiveWarning && !window.confirm(sensitiveWarning)) {
    hideToolbar();
    return;
  }

  let attachments = lastPromptAttachments;
  if (activeContextKind === "screenshot" && pendingScreenshotRegion) {
    removeScreenshotOverlay();
    const screenshotAttachment = await requestScreenshotAttachment(pendingScreenshotRegion);
    attachments = [await annotateScreenshotAttachment(screenshotAttachment)];
  }

  const rendered = renderPrompt(
    action,
    {
      selectedText: lastSelectionText,
      pageTitle: document.title,
      userInput,
    },
    appState.settings,
  );

  const message: RuntimeMessage = {
    type: "prompt-action-request",
    prompt: {
      ...rendered,
      createdAt: Date.now(),
      ...(attachments.length > 0 ? { attachments } : {}),
    },
  };
  try {
    const sendResult = chrome.runtime.sendMessage(message) as Promise<unknown> | undefined;
    void sendResult?.catch?.(handleContentScriptError);
  } catch (error) {
    handleContentScriptError(error);
    return;
  }
  pendingScreenshotRegion = null;
  lastPromptAttachments = attachments;
  removeScreenshotOverlay();
  hideToolbar();
}

function normalizeViewportRect(startX: number, startY: number, endX: number, endY: number) {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const right = Math.max(startX, endX);
  const bottom = Math.max(startY, endY);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function screenshotRegionFromRect(rect: ReturnType<typeof normalizeViewportRect>): ScreenshotCaptureRegion {
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function isScreenshotCaptureResponse(response: unknown): response is { ok: true; attachment: PromptAttachment } {
  return Boolean(
    response &&
      typeof response === "object" &&
      "ok" in response &&
      response.ok === true &&
      "attachment" in response,
  );
}

async function requestScreenshotAttachment(region: ScreenshotCaptureRegion): Promise<PromptAttachment> {
  await waitForNextPaint();
  const response = await chrome.runtime.sendMessage({
    type: "capture-screenshot-region",
    region,
  } satisfies RuntimeMessage);

  if (isScreenshotCaptureResponse(response)) {
    return response.attachment;
  }

  const message =
    response && typeof response === "object" && "error" in response
      ? String(response.error)
      : "Unable to capture screenshot.";
  throw new Error(message);
}

function setPendingScreenshotContext(region: ScreenshotCaptureRegion, rect: ReturnType<typeof normalizeViewportRect>) {
  lastSelectionText = screenshotContextText;
  lastPromptAttachments = [];
  pendingScreenshotRegion = region;
  activeContextKind = "screenshot";
  lastSelectionRect = new DOMRect(rect.left, rect.top, rect.width, rect.height);
  clearPendingScreenshotCancelHandler();
  pendingScreenshotCancelHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      hideToolbar();
    }
  };
  document.addEventListener("keydown", pendingScreenshotCancelHandler, true);
  renderToolbar();
}

async function startScreenshotSelection() {
  if (extensionContextIsInvalidated) {
    return;
  }

  appState = await getAppState();
  if (currentHostIsBlocked(appState)) {
    return;
  }

  hideToolbar();
  removeScreenshotOverlay();
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = screenshotOverlayId;

  const regionElement = document.createElement("div");
  regionElement.className = "ai-buddy-screenshot-region";

  overlay.append(regionElement);
  document.documentElement.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let currentRegion: ScreenshotCaptureRegion | null = null;
  let currentRect: ReturnType<typeof normalizeViewportRect> | null = null;
  let isSelectingRegion = false;

  function updateRegion(endX: number, endY: number) {
    const rect = normalizeViewportRect(startX, startY, endX, endY);
    regionElement.style.display = "block";
    regionElement.style.left = `${rect.left}px`;
    regionElement.style.top = `${rect.top}px`;
    regionElement.style.width = `${rect.width}px`;
    regionElement.style.height = `${rect.height}px`;

    if (rect.width >= minimumScreenshotRegionSize && rect.height >= minimumScreenshotRegionSize) {
      currentRegion = screenshotRegionFromRect(rect);
      currentRect = rect;
    } else {
      currentRegion = null;
      currentRect = null;
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.target !== overlay && event.target !== regionElement) {
      return;
    }

    event.preventDefault();
    overlay.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    isSelectingRegion = true;
    currentRegion = null;
    updateRegion(event.clientX, event.clientY);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isSelectingRegion) {
      return;
    }

    event.preventDefault();
    updateRegion(event.clientX, event.clientY);
  }

  function handlePointerUp(event: PointerEvent) {
    if (!isSelectingRegion) {
      return;
    }

    event.preventDefault();
    isSelectingRegion = false;
    overlay.releasePointerCapture(event.pointerId);
    updateRegion(event.clientX, event.clientY);

    if (!currentRegion || !currentRect) {
      regionElement.style.display = "none";
      return;
    }

    document.removeEventListener("keydown", handleKeyDown, true);
    overlay.dataset.pending = "true";
    setPendingScreenshotContext(currentRegion, currentRect);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      removeScreenshotOverlay();
      document.removeEventListener("keydown", handleKeyDown, true);
    }
  }

  overlay.addEventListener("pointerdown", handlePointerDown);
  overlay.addEventListener("pointermove", handlePointerMove);
  overlay.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("keydown", handleKeyDown, true);
}

function handleAction(action: Action) {
  if (extensionContextIsInvalidated) {
    hideToolbar();
    return;
  }

  if (action.id === "copy") {
    void copySelection().catch(handleContentScriptError);
    return;
  }

  if (action.type === "inputPrompt") {
    showInputPrompt(action);
    return;
  }

  void sendPromptAction(action).catch((error: unknown) => {
    handleContentScriptError(error);
    window.alert(error instanceof Error ? error.message : "Unable to send screenshot prompt.");
  });
}

function actionButton(action: Action, buttonStyle: AppState["settings"]["actionButtonStyle"]) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ai-buddy-action-button";
  button.dataset.style = buttonStyle;
  button.style.setProperty("--ai-buddy-action-color", action.color);
  button.title = action.name;
  button.ariaLabel = action.name;

  const icon = document.createElement("span");
  icon.className = "ai-buddy-action-icon";
  const iconSvg = action.iconSvg ?? getFallbackActionIcon(action.icon)?.svg;
  if (iconSvg) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = iconSvg;
    icon.appendChild(svg);
  } else {
    icon.textContent = action.icon || action.name.slice(0, 2);
  }
  button.appendChild(icon);

  if (buttonStyle !== "iconOnly") {
    const label = document.createElement("span");
    label.textContent = action.name;
    button.appendChild(label);
  }

  button.addEventListener("click", () => handleAction(action));
  return button;
}

function screenshotButton(buttonStyle: AppState["settings"]["actionButtonStyle"]) {
  const action: Action = {
    id: screenshotActionId,
    name: "Screenshot",
    type: "local",
    icon: "camera",
    color: screenshotButtonColor,
  };
  const button = actionButton(action, buttonStyle);
  button.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    void startScreenshotSelection().catch(handleContentScriptError);
  }, true);
  return button;
}

function createMoreMenu(
  actions: Action[],
  buttonStyle: AppState["settings"]["actionButtonStyle"],
  label = "More",
  className = "",
) {
  const more = document.createElement("div");
  more.className = `ai-buddy-more ${className}`.trim();

  const moreButton = document.createElement("button");
  moreButton.type = "button";
  moreButton.textContent = label;
  more.appendChild(moreButton);

  const menu = document.createElement("div");
  menu.className = "ai-buddy-menu";
  actions.forEach((action) => menu.appendChild(actionButton(action, buttonStyle)));
  more.appendChild(menu);

  return more;
}

function transformActions(state: AppState) {
  const actionsById = new Map(state.actions.map((action) => [action.id, action]));
  return transformActionIds
    .map((actionId) => actionsById.get(actionId))
    .filter((action): action is Action => Boolean(action));
}

function renderToolbar() {
  if (extensionContextIsInvalidated || !appState || !lastSelectionRect) {
    return;
  }

  const state = appState;
  const root = ensureToolbarRoot();
  const scenario = getActiveScenario(state);
  const { directActions, overflowActions } = getToolbarActions(state, scenario, directActionLimit);
  const buttonStyle = state.settings.actionButtonStyle;
  const actionIsAvailableForContext = (action: Action) =>
    action.id !== screenshotActionId && (activeContextKind === "text" || action.type !== "local");
  const availableActions = [...directActions, ...overflowActions].filter(actionIsAvailableForContext);
  let visibleDirectActions = availableActions.slice(0, directActionLimit);
  let visibleOverflowActions = availableActions.slice(directActionLimit);

  root.style.setProperty("--ai-buddy-scenario-color", scenario.color);
  root.replaceChildren();

  const inner = document.createElement("div");
  inner.className = "ai-buddy-inner";

  const scenarioSelect = document.createElement("select");
  scenarioSelect.ariaLabel = "Active Scenario";
  state.scenarios.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    scenarioSelect.appendChild(option);
  });
  scenarioSelect.value = scenario.id;
  scenarioSelect.addEventListener("change", () => {
    void setActiveScenario(scenarioSelect.value).catch(handleContentScriptError);
  });
  inner.appendChild(scenarioSelect);
  inner.appendChild(screenshotButton(buttonStyle));

  function renderActionRow() {
    Array.from(inner.querySelectorAll(".ai-buddy-context-action,.ai-buddy-more")).forEach((element) => {
      element.remove();
    });
    const transformMenuActions = activeContextKind === "text" ? transformActions(state) : [];
    if (transformMenuActions.length > 0) {
      inner.appendChild(createMoreMenu(transformMenuActions, buttonStyle, "Transform", "ai-buddy-transform"));
    }
    visibleDirectActions.forEach((action) => {
      const button = actionButton(action, buttonStyle);
      button.classList.add("ai-buddy-context-action");
      inner.appendChild(button);
    });
    if (visibleOverflowActions.length > 0) {
      inner.appendChild(createMoreMenu(visibleOverflowActions, buttonStyle));
    }
  }

  renderActionRow();

  const inputPromptForm = createInputPromptForm({
    onSubmit: submitInputPrompt,
    onCancel: () => hideInputPrompt({ clear: true }),
  });

  root.append(inner, inputPromptForm);
  root.dataset.visible = "true";
  root.dataset.inputMode = "false";
  positionToolbar(root, lastSelectionRect);

  while (inner.scrollWidth > inner.clientWidth && visibleDirectActions.length > minimumVisibleActionCount) {
    const movedAction = visibleDirectActions.pop();
    if (!movedAction) {
      break;
    }
    visibleOverflowActions = [movedAction, ...visibleOverflowActions];
    renderActionRow();
    positionToolbar(root, lastSelectionRect);
  }
}

async function showToolbarForCurrentSelection() {
  if (extensionContextIsInvalidated) {
    return;
  }

  appState = await getAppState();

  if (!appState.settings.toolbarEnabled || currentHostIsBlocked(appState)) {
    hideToolbar();
    return;
  }

  const selectionInfo = getSelectionInfo();
  if (!selectionInfo) {
    hideToolbar();
    return;
  }

  lastSelectionText = selectionInfo.text;
  lastSelectionRect = selectionInfo.rect;
  lastPromptAttachments = [];
  pendingScreenshotRegion = null;
  activeContextKind = "text";
  renderToolbar();
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message?.type === "start-screenshot-capture") {
    void startScreenshotSelection().catch(handleContentScriptError);
  }

  if (message?.type === "open-toolbar-for-selection") {
    void showToolbarForCurrentSelection().catch(handleContentScriptError);
  }
});

document.addEventListener("mousedown", (event) => {
  if (eventTargetIsToolbar(event.target)) {
    return;
  }

  isPointerSelecting = true;
  clearSelectionUpdateTimer();
  hideToolbar();
}, true);

document.addEventListener("mouseup", () => {
  if (!isPointerSelecting) {
    return;
  }

  isPointerSelecting = false;
  scheduleToolbarForCurrentSelection(80);
});

document.addEventListener("touchstart", (event) => {
  if (eventTargetIsToolbar(event.target)) {
    return;
  }

  isPointerSelecting = true;
  clearSelectionUpdateTimer();
  hideToolbar();
}, true);

document.addEventListener("touchend", () => {
  if (!isPointerSelecting) {
    return;
  }

  isPointerSelecting = false;
  scheduleToolbarForCurrentSelection(120);
});

document.addEventListener("selectionchange", () => {
  if (isPointerSelecting || isToolbarInteracting || eventTargetIsToolbar(document.activeElement)) {
    return;
  }

  scheduleToolbarForCurrentSelection(80);
});

document.addEventListener("keyup", (event) => {
  if (isPointerSelecting || isToolbarInteracting || eventTargetIsToolbar(event.target)) {
    return;
  }

  scheduleToolbarForCurrentSelection(80);
});

document.addEventListener("scroll", hideToolbarForPageScroll, true);
window.addEventListener("resize", hideToolbar);
window.addEventListener("unhandledrejection", (event) => {
  handleExtensionContextUnhandledRejection(event, handleContentScriptError);
});

try {
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged && !extensionContextIsInvalidated) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[appStateKey] || extensionContextIsInvalidated) {
        return;
      }

      appState = normalizeAppState(changes[appStateKey].newValue as Partial<AppState>);
      if (!appState.settings.toolbarEnabled || currentHostIsBlocked(appState)) {
        hideToolbar();
        return;
      }
      renderToolbar();
    });
  }
} catch (error) {
  handleContentScriptError(error);
}
