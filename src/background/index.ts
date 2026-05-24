import { nextScenarioId } from "../domain/scenarioSwitching";
import type { RuntimeMessage } from "../shared/messages";
import { ensureAppState, getAppState, saveAppState } from "../shared/storage";
import { createPromptRouter } from "./promptRouter";
import { platformFrameRules } from "./platformFrameRules";
import { cropScreenshotDataUrl } from "./screenshotCapture";

const promptRouter = createPromptRouter();

function installPlatformFrameRules() {
  const rules = platformFrameRules();
  void chrome.declarativeNetRequest
    .updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map((rule) => rule.id),
    })
    .catch((error) => {
      console.warn("[AI Buddy] Unable to install platform frame rules", error);
    });
}

installPlatformFrameRules();

chrome.runtime.onInstalled.addListener(() => {
  ensureAppState();
  installPlatformFrameRules();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    openSidePanel({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }

  if (command === "capture-screenshot") {
    void sendMessageToActiveTab({ type: "start-screenshot-capture" }).catch((error) => {
      console.warn("[AI Buddy] Unable to start screenshot capture", error);
    });
  }

  if (command === "toggle-toolbar-enabled") {
    void toggleToolbarEnabled().catch((error) => {
      console.warn("[AI Buddy] Unable to toggle toolbar", error);
    });
  }

  if (command === "cycle-scenario") {
    void cycleActiveScenario().catch((error) => {
      console.warn("[AI Buddy] Unable to cycle Scenario", error);
    });
  }
});

async function sendMessageToActiveTab(message: RuntimeMessage) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (typeof tab?.id !== "number") {
    return;
  }

  await chrome.tabs.sendMessage(tab.id, message);
}

async function cycleActiveScenario() {
  const state = await getAppState();
  await saveAppState({
    ...state,
    settings: {
      ...state.settings,
      activeScenarioId: nextScenarioId(state),
    },
  });
}

async function toggleToolbarEnabled() {
  const state = await getAppState();
  await saveAppState({
    ...state,
    settings: {
      ...state.settings,
      toolbarEnabled: !state.settings.toolbarEnabled,
    },
  });
}

function reportUnexpectedSidePanelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/sidePanel\.open\(\) may only be called in response to a user gesture/i.test(message)) {
    console.warn("[AI Buddy] Unable to open side panel", error);
  }
}

function openSidePanel(target: chrome.runtime.MessageSender | { windowId: number }) {
  const windowId = "windowId" in target
    ? target.windowId
    : target.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;

  try {
    void chrome.sidePanel.open({ windowId }).catch(reportUnexpectedSidePanelError);
  } catch (error) {
    reportUnexpectedSidePanelError(error);
  }
}

async function captureScreenshotRegion(message: Extract<RuntimeMessage, { type: "capture-screenshot-region" }>, sender: chrome.runtime.MessageSender) {
  const dataUrl = typeof sender.tab?.windowId === "number"
    ? await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
    : await chrome.tabs.captureVisibleTab({ format: "png" });
  return cropScreenshotDataUrl(dataUrl, message.region);
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (!message) {
    return;
  }

  if (message.type === "open-side-panel") {
    openSidePanel(sender);
    return;
  }

  if (message.type === "prompt-action-request") {
    const delivered = promptRouter.deliverPrompt(message.prompt);
    if (!delivered) {
      openSidePanel(sender);
    }
    sendResponse({ ok: true, delivered });
    return;
  }

  if (message.type === "capture-screenshot-region") {
    void captureScreenshotRegion(message, sender)
      .then((attachment) => sendResponse({ ok: true, attachment }))
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendResponse({ ok: false, error: errorMessage });
      });
    return true;
  }

  if (message.type === "claim-pending-prompt") {
    sendResponse({ prompt: promptRouter.claimPendingPrompt() });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  promptRouter.connect(port);
});
