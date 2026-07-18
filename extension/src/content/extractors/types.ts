import type { JobPost } from "../../shared/job";

export type JobPageExtractor = {
  matches: (url: URL) => boolean;
  extract: () => JobPost;
};
