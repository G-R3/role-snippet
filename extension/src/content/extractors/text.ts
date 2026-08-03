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

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DETAILS",
  "DIALOG",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL",
]);
const IGNORED_TAGS = new Set(["NOSCRIPT", "SCRIPT", "STYLE", "TEMPLATE"]);
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export function htmlToMultilineText(
  value: string,
  ownerDocument: Document = document,
): string {
  const container = ownerDocument.createElement("div");
  container.innerHTML = value;
  const parts: string[] = [];

  function appendNodeText(node: Node): void {
    if (node.nodeType === TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return;
    }

    const element = node as Element;

    if (IGNORED_TAGS.has(element.tagName)) {
      return;
    }

    if (element.tagName === "BR") {
      parts.push("\n");
      return;
    }

    if (element.tagName === "LI") {
      parts.push("- ");
    }

    for (const child of element.childNodes) {
      appendNodeText(child);
    }

    if (BLOCK_TAGS.has(element.tagName)) {
      parts.push("\n");
    }
  }

  for (const child of container.childNodes) {
    appendNodeText(child);
  }

  return normalizeMultilineText(parts.join(""));
}
