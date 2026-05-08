import { describe, expect, it, vi } from "vitest";
import {
  createContentScriptErrorHandler,
  handleExtensionContextUnhandledRejection,
  isExtensionContextInvalidatedError,
} from "./extensionContext";

describe("content extension context handling", () => {
  it("recognizes Chrome's invalidated extension context error", () => {
    expect(isExtensionContextInvalidatedError(new Error("Extension context invalidated."))).toBe(true);
    expect(isExtensionContextInvalidatedError({ message: "Extension context invalidated." })).toBe(true);
    expect(isExtensionContextInvalidatedError(new Error("Network failed"))).toBe(false);
    expect(isExtensionContextInvalidatedError("Extension context invalidated.")).toBe(false);
  });

  it("handles invalidated extension context errors without reporting them as unexpected", () => {
    const onContextInvalidated = vi.fn();
    const onUnexpectedError = vi.fn();
    const handleError = createContentScriptErrorHandler({
      onContextInvalidated,
      onUnexpectedError,
    });

    handleError(new Error("Extension context invalidated."));

    expect(onContextInvalidated).toHaveBeenCalledTimes(1);
    expect(onUnexpectedError).not.toHaveBeenCalled();
  });

  it("suppresses unhandled invalidated-context promise rejections", () => {
    const handleError = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleExtensionContextUnhandledRejection(
      {
        reason: new Error("Extension context invalidated."),
        preventDefault,
      },
      handleError,
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
  });
});
