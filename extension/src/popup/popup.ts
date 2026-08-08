import type { JobPost } from "../shared/job";
import {
  emptyJobPost,
  getMissingRequiredJobPostFields,
  hasMinimumJobPostFields,
  isJobPost,
  JOB_POST_FIELDS,
  REQUIRED_JOB_POST_FIELDS,
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
const feedbackElement = getElement<HTMLElement>("feedback");
const feedbackIcon = getElement<HTMLElement>("feedback-icon");
const statusElement = getElement<HTMLParagraphElement>("status");
const reextractButton = getElement<HTMLButtonElement>("reextract-button");
const fieldElements = {
  sourceUrl: getElement<HTMLInputElement>("url-value"),
  title: getElement<HTMLInputElement>("title-value"),
  company: getElement<HTMLInputElement>("company-value"),
  location: getElement<HTMLInputElement>("location-value"),
  description: getElement<HTMLTextAreaElement>("description-value"),
  notes: getElement<HTMLTextAreaElement>("notes-value"),
} satisfies JobPostInputElements;
const requiredFieldElements = REQUIRED_JOB_POST_FIELDS.map((field) => ({
  field,
  container: getElement<HTMLElement>(`${field}-field`),
  warning: getElement<HTMLElement>(`${field}-warning`),
}));

type ActionState = "initializing" | "extracting" | "idle" | "adding" | "added";
type StatusTone = "neutral" | "warning" | "success" | "error";

const STATUS_ICONS = {
  neutral: "·",
  warning: "⚠",
  success: "✓",
  error: "!",
} satisfies Record<StatusTone, string>;

let actionState: ActionState = "initializing";
let statusTone: StatusTone = "neutral";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing popup element: ${id}`);
  }

  return element as T;
}

function setStatus(message: string, tone: StatusTone = "neutral"): void {
  statusTone = tone;
  statusElement.textContent = message;
  feedbackIcon.textContent = STATUS_ICONS[tone];
  feedbackElement.className =
    tone === "neutral" ? "feedback" : `feedback ${tone}`;
  feedbackElement.setAttribute("role", tone === "error" ? "alert" : "status");
  feedbackElement.setAttribute(
    "aria-live",
    tone === "error" ? "assertive" : "polite",
  );
}

function renderFormState(): void {
  const missingFields = new Set(
    getMissingRequiredJobPostFields(readFromInputs(fieldElements)),
  );

  for (const { field, container, warning } of requiredFieldElements) {
    const showWarning =
      actionState !== "initializing" && missingFields.has(field);
    const input = fieldElements[field];
    container.classList.toggle("invalid", showWarning);
    warning.hidden = !showWarning;
    input.setAttribute("aria-invalid", String(showWarning));

    if (showWarning) {
      input.setAttribute("aria-describedby", `${field}-warning`);
    } else {
      input.removeAttribute("aria-describedby");
    }
  }

  addToNotionButton.textContent =
    actionState === "initializing" || actionState === "extracting"
      ? "Extracting…"
      : actionState === "adding"
        ? "Adding…"
        : actionState === "added"
          ? "✓ Added"
          : "Add to Notion";
  addToNotionButton.disabled = actionState !== "idle" || missingFields.size > 0;
  addToNotionButton.classList.toggle("added", actionState === "added");
  reextractButton.textContent =
    actionState === "extracting" ? "Extracting…" : "Extract again";
  reextractButton.disabled =
    actionState === "initializing" ||
    actionState === "extracting" ||
    actionState === "adding";
}

function showValidationStatus(): void {
  const missingCount = getMissingRequiredJobPostFields(
    readFromInputs(fieldElements),
  ).length;

  if (missingCount > 0) {
    setStatus(
      `Review ${missingCount} required ${missingCount === 1 ? "field" : "fields"} before adding.`,
      "warning",
    );
    return;
  }

  setStatus("Ready to add", "success");
}

function setActionState(state: ActionState): void {
  actionState = state;
  renderFormState();
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
  if (actionState !== "idle") {
    return;
  }

  const jobPost = readFromInputs(fieldElements);

  if (!hasMinimumJobPostFields(jobPost)) {
    renderFormState();
    showValidationStatus();
    return;
  }

  setActionState("adding");
  setStatus("Adding job to Notion…");

  try {
    const response = await sendSyncMessage(jobPost);

    if (!response.ok) {
      setActionState("idle");
      setStatus(response.error, "error");
      return;
    }

    setActionState("added");
    setStatus("Job added to Notion.", "success");
  } catch {
    setActionState("idle");
    setStatus("Could not add the job to Notion. Try again.", "error");
  }
}

async function reextractCurrentTab(): Promise<void> {
  if (
    actionState === "initializing" ||
    actionState === "extracting" ||
    actionState === "adding"
  ) {
    return;
  }

  setActionState("extracting");

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      setStatus("Could not find the active tab.", "error");
      return;
    }

    await extractFromTab(tab.id);
  } catch {
    setStatus("Could not extract job details. Try again.", "error");
  } finally {
    setActionState("idle");
  }
}

writeToInputs(fieldElements, emptyJobPost);
renderFormState();

addToNotionButton.addEventListener("click", () => {
  void addCurrentJobPostToNotion();
});

reextractButton.addEventListener("click", () => {
  void reextractCurrentTab();
});

for (const field of JOB_POST_FIELDS) {
  fieldElements[field].addEventListener("input", () => {
    renderFormState();

    if (actionState === "idle") {
      showValidationStatus();
    }

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
    setActionState(disabled ? "initializing" : "idle");

    if (!disabled && statusTone !== "error") {
      showValidationStatus();
    }
  },
});
