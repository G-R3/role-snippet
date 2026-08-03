import { describe, expect, test } from "bun:test";
import { isJobPost } from "../backend/src/jobPost";

describe("isJobPost", () => {
  test("requires the shared location field", () => {
    const jobPost = {
      sourceUrl: "https://www.linkedin.com/jobs/view/0000000000",
      title: "Software Engineer",
      company: "Example Company",
      location: "New York, NY",
      description: "Build software.",
      notes: "",
      extractedAt: "2026-08-03T00:00:00.000Z",
    };

    expect(isJobPost(jobPost)).toBe(true);

    const { location: _location, ...jobPostWithoutLocation } = jobPost;
    expect(isJobPost(jobPostWithoutLocation)).toBe(false);
  });
});
