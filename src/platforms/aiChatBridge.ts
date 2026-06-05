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

function selectComposerContents(composer: HTMLElement) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(composer);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function createClipboardData(text: string): DataTransfer {
  if (typeof DataTransfer === "function") {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    return clipboardData;
  }

  const data = new Map<string, string>([["text/plain", text]]);
  return {
    dropEffect: "none",
    effectAllowed: "uninitialized",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: ["text/plain"],
    clearData: (format?: string) => {
      if (format) {
        data.delete(format);
      } else {
        data.clear();
      }
    },
    getData: (format: string) => data.get(format) ?? "",
    setData: (format: string, value: string) => {
      data.set(format, value);
    },
    setDragImage: () => {},
  } as DataTransfer;
}

function createPasteEvent(text: string) {
  const clipboardData = createClipboardData(text);
  const event = (typeof ClipboardEvent === "function"
    ? new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      })
    : new Event("paste", { bubbles: true, cancelable: true })) as ClipboardEvent;

  if (!event.clipboardData) {
    Object.defineProperty(event, "clipboardData", {
      configurable: true,
      value: clipboardData,
    });
  }

  return event;
}

function normalizeComposerText(text: string) {
  return text.replace(/\u200B/g, "").trim();
}

function getComposerText(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    return composer.value;
  }

  return composer.textContent ?? "";
}

function composerContainsPrompt(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  return normalizeComposerText(getComposerText(composer)).includes(normalizeComposerText(promptText));
}

function composerLooksLikeClaudeComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  if (isClaudePage()) {
    return true;
  }

  if (!(composer instanceof HTMLElement)) {
    return false;
  }

  const label = `${composer.getAttribute("aria-label") ?? ""} ${composer.getAttribute("data-placeholder") ?? ""}`
    .trim()
    .toLowerCase();
  return label.includes("claude");
}

function pasteComposerText(composer: HTMLElement, promptText: string) {
  selectComposerContents(composer);
  composer.dispatchEvent(createPasteEvent(promptText));

  if (
    !composerContainsPrompt(composer, promptText) &&
    typeof document.execCommand === "function"
  ) {
    selectComposerContents(composer);
    document.execCommand("insertText", false, promptText);
  }

  dispatchTextInputEvent(composer, "input", "insertFromPaste", promptText);
  return composerContainsPrompt(composer, promptText);
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
    selectComposerContents(composer);

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

async function waitForSendButton(doc = document, maximumWaitMs = sendButtonWaitMs) {
  const deadline = Date.now() + maximumWaitMs;
  const discoveryDeadline = Date.now() + Math.min(sendButtonDiscoveryWaitMs, maximumWaitMs);
  let sawCandidate = false;

  while (Date.now() <= deadline) {
    const candidates = findSendButtonCandidates(doc);
    sawCandidate = sawCandidate || candidates.length > 0;
    const button = findSendButton(doc);
    if (button) {
      return { button, sawCandidate: true };
    }

    if (!sawCandidate && Date.now() > discoveryDeadline) {
      return { button: null, sawCandidate };
    }

    await delay(sendButtonPollMs);
  }

  return { button: null, sawCandidate };
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

async function waitForPromptToLeaveComposer(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  const deadline = Date.now() + 500;

  while (Date.now() <= deadline) {
    if (!composer.isConnected || !composerContainsPrompt(composer, promptText)) {
      return true;
    }

    await delay(sendButtonPollMs);
  }

  return false;
}

async function activateSendControl(
  control: HTMLElement,
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
  verifySend: boolean,
) {
  activateControl(control);
  if (!verifySend || (await waitForPromptToLeaveComposer(composer, promptText))) {
    return true;
  }

  if (typeof control.click === "function") {
    control.click();
    if (await waitForPromptToLeaveComposer(composer, promptText)) {
      return true;
    }
  }

  return false;
}

async function submitComposer(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  const verifySend = composerLooksLikeClaudeComposer(composer);
  let { button, sawCandidate } = await waitForSendButton(document, verifySend ? 750 : sendButtonWaitMs);
  if (button && (await activateSendControl(button, composer, promptText, verifySend))) {
    return true;
  }

  if (
    verifySend &&
    composer instanceof HTMLElement &&
    (composer.isContentEditable || composer.hasAttribute("contenteditable"))
  ) {
    if (pasteComposerText(composer, promptText)) {
      ({ button, sawCandidate } = await waitForSendButton());
      if (button && (await activateSendControl(button, composer, promptText, true))) {
        return true;
      }
    }
  }

  if (sawCandidate) {
    return false;
  }

  dispatchEnter(composer);
  return !verifySend || (await waitForPromptToLeaveComposer(composer, promptText));
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
  if (shouldSubmit && !(await submitComposer(composer, promptText))) {
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
