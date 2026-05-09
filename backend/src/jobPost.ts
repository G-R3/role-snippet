export type JobPost = {
  sourceUrl: string;
  title: string;
  company: string;
  description: string;
  notes: string;
  extractedAt: string;
};

export function isJobPost(value: unknown): value is JobPost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof JobPost, unknown>>;
  return (
    typeof candidate.sourceUrl === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.notes === "string" &&
    typeof candidate.extractedAt === "string"
  );
}
