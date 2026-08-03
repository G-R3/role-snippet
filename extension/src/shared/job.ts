import type { JobPost } from "../../../backend/src/jobPost";

export type { JobPost };

export type JobPostField = keyof JobPost;

export const emptyJobPost: JobPost = {
  sourceUrl: "",
  title: "",
  company: "",
  location: "",
  description: "",
  notes: "",
  extractedAt: "",
};

export function hasMinimumJobPostFields(jobPost: JobPost): boolean {
  return Boolean(
    jobPost.title.trim() &&
      jobPost.company.trim() &&
      jobPost.description.trim(),
  );
}
