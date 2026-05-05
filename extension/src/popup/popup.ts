import type { JobPost, JobPostField } from "../shared/job";
import { hasMinimumJobPostFields } from "../shared/job";
import {
  EXTRACT_JOB_POST_MESSAGE,
  type ExtractJobPostResponse,
  type ExtractJobPostRequest
} from "../shared/messages";
import {
  formatJobPostAsJson,
  formatJobPostAsMarkdown,
  formatJobPostAsPlainText
} from "../shared/notionExport";

let currentJobPost: JobPost | null = null;
const STORED_JOB_POST_KEY = "lastExtractedJobPost";

const extractButton = getElement<HTMLButtonElement>("extract-button");
const copyTitleButton = getElement<HTMLButtonElement>("copy-title-button");
const copyCompanyButton = getElement<HTMLButtonElement>("copy-company-button");
const copyDescriptionButton = getElement<HTMLButtonElement>("copy-description-button");
const copyUrlButton = getElement<HTMLButtonElement>("copy-url-button");
const copyExtractedAtButton = getElement<HTMLButtonElement>("copy-extracted-at-button");
const copyTextButton = getElement<HTMLButtonElement>("copy-text-button");
const copyMarkdownButton = getElement<HTMLButtonElement>("copy-markdown-button");
const copyJsonButton = getElement<HTMLButtonElement>("copy-json-button");
const statusElement = getElement<HTMLParagraphElement>("status");
const previewElement = getElement<HTMLElement>("preview");
const titleElement = getElement<HTMLElement>("title-value");
const companyElement = getElement<HTMLElement>("company-value");
const urlElement = getElement<HTMLElement>("url-value");
const descriptionElement = getElement<HTMLTextAreaElement>("description-value");

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing popup element: ${id}`);
  }

  return element as T;
}

function setStatus(message: string, tone: "neutral" | "success" | "error" = "neutral"): void {
  statusElement.textContent = message;
  statusElement.classList.toggle("success", tone === "success");
  statusElement.classList.toggle("error", tone === "error");
}

function setLoading(isLoading: boolean): void {
  extractButton.disabled = isLoading;
  extractButton.textContent = isLoading ? "Extracting..." : "Extract job post";
}

function setCopyButtonsEnabled(isEnabled: boolean): void {
  copyTitleButton.disabled = !isEnabled;
  copyCompanyButton.disabled = !isEnabled;
  copyDescriptionButton.disabled = !isEnabled;
  copyUrlButton.disabled = !isEnabled;
  copyExtractedAtButton.disabled = !isEnabled;
  copyTextButton.disabled = !isEnabled;
  copyMarkdownButton.disabled = !isEnabled;
  copyJsonButton.disabled = !isEnabled;
}

function renderJobPost(jobPost: JobPost): void {
  currentJobPost = jobPost;
  previewElement.classList.remove("hidden");

  titleElement.textContent = jobPost.title || "Not found";
  companyElement.textContent = jobPost.company || "Not found";
  urlElement.textContent = jobPost.sourceUrl;
  descriptionElement.value = jobPost.description || "Not found";

  setCopyButtonsEnabled(true);
}

function isJobPost(value: unknown): value is JobPost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<JobPostField, unknown>>;
  return (
    typeof candidate.sourceUrl === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.extractedAt === "string"
  );
}

async function saveJobPost(jobPost: JobPost): Promise<void> {
  await chrome.storage.local.set({
    [STORED_JOB_POST_KEY]: jobPost
  });
}

async function restoreSavedJobPost(): Promise<void> {
  const stored = await chrome.storage.local.get(STORED_JOB_POST_KEY);
  const savedJobPost = stored[STORED_JOB_POST_KEY];

  if (!isJobPost(savedJobPost)) {
    return;
  }

  renderJobPost(savedJobPost);
  setStatus("Restored the last extracted job post.", "success");
}

function isLinkedInJobUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.endsWith("linkedin.com") && parsedUrl.pathname.startsWith("/jobs/");
  } catch {
    return false;
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

function sendExtractMessage(tabId: number): Promise<ExtractJobPostResponse> {
  const request: ExtractJobPostRequest = {
    type: EXTRACT_JOB_POST_MESSAGE
  };

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, request, (response: ExtractJobPostResponse | undefined) => {
      const lastError = chrome.runtime.lastError;

      if (lastError) {
        resolve({
          ok: false,
          error: "Could not reach the LinkedIn page. Reload the tab and try again."
        });
        return;
      }

      resolve(
        response ?? {
          ok: false,
          error: "LinkedIn did not return job details."
        }
      );
    });
  });
}

async function extractFromActiveTab(): Promise<void> {
  setLoading(true);
  setStatus("Looking for job details...");

  try {
    const tab = await getActiveTab();

    if (!tab?.id || !isLinkedInJobUrl(tab.url)) {
      setStatus("Open a LinkedIn job post page before extracting.", "error");
      return;
    }

    const response = await sendExtractMessage(tab.id);

    if (!response.ok) {
      setStatus(response.error, "error");
      return;
    }

    renderJobPost(response.jobPost);
    await saveJobPost(response.jobPost);

    const confidenceMessage = hasMinimumJobPostFields(response.jobPost)
      ? "Job post extracted."
      : "Extracted partial job details. Review before copying.";
    setStatus(confidenceMessage, hasMinimumJobPostFields(response.jobPost) ? "success" : "neutral");
  } finally {
    setLoading(false);
  }
}

async function copyCurrentJobPost(formatter: (jobPost: JobPost) => string, label: string): Promise<void> {
  if (!currentJobPost) {
    setStatus("Extract a job post before copying.", "error");
    return;
  }

  await navigator.clipboard.writeText(formatter(currentJobPost));
  setStatus(`${label} copied to clipboard.`, "success");
}

async function copyCurrentJobPostField(field: JobPostField, label: string): Promise<void> {
  if (!currentJobPost) {
    setStatus("Extract a job post before copying.", "error");
    return;
  }

  const value = currentJobPost[field].trim();

  if (!value) {
    setStatus(`${label} is empty.`, "error");
    return;
  }

  await navigator.clipboard.writeText(value);
  setStatus(`${label} copied to clipboard.`, "success");
}

void restoreSavedJobPost();

extractButton.addEventListener("click", () => {
  void extractFromActiveTab();
});

copyTitleButton.addEventListener("click", () => {
  void copyCurrentJobPostField("title", "Title");
});

copyCompanyButton.addEventListener("click", () => {
  void copyCurrentJobPostField("company", "Company");
});

copyDescriptionButton.addEventListener("click", () => {
  void copyCurrentJobPostField("description", "Description");
});

copyUrlButton.addEventListener("click", () => {
  void copyCurrentJobPostField("sourceUrl", "URL");
});

copyExtractedAtButton.addEventListener("click", () => {
  void copyCurrentJobPostField("extractedAt", "Extracted date");
});

copyTextButton.addEventListener("click", () => {
  void copyCurrentJobPost(formatJobPostAsPlainText, "Plain text");
});

copyMarkdownButton.addEventListener("click", () => {
  void copyCurrentJobPost(formatJobPostAsMarkdown, "Markdown");
});

copyJsonButton.addEventListener("click", () => {
  void copyCurrentJobPost(formatJobPostAsJson, "JSON");
});
