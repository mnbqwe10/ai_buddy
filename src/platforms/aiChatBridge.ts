import {
  deliverImageAttachments,
  waitForImageAttachmentSurface,
  waitForImageAttachmentUpload,
  type AttachmentDelivery,
} from "./attachments";
import type { PromptAttachment } from "../shared/messages";

const bridgeSource = "ai-buddy-ai-chat-bridge";
const bridgeLoadedAt = Date.now();

interface BridgeMessage {
  source?: string;
  type?: string;
  requestId?: string;
  promptText?: string;
  attachments?: PromptAttachment[];
  submit?: boolean;
}

type BridgeResult =
  | { ok: true; mode: "sent" | "drafted"; attachmentDelivery?: AttachmentDelivery }
  | { ok: false; error: string };

const sendButtonWaitMs = 30_000;
const sendButtonDiscoveryWaitMs = 500;
const sendButtonPollMs = 50;
const claudeInitialUploadSettleMs = 5_000;
const claudeUploadSurfaceWaitMs = 10_000;
const sendButtonSelectors = [
  "button[data-testid='send-button']",
  "button[aria-label='Send']",
  "button[aria-label*='send' i]",
  "button[aria-label*='submit' i]",
  "button[title*='send' i]",
  "button[title*='submit' i]",
  "button[data-testid*='send' i]",
  "button[data-testid*='submit' i]",
  "button[type='submit']",
  "[role='button'][aria-label='Send']",
  "[role='button'][aria-label*='send' i]",
  "[role='button'][aria-label*='submit' i]",
  "[role='button'][title*='send' i]",
  "[role='button'][title*='submit' i]",
  "[role='button'][data-testid*='send' i]",
  "[role='button'][data-testid*='submit' i]",
];

type SearchRoot = Document | ShadowRoot | Element;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isClaudePage() {
  return window.location.hostname === "claude.ai";
}

function remainingInitialClaudeSettleMs(now = Date.now()) {
  return Math.max(0, claudeInitialUploadSettleMs - (now - bridgeLoadedAt));
}

function querySelectorAllDeep<T extends Element>(root: SearchRoot, selector: string): T[] {
  const results = Array.from(root.querySelectorAll<T>(selector));

  for (const element of Array.from(root.querySelectorAll<Element>("*"))) {
    if (element.shadowRoot) {
      results.push(...querySelectorAllDeep<T>(element.shadowRoot, selector));
    }
  }

  return results;
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findComposer(doc = document): HTMLElement | HTMLTextAreaElement | HTMLInputElement | null {
  const selectors = [
    "#prompt-textarea",
    "[data-placeholder='Ask anything']",
    "[aria-label='Enter a prompt here']",
    "[aria-label*='prompt' i]",
    "[aria-label*='message' i]",
    "[role='textbox'][contenteditable]",
    "[contenteditable='plaintext-only']",
    "[contenteditable='true']",
    "[contenteditable]",
    ".ProseMirror",
    "textarea",
  ];

  for (const selector of selectors) {
    const elements = querySelectorAllDeep<HTMLElement | HTMLTextAreaElement | HTMLInputElement>(doc, selector)
      .filter((candidate) => !("disabled" in candidate && candidate.disabled));
    const element = elements.filter(visible).at(-1) ?? elements.at(-1);
    if (element && !("disabled" in element && element.disabled)) {
      return element;
    }
  }

  return null;
}

function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(element, value);
}

function dispatchTextInputEvent(
  element: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  type: "beforeinput" | "input",
  inputType: string,
  data: string,
) {
  const event = new InputEvent(type, {
    bubbles: true,
    cancelable: type === "beforeinput",
    inputType,
    data,
  });

  return element.dispatchEvent(event);
}

function setComposerText(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  composer.focus();

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
    setNativeValue(composer, promptText);
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: promptText }));
    return true;
  }

  if (composer.isContentEditable || composer.hasAttribute("contenteditable")) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const shouldInsert = dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
    const inserted =
      shouldInsert &&
      typeof document.execCommand === "function" &&
      document.execCommand("insertText", false, promptText);
    if (!inserted || composer.textContent !== promptText) {
      composer.replaceChildren(document.createTextNode(promptText));
    }
    dispatchTextInputEvent(composer, "input", "insertText", promptText);
    return true;
  }

  return false;
}

function controlIsEnabled(control: HTMLElement) {
  return (
    !(control instanceof HTMLButtonElement && control.disabled) &&
    control.getAttribute("aria-disabled") !== "true" &&
    control.getAttribute("data-disabled") !== "true" &&
    !control.classList.contains("disabled")
  );
}

function controlLabel(control: HTMLElement) {
  return `${control.getAttribute("aria-label") ?? ""} ${control.getAttribute("title") ?? ""} ${
    control.textContent ?? ""
  }`
    .trim()
    .toLowerCase();
}

function controlLooksLikeSend(control: HTMLElement) {
  const label = controlLabel(control);
  return (
    label === "send" ||
    label === "submit" ||
    label.includes("send prompt") ||
    label.includes("send message") ||
    label.includes("submit prompt")
  );
}

function controlLooksLikeDeepSeekSend(control: HTMLElement) {
  if (
    control.getAttribute("role") !== "button" ||
    !control.classList.contains("ds-icon-button") ||
    !control.hasAttribute("aria-disabled")
  ) {
    return false;
  }

  return Array.from(control.querySelectorAll<SVGPathElement>("svg path")).some((path) => {
    const pathData = path.getAttribute("d") ?? "";
    return pathData.includes("M8.3125") && pathData.includes("V15.0431H7V3.95717");
  });
}

function rejectionReasonForSendControl(control: HTMLElement) {
  const label = controlLabel(control);
  const classList = Array.from(control.classList).map((className) => className.toLowerCase());

  if (label.includes("feedback") || label.includes("attach") || label.includes("upload") || label.includes("file")) {
    return "non-message-send-control";
  }

  if (classList.includes("record") || label.includes("record") || label.includes("voice")) {
    return "record-control";
  }

  return undefined;
}

function findSendButtonCandidates(doc = document): HTMLElement[] {
  const candidates = new Set<HTMLElement>();

  for (const selector of sendButtonSelectors) {
    for (const element of querySelectorAllDeep<HTMLElement>(doc, selector)) {
      candidates.add(element.closest<HTMLElement>("button,[role='button']") ?? element);
    }
  }

  for (const control of querySelectorAllDeep<HTMLElement>(doc, "button,[role='button']")) {
    if (controlLooksLikeSend(control) || controlLooksLikeDeepSeekSend(control)) {
      candidates.add(control);
    }
  }

  return Array.from(candidates).filter((control) => !rejectionReasonForSendControl(control));
}

function findSendButton(doc = document): HTMLElement | null {
  return (
    findSendButtonCandidates(doc).find(
      (control) => controlIsEnabled(control) && (control instanceof HTMLButtonElement || visible(control)),
    ) ?? null
  );
}

async function waitForSendButton(doc = document) {
  const deadline = Date.now() + sendButtonWaitMs;
  const discoveryDeadline = Date.now() + sendButtonDiscoveryWaitMs;
  let sawCandidate = false;

  while (Date.now() <= deadline) {
    sawCandidate = sawCandidate || findSendButtonCandidates(doc).length > 0;
    const button = findSendButton(doc);
    if (button) {
      return button;
    }

    if (!sawCandidate && Date.now() > discoveryDeadline) {
      return null;
    }

    await delay(sendButtonPollMs);
  }

  return null;
}

function dispatchEnter(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  composer.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    }),
  );
}

function activateControl(control: HTMLElement) {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    control.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type.endsWith("down") ? 1 : 0,
      }),
    );
  }
}

async function submitComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  const control = await waitForSendButton();
  if (control) {
    activateControl(control);
    return true;
  }

  if (findSendButtonCandidates().length > 0) {
    return false;
  }

  dispatchEnter(composer);
  return true;
}

export async function injectPrompt(
  promptText: string,
  submit: boolean,
  attachments?: PromptAttachment[],
): Promise<BridgeResult> {
  let composer = findComposer();
  if (!composer) {
    return { ok: false, error: "Composer not found" };
  }

  if (isClaudePage()) {
    await waitForImageAttachmentSurface(attachments, {
      minimumSettleMs: remainingInitialClaudeSettleMs(),
      maximumWaitMs: claudeUploadSurfaceWaitMs,
    });
  }

  const attachmentDelivery = await deliverImageAttachments(composer, attachments);
  const attachmentUploadResult = await waitForImageAttachmentUpload(attachmentDelivery);
  composer = findComposer() ?? composer;

  if (!setComposerText(composer, promptText)) {
    return { ok: false, error: "Unable to draft prompt" };
  }

  const effectiveAttachmentDelivery =
    attachmentDelivery === "attached" && attachmentUploadResult === "failed" ? "manualUpload" : attachmentDelivery;
  const shouldSubmit = submit && effectiveAttachmentDelivery !== "manualUpload";
  if (shouldSubmit && !(await submitComposer(composer))) {
    return { ok: false, error: "Prompt drafted, but the send button was not ready." };
  }

  return {
    ok: true,
    mode: shouldSubmit ? "sent" : "drafted",
    ...(effectiveAttachmentDelivery ? { attachmentDelivery: effectiveAttachmentDelivery } : {}),
  };
}

async function handleBridgeMessage(event: MessageEvent) {
  const message = event.data as BridgeMessage;
  if (!message || message.source !== bridgeSource) {
    return;
  }

  const targetOrigin = event.origin || "*";
  const sourceWindow = event.source as Window | null;

  if (message.type === "bridge-ping") {
    sourceWindow?.postMessage({ source: bridgeSource, type: "bridge-ready" }, targetOrigin);
    return;
  }

  if (message.type !== "inject-prompt" || !message.requestId || !message.promptText) {
    return;
  }

  const result = await injectPrompt(message.promptText, Boolean(message.submit), message.attachments);
  sourceWindow?.postMessage(
    {
      source: bridgeSource,
      type: "inject-result",
      requestId: message.requestId,
      result,
    },
    targetOrigin,
  );
}

window.addEventListener("message", (event) => {
  void handleBridgeMessage(event);
});

export {};
