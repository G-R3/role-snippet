import { isJsonRecord, type JsonRecord } from "./json";
import {
  htmlToMultilineText,
  normalizeInlineText,
  normalizeMultilineText,
} from "./text";
import type { ExtractedJobDetails, JobPageExtractor } from "./types";

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
      // Ignore malformed structured data and continue to DOM fallbacks.
    }
  }

  return null;
}

function getElementInlineTextFromElement(element: HTMLElement): string {
  return normalizeInlineText(element.innerText || element.textContent || "");
}

function getElementInlineText(selector: string): string {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement
    ? getElementInlineTextFromElement(element)
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

function getLocationFromSchema(value: unknown): string {
  if (!isJsonRecord(value) || !isJsonRecord(value.address)) {
    return "";
  }

  const address = value.address;

  return ["addressLocality", "addressRegion", "addressCountry"]
    .map((field) => address[field])
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function getLocationFromDom(): string {
  const locationHeading = Array.from(document.querySelectorAll("h2")).find(
    (heading) => getElementInlineTextFromElement(heading) === "Location",
  );
  const location = locationHeading?.parentElement?.querySelector("p");

  return location instanceof HTMLElement
    ? getElementInlineTextFromElement(location)
    : "";
}

function getOrganizationName(value: unknown): string {
  return isJsonRecord(value) && typeof value.name === "string"
    ? value.name.trim()
    : "";
}

export const ashbyExtractor: JobPageExtractor = {
  extract(): ExtractedJobDetails {
    const schema = getJobPostingFromSchema();

    return {
      title:
        (typeof schema?.title === "string" ? schema.title.trim() : "") ||
        getElementInlineText(".ashby-job-posting-heading"),
      company:
        getOrganizationName(schema?.hiringOrganization) || getCompanyFromDom(),
      location:
        getLocationFromSchema(schema?.jobLocation) || getLocationFromDom(),
      description:
        htmlToMultilineText(
          typeof schema?.description === "string"
            ? schema.description.trim()
            : "",
        ) || getDescriptionFromDom(),
    };
  },
};
