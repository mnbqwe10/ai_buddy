export interface PendingPrompt {
  actionId: string;
  actionName: string;
  promptText: string;
  createdAt: number;
}

export type RuntimeMessage =
  | { type: "open-side-panel" }
  | { type: "prompt-action-request"; prompt: PendingPrompt }
  | { type: "claim-pending-prompt" }
  | { type: "deliver-prompt"; prompt: PendingPrompt };
