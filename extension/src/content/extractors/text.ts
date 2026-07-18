export function normalizeInlineText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMultilineText(value: string): string {
  const lines = value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
