import { NOTION_BACKEND_JOBS_URL, ROLE_SNIPPET_API_KEY } from "./shared/config";
import {
  addFiledJob,
  FILED_JOBS_KEY,
  type FiledJobs,
  getFiledJobKey,
  parseFiledJobs,
  readFiledJobs,
} from "./shared/filedJobs";
import type { JobPost } from "./shared/job";
import {
  type ExtensionRequest,
  NOTION_UNREACHABLE_ERROR,
  SYNC_JOB_POST_MESSAGE,
  type SyncJobPostResponse,
} from "./shared/messages";

function isSyncJobPostResponse(value: unknown): value is SyncJobPostResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SyncJobPostResponse>;
  return typeof candidate.ok === "boolean";
}

async function syncJobPost(jobPost: JobPost): Promise<SyncJobPostResponse> {
  try {
    const response = await fetch(NOTION_BACKEND_JOBS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Role-Snippet-Key": ROLE_SNIPPET_API_KEY,
      },
      body: JSON.stringify(jobPost),
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const error =
        isSyncJobPostResponse(payload) && !payload.ok
          ? payload.error
          : "Failed to add job to Notion.";

      return {
        ok: false,
        error,
      };
    }

    if (isSyncJobPostResponse(payload)) {
      return payload;
    }

    return {
      ok: true,
    };
  } catch {
    // fetch only throws when the request never got an answer.
    return {
      ok: false,
      error: NOTION_UNREACHABLE_ERROR,
    };
  }
}

// Moss, the popup's "filed" color, as hex for the badge API.
const FILED_BADGE_COLOR = "#3b723e";

// Recorded here, not in the popup, so it survives the popup closing mid-sync.
async function recordFiledJob(
  jobPost: JobPost,
  response: SyncJobPostResponse,
): Promise<void> {
  const key = getFiledJobKey(jobPost.sourceUrl);

  if (!response.ok || !key) {
    return;
  }

  const filedJobs = await readFiledJobs();
  await chrome.storage.local.set({
    [FILED_JOBS_KEY]: addFiledJob(filedJobs, key, {
      filedAt: new Date().toISOString(),
      notionUrl: response.notionPage?.url,
    }),
  });
}

async function updateBadge(
  tabId: number,
  url: string | undefined,
  filedJobs?: FiledJobs,
): Promise<void> {
  const key = getFiledJobKey(url);
  const isFiled = key
    ? Boolean((filedJobs ?? (await readFiledJobs()))[key])
    : false;

  await chrome.action.setBadgeText({ tabId, text: isFiled ? "✓" : "" });
}

async function updateActiveTabBadges(filedJobs: FiledJobs): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true });
  await Promise.all(
    tabs.map((tab) =>
      tab.id === undefined
        ? undefined
        : updateBadge(tab.id, tab.url, filedJobs),
    ),
  );
}

function setBadgeColors(): void {
  void chrome.action.setBadgeBackgroundColor({ color: FILED_BADGE_COLOR });
  void chrome.action.setBadgeTextColor({ color: "#ffffff" });
}

chrome.runtime.onInstalled.addListener(setBadgeColors);
chrome.runtime.onStartup.addListener(setBadgeColors);

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs
    .get(tabId)
    .then((tab) => updateBadge(tabId, tab.url))
    .catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    void updateBadge(tabId, tab.url).catch(() => undefined);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const change = changes[FILED_JOBS_KEY];

  if (areaName === "local" && change) {
    void updateActiveTabBadges(parseFiledJobs(change.newValue)).catch(
      () => undefined,
    );
  }
});

chrome.runtime.onMessage.addListener(
  (
    request: ExtensionRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: SyncJobPostResponse) => void,
  ) => {
    if (request.type !== SYNC_JOB_POST_MESSAGE) {
      return false;
    }

    void syncJobPost(request.jobPost).then(async (response) => {
      await recordFiledJob(request.jobPost, response).catch(() => undefined);
      sendResponse(response);
    });
    return true;
  },
);
