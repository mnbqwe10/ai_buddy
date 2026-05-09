// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectPrompt } from "./aiChatBridge";

describe("AI chat bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
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
});
