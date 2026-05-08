import { describe, expect, it, vi } from "vitest";
import { createPromptRouter, sidePanelPortName, type PromptPort } from "./promptRouter";
import type { PendingPrompt } from "../shared/messages";

function prompt(id = "explain"): PendingPrompt {
  return {
    actionId: id,
    actionName: "Explain",
    promptText: "Explain this",
    createdAt: 1,
  };
}

function port(postMessage: PromptPort["postMessage"] = vi.fn()): PromptPort {
  return {
    name: sidePanelPortName,
    postMessage,
    onDisconnect: {
      addListener: vi.fn(),
    },
  };
}

describe("background prompt router", () => {
  it("keeps prompts pending when no side panel is connected", () => {
    const router = createPromptRouter();
    const pending = prompt();

    expect(router.deliverPrompt(pending)).toBe(false);
    expect(router.claimPendingPrompt()).toBe(pending);
    expect(router.claimPendingPrompt()).toBeNull();
  });

  it("delivers directly to a connected side panel and does not keep a stale pending prompt", () => {
    const router = createPromptRouter();
    const postMessage = vi.fn();
    router.connect(port(postMessage));
    const nextPrompt = prompt();

    expect(router.deliverPrompt(nextPrompt)).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: "deliver-prompt", prompt: nextPrompt });
    expect(router.claimPendingPrompt()).toBeNull();
  });

  it("falls back to pending when connected ports cannot receive messages", () => {
    const router = createPromptRouter();
    const nextPrompt = prompt();
    router.connect(port(() => {
      throw new Error("Port closed");
    }));

    expect(router.deliverPrompt(nextPrompt)).toBe(false);
    expect(router.claimPendingPrompt()).toBe(nextPrompt);
  });
});
