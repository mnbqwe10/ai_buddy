import type { PendingPrompt, RuntimeMessage } from "../shared/messages";

export const sidePanelPortName = "ai-buddy-sidepanel";

export interface PromptPort {
  name: string;
  postMessage: (message: RuntimeMessage) => void;
  onDisconnect: {
    addListener: (listener: () => void) => void;
  };
}

export function createPromptRouter() {
  const ports = new Set<PromptPort>();
  let pendingPrompt: PendingPrompt | null = null;

  function connect(port: PromptPort) {
    if (port.name !== sidePanelPortName) {
      return false;
    }

    ports.add(port);
    port.onDisconnect.addListener(() => {
      ports.delete(port);
    });
    return true;
  }

  function deliverPrompt(prompt: PendingPrompt) {
    pendingPrompt = prompt;
    let delivered = false;

    for (const port of [...ports]) {
      try {
        port.postMessage({ type: "deliver-prompt", prompt });
        delivered = true;
      } catch {
        ports.delete(port);
      }
    }

    if (delivered) {
      pendingPrompt = null;
    }

    return delivered;
  }

  function claimPendingPrompt() {
    const prompt = pendingPrompt;
    pendingPrompt = null;
    return prompt;
  }

  return {
    claimPendingPrompt,
    connect,
    deliverPrompt,
  };
}
