import type { JobPost, JobPostField } from "../../../backend/src/jobPost";

export { isJobPost, JOB_POST_FIELDS } from "../../../backend/src/jobPost";
export type { JobPost, JobPostField };

export const emptyJobPost: JobPost = {
  sourceUrl: "",
  title: "",
  company: "",
  location: "",
  description: "",
  notes: "",
};

export function hasMinimumJobPostFields(jobPost: JobPost): boolean {
  return Boolean(
    jobPost.title.trim() &&
      jobPost.company.trim() &&
      jobPost.description.trim(),
  );
}
