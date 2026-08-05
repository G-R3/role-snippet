import type { JobPost, JobPostField } from "../shared/job";
import { emptyJobPost, JOB_POST_FIELDS } from "../shared/job";

export type JobPostInputElements = Record<JobPostField, { value: string }>;

export function writeToInputs(
  inputs: JobPostInputElements,
  jobPost: JobPost,
): void {
  for (const field of JOB_POST_FIELDS) {
    inputs[field].value = jobPost[field];
  }
}

export function readFromInputs(inputs: JobPostInputElements): JobPost {
  const jobPost = { ...emptyJobPost };

  for (const field of JOB_POST_FIELDS) {
    jobPost[field] = inputs[field].value;
  }

  return jobPost;
}
