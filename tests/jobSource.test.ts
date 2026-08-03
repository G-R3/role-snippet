import { describe, expect, test } from "bun:test";
import {
  getJobSource,
  isSupportedJobPageUrl,
} from "../extension/src/shared/jobSource";

describe("YC job URL recognition", () => {
  test.each([
    "https://www.workatastartup.com/jobs/00000",
    "https://www.workatastartup.com/jobs/00000/",
    "https://www.workatastartup.com/jobs/00000?utm_source=test",
  ])("recognizes %s", (value) => {
    const url = new URL(value);

    expect(getJobSource(url)).toBe("yc");
    expect(isSupportedJobPageUrl(url)).toBe(true);
  });

  test.each([
    "https://www.workatastartup.com/jobs",
    "https://www.workatastartup.com/jobs/software-engineer",
    "https://www.workatastartup.com/companies/example-company-alpha",
    "https://example.com/jobs/00000",
  ])("rejects %s", (value) => {
    expect(getJobSource(new URL(value))).toBeNull();
  });
});
