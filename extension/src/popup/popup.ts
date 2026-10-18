import {
  type FiledJob,
  formatFiledDate,
  getFiledJobKey,
  readFiledJobs,
} from "../shared/filedJobs";
import type { JobPost, JobPostField } from "../shared/job";
import {
  emptyJobPost,
  getMissingRequiredJobPostFields,
  isJobPost,
  JOB_POST_FIELDS,
  REQUIRED_JOB_POST_FIELDS,
} from "../shared/job";
import {
  getJobDisplayId,
  getJobSource,
  getJobSourceLabel,
  getJobSourceLabels,
  isSupportedJobPageUrl,
  parseUrl,
} from "../shared/jobSource";
import {
  EXTRACT_JOB_POST_MESSAGE,
  type ExtractJobPostRequest,
  type ExtractJobPostResponse,
  NOTION_UNREACHABLE_ERROR,
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

const popup = getElement<HTMLElement>("popup");
const formElement = getElement<HTMLFormElement>("job-form");
const statusLine = getElement<HTMLElement>("status");
const statusMessage = getElement<HTMLElement>("status-message");
const sourceFooter = getElement<HTMLElement>("source");
const sourceName = getElement<HTMLElement>("source-name");
const sourceDetail = getElement<HTMLElement>("source-detail");
const reextractButton = getElement<HTMLButtonElement>("reextract-button");
const pageNotice = getElement<HTMLParagraphElement>("page-notice");
const addToNotionButton = getElement<HTMLButtonElement>("add-to-notion-button");
const shortcutHint = getElement<HTMLElement>("shortcut-hint");
const fileAgainButton = getElement<HTMLButtonElement>("file-again-button");
const openNotionLink = getElement<HTMLAnchorElement>("open-notion-link");
const fieldElements = {
  sourceUrl: getElement<HTMLInputElement>("url-value"),
  title: getElement<HTMLTextAreaElement>("title-value"),
  company: getElement<HTMLInputElement>("company-value"),
  location: getElement<HTMLInputElement>("location-value"),
  description: getElement<HTMLTextAreaElement>("description-value"),
  notes: getElement<HTMLTextAreaElement>("notes-value"),
} satisfies JobPostInputElements;

// Labels match the Notion properties each field is written to.
const FIELD_NAMES: Partial<Record<JobPostField, string>> = {
  title: "a role",
  company: "a company",
  description: "a description",
};

// The markup's placeholders, restored once a missing field is filled.
const RESTING_PLACEHOLDERS = new Map(
  REQUIRED_JOB_POST_FIELDS.map((field) => [
    field,
    fieldElements[field].placeholder,
  ]),
);

const SUPPORTED_BOARDS = `Role Snippet reads ${new Intl.ListFormat("en", {
  type: "conjunction",
}).format(getJobSourceLabels())}. Fill this one in by hand.`;

type PageState = "reading" | "read" | "failed" | "unsupported";
type FilingState = "ready" | "missing" | "adding" | "filed" | "error";
type NoticeTone = "neutral" | "error";

let pageState: PageState = "reading";
let filingState: FilingState = "ready";
let isInitializing = true;
let hasAttemptedFiling = false;
let activeUrl: URL | null = null;
let filedJob: FiledJob | null = null;
let filingError = "";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing popup element: ${id}`);
  }

  return element as T;
}

// The status line is one short line, so several gaps are counted rather
// than listed; the rows themselves are flagged.
function describeMissingFields(fields: JobPostField[]): string {
  const [onlyField] = fields;

  if (fields.length === 1 && onlyField) {
    return `Add ${FIELD_NAMES[onlyField] ?? onlyField} first`;
  }

  return `Add ${fields.length} missing fields`;
}

function getMissingFields(): JobPostField[] {
  return getMissingRequiredJobPostFields(readFromInputs(fieldElements));
}

function setNotice(message: string, tone: NoticeTone = "neutral"): void {
  pageNotice.textContent = message;
  pageNotice.hidden = message === "";
  pageNotice.dataset.tone = tone;
  pageNotice.setAttribute("role", tone === "error" ? "alert" : "status");
}

function renderPage(): void {
  popup.dataset.page = pageState;
  reextractButton.hidden =
    pageState === "unsupported" || filingState === "filed";
  reextractButton.disabled = isInitializing || pageState === "reading";
  formElement.setAttribute("aria-busy", String(pageState === "reading"));
}

// Where the job came from: the board and its own job ID, or the host of a
// page Role Snippet can't read.
function renderSource(): void {
  const source = activeUrl ? getJobSource(activeUrl) : null;

  sourceName.textContent = source ? getJobSourceLabel(source) : "";
  sourceDetail.textContent = activeUrl
    ? source
      ? (getJobDisplayId(activeUrl) ?? "")
      : activeUrl.host
    : "";
  sourceFooter.hidden = !activeUrl;
}

// The header speaks only when something needs attention or just changed.
// A ready job page says nothing: the button already says what will happen.
function getStatusMessage(missingFields: JobPostField[]): string {
  switch (filingState) {
    case "missing":
      return describeMissingFields(missingFields);
    case "adding":
      return "Filing in Notion…";
    case "filed":
      return filedJob
        ? `Applied ${formatFiledDate(filedJob.filedAt)}`
        : "Applied";
    case "error":
      return filingError;
    case "ready":
      break;
  }

  if (pageState === "reading") {
    const source = activeUrl ? getJobSource(activeUrl) : null;
    return source ? `Reading ${getJobSourceLabel(source)}…` : "Reading…";
  }

  return pageState === "failed" ? "Couldn’t read this page" : "";
}

function renderFields(missingFields: JobPostField[]): void {
  const flaggedFields = new Set(
    hasAttemptedFiling && filingState !== "filed" ? missingFields : [],
  );

  for (const field of REQUIRED_JOB_POST_FIELDS) {
    const input = fieldElements[field];
    const isMissing = flaggedFields.has(field);
    input.closest(".row")?.classList.toggle("is-missing", isMissing);
    input.setAttribute("aria-invalid", String(isMissing));
    input.placeholder = !isMissing
      ? (RESTING_PLACEHOLDERS.get(field) ?? "")
      : pageState === "read"
        ? "Not found on the page"
        : "Required";

    if (isMissing) {
      input.setAttribute("aria-describedby", `${field}-warning`);
    } else {
      input.removeAttribute("aria-describedby");
    }
  }

  for (const field of JOB_POST_FIELDS) {
    fieldElements[field].readOnly = filingState === "filed";
  }
}

function getStatusTone(): string {
  if (filingState === "missing" || pageState === "failed") {
    return "warning";
  }

  return filingState === "error" || filingState === "filed" ? filingState : "";
}

function renderActions(missingFields: JobPostField[]): void {
  popup.dataset.filing = filingState;
  const isFiled = filingState === "filed";
  statusMessage.textContent = getStatusMessage(missingFields);
  statusLine.dataset.tone = getStatusTone();
  // Long backend errors clamp to two lines; the full text stays reachable.
  statusMessage.title = filingState === "error" ? filingError : "";
  statusLine.setAttribute("role", filingState === "error" ? "alert" : "status");
  addToNotionButton.hidden = isFiled;
  addToNotionButton.setAttribute("aria-busy", String(filingState === "adding"));
  fileAgainButton.hidden = !isFiled;
  openNotionLink.hidden = !isFiled || !filedJob?.notionUrl;

  if (filedJob?.notionUrl) {
    openNotionLink.href = filedJob.notionUrl;
  }
}

function render(): void {
  const missingFields = getMissingFields();
  renderPage();
  renderFields(missingFields);
  renderActions(missingFields);
}

function setPageState(state: PageState): void {
  pageState = state;
  render();
}

function setFilingState(state: FilingState): void {
  filingState = state;
  render();
}

function updateScrollEdges(): void {
  popup.classList.toggle("is-scrolled", formElement.scrollTop > 0);
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

async function findFiledJob(sourceUrl: string): Promise<FiledJob | null> {
  const key = getFiledJobKey(sourceUrl);
  return key ? ((await readFiledJobs())[key] ?? null) : null;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

function setCurrentUrl(url: string, preserveDetails: boolean): void {
  writeToInputs(fieldElements, {
    ...(preserveDetails ? readFromInputs(fieldElements) : emptyJobPost),
    sourceUrl: url,
  });

  activeUrl = parseUrl(url);
  const isJobPage = activeUrl !== null && isSupportedJobPageUrl(activeUrl);
  pageState = isJobPage ? "read" : "unsupported";
  setNotice(isJobPage ? "" : SUPPORTED_BOARDS);
  renderSource();
  render();

  // Looked up alongside reading the page, not after it.
  void findFiledJob(url)
    .catch(() => null)
    .then((record) => {
      if (record) {
        filedJob = record;
        filingState = "filed";
        render();
      }
    });
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
              "The tab may have loaded before Role Snippet. Reload it, then read it again.",
          });
          return;
        }

        resolve(
          response ?? {
            ok: false,
            error: "The page didn’t return any job details.",
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
            error: "Role Snippet’s background worker didn’t answer. Try again.",
          });
          return;
        }

        resolve(
          response ?? {
            ok: false,
            error: NOTION_UNREACHABLE_ERROR,
          },
        );
      },
    );
  });
}

async function extractFromTab(tabId: number): Promise<void> {
  setNotice("");
  setPageState("reading");
  const response = await sendExtractMessage(tabId);

  if (!response.ok) {
    setNotice(response.error);
    setPageState("failed");
    return;
  }

  writeToInputs(fieldElements, response.jobPost);
  setPageState("read");

  try {
    await saveJobPost(response.jobPost);
  } catch {
    setNotice(
      "Read the page, but couldn’t keep a copy for next time.",
      "error",
    );
  }
}

function setStatus(message: string, tone: NoticeTone = "neutral"): void {
  if (!activeUrl) {
    pageState = "unsupported";
  }

  setNotice(message, tone);
  render();
}

async function fileCurrentJob(): Promise<void> {
  if (
    isInitializing ||
    filingState === "adding" ||
    filingState === "filed" ||
    pageState === "reading"
  ) {
    return;
  }

  hasAttemptedFiling = true;
  const [firstMissing] = getMissingFields();

  if (firstMissing) {
    setFilingState("missing");
    fieldElements[firstMissing].focus();
    return;
  }

  const jobPost = readFromInputs(fieldElements);
  setFilingState("adding");

  try {
    const response = await sendSyncMessage(jobPost);

    if (!response.ok) {
      filingError = response.error;
      setFilingState("error");
      return;
    }

    filedJob = {
      filedAt: new Date().toISOString(),
      notionUrl: response.notionPage?.url,
    };
    popup.classList.add("just-filed");
    setFilingState("filed");
    (openNotionLink.hidden ? fileAgainButton : openNotionLink).focus();
  } catch {
    filingError = NOTION_UNREACHABLE_ERROR;
    setFilingState("error");
  }
}

async function reextractCurrentTab(): Promise<void> {
  if (isInitializing || pageState === "reading") {
    return;
  }

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      setNotice("Couldn’t find the active tab.", "error");
      setPageState("failed");
      return;
    }

    await extractFromTab(tab.id);
  } catch {
    setNotice("Couldn’t read the page. Try again.", "error");
    setPageState("failed");
  }
}

function fileAgain(): void {
  filedJob = null;
  hasAttemptedFiling = false;
  popup.classList.remove("just-filed");
  setFilingState("ready");
  addToNotionButton.focus();
}

shortcutHint.dataset.platform = /Mac|iPhone|iPad/.test(navigator.userAgent)
  ? "mac"
  : "other";
writeToInputs(fieldElements, emptyJobPost);
render();

formElement.addEventListener("submit", (event) => {
  event.preventDefault();
  void fileCurrentJob();
});

formElement.addEventListener("scroll", updateScrollEdges, { passive: true });
new ResizeObserver(updateScrollEdges).observe(formElement);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) {
    return;
  }

  if (event.metaKey || event.ctrlKey) {
    event.preventDefault();
    void fileCurrentJob();
    return;
  }

  // Enter never files or adds a line break to single-line values.
  const target = event.target;
  if (target instanceof HTMLInputElement || target === fieldElements.title) {
    event.preventDefault();
  }
});

// Clicking anywhere on a row edits its value.
for (const row of formElement.querySelectorAll<HTMLElement>(".row")) {
  row.addEventListener("mousedown", (event) => {
    const value = row.querySelector<HTMLElement>(".value");

    if (value && event.target === row) {
      event.preventDefault();
      value.focus();
    }
  });
}

fieldElements.title.addEventListener("input", () => {
  const title = fieldElements.title;

  if (/\n/.test(title.value)) {
    title.value = title.value.replace(/\s*\n+\s*/g, " ");
  }
});

for (const field of JOB_POST_FIELDS) {
  fieldElements[field].addEventListener("input", () => {
    if (
      filingState === "error" ||
      (filingState === "missing" && getMissingFields().length === 0)
    ) {
      filingState = "ready";
    }

    render();
    void saveJobPost(readFromInputs(fieldElements)).catch(() => {
      setNotice("Couldn’t save your edits.", "error");
    });
  });
}

reextractButton.addEventListener("click", () => {
  void reextractCurrentTab();
});

fileAgainButton.addEventListener("click", fileAgain);

void initializePopup({
  restoreSavedJobPost,
  getActiveTab,
  setCurrentUrl,
  extractFromTab,
  setStatus,
  setSyncDisabled(disabled) {
    isInitializing = disabled;

    if (!disabled && pageState === "reading") {
      pageState = activeUrl ? "read" : "unsupported";
    }

    render();
  },
});
