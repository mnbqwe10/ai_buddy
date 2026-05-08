export function isExtensionContextInvalidatedError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "";

  return /extension context invalidated/i.test(message);
}

export function createContentScriptErrorHandler({
  onContextInvalidated,
  onUnexpectedError,
}: {
  onContextInvalidated: () => void;
  onUnexpectedError?: (error: unknown) => void;
}) {
  return (error: unknown) => {
    if (isExtensionContextInvalidatedError(error)) {
      onContextInvalidated();
      return;
    }

    onUnexpectedError?.(error);
  };
}

export interface UnhandledRejectionLike {
  reason: unknown;
  preventDefault: () => void;
}

export function handleExtensionContextUnhandledRejection(
  event: UnhandledRejectionLike,
  handleError: (error: unknown) => void,
) {
  if (!isExtensionContextInvalidatedError(event.reason)) {
    return false;
  }

  event.preventDefault();
  handleError(event.reason);
  return true;
}
