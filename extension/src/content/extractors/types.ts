import type { JobPost } from "../../shared/job";
import type { JobSource } from "../../shared/jobSource";

export type ExtractedJobDetails = Pick<
  JobPost,
  "title" | "company" | "description"
>;

export type JobPageExtractor = {
  extract: () => ExtractedJobDetails;
};

export type JobPageExtractors = Record<JobSource, JobPageExtractor>;
