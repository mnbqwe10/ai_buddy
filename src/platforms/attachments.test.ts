// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForImageAttachmentSurface } from "./attachments";
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

describe("attachment delivery helpers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("waits for image file inputs to appear and settle", async () => {
    vi.useFakeTimers();

    window.setTimeout(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png";
      document.body.append(input);
    }, 500);

    const waitPromise = waitForImageAttachmentSurface([imageAttachment()], {
      minimumSettleMs: 1_000,
      maximumWaitMs: 2_000,
    });

    await vi.advanceTimersByTimeAsync(900);
    expect(document.querySelector("input[type='file']")).not.toBeNull();

    let settled = false;
    waitPromise.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    await waitPromise;
    expect(settled).toBe(true);
  });

  it("returns immediately when there is no image attachment", async () => {
    vi.useFakeTimers();

    const waitPromise = waitForImageAttachmentSurface(undefined, {
      minimumSettleMs: 1_000,
      maximumWaitMs: 2_000,
    });

    await waitPromise;
    expect(vi.getTimerCount()).toBe(0);
  });
});
