import { describe, expect, test } from "bun:test";
import {
  addFiledJob,
  formatFiledDate,
  getFiledJobKey,
  parseFiledJobs,
} from "../extension/src/shared/filedJobs";

describe("getFiledJobKey", () => {
  test("uses the board identity so tracking parameters don't matter", () => {
    expect(
      getFiledJobKey("https://www.linkedin.com/jobs/view/1234567890/?trk=abc"),
    ).toBe("linkedin:1234567890");
  });

  test("falls back to the address for boards it can't read", () => {
    expect(getFiledJobKey("https://jobs.example.com/acme/123/?ref=x")).toBe(
      "url:https://jobs.example.com/acme/123",
    );
  });

  test("returns null for empty or invalid URLs", () => {
    expect(getFiledJobKey("")).toBeNull();
    expect(getFiledJobKey("not a url")).toBeNull();
  });
});

describe("parseFiledJobs", () => {
  test("drops malformed entries", () => {
    expect(
      parseFiledJobs({
        good: { filedAt: "2026-10-16T10:00:00.000Z" },
        bad: { filedAt: 3 },
      }),
    ).toEqual({ good: { filedAt: "2026-10-16T10:00:00.000Z" } });
    expect(parseFiledJobs(null)).toEqual({});
  });
});

describe("addFiledJob", () => {
  test("replaces an existing entry and keeps at most 500", () => {
    let filedJobs = {};

    for (let index = 0; index < 510; index += 1) {
      filedJobs = addFiledJob(filedJobs, `job:${index}`, {
        filedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
      });
    }

    filedJobs = addFiledJob(filedJobs, "job:509", {
      filedAt: "2026-10-16T10:00:00.000Z",
      notionUrl: "https://notion.so/page",
    });

    expect(Object.keys(filedJobs)).toHaveLength(500);
    expect(filedJobs).toHaveProperty(
      "job:509.notionUrl",
      "https://notion.so/page",
    );
    expect(filedJobs).not.toHaveProperty("job:0");
  });
});

describe("formatFiledDate", () => {
  const now = new Date(2026, 9, 17, 12);

  test("says today for the same day", () => {
    expect(formatFiledDate(new Date(2026, 9, 17, 9).toISOString(), now)).toBe(
      "today",
    );
  });

  test("uses a short month and day within the year", () => {
    expect(formatFiledDate(new Date(2026, 9, 16).toISOString(), now)).toBe(
      "Oct 16",
    );
  });

  test("adds the year for older entries", () => {
    expect(formatFiledDate(new Date(2025, 2, 3).toISOString(), now)).toBe(
      "Mar 3, 2025",
    );
  });
});
