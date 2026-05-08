import type { ChatPlatform } from "./model";

export type SendMode = "autoSubmit" | "draftOnly";

export interface SendPolicyInput {
  platform: ChatPlatform;
  autoSendLockEnabled?: boolean;
}

export function resolveSendMode({
  platform,
  autoSendLockEnabled = false,
}: SendPolicyInput): SendMode {
  if (platform.type === "messaging") {
    return autoSendLockEnabled ? "autoSubmit" : "draftOnly";
  }

  return "autoSubmit";
}
