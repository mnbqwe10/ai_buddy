import { describe, expect, it } from "vitest";
import { findSensitiveData, sensitiveDataWarningText } from "./sensitiveData";

describe("Sensitive Data Warning", () => {
  it("detects common private data categories", () => {
    const findings = findSensitiveData(
      "Email jane@example.com or call (415) 555-0199. token=abc123def456ghi789. Ship to 123 Market Street. Card 4242 4242 4242 4242.",
    );

    expect(findings.map((finding) => finding.kind)).toEqual([
      "email",
      "phone",
      "apiKey",
      "address",
      "financialNumber",
    ]);
  });

  it("does not flag ordinary numbers as financial numbers", () => {
    const findings = findSensitiveData("Revenue grew 18% in 2026 across 4 regions.");

    expect(findings).toEqual([]);
  });

  it("formats a confirmation warning", () => {
    const warning = sensitiveDataWarningText(findSensitiveData("Contact me at jane@example.com."));

    expect(warning).toContain("Sensitive data warning");
    expect(warning).toContain("Email address");
    expect(warning).toContain("Continue sending?");
  });
});
