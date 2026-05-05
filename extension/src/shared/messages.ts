import type { JobPost } from "./job";

export const EXTRACT_JOB_POST_MESSAGE = "LINK_SNAGGED_IN_EXTRACT_JOB_POST";
export const SYNC_JOB_POST_MESSAGE = "LINK_SNAGGED_IN_SYNC_JOB_POST";

export type ExtractJobPostRequest = {
  type: typeof EXTRACT_JOB_POST_MESSAGE;
};

export type ExtractJobPostResponse =
  | {
      ok: true;
      jobPost: JobPost;
    }
  | {
      ok: false;
      error: string;
    };

export type SyncJobPostRequest = {
  type: typeof SYNC_JOB_POST_MESSAGE;
  jobPost: JobPost;
};

export type SyncJobPostResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export type ExtensionRequest = ExtractJobPostRequest | SyncJobPostRequest;
