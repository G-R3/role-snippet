import type { JobPost } from "../../shared/job";
import type { JobPageExtractor } from "./types";

const ASHBY_JOB_PATH_PATTERN =
  /^\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;

type JsonRecord = Record<string, unknown>;

type AshbyAppData = {
  organization?: {
    name?: unknown;
  };
  posting?: {
    descriptionHtml?: unknown;
    title?: unknown;
  };
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInlineText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMultilineText(value: string): string {
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

function isJobPosting(value: JsonRecord): boolean {
  const type = value["@type"];

  return (
    type === "JobPosting" ||
    (Array.isArray(type) && type.some((entry) => entry === "JobPosting"))
  );
}

function getJobPosting(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const jobPosting = getJobPosting(entry);

      if (jobPosting) {
        return jobPosting;
      }
    }

    return null;
  }

  if (!isJsonRecord(value)) {
    return null;
  }

  if (isJobPosting(value)) {
    return value;
  }

  return getJobPosting(value["@graph"]);
}

function getJobPostingFromSchema(): JsonRecord | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );

  for (const script of scripts) {
    try {
      const jobPosting = getJobPosting(JSON.parse(script.textContent ?? ""));

      if (jobPosting) {
        return jobPosting;
      }
    } catch {
      // Ignore malformed structured data and continue to Ashby's page data.
    }
  }

  return null;
}

function getAshbyAppData(): AshbyAppData {
  const appData = (window as Window & { __appData?: unknown }).__appData;
  return isJsonRecord(appData) ? (appData as AshbyAppData) : {};
}

function htmlToMultilineText(value: string): string {
  const container = document.createElement("div");
  container.innerHTML = value;
  const parts: string[] = [];

  function appendNodeText(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }

    if (node.tagName === "LI") {
      parts.push("- ");
    }

    for (const child of node.childNodes) {
      appendNodeText(child);
    }

    if (/^(H[1-6]|LI|P|DIV|UL|OL)$/.test(node.tagName)) {
      parts.push("\n");
    }
  }

  for (const child of container.childNodes) {
    appendNodeText(child);
  }

  return normalizeMultilineText(parts.join(""));
}

function getElementInlineText(selector: string): string {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement
    ? normalizeInlineText(element.innerText || element.textContent || "")
    : "";
}

function getElementMultilineText(selector: string): string {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement
    ? normalizeMultilineText(element.innerText || element.textContent || "")
    : "";
}

function getFirstElementText(
  selectors: string[],
  getText: (selector: string) => string,
): string {
  for (const selector of selectors) {
    const text = getText(selector);

    if (text) {
      return text;
    }
  }

  return "";
}

function getCompanyFromDom(): string {
  const logo = document.querySelector<HTMLImageElement>(
    ".ashby-job-posting-header img[alt]",
  );
  return normalizeInlineText(logo?.alt ?? "");
}

function getDescriptionFromDom(): string {
  const description = getFirstElementText(
    ["#overview [class*='_descriptionText_']", "#overview"],
    getElementMultilineText,
  );

  return description.replace(/\n?Apply for this Job\s*$/i, "").trim();
}

function getOrganizationName(value: unknown): string {
  return isJsonRecord(value) ? getString(value.name) : "";
}

export const ashbyExtractor: JobPageExtractor = {
  matches(url) {
    return (
      url.hostname === "jobs.ashbyhq.com" &&
      ASHBY_JOB_PATH_PATTERN.test(url.pathname)
    );
  },

  extract(): JobPost {
    const schema = getJobPostingFromSchema();
    const appData = getAshbyAppData();

    return {
      sourceUrl: window.location.href,
      title:
        getString(schema?.title) ||
        getString(appData.posting?.title) ||
        getElementInlineText(".ashby-job-posting-heading"),
      company:
        getOrganizationName(schema?.hiringOrganization) ||
        getString(appData.organization?.name) ||
        getCompanyFromDom(),
      description:
        htmlToMultilineText(getString(schema?.description)) ||
        htmlToMultilineText(getString(appData.posting?.descriptionHtml)) ||
        getDescriptionFromDom(),
      notes: "",
      extractedAt: new Date().toISOString(),
    };
  },
};
