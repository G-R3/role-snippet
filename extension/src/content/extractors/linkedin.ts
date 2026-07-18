import type { JobPost } from "../../shared/job";
import type { JobPageExtractor } from "./types";

const JOB_PATH_PATTERN = /^\/jobs\//;

const TITLE_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  ".top-card-layout__title",
  "[data-test-job-title]",
  "h1",
];

const COMPANY_SELECTORS = [
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  ".topcard__org-name-link",
  ".topcard__flavor--black-link",
  "[data-test-job-company-name]",
];

const DESCRIPTION_SELECTORS = [
  "#job-details",
  ".jobs-description__content",
  ".jobs-box__html-content",
  ".description__text",
  "[data-test-job-description]",
];

// Collapses short text fields like title and company into a single clean line.
function normalizeInlineText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Preserves meaningful job description line breaks while removing UI noise.
function normalizeMultilineText(value: string): string {
  const lines = value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line && !/^show (more|less)$/i.test(line));

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Reads normalized one-line text from a DOM element.
function getElementInlineText(element: HTMLElement): string {
  return normalizeInlineText(element.innerText || element.textContent || "");
}

// Reads normalized multi-line text from a DOM element.
function getElementMultilineText(element: HTMLElement): string {
  return normalizeMultilineText(element.innerText || element.textContent || "");
}

// Removes the common section heading from extracted description text.
function cleanDescriptionText(value: string): string {
  return value.replace(/^About the job\n?/i, "").trim();
}

// Returns a typed HTML element for selector-based extraction.
function queryHTMLElement(selector: string): HTMLElement | null {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
}

// Returns typed HTML elements for broader fallback searches.
function queryHTMLElements(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  );
}

// Pulls the active job id from the URL so fallbacks target the selected job.
function getCurrentJobId(): string {
  const currentJobId = new URLSearchParams(window.location.search).get(
    "currentJobId",
  );

  if (currentJobId) {
    return currentJobId;
  }

  const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
  return match?.[1] ?? "";
}

// Tries known job-page CSS selectors before using structural fallbacks.
function getFirstText(selectors: string[]): string {
  for (const selector of selectors) {
    const element = queryHTMLElement(selector);
    const text = element ? getElementInlineText(element) : "";

    if (text) {
      return text;
    }
  }

  return "";
}

// Parses anchor URLs safely for matching job links.
function getAnchorUrl(anchor: HTMLAnchorElement): URL | null {
  try {
    return new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
}

// Finds job detail links, optionally limited to the active job id.
function getJobViewAnchors(jobId: string): HTMLAnchorElement[] {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]'),
  );

  if (!jobId) {
    return anchors;
  }

  return anchors.filter((anchor) => {
    const url = getAnchorUrl(anchor);
    return url?.pathname.replace(/\/$/, "") === `/jobs/view/${jobId}`;
  });
}

// Uses the active /jobs/view/<id> link as a title fallback.
function getJobTitleFromLinks(jobId: string): string {
  for (const anchor of getJobViewAnchors(jobId)) {
    const text = getElementInlineText(anchor);

    if (text) {
      return text;
    }
  }

  return "";
}

// Extracts company from stable links, accessibility labels, or logo alt text.
function getCompanyNameFromElement(element: HTMLElement): string {
  const companyLink = element.querySelector<HTMLAnchorElement>(
    'a[href*="/company/"]',
  );
  const companyLinkText = companyLink ? getElementInlineText(companyLink) : "";

  if (companyLinkText) {
    return companyLinkText;
  }

  const ariaElement = element.querySelector<HTMLElement>(
    '[aria-label^="Company,"]',
  );
  const ariaLabel = ariaElement?.getAttribute("aria-label") ?? "";
  const ariaMatch = ariaLabel.match(/^Company,\s*(.+?)\.?$/);

  if (ariaMatch?.[1]) {
    return normalizeInlineText(ariaMatch[1]);
  }

  const logo = element.querySelector<HTMLImageElement>(
    'img[alt^="Company logo for,"]',
  );
  const logoAlt = logo?.alt ?? "";
  const logoMatch = logoAlt.match(/^Company logo for,\s*(.+?)\.?$/);

  return logoMatch?.[1] ? normalizeInlineText(logoMatch[1]) : "";
}

// Walks up from the title link to find the selected job's summary block.
function findJobSummaryContainer(jobId: string): HTMLElement | null {
  for (const titleAnchor of getJobViewAnchors(jobId)) {
    let current = titleAnchor.parentElement;

    for (let depth = 0; current && depth < 8; depth += 1) {
      if (
        current.querySelector('a[href*="/jobs/view/"]') &&
        current.querySelector('a[href*="/company/"], [aria-label^="Company,"]')
      ) {
        return current;
      }

      current = current.parentElement;
    }
  }

  return null;
}

// Reads company details from the active job's summary block.
function getCompanyFromJobSummary(jobId: string): string {
  const summaryContainer = findJobSummaryContainer(jobId);
  return summaryContainer ? getCompanyNameFromElement(summaryContainer) : "";
}

// Uses older description selectors as a compatibility fallback.
function getDescriptionText(): string {
  for (const selector of DESCRIPTION_SELECTORS) {
    const element = queryHTMLElement(selector);
    const text = element
      ? cleanDescriptionText(getElementMultilineText(element))
      : "";

    if (text) {
      return text;
    }
  }

  return "";
}

// Uses newer About-the-job containers that are tied to the active job id.
function getDescriptionFromAboutSection(jobId: string): string {
  const selectors = [
    jobId ? `[componentkey="JobDetails_AboutTheJob_${jobId}"]` : "",
    '[componentkey^="JobDetails_AboutTheJob"]',
    '[data-sdui-component*="aboutTheJob"]',
  ].filter(Boolean);

  for (const selector of selectors) {
    const element = queryHTMLElement(selector);
    const text = element ? getElementMultilineText(element) : "";

    if (text) {
      return cleanDescriptionText(text);
    }
  }

  const aboutHeading = queryHTMLElements("h2").find(
    (heading) =>
      getElementInlineText(heading).toLowerCase() === "about the job",
  );

  let current = aboutHeading?.parentElement ?? null;

  for (let depth = 0; current && depth < 5; depth += 1) {
    const text = cleanDescriptionText(getElementMultilineText(current));

    if (text) {
      return text;
    }

    current = current.parentElement;
  }

  return "";
}

export const linkedInExtractor: JobPageExtractor = {
  matches(url) {
    return (
      url.hostname.endsWith("linkedin.com") &&
      JOB_PATH_PATTERN.test(url.pathname)
    );
  },

  extract(): JobPost {
    const jobId = getCurrentJobId();

    return {
      sourceUrl: window.location.href,
      title: getFirstText(TITLE_SELECTORS) || getJobTitleFromLinks(jobId),
      company:
        getFirstText(COMPANY_SELECTORS) || getCompanyFromJobSummary(jobId),
      description:
        getDescriptionFromAboutSection(jobId) || getDescriptionText(),
      notes: "",
      extractedAt: new Date().toISOString(),
    };
  },
};
