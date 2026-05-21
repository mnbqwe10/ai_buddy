export interface PromptImageAttachment {
  id: string;
  kind: "image";
  mimeType: "image/png";
  fileName: string;
  dataUrl: string;
  width: number;
  height: number;
}

export type PromptAttachment = PromptImageAttachment;

export interface PendingPrompt {
  actionId: string;
  actionName: string;
  promptText: string;
  createdAt: number;
  attachments?: PromptAttachment[];
}

export interface ScreenshotCaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

export type RuntimeMessage =
  | { type: "open-side-panel" }
  | { type: "start-screenshot-capture" }
  | { type: "prompt-action-request"; prompt: PendingPrompt }
  | { type: "capture-screenshot-region"; region: ScreenshotCaptureRegion }
  | { type: "claim-pending-prompt" }
  | { type: "deliver-prompt"; prompt: PendingPrompt };
