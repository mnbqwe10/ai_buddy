import type { PromptAttachment } from "../shared/messages";

export type AttachmentDelivery = "attached" | "manualClipboard";
export type AttachmentUploadResult = "ready" | "failed";
export interface AttachmentDeliveryOptions {
  preferPaste?: boolean;
}

const uploadSettleMinimumMs = 3_000;
const uploadSettleMaximumMs = 20_000;
const uploadSettlePollMs = 250;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function dataUrlToFile(attachment: PromptAttachment) {
  const [metadata, base64Data] = attachment.dataUrl.split(",");
  const mimeType = metadata.match(/data:([^;]+)/)?.[1] ?? attachment.mimeType;
  const binary = atob(base64Data ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], attachment.fileName, { type: mimeType });
}

function createDataTransfer(files: File[]) {
  if (typeof DataTransfer !== "function") {
    return null;
  }

  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }
  return dataTransfer;
}

function withClipboardData(event: ClipboardEvent, dataTransfer: DataTransfer) {
  if (!event.clipboardData) {
    Object.defineProperty(event, "clipboardData", {
      configurable: true,
      value: dataTransfer,
    });
  }
  return event;
}

function pasteFiles(target: HTMLElement | HTMLTextAreaElement | HTMLInputElement, files: File[]) {
  const dataTransfer = createDataTransfer(files);
  if (!dataTransfer) {
    return false;
  }

  const event = withClipboardData(
    typeof ClipboardEvent === "function"
      ? new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        })
      : (new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent),
    dataTransfer,
  );

  return !target.dispatchEvent(event);
}

function dropFiles(target: HTMLElement | HTMLTextAreaElement | HTMLInputElement, files: File[]) {
  if (typeof DragEvent !== "function") {
    return false;
  }

  const dataTransfer = createDataTransfer(files);
  if (!dataTransfer) {
    return false;
  }

  let accepted = false;
  for (const type of ["dragenter", "dragover", "drop"]) {
    const event = new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    accepted = !target.dispatchEvent(event) || accepted;
  }
  return accepted;
}

function imageFileInputCandidates(doc = document) {
  return Array.from(doc.querySelectorAll<HTMLInputElement>("input[type='file']")).filter((input) => {
    const accept = input.accept.toLowerCase();
    return !accept || accept.includes("image") || accept.includes("png") || accept.includes("*/*");
  });
}

export async function waitForImageAttachmentSurface(
  attachments: PromptAttachment[] | undefined,
  options: { minimumSettleMs?: number; maximumWaitMs?: number } = {},
) {
  const imageAttachments = attachments?.filter((attachment) => attachment.kind === "image") ?? [];
  if (imageAttachments.length === 0) {
    return;
  }

  const minimumSettleMs = options.minimumSettleMs ?? 0;
  const maximumWaitMs = options.maximumWaitMs ?? 0;
  const startedAt = Date.now();
  const deadline = startedAt + maximumWaitMs;
  let stablePolls = 0;

  while (Date.now() <= deadline) {
    const hasSettled = Date.now() - startedAt >= minimumSettleMs;
    const hasFileInput = imageFileInputCandidates().length > 0;

    if (hasSettled && hasFileInput) {
      stablePolls += 1;
      if (stablePolls >= 2) {
        return;
      }
    } else {
      stablePolls = 0;
    }

    await delay(uploadSettlePollMs);
  }
}

function attachViaFileInput(files: File[]) {
  const dataTransfer = createDataTransfer(files);
  if (!dataTransfer) {
    return false;
  }

  const input = imageFileInputCandidates().at(-1);
  if (!input) {
    return false;
  }

  try {
    input.files = dataTransfer.files;
  } catch {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: dataTransfer.files,
    });
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function activeUploadIndicators(doc = document) {
  const selectors = [
    "[aria-busy='true']",
    "[role='progressbar']",
    "progress",
    "[aria-label*='uploading' i]",
    "[aria-label*='processing' i]",
    "[aria-label*='attaching' i]",
    "[data-testid*='upload-progress' i]",
    "[class*='uploading' i]",
    "[class*='progress' i]",
    "[class*='spinner' i]",
  ];
  const indicators = new Set<Element>();

  for (const selector of selectors) {
    for (const element of doc.querySelectorAll(selector)) {
      indicators.add(element);
    }
  }

  return Array.from(indicators).filter((element) => {
    if (!visible(element)) {
      return false;
    }

    if (
      element.matches("[aria-busy='true'],[role='progressbar'],progress,[class*='uploading' i],[class*='progress' i],[class*='spinner' i]")
    ) {
      return true;
    }

    const label = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${
      element.textContent ?? ""
    }`;
    return /\b(uploading|processing|attaching|preparing|scanning)\b/i.test(label);
  });
}

function uploadFailureIndicators(doc = document) {
  const selectors = [
    "[role='alert']",
    "[aria-live]",
    "[data-testid*='toast' i]",
    "[data-testid*='error' i]",
    "[class*='toast' i]",
    "[class*='error' i]",
  ];
  const indicators = new Set<Element>();

  for (const selector of selectors) {
    for (const element of doc.querySelectorAll(selector)) {
      indicators.add(element);
    }
  }

  return Array.from(indicators).filter((element) => {
    if (!visible(element)) {
      return false;
    }

    const text = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${
      element.textContent ?? ""
    }`;
    return /\b(file|upload|uploads|attachment|image)\b/i.test(text) && /\b(failed|fail|error|try again|unsupported)\b/i.test(text);
  });
}

export async function waitForImageAttachmentUpload(
  delivery: AttachmentDelivery | undefined,
): Promise<AttachmentUploadResult> {
  if (delivery !== "attached") {
    return "ready";
  }

  await delay(uploadSettleMinimumMs);

  const deadline = Date.now() + uploadSettleMaximumMs;
  let stablePolls = 0;

  while (Date.now() <= deadline) {
    if (uploadFailureIndicators().length > 0) {
      return "failed";
    }

    if (activeUploadIndicators().length === 0) {
      stablePolls += 1;
      if (stablePolls >= 2) {
        return "ready";
      }
    } else {
      stablePolls = 0;
    }

    await delay(uploadSettlePollMs);
  }

  return uploadFailureIndicators().length > 0 ? "failed" : "ready";
}

export async function deliverImageAttachments(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  attachments: PromptAttachment[] | undefined,
  options: AttachmentDeliveryOptions = {},
): Promise<AttachmentDelivery | undefined> {
  const imageAttachments = attachments?.filter((attachment) => attachment.kind === "image") ?? [];
  if (imageAttachments.length === 0) {
    return undefined;
  }

  const files = imageAttachments.map(dataUrlToFile);
  const attached = options.preferPaste
    ? pasteFiles(composer, files) || dropFiles(composer, files) || attachViaFileInput(files)
    : attachViaFileInput(files) || pasteFiles(composer, files) || dropFiles(composer, files);
  return attached ? "attached" : "manualClipboard";
}
