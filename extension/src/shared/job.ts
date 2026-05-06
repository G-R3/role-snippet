export type JobPost = {
  sourceUrl: string;
  title: string;
  company: string;
  description: string;
  extractedAt: string;
};

export type JobPostField = keyof JobPost;

export const emptyJobPost: JobPost = {
  sourceUrl: "",
  title: "",
  company: "",
  description: "",
  extractedAt: "",
};

export function hasMinimumJobPostFields(jobPost: JobPost): boolean {
  return Boolean(
    jobPost.title.trim() &&
      jobPost.company.trim() &&
      jobPost.description.trim(),
  );
}
