import type { JobPost } from "./job";

export const EXTRACT_JOB_POST_MESSAGE = "EXTRACT_JOB_POST";
export const SYNC_JOB_POST_MESSAGE = "SYNC_JOB_POST";

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
      notionPage?: {
        id: string;
        url: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type ExtensionRequest = ExtractJobPostRequest | SyncJobPostRequest;
