import type { JobPost } from "../shared/job";
import {
  emptyJobPost,
  hasMinimumJobPostFields,
  isJobPost,
  JOB_POST_FIELDS,
} from "../shared/job";
import {
  EXTRACT_JOB_POST_MESSAGE,
  type ExtractJobPostRequest,
  type ExtractJobPostResponse,
  SYNC_JOB_POST_MESSAGE,
  type SyncJobPostRequest,
  type SyncJobPostResponse,
} from "../shared/messages";
import {
  type JobPostInputElements,
  readFromInputs,
  writeToInputs,
} from "./jobPostForm";
import { initializePopup } from "./popupInitialization";

const STORED_JOB_POST_KEY = "lastExtractedJobPost";

const addToNotionButton = getElement<HTMLButtonElement>("add-to-notion-button");
const statusElement = getElement<HTMLParagraphElement>("status");
const fieldElements = {
  sourceUrl: getElement<HTMLInputElement>("url-value"),
  title: getElement<HTMLInputElement>("title-value"),
  company: getElement<HTMLInputElement>("company-value"),
  location: getElement<HTMLInputElement>("location-value"),
  description: getElement<HTMLTextAreaElement>("description-value"),
  notes: getElement<HTMLTextAreaElement>("notes-value"),
} satisfies JobPostInputElements;

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing popup element: ${id}`);
  }

  return element as T;
}

function setStatus(
  message: string,
  tone: "neutral" | "success" | "error" = "neutral",
): void {
  statusElement.textContent = message;
  statusElement.classList.toggle("success", tone === "success");
  statusElement.classList.toggle("error", tone === "error");
}

function setNotionSyncLoading(isLoading: boolean): void {
  addToNotionButton.disabled = isLoading;
  addToNotionButton.textContent = isLoading
    ? "Adding to Notion..."
    : "Add to Notion";
}

async function saveJobPost(jobPost: JobPost): Promise<void> {
  await chrome.storage.local.set({
    [STORED_JOB_POST_KEY]: jobPost,
  });
}

async function restoreSavedJobPost(): Promise<JobPost | null> {
  const stored = await chrome.storage.local.get(STORED_JOB_POST_KEY);
  const savedJobPost = stored[STORED_JOB_POST_KEY];

  if (!isJobPost(savedJobPost)) {
    return null;
  }

  writeToInputs(fieldElements, savedJobPost);
  return savedJobPost;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

function sendExtractMessage(tabId: number): Promise<ExtractJobPostResponse> {
  const request: ExtractJobPostRequest = {
    type: EXTRACT_JOB_POST_MESSAGE,
  };

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      request,
      (response: ExtractJobPostResponse | undefined) => {
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          resolve({
            ok: false,
            error:
              "Could not reach the job page. Reload the tab and try again.",
          });
          return;
        }

        resolve(
          response ?? {
            ok: false,
            error: "The page did not return job details.",
          },
        );
      },
    );
  });
}

function sendSyncMessage(jobPost: JobPost): Promise<SyncJobPostResponse> {
  const request: SyncJobPostRequest = {
    type: SYNC_JOB_POST_MESSAGE,
    jobPost,
  };

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      request,
      (response: SyncJobPostResponse | undefined) => {
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          resolve({
            ok: false,
            error: "Could not reach the extension background worker.",
          });
          return;
        }

        resolve(
          response ?? {
            ok: false,
            error: "The Notion sync did not return a response.",
          },
        );
      },
    );
  });
}

async function extractFromTab(tabId: number): Promise<void> {
  setStatus("Looking for job details...");
  const response = await sendExtractMessage(tabId);

  if (!response.ok) {
    setStatus(response.error, "error");
    return;
  }

  writeToInputs(fieldElements, response.jobPost);

  try {
    await saveJobPost(response.jobPost);
  } catch {
    setStatus("Job extracted, but could not save it.", "error");
    return;
  }

  const confidenceMessage = hasMinimumJobPostFields(response.jobPost)
    ? "Job post extracted."
    : "Extracted partial job details. Review before adding to Notion.";
  setStatus(
    confidenceMessage,
    hasMinimumJobPostFields(response.jobPost) ? "success" : "neutral",
  );
}

async function addCurrentJobPostToNotion(): Promise<void> {
  const jobPost = readFromInputs(fieldElements);

  if (!hasMinimumJobPostFields(jobPost)) {
    setStatus(
      "Add a title, company, and description before adding to Notion.",
      "error",
    );
    return;
  }

  setNotionSyncLoading(true);
  setStatus("Adding job to Notion...");

  try {
    const response = await sendSyncMessage(jobPost);

    if (!response.ok) {
      setStatus(response.error, "error");
      return;
    }

    setStatus("Added job to Notion.", "success");
  } finally {
    setNotionSyncLoading(false);
  }
}

writeToInputs(fieldElements, emptyJobPost);

addToNotionButton.addEventListener("click", () => {
  void addCurrentJobPostToNotion();
});

for (const field of JOB_POST_FIELDS) {
  fieldElements[field].addEventListener("input", () => {
    void saveJobPost(readFromInputs(fieldElements)).catch(() => {
      setStatus("Could not save changes.", "error");
    });
  });
}

void initializePopup({
  restoreSavedJobPost,
  getActiveTab,
  extractFromTab,
  setStatus,
  setSyncDisabled(disabled) {
    addToNotionButton.disabled = disabled;
  },
});
