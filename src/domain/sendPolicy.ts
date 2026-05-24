import type { ChatPlatform } from "./model";

export type SendMode = "autoSubmit" | "draftOnly";

export interface SendPolicyInput {
  platform: ChatPlatform;
  allowAutoSend?: boolean;
}

export function resolveSendMode({
  platform,
  allowAutoSend = false,
}: SendPolicyInput): SendMode {
  if (platform.sendBehavior !== "autoSubmit") {
    return "draftOnly";
  }

  if (platform.type === "messaging") {
    return allowAutoSend ? "autoSubmit" : "draftOnly";
  }

  return "autoSubmit";
}

export function sendBehaviorStatusLabel(platform: ChatPlatform) {
  switch (platform.sendBehavior) {
    case "autoSubmit":
      return platform.type === "messaging" ? "Auto-send when allowed" : "Auto-send";
    case "pasteOnly":
      return "Paste only";
    case "openSidePanelFirst":
      return "Open side panel first";
    case "draftOnly":
    default:
      return "Draft only";
  }
}
