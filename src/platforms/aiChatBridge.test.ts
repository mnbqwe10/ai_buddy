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

describe("AI chat bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
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
