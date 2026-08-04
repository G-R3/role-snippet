import { describe, expect, test } from "bun:test";
import {
  isJobPost,
  JOB_POST_FIELDS,
  type JobPost,
} from "../backend/src/jobPost";

describe("isJobPost", () => {
  const jobPost: JobPost = {
    sourceUrl: "https://www.linkedin.com/jobs/view/0000000000",
    title: "Software Engineer",
    company: "Example Company",
    location: "New York, NY",
    description: "Build software.",
    notes: "",
    extractedAt: "2026-08-03T00:00:00.000Z",
  };

  test("validates every canonical field", () => {
    expect(isJobPost(jobPost)).toBe(true);

    for (const field of JOB_POST_FIELDS) {
      const candidate: Partial<JobPost> = { ...jobPost };
      delete candidate[field];
      expect(isJobPost(candidate)).toBe(false);
    }
  });
});
