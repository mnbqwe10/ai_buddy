// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectPrompt } from "./aiChatBridge";
import type { PromptAttachment } from "../shared/messages";

function imageAttachment(): PromptAttachment {
  return {
    id: "image-1",
    kind: "image",
    mimeType: "image/png",
    fileName: "capture.png",
    dataUrl: "data:image/png;base64,AA==",
    width: 1,
    height: 1,
  };
}

function markVisible(element: HTMLElement) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 100,
    height: 24,
    top: 0,
    right: 100,
    bottom: 24,
    left: 0,
    toJSON: () => ({}),
  });
}

describe("AI chat bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("waits for the send button to become enabled after drafting the prompt", async () => {
    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    sendButton.disabled = true;

    const clickSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        sendButton.disabled = false;
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Second prompt", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.value).toBe("Second prompt");
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("drafts into a Gemini-style composer inside an open shadow root", async () => {
    const host = document.createElement("rich-textarea");
    const shadow = host.attachShadow({ mode: "open" });
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "plaintext-only");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("aria-label", "Prompt");
    shadow.append(composer);
    document.body.append(host);

    const result = await injectPrompt("Explain this", false);

    expect(result).toEqual({ ok: true, mode: "drafted" });
    expect(composer.textContent).toBe("Explain this");
  });

  it("updates rich editor state before sending a Gemini-style prompt", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("aria-label", "Enter a prompt here");
    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send");
    sendButton.disabled = true;
    const clickSend = vi.fn();

    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("beforeinput", (event) => {
      const inputEvent = event as InputEvent;
      if (inputEvent.inputType === "insertText") {
        event.preventDefault();
        composer.textContent = inputEvent.data;
        sendButton.disabled = false;
      }
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Ask Gemini", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.textContent).toBe("Ask Gemini");
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("sends when an image paste is accepted before drafting text", async () => {
    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );

    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    const pasteSeen = vi.fn();
    const clickSend = vi.fn();

    composer.addEventListener("paste", (event) => {
      pasteSeen((event.clipboardData?.files ?? []).length);
      event.preventDefault();
    });
    sendButton.addEventListener("click", clickSend);
    document.body.append(composer, sendButton);

    const result = await injectPrompt("Review the screenshot", true, [imageAttachment()]);

    expect(result).toEqual({ ok: true, mode: "sent", attachmentDelivery: "attached" });
    expect(pasteSeen).toHaveBeenCalledWith(1);
    expect(composer.value).toBe("Review the screenshot");
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("prefers an image file input over a Claude-style editor paste handler", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );

    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("aria-label", "Message Claude");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";
    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send");
    const pasteSeen = vi.fn((event: ClipboardEvent) => {
      event.preventDefault();
    });
    const fileInputChanged = vi.fn();
    const clickSend = vi.fn();

    composer.addEventListener("paste", pasteSeen);
    fileInput.addEventListener("change", fileInputChanged);
    sendButton.addEventListener("click", clickSend);
    document.body.append(composer, fileInput, sendButton);

    const resultPromise = injectPrompt("Review the screenshot", true, [imageAttachment()]);
    await vi.advanceTimersByTimeAsync(4_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, mode: "sent", attachmentDelivery: "attached" });
    expect(fileInputChanged).toHaveBeenCalledTimes(1);
    expect(pasteSeen).not.toHaveBeenCalled();
    expect(composer.textContent).toBe("Review the screenshot");
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("keeps waiting when a slow image upload leaves the send button disabled", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );

    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";
    const sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    sendButton.disabled = true;
    const clickSend = vi.fn();

    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        sendButton.disabled = false;
      }, 20_000);
    });
    sendButton.addEventListener("click", clickSend);
    document.body.append(composer, fileInput, sendButton);

    const resultPromise = injectPrompt("Review the slow screenshot", true, [imageAttachment()]);
    await vi.advanceTimersByTimeAsync(25_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, mode: "sent", attachmentDelivery: "attached" });
    expect(composer.value).toBe("Review the slow screenshot");
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("activates DeepSeek's unlabeled icon send button after a slow image upload", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );

    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";
    const sendControl = document.createElement("div");
    sendControl.setAttribute("role", "button");
    sendControl.setAttribute("aria-disabled", "true");
    sendControl.className = "_52c986b ds-icon-button ds-icon-button--l ds-icon-button--sizing-container";
    sendControl.tabIndex = 0;
    sendControl.innerHTML = `
      <div class="ds-icon-button__hover-bg"></div>
      <div class="ds-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8.3125 0.981587C8.66767 1.0545 8.97902 1.20558 9.2627 1.43374C9.48724 1.61438 9.73029 1.85933 9.97949 2.10854L14.707 6.83608L13.293 8.25014L9 3.95717V15.0431H7V3.95717L2.70703 8.25014L1.29297 6.83608L6.02051 2.10854C6.26971 1.85933 6.51277 1.61438 6.7373 1.43374C6.97662 1.24126 7.28445 1.04542 7.6875 0.981587C7.8973 0.94841 8.1031 0.956564 8.3125 0.981587Z" fill="currentColor"></path>
        </svg>
      </div>
      <div class="ds-focus-ring"></div>
    `;
    markVisible(sendControl);
    const mouseSend = vi.fn();

    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        sendControl.setAttribute("aria-disabled", "false");
      }, 20_000);
    });
    sendControl.addEventListener("mousedown", mouseSend);
    document.body.append(composer, fileInput, sendControl);

    const resultPromise = injectPrompt("Review the slow DeepSeek screenshot", true, [imageAttachment()]);
    await vi.advanceTimersByTimeAsync(25_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, mode: "sent", attachmentDelivery: "attached" });
    expect(composer.value).toBe("Review the slow DeepSeek screenshot");
    expect(mouseSend).toHaveBeenCalledTimes(1);
  });

  it("ignores DeepSeek unlabeled menu icon buttons while looking for send", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );

    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";

    const menuControl = document.createElement("div");
    menuControl.setAttribute("role", "button");
    menuControl.setAttribute("aria-disabled", "false");
    menuControl.className = "_52c986b ds-icon-button ds-icon-button--l ds-icon-button--sizing-container";
    menuControl.innerHTML = `
      <div class="ds-icon">
        <svg viewBox="0 0 16 16">
          <path d="M3 8C3 7.44772 3.44772 7 4 7C4.55228 7 5 7.44772 5 8C5 8.55228 4.55228 9 4 9C3.44772 9 3 8.55228 3 8Z"></path>
        </svg>
      </div>
    `;
    markVisible(menuControl);
    const clickMenu = vi.fn();
    menuControl.addEventListener("mousedown", clickMenu);

    const sendControl = document.createElement("div");
    sendControl.setAttribute("role", "button");
    sendControl.setAttribute("aria-disabled", "true");
    sendControl.className = "_52c986b ds-icon-button ds-icon-button--l ds-icon-button--sizing-container";
    sendControl.innerHTML = `
      <div class="ds-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8.3125 0.981587C8.66767 1.0545 8.97902 1.20558 9.2627 1.43374C9.48724 1.61438 9.73029 1.85933 9.97949 2.10854L14.707 6.83608L13.293 8.25014L9 3.95717V15.0431H7V3.95717L2.70703 8.25014L1.29297 6.83608L6.02051 2.10854C6.26971 1.85933 6.51277 1.61438 6.7373 1.43374C6.97662 1.24126 7.28445 1.04542 7.6875 0.981587C7.8973 0.94841 8.1031 0.956564 8.3125 0.981587Z" fill="currentColor"></path>
        </svg>
      </div>
    `;
    markVisible(sendControl);
    const clickSend = vi.fn();
    sendControl.addEventListener("mousedown", clickSend);

    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        sendControl.setAttribute("aria-disabled", "false");
      }, 20_000);
    });
    document.body.append(composer, fileInput, menuControl, sendControl);

    const resultPromise = injectPrompt("Avoid the DeepSeek menu", true, [imageAttachment()]);
    await vi.advanceTimersByTimeAsync(25_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, mode: "sent", attachmentDelivery: "attached" });
    expect(clickMenu).not.toHaveBeenCalled();
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("does not submit text when an attached image upload fails", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );

    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";
    const sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    const clickSend = vi.fn();

    fileInput.addEventListener("change", () => {
      const alert = document.createElement("div");
      alert.setAttribute("role", "alert");
      alert.textContent = "One or more file uploads have failed. Please try again.";
      markVisible(alert);
      document.body.append(alert);
    });
    sendButton.addEventListener("click", clickSend);
    document.body.append(composer, fileInput, sendButton);

    const resultPromise = injectPrompt("Do not send without image", true, [imageAttachment()]);
    await vi.advanceTimersByTimeAsync(4_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, mode: "drafted", attachmentDelivery: "manualClipboard" });
    expect(composer.value).toBe("Do not send without image");
    expect(clickSend).not.toHaveBeenCalled();
  });

  it("drafts instead of submitting when image attachment needs manual paste", async () => {
    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    const clickSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    document.body.append(composer, sendButton);

    const result = await injectPrompt("Review the screenshot", true, [imageAttachment()]);

    expect(result).toEqual({ ok: true, mode: "drafted", attachmentDelivery: "manualClipboard" });
    expect(composer.value).toBe("Review the screenshot");
    expect(clickSend).not.toHaveBeenCalled();
  });
});
