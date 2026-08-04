import type { JobPost, JobPostField } from "../../../backend/src/jobPost";

export { isJobPost } from "../../../backend/src/jobPost";
export type { JobPost, JobPostField };

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
