import { describe, expect, test } from "bun:test";
import type { JobPost } from "../backend/src/jobPost";
import { buildNotionJobProperties } from "../backend/src/notionJobs";

describe("buildNotionJobProperties", () => {
  test("maps location to the existing Notion column", () => {
    const jobPost: JobPost = {
      sourceUrl: "https://www.linkedin.com/jobs/view/0000000000",
      title: "Widget Engineer",
      company: "Example Company Theta",
      location: "New York, NY",
      description: "Build software.",
      notes: "",
    };

    const properties = buildNotionJobProperties(jobPost, "status");

    expect(properties.Location).toEqual({
      rich_text: [{ text: { content: "New York, NY" } }],
    });
  });
});
