import type { JobPost } from "./shared/job";
import { NOTION_BACKEND_JOBS_URL } from "./shared/config";
import {
  SYNC_JOB_POST_MESSAGE,
  type ExtensionRequest,
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
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not reach the Notion backend.",
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.info("LinkSnaggedIn installed.");
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

    void syncJobPost(request.jobPost).then(sendResponse);
    return true;
  },
);
