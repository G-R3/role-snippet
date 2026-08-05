export const JOB_POST_FIELDS = [
  "sourceUrl",
  "title",
  "company",
  "location",
  "description",
  "notes",
] as const;

export type JobPostField = (typeof JOB_POST_FIELDS)[number];
export type JobPost = Record<JobPostField, string>;

export function isJobPost(value: unknown): value is JobPost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return JOB_POST_FIELDS.every((field) => typeof candidate[field] === "string");
}
