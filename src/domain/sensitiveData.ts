export type SensitiveDataKind = "email" | "phone" | "apiKey" | "address" | "financialNumber";

export interface SensitiveDataFinding {
  kind: SensitiveDataKind;
  label: string;
  sample: string;
}

const detectors: Array<{
  kind: SensitiveDataKind;
  label: string;
  pattern: RegExp;
}> = [
  {
    kind: "email",
    label: "Email address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    kind: "phone",
    label: "Phone number",
    pattern: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
  },
  {
    kind: "apiKey",
    label: "API key or token",
    pattern: /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|xox[baprs]-[A-Za-z0-9-]{16,}|AKIA[0-9A-Z]{16}|(?:api[_-]?key|token|secret)\s*[:=]\s*[A-Za-z0-9._-]{12,})\b/g,
  },
  {
    kind: "address",
    label: "Street address",
    pattern: /\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,5}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b/g,
  },
  {
    kind: "financialNumber",
    label: "Financial number",
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
  },
];

function normalizeSample(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function maybeCreditCard(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19 || /^0+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function findSensitiveData(text: string): SensitiveDataFinding[] {
  const findings: SensitiveDataFinding[] = [];
  const seen = new Set<string>();

  for (const detector of detectors) {
    for (const match of text.matchAll(detector.pattern)) {
      const rawSample = match[0] ?? "";
      if (detector.kind === "financialNumber" && !maybeCreditCard(rawSample)) {
        continue;
      }

      const sample = normalizeSample(rawSample);
      const key = `${detector.kind}:${sample.toLowerCase()}`;
      if (!sample || seen.has(key)) {
        continue;
      }

      seen.add(key);
      findings.push({
        kind: detector.kind,
        label: detector.label,
        sample,
      });
    }
  }

  return findings;
}

export function sensitiveDataWarningText(findings: SensitiveDataFinding[]) {
  if (findings.length === 0) {
    return "";
  }

  const lines = findings.slice(0, 6).map((finding) => `- ${finding.label}: ${finding.sample}`);
  const remaining = findings.length > lines.length ? `\n- ${findings.length - lines.length} more finding(s)` : "";

  return `Sensitive data warning\n\nAI Buddy found possible private data in this prompt:\n${lines.join("\n")}${remaining}\n\nContinue sending?`;
}
