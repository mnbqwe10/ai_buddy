import type { ChatPlatform } from "./model";

export type SendMode = "autoSubmit" | "draftOnly";

export interface SendPolicyInput {
  platform: ChatPlatform;
}

export function resolveSendMode({ platform }: SendPolicyInput): SendMode {
  if (platform.sendBehavior !== "autoSubmit") {
    return "draftOnly";
  }

  return "autoSubmit";
}

export function sendBehaviorStatusLabel(platform: ChatPlatform) {
  switch (platform.sendBehavior) {
    case "autoSubmit":
      return "Auto-send";
    case "pasteOnly":
      return "Paste only";
    case "openSidePanelFirst":
      return "Open side panel first";
    case "draftOnly":
    default:
      return "Draft only";
  }
}
