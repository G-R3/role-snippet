import { getJobPostingFromJsonLd } from "./jobPostingSchema";
import { isJsonRecord } from "./json";
import { htmlToMultilineText, normalizeInlineText } from "./text";
import type { ExtractedJobDetails, JobPageExtractor } from "./types";

function getSchemaString(value: unknown): string {
  return typeof value === "string" ? normalizeInlineText(value) : "";
}

function getOrganizationName(value: unknown): string {
  return isJsonRecord(value) ? getSchemaString(value.name) : "";
}

function getLocation(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(getLocation).filter(Boolean).join("; ");
  }

  if (!isJsonRecord(value)) {
    return "";
  }

  const address = value.address;

  if (typeof address === "string") {
    return normalizeInlineText(address);
  }

  if (!isJsonRecord(address)) {
    return "";
  }

  return [
    "streetAddress",
    "addressLocality",
    "addressRegion",
    "postalCode",
    "addressCountry",
  ]
    .map((field) => getSchemaString(address[field]))
    .filter(Boolean)
    .join(", ");
}

function getElementText(selector: string): string {
  const element = document.querySelector(selector);

  return element instanceof HTMLElement
    ? normalizeInlineText(element.innerText || element.textContent || "")
    : "";
}

function getDescriptionFromDom(): string {
  const description = document.querySelector("#jobDescriptionText");

  return description instanceof HTMLElement
    ? htmlToMultilineText(description.innerHTML)
    : "";
}

export const indeedExtractor: JobPageExtractor = {
  extract(): ExtractedJobDetails {
    const schema = getJobPostingFromJsonLd();

    return {
      title:
        getSchemaString(schema?.title) ||
        getElementText('[data-testid="jobsearch-JobInfoHeader-title"]'),
      company:
        getOrganizationName(schema?.hiringOrganization) ||
        getElementText('[data-testid="inlineHeader-companyName"]'),
      location:
        getLocation(schema?.jobLocation) ||
        getElementText('[data-testid="inlineHeader-companyLocation"]'),
      description:
        htmlToMultilineText(
          typeof schema?.description === "string" ? schema.description : "",
        ) || getDescriptionFromDom(),
    };
  },
};
