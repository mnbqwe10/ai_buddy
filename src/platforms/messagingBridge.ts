const bridgeSource = "ai-buddy-messaging-bridge";

interface BridgeMessage {
  source?: string;
  type?: string;
  requestId?: string;
  promptText?: string;
  submit?: boolean;
}

type BridgeResult = { ok: true; mode: "sent" | "drafted" } | { ok: false; error: string };

const sendButtonWaitMs = 3_000;
const sendButtonDiscoveryWaitMs = 250;
const sendButtonPollMs = 50;
const sendVerificationWaitMs = 500;
const whatsappEditorSettleMs = 300;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isUsableComposer(element: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  if ("disabled" in element && element.disabled) {
    return false;
  }

  if (element.classList.contains("input-field-input-fake")) {
    return false;
  }

  if (element.getAttribute("aria-hidden") === "true" || element.getAttribute("data-disabled") === "true") {
    return false;
  }

  return visible(element);
}

function findComposer(doc = document): HTMLElement | HTMLTextAreaElement | HTMLInputElement | null {
  const selectors = [
    "footer [role='textbox'][contenteditable='true']",
    "footer [contenteditable='true'][data-tab]",
    ".input-message-container .input-message-input[contenteditable='true'][data-peer-id]",
    ".input-message-container .input-message-input[contenteditable='true']:not(.input-field-input-fake)",
    "[role='textbox']",
    "[contenteditable='true']",
    "div[contenteditable='true']",
    "textarea",
    "input[type='text']",
  ];

  for (const selector of selectors) {
    const elements = Array.from(
      doc.querySelectorAll<HTMLElement | HTMLTextAreaElement | HTMLInputElement>(selector),
    ).filter(isUsableComposer);
    const element = elements.at(-1);
    if (element) {
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

function composerIsSlateEditor(composer: HTMLElement) {
  return composer.getAttribute("data-slate-editor") === "true";
}

function composerIsWhatsAppComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  if (window.location.hostname === "web.whatsapp.com") {
    return true;
  }

  if (!(composer instanceof HTMLElement)) {
    return false;
  }

  const composerLabel = `${composer.getAttribute("aria-label") ?? ""} ${
    composer.getAttribute("aria-placeholder") ?? ""
  }`.toLowerCase();

  return Boolean(
    composer.closest("footer") &&
      composer.matches("[contenteditable='true']") &&
      (composer.getAttribute("role") === "textbox" ||
        composer.hasAttribute("data-tab") ||
        composerLabel.includes("message")),
  );
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
    : new Event("paste", {
        bubbles: true,
        cancelable: true,
      })) as ClipboardEvent;

  if (!event.clipboardData) {
    Object.defineProperty(event, "clipboardData", {
      configurable: true,
      value: clipboardData,
    });
  }

  return event;
}

function pasteComposerText(composer: HTMLElement, promptText: string) {
  selectComposerContents(composer);
  const event = createPasteEvent(promptText);
  composer.dispatchEvent(event);

  if (
    normalizeComposerText(composer.textContent ?? "") !== normalizeComposerText(promptText) &&
    typeof document.execCommand === "function"
  ) {
    selectComposerContents(composer);
    document.execCommand("insertText", false, promptText);
  }
}

async function setWhatsAppComposerText(composer: HTMLElement, promptText: string) {
  pasteComposerText(composer, promptText);
  await delay(whatsappEditorSettleMs);

  if (composerContainsPrompt(composer, promptText)) {
    return true;
  }

  selectComposerContents(composer);
  dispatchTextInputEvent(composer, "beforeinput", "insertFromPaste", promptText);
  if (typeof document.execCommand === "function") {
    document.execCommand("insertText", false, promptText);
  }
  dispatchTextInputEvent(composer, "input", "insertFromPaste", promptText);
  await delay(whatsappEditorSettleMs);

  if (composerContainsPrompt(composer, promptText)) {
    return true;
  }

  selectComposerContents(composer);
  dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
  if (typeof document.execCommand === "function") {
    document.execCommand("insertText", false, promptText);
  }
  dispatchTextInputEvent(composer, "input", "insertText", promptText);
  await delay(whatsappEditorSettleMs);

  return composerContainsPrompt(composer, promptText);
}

async function setComposerText(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  composer.focus();

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
    setNativeValue(composer, promptText);
    dispatchTextInputEvent(composer, "input", "insertText", promptText);
    return true;
  }

  if (composer.isContentEditable || composer.hasAttribute("contenteditable")) {
    if (composerIsWhatsAppComposer(composer)) {
      return setWhatsAppComposerText(composer, promptText);
    }

    if (composerIsSlateEditor(composer)) {
      pasteComposerText(composer, promptText);
    } else {
      selectComposerContents(composer);
      const shouldInsert = dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
      const inserted =
        shouldInsert &&
        typeof document.execCommand === "function" &&
        document.execCommand("insertText", false, promptText);
      if (!inserted || composer.textContent !== promptText) {
        composer.replaceChildren(document.createTextNode(promptText));
      }
    }

    if (normalizeComposerText(composer.textContent ?? "") !== normalizeComposerText(promptText)) {
      composer.replaceChildren(document.createTextNode(promptText));
    }
    dispatchTextInputEvent(composer, "input", "insertText", promptText);
    return true;
  }

  return false;
}

function getComposerText(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    return composer.value;
  }

  return composer.textContent ?? "";
}

function normalizeComposerText(text: string) {
  return text.replace(/\u200B/g, "").trim();
}

function composerContainsPrompt(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  return normalizeComposerText(getComposerText(composer)).includes(normalizeComposerText(promptText));
}

function controlIsEnabled(element: HTMLElement) {
  return (
    !("disabled" in element && element.disabled) &&
    element.getAttribute("aria-disabled") !== "true" &&
    element.getAttribute("data-disabled") !== "true"
  );
}

function rejectionReasonForSendControl(element: HTMLElement) {
  const label = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${
    element.textContent ?? ""
  }`.toLowerCase();
  const classList = Array.from(element.classList).map((className) => className.toLowerCase());

  if (classList.includes("record") || label.includes("record") || label.includes("voice")) {
    return "record-control";
  }

  if (label.includes("gift") || label.includes("nitro")) {
    return "non-message-send-control";
  }

  if (label.includes("send files") || label.includes("attach")) {
    return "non-message-send-control";
  }

  return undefined;
}

function rawSendControlCandidates(doc = document): HTMLElement[] {
  const selectors = [
    "button[aria-label*='send' i]",
    "button[title*='send' i]",
    "button[data-testid*='send' i]",
    "button[type='submit']",
    "[role='button'][aria-label*='send' i]",
    "[role='button'][title*='send' i]",
    "[aria-label*='send' i]",
    "[title*='send' i]",
    "button.btn-send",
    "button.Button.send",
    ".btn-send",
    ".Button.send",
  ];
  const candidates = new Set<HTMLElement>();

  for (const selector of selectors) {
    for (const element of doc.querySelectorAll<HTMLElement>(selector)) {
      candidates.add(element.closest<HTMLElement>("button,[role='button']") ?? element);
    }
  }

  return Array.from(candidates);
}

async function waitForSendButton(doc = document) {
  const deadline = Date.now() + sendButtonWaitMs;
  const discoveryDeadline = Date.now() + sendButtonDiscoveryWaitMs;
  let sawCandidate = false;

  while (Date.now() <= deadline) {
    const rawCandidates = rawSendControlCandidates(doc);
    const rejectedCandidates = rawCandidates.filter((candidate) => rejectionReasonForSendControl(candidate));
    const candidates = rawCandidates.filter((candidate) => !rejectionReasonForSendControl(candidate));
    sawCandidate = sawCandidate || candidates.length > 0;
    const control = candidates.find((candidate) => controlIsEnabled(candidate) && visible(candidate)) ?? null;
    if (control) {
      return { control, sawCandidate };
    }

    if (!sawCandidate && rejectedCandidates.length === 0 && Date.now() > discoveryDeadline) {
      return { control: null, sawCandidate };
    }

    await delay(sendButtonPollMs);
  }

  return { control: null, sawCandidate };
}

function dispatchEnter(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  composer.focus();
  for (const type of ["keydown", "keypress", "keyup"]) {
    composer.dispatchEvent(
      new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        charCode: type === "keypress" ? 13 : 0,
      }),
    );
  }
}

function whatsappSendControl(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  const scopes: ParentNode[] = [];
  if (composer instanceof HTMLElement) {
    const footer = composer.closest("footer");
    if (footer) {
      scopes.push(footer);
    }
  }
  scopes.push(document);
  const selectors = [
    "button[aria-label='Send']",
    "[role='button'][aria-label='Send']",
    "button[data-tab='11'][aria-label='Send']",
    "button[data-testid*='send' i]",
    "[role='button'][data-testid*='send' i]",
    "button [data-icon='send']",
    "[role='button'] [data-icon='send']",
    "button [data-testid='wds-ic-send-filled']",
    "[role='button'] [data-testid='wds-ic-send-filled']",
    "button [data-icon='wds-ic-send-filled']",
    "[role='button'] [data-icon='wds-ic-send-filled']",
    "button [data-icon*='send' i]",
    "[role='button'] [data-icon*='send' i]",
  ];
  const candidates: HTMLElement[] = [];

  for (const scope of scopes) {
    for (const selector of selectors) {
      for (const element of scope.querySelectorAll<HTMLElement>(selector)) {
        const control = element.closest<HTMLElement>("button,[role='button']") ?? element;
        if (!candidates.includes(control)) {
          candidates.push(control);
        }
      }
    }
  }

  for (const control of candidates) {
    if (!rejectionReasonForSendControl(control) && controlIsEnabled(control) && visible(control)) {
      return control;
    }
  }

  return null;
}

function clearStaleComposerDom(composer: HTMLElement, promptText: string) {
  if (normalizeComposerText(composer.textContent ?? "") !== normalizeComposerText(promptText)) {
    return;
  }

  composer.replaceChildren();
  dispatchTextInputEvent(composer, "input", "deleteContentBackward", "");
}

async function waitForPromptToLeaveComposer(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  const deadline = Date.now() + sendVerificationWaitMs;
  const expectedText = normalizeComposerText(promptText);

  while (Date.now() <= deadline) {
    if (!composer.isConnected) {
      return true;
    }

    const currentText = normalizeComposerText(getComposerText(composer));
    if (!currentText.includes(expectedText)) {
      return true;
    }

    await delay(sendButtonPollMs);
  }

  return false;
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

async function submitComposer(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  if (composer instanceof HTMLElement && composerIsSlateEditor(composer)) {
    dispatchEnter(composer);
    await delay(sendButtonPollMs);
    clearStaleComposerDom(composer, promptText);
    return true;
  }

  if (composerIsWhatsAppComposer(composer)) {
    dispatchEnter(composer);
    if (await waitForPromptToLeaveComposer(composer, promptText)) {
      return true;
    }

    const control = whatsappSendControl(composer);
    if (!control) {
      return false;
    }

    if (typeof control.click === "function") {
      control.click();
    }
    if (await waitForPromptToLeaveComposer(composer, promptText)) {
      return true;
    }

    activateControl(control);
    if (await waitForPromptToLeaveComposer(composer, promptText)) {
      return true;
    }

    return false;
  }

  const { control, sawCandidate } = await waitForSendButton();
  if (control) {
    activateControl(control);
    if (await waitForPromptToLeaveComposer(composer, promptText)) {
      return true;
    }

    if (typeof control.click === "function") {
      control.click();
      if (await waitForPromptToLeaveComposer(composer, promptText)) {
        return true;
      }
    }

    dispatchEnter(composer);

    if (await waitForPromptToLeaveComposer(composer, promptText)) {
      return true;
    }

    return false;
  }

  if (sawCandidate) {
    return false;
  }

  dispatchEnter(composer);
  return true;
}

export async function injectPrompt(promptText: string, submit: boolean): Promise<BridgeResult> {
  const composer = findComposer();
  if (!composer) {
    return { ok: false, error: "Messaging composer not found" };
  }

  if (!(await setComposerText(composer, promptText))) {
    return { ok: false, error: "Unable to draft message" };
  }

  if (submit && !(await submitComposer(composer, promptText))) {
    return { ok: false, error: "Message drafted, but the chat platform did not accept the send action." };
  }

  return { ok: true, mode: submit ? "sent" : "drafted" };
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

  const result = await injectPrompt(message.promptText, Boolean(message.submit));
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
