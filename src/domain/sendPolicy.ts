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
  if (platform.type === "messaging") {
    return allowAutoSend ? "autoSubmit" : "draftOnly";
  }

  return "autoSubmit";
}
