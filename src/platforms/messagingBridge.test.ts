// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectPrompt } from "./messagingBridge";
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

function createDiscordSlateComposer() {
  const composer = document.createElement("div");
  composer.setAttribute("role", "textbox");
  composer.setAttribute("aria-multiline", "true");
  composer.setAttribute("contenteditable", "true");
  composer.setAttribute("data-slate-editor", "true");
  composer.setAttribute("data-slate-node", "value");
  composer.className = "markup__75297 editor__1b31f slateTextArea_ec4baf";
  markVisible(composer);
  return composer;
}

function mockExecCommandInsertText(target: HTMLElement) {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn((command: string, _showUi?: boolean, value?: string) => {
      if (command !== "insertText") {
        return false;
      }

      target.textContent = value ?? "";
      target.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: value ?? "",
        }),
      );
      return true;
    }),
  });
}

function mockExecCommandInsertTextIntoActiveElement() {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn((command: string, _showUi?: boolean, value?: string) => {
      if (command !== "insertText") {
        return false;
      }

      const target = document.activeElement;
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      target.textContent = value ?? "";
      target.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: value ?? "",
        }),
      );
      return true;
    }),
  });
}

function createWhatsAppComposer() {
  const footer = document.createElement("footer");
  const composer = document.createElement("div");
  composer.setAttribute("role", "textbox");
  composer.setAttribute("contenteditable", "true");
  composer.setAttribute("data-tab", "10");
  composer.setAttribute("aria-label", "Type a message");
  markVisible(composer);
  footer.append(composer);
  document.body.append(footer);
  mockExecCommandInsertText(composer);
  return { footer, composer };
}

describe("messaging bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    Reflect.deleteProperty(document, "execCommand");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("waits for a Telegram send button to become enabled after drafting", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const sendButton = document.createElement("div");
    sendButton.setAttribute("role", "button");
    sendButton.setAttribute("title", "Send Message");
    sendButton.setAttribute("aria-disabled", "true");
    markVisible(sendButton);

    const clickSend = vi.fn();
    const enterSend = vi.fn();
    sendButton.addEventListener("click", () => {
      clickSend();
      composer.textContent = "";
    });
    composer.addEventListener("keydown", enterSend);
    composer.addEventListener("beforeinput", (event) => {
      const inputEvent = event as InputEvent;
      event.preventDefault();
      composer.textContent = inputEvent.data;
      window.setTimeout(() => {
        sendButton.setAttribute("aria-disabled", "false");
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Send this to Telegram", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.textContent).toBe("");
    expect(clickSend).toHaveBeenCalledTimes(1);
    expect(enterSend).not.toHaveBeenCalled();
  });

  it("tries Enter when Telegram keeps the prompt after clicking send", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const sendButton = document.createElement("button");
    sendButton.setAttribute("title", "Send Message");
    markVisible(sendButton);

    const clickSend = vi.fn();
    const enterSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        enterSend();
        composer.textContent = "";
      }
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Fallback through Enter", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickSend).toHaveBeenCalled();
    expect(enterSend).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("");
  });

  it("does not click Telegram's recorder button while waiting for the real send state", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.className = "input-message-input is-empty";
    markVisible(composer);

    const sendButton = document.createElement("button");
    sendButton.className = "btn-icon btn-send record";
    markVisible(sendButton);

    const clickSend = vi.fn(() => {
      composer.textContent = "";
    });
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        composer.className = "input-message-input";
        sendButton.className = "btn-icon btn-send";
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Wait for text send", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickSend).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("");
  });

  it("uses Telegram's real composer instead of the fake input mirror", async () => {
    const container = document.createElement("div");
    container.className = "input-message-container";

    const realComposer = document.createElement("div");
    realComposer.setAttribute("contenteditable", "true");
    realComposer.setAttribute("data-peer-id", "8738912168");
    realComposer.className = "input-message-input is-empty scrollable scrollable-y no-scrollbar";
    markVisible(realComposer);

    const fakeComposer = document.createElement("div");
    fakeComposer.setAttribute("contenteditable", "true");
    fakeComposer.className = "input-message-input is-empty scrollable scrollable-y no-scrollbar input-field-input-fake";
    markVisible(fakeComposer);

    const sendButton = document.createElement("button");
    sendButton.className = "btn-icon btn-send";
    markVisible(sendButton);
    sendButton.addEventListener("click", () => {
      realComposer.textContent = "";
    });

    container.append(realComposer, fakeComposer, sendButton);
    document.body.append(container);

    const result = await injectPrompt("Use the real Telegram composer", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(fakeComposer.textContent).toBe("");
    expect(realComposer.textContent).toBe("");
  });

  it("uses paste semantics for Discord Slate editors", async () => {
    const composer = createDiscordSlateComposer();

    const pasteSeen = vi.fn();
    const enterSend = vi.fn();
    composer.addEventListener("paste", (event) => {
      pasteSeen();
      event.preventDefault();
      composer.textContent = event.clipboardData?.getData("text/plain") ?? "";
    });
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        enterSend();
        composer.textContent = "";
      }
    });

    document.body.append(composer);

    const result = await injectPrompt("Send this to Discord Slate", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(pasteSeen).toHaveBeenCalledTimes(1);
    expect(enterSend).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("");
  });

  it("does not click Discord gift controls that look like send actions", async () => {
    const composer = createDiscordSlateComposer();

    const giftButton = document.createElement("button");
    giftButton.setAttribute("aria-label", "Send a gift");
    markVisible(giftButton);

    const clickGift = vi.fn();
    const enterSend = vi.fn();
    giftButton.addEventListener("click", clickGift);
    composer.addEventListener("paste", (event) => {
      event.preventDefault();
      composer.textContent = event.clipboardData?.getData("text/plain") ?? "";
    });
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        enterSend();
        composer.textContent = "";
      }
    });

    document.body.append(composer, giftButton);

    const result = await injectPrompt("Do not open Nitro", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickGift).not.toHaveBeenCalled();
    expect(enterSend).toHaveBeenCalledTimes(1);
  });

  it("clears stale Discord Slate DOM after Enter sends from editor state", async () => {
    const composer = createDiscordSlateComposer();

    const enterSend = vi.fn();
    composer.addEventListener("paste", (event) => {
      event.preventDefault();
      composer.textContent = event.clipboardData?.getData("text/plain") ?? "";
    });
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        event.preventDefault();
        enterSend();
      }
    });

    document.body.append(composer);

    const result = await injectPrompt("Clear Discord ghost text", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(enterSend).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("");
  });

  it("does not report Discord Slate prompts as sent when Enter is not handled", async () => {
    const composer = createDiscordSlateComposer();

    const enterSeen = vi.fn();
    composer.addEventListener("paste", (event) => {
      event.preventDefault();
      composer.textContent = event.clipboardData?.getData("text/plain") ?? "";
    });
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        enterSeen();
      }
    });

    document.body.append(composer);

    const result = await injectPrompt("Do not fake Discord send", true);

    expect(result).toEqual({
      ok: false,
      error: "Message drafted, but the chat platform did not accept the send action.",
    });
    expect(enterSeen).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("Do not fake Discord send");
  });

  it("uses WhatsApp's footer composer instead of other visible textboxes", async () => {
    const searchBox = document.createElement("div");
    searchBox.setAttribute("role", "textbox");
    searchBox.setAttribute("contenteditable", "true");
    searchBox.setAttribute("aria-label", "Search input textbox");
    markVisible(searchBox);

    const { composer } = createWhatsAppComposer();
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        composer.textContent = "";
      }
    });

    document.body.prepend(searchBox);

    const result = await injectPrompt("Send this to WhatsApp", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(searchBox.textContent).toBe("");
    expect(composer.textContent).toBe("");
  });

  it("does not click WhatsApp's send-files control when falling back to a button", async () => {
    const { footer, composer } = createWhatsAppComposer();

    const sendFilesButton = document.createElement("button");
    sendFilesButton.setAttribute("aria-label", "Send files");
    markVisible(sendFilesButton);

    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send");
    markVisible(sendButton);

    const clickSendFiles = vi.fn();
    const clickSend = vi.fn(() => {
      composer.textContent = "";
    });
    sendFilesButton.addEventListener("click", clickSendFiles);
    sendButton.addEventListener("click", clickSend);
    footer.append(sendFilesButton, sendButton);

    const result = await injectPrompt("Fallback to WhatsApp send button", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickSendFiles).not.toHaveBeenCalled();
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("finds WhatsApp's current send icon outside the exact footer subtree", async () => {
    const { composer } = createWhatsAppComposer();

    const wrapper = document.createElement("div");
    const sendButton = document.createElement("button");
    sendButton.setAttribute("data-tab", "11");
    sendButton.setAttribute("aria-label", "Send");
    const icon = document.createElement("span");
    icon.setAttribute("data-testid", "wds-ic-send-filled");
    icon.setAttribute("data-icon", "wds-ic-send-filled");
    markVisible(sendButton);
    markVisible(icon);
    sendButton.append(icon);
    wrapper.append(sendButton);
    document.body.append(wrapper);

    const clickSend = vi.fn(() => {
      composer.textContent = "";
    });
    sendButton.addEventListener("click", clickSend);

    const result = await injectPrompt("Use WhatsApp wds send icon", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickSend).toHaveBeenCalledTimes(1);
  });

  it("uses the WhatsApp media dialog caption composer for image prompts", async () => {
    vi.stubGlobal(
      "DataTransfer",
      class {
        data = new Map<string, string>();
        files: File[] = [];
        types: string[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
        getData = (format: string) => this.data.get(format) ?? "";
        setData = (format: string, value: string) => {
          this.data.set(format, value);
          if (!this.types.includes(format)) {
            this.types.push(format);
          }
        };
      },
    );

    const { footer, composer: footerComposer } = createWhatsAppComposer();
    mockExecCommandInsertTextIntoActiveElement();

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";
    const fileInputChanged = vi.fn();
    fileInput.addEventListener("change", fileInputChanged);
    const footerSend = document.createElement("button");
    footerSend.setAttribute("aria-label", "Send");
    markVisible(footerSend);

    const clickFooterSend = vi.fn(() => {
      footerComposer.textContent = "";
    });
    footerSend.addEventListener("click", clickFooterSend);
    footer.append(fileInput, footerSend);

    const clickDialogSend = vi.fn();
    const dialogState: { captionComposer?: HTMLElement } = {};
    footerComposer.addEventListener("paste", (event) => {
      expect((event.clipboardData?.files ?? []).length).toBe(1);
      event.preventDefault();

      const overlay = document.createElement("div");
      markVisible(overlay);

      const image = document.createElement("img");
      image.alt = "Screenshot preview";

      const captionComposer = document.createElement("div");
      dialogState.captionComposer = captionComposer;
      captionComposer.setAttribute("role", "textbox");
      captionComposer.setAttribute("contenteditable", "true");
      captionComposer.setAttribute("data-testid", "media-caption-input-container");
      captionComposer.setAttribute("aria-label", "Add a caption");
      markVisible(captionComposer);

      const dialogSend = document.createElement("button");
      dialogSend.setAttribute("aria-label", "Send");
      markVisible(dialogSend);
      dialogSend.addEventListener("click", () => {
        clickDialogSend();
        captionComposer.replaceChildren();
      });

      overlay.append(image, captionComposer, dialogSend);
      document.body.append(overlay);
    });

    const result = await injectPrompt("Send this with the screenshot", true, [imageAttachment()]);

    expect(result).toEqual({ ok: true, mode: "sent", attachmentDelivery: "attached" });
    expect(clickDialogSend).toHaveBeenCalledTimes(1);
    expect(clickFooterSend).not.toHaveBeenCalled();
    expect(fileInputChanged).not.toHaveBeenCalled();
    expect(footerComposer.textContent).toBe("");
    expect(dialogState.captionComposer?.textContent).toBe("");
  });

  it("sends WhatsApp prompts with Enter before clicking any send control", async () => {
    const { footer, composer } = createWhatsAppComposer();

    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send");
    markVisible(sendButton);

    const clickSend = vi.fn();
    const enterSend = vi.fn(() => {
      composer.textContent = "";
    });
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        enterSend();
      }
    });
    footer.append(sendButton);

    const result = await injectPrompt("Enter sends WhatsApp", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(enterSend).toHaveBeenCalledTimes(1);
    expect(clickSend).not.toHaveBeenCalled();
  });

  it("dispatches a Discord-compatible Enter sequence when no send button exists", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const enterEvents: string[] = [];
    for (const eventName of ["keydown", "keypress", "keyup"]) {
      composer.addEventListener(eventName, (event) => {
        enterEvents.push(`${event.type}:${(event as KeyboardEvent).key}`);
      });
    }

    document.body.append(composer);

    const result = await injectPrompt("Send this to Discord", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.textContent).toBe("Send this to Discord");
    expect(enterEvents).toEqual(["keydown:Enter", "keypress:Enter", "keyup:Enter"]);
  });

  it("keeps image prompts drafted when attachment requires manual clipboard fallback", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const sendButton = document.createElement("button");
    sendButton.setAttribute("title", "Send Message");
    markVisible(sendButton);
    const clickSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    document.body.append(composer, sendButton);

    const result = await injectPrompt("Review the screenshot", true, [imageAttachment()]);

    expect(result).toEqual({ ok: true, mode: "drafted", attachmentDelivery: "manualUpload" });
    expect(composer.textContent).toBe("Review the screenshot");
    expect(clickSend).not.toHaveBeenCalled();
  });
});
