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

export const REQUIRED_JOB_POST_FIELDS = [
  "title",
  "company",
  "description",
] as const satisfies readonly JobPostField[];

export type RequiredJobPostField = (typeof REQUIRED_JOB_POST_FIELDS)[number];

export function getMissingRequiredJobPostFields(
  jobPost: JobPost,
): RequiredJobPostField[] {
  return REQUIRED_JOB_POST_FIELDS.filter((field) => !jobPost[field].trim());
}

export function hasMinimumJobPostFields(jobPost: JobPost): boolean {
  return getMissingRequiredJobPostFields(jobPost).length === 0;
}
