import type { JobPost } from "../shared/job";
import {
  EXTRACT_JOB_POST_MESSAGE,
  type ExtensionRequest,
  type ExtractJobPostResponse,
} from "../shared/messages";
import { findJobPageExtractor } from "./extractors/registry";

// Selects the extractor for the current provider and preserves a shared response shape.
function extractJobPost(): ExtractJobPostResponse {
  const extractor = findJobPageExtractor(new URL(window.location.href));

  if (!extractor) {
    return {
      ok: false,
      error: "Open a supported job post page before extracting.",
    };
  }

  const jobPost: JobPost = {
    sourceUrl: window.location.href,
    ...extractor.extract(),
    notes: "",
    extractedAt: new Date().toISOString(),
  };

  if (!jobPost.title && !jobPost.company && !jobPost.description) {
    return {
      ok: false,
      error: "Could not find job details on this page.",
    };
  }

  return {
    ok: true,
    jobPost,
  };
}

chrome.runtime.onMessage.addListener(
  (
    request: ExtensionRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtractJobPostResponse) => void,
  ) => {
    if (request.type !== EXTRACT_JOB_POST_MESSAGE) {
      return false;
    }

    sendResponse(extractJobPost());
    return false;
  },
);
