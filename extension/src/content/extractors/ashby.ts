import { isJsonRecord, type JsonRecord } from "./json";
import {
  htmlToMultilineText,
  normalizeInlineText,
  normalizeMultilineText,
} from "./text";
import type { ExtractedJobDetails, JobPageExtractor } from "./types";

type AshbyPageData = {
  descriptionHtml: string;
  organizationName: string;
  title: string;
};

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

function getAshbyPageData(): AshbyPageData {
  const appData = (window as Window & { __appData?: unknown }).__appData;

  if (!isJsonRecord(appData)) {
    return {
      descriptionHtml: "",
      organizationName: "",
      title: "",
    };
  }

  const organization = isJsonRecord(appData.organization)
    ? appData.organization
    : null;
  const posting = isJsonRecord(appData.posting) ? appData.posting : null;

  return {
    descriptionHtml:
      typeof posting?.descriptionHtml === "string"
        ? posting.descriptionHtml.trim()
        : "",
    organizationName:
      typeof organization?.name === "string" ? organization.name.trim() : "",
    title: typeof posting?.title === "string" ? posting.title.trim() : "",
  };
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
  return isJsonRecord(value) && typeof value.name === "string"
    ? value.name.trim()
    : "";
}

export const ashbyExtractor: JobPageExtractor = {
  extract(): ExtractedJobDetails {
    const schema = getJobPostingFromSchema();
    const pageData = getAshbyPageData();

    return {
      title:
        (typeof schema?.title === "string" ? schema.title.trim() : "") ||
        pageData.title ||
        getElementInlineText(".ashby-job-posting-heading"),
      company:
        getOrganizationName(schema?.hiringOrganization) ||
        pageData.organizationName ||
        getCompanyFromDom(),
      description:
        htmlToMultilineText(
          typeof schema?.description === "string"
            ? schema.description.trim()
            : "",
        ) ||
        htmlToMultilineText(pageData.descriptionHtml) ||
        getDescriptionFromDom(),
    };
  },
};
