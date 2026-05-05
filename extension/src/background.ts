import type { JobPost } from "./shared/job";
import {
  SYNC_JOB_POST_MESSAGE,
  type ExtensionRequest,
  type SyncJobPostResponse
} from "./shared/messages";

async function syncJobPost(_jobPost: JobPost): Promise<SyncJobPostResponse> {
  return {
    ok: false,
    error: "Automatic Notion sync is not implemented in v1."
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.info("LinkSnaggedIn installed.");
});

chrome.runtime.onMessage.addListener(
  (request: ExtensionRequest, _sender: chrome.runtime.MessageSender, sendResponse: (response: SyncJobPostResponse) => void) => {
    if (request.type !== SYNC_JOB_POST_MESSAGE) {
      return false;
    }

    void syncJobPost(request.jobPost).then(sendResponse);
    return true;
  }
);
