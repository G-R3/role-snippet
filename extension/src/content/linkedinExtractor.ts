import type { JobPost } from "../shared/job";
import {
  EXTRACT_JOB_POST_MESSAGE,
  type ExtractJobPostResponse,
  type ExtensionRequest
} from "../shared/messages";

const LINKEDIN_JOB_PATH_PATTERN = /^\/jobs\//;

const TITLE_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  ".top-card-layout__title",
  "[data-test-job-title]",
  "h1"
];

const COMPANY_SELECTORS = [
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  ".topcard__org-name-link",
  ".topcard__flavor--black-link",
  "[data-test-job-company-name]"
];

const DESCRIPTION_SELECTORS = [
  "#job-details",
  ".jobs-description__content",
  ".jobs-box__html-content",
  ".description__text",
  "[data-test-job-description]"
];

function isLinkedInJobPage(): boolean {
  return window.location.hostname.endsWith("linkedin.com") && LINKEDIN_JOB_PATH_PATTERN.test(window.location.pathname);
}

function normalizeInlineText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: string): string {
  const lines = value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line && !/^show (more|less)$/i.test(line));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function queryHTMLElement(selector: string): HTMLElement | null {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
}

function getFirstText(selectors: string[]): string {
  for (const selector of selectors) {
    const element = queryHTMLElement(selector);
    const text = element ? normalizeInlineText(element.innerText || element.textContent || "") : "";

    if (text) {
      return text;
    }
  }

  return "";
}

function getDescriptionText(): string {
  for (const selector of DESCRIPTION_SELECTORS) {
    const element = queryHTMLElement(selector);
    const text = element ? normalizeMultilineText(element.innerText || element.textContent || "") : "";

    if (text) {
      return text;
    }
  }

  return "";
}

function extractLinkedInJobPost(): ExtractJobPostResponse {
  if (!isLinkedInJobPage()) {
    return {
      ok: false,
      error: "Open a LinkedIn job post page before extracting."
    };
  }

  const jobPost: JobPost = {
    sourceUrl: window.location.href,
    title: getFirstText(TITLE_SELECTORS),
    company: getFirstText(COMPANY_SELECTORS),
    description: getDescriptionText(),
    extractedAt: new Date().toISOString()
  };

  if (!jobPost.title && !jobPost.company && !jobPost.description) {
    return {
      ok: false,
      error: "Could not find job details on this LinkedIn page."
    };
  }

  return {
    ok: true,
    jobPost
  };
}

chrome.runtime.onMessage.addListener(
  (request: ExtensionRequest, _sender: chrome.runtime.MessageSender, sendResponse: (response: ExtractJobPostResponse) => void) => {
    if (request.type !== EXTRACT_JOB_POST_MESSAGE) {
      return false;
    }

    sendResponse(extractLinkedInJobPost());
    return false;
  }
);
