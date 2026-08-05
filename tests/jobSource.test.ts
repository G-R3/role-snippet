import { describe, expect, test } from "bun:test";
import {
  getJobPageIdentity,
  getJobSource,
  isSupportedJobPageUrl,
} from "../extension/src/shared/jobSource";

describe("job page identity", () => {
  test.each([
    [
      "https://www.linkedin.com/jobs/view/software-engineer-at-example-1234567890/?trackingId=abc#details",
      "linkedin:1234567890",
    ],
    [
      "https://www.linkedin.com/jobs/search/?currentJobId=1234567890&origin=JOB_SEARCH_PAGE_JOB_FILTER",
      "linkedin:1234567890",
    ],
    [
      "https://jobs.ashbyhq.com/example/12345678-abcd-4321-abcd-1234567890ab?utm_source=test",
      "ashby:12345678-abcd-4321-abcd-1234567890ab",
    ],
    [
      "https://boards.greenhouse.io/example/jobs/1234567?gh_src=abc#app",
      "greenhouse:example:1234567",
    ],
    [
      "https://www.indeed.com/viewjob?jk=example-job-key&from=share#jobDescriptionText",
      "indeed:example-job-key",
    ],
    [
      "https://www.workatastartup.com/jobs/12345?utm_source=test#apply",
      "yc:12345",
    ],
  ])("identifies %s", (value, expected) => {
    expect(getJobPageIdentity(new URL(value))).toBe(expected);
  });

  test("returns the same identity when only tracking details change", () => {
    const sharedJob = "https://www.indeed.com/viewjob?jk=example-job-key";

    expect(getJobPageIdentity(new URL(`${sharedJob}&from=share`))).toBe(
      getJobPageIdentity(new URL(`${sharedJob}&from=search#details`)),
    );
  });

  test("returns null for unsupported pages", () => {
    expect(
      getJobPageIdentity(new URL("https://example.com/jobs/12345")),
    ).toBeNull();
  });

  test("keeps Greenhouse boards distinct when job IDs match", () => {
    const firstBoard = getJobPageIdentity(
      new URL("https://job-boards.greenhouse.io/acme/jobs/1234567"),
    );
    const secondBoard = getJobPageIdentity(
      new URL("https://job-boards.greenhouse.io/example/jobs/1234567"),
    );

    expect(firstBoard).not.toBe(secondBoard);
  });
});

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

describe("Indeed job URL recognition", () => {
  test.each([
    "https://www.indeed.com/viewjob?jk=example-job-key",
    "https://www.indeed.com/viewjob?jk=example-job-key&from=share",
  ])("recognizes %s", (value) => {
    const url = new URL(value);

    expect(getJobSource(url)).toBe("indeed");
    expect(isSupportedJobPageUrl(url)).toBe(true);
  });

  test.each([
    "https://www.indeed.com/viewjob",
    "https://indeed.com/viewjob?jk=example-job-key",
    "https://ca.indeed.com/viewjob?jk=example-job-key",
    "https://www.indeed.com/?vjk=example-job-key",
    "https://www.indeed.com/",
    "https://www.indeed.com/jobs?q=engineer",
    "https://www.indeed.com/cmp/Example-Company/jobs",
    "https://www.indeed.com/m/viewjob?jk=example-job-key",
    "https://notindeed.com/viewjob?jk=example-job-key",
  ])("rejects %s", (value) => {
    expect(getJobSource(new URL(value))).toBeNull();
  });
});
