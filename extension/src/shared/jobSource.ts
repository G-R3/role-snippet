export type JobSource = "linkedin" | "ashby" | "greenhouse";

const ASHBY_JOB_PATH_PATTERN =
  /^\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;
const GREENHOUSE_JOB_PATH_PATTERN = /^\/[^/]+\/jobs\/\d+\/?$/;

function isLinkedInJobUrl(url: URL): boolean {
  return (
    (url.hostname === "linkedin.com" || url.hostname === "www.linkedin.com") &&
    url.pathname.startsWith("/jobs/")
  );
}

function isAshbyJobUrl(url: URL): boolean {
  return (
    url.hostname === "jobs.ashbyhq.com" &&
    ASHBY_JOB_PATH_PATTERN.test(url.pathname)
  );
}

function isGreenhouseJobUrl(url: URL): boolean {
  return (
    (url.hostname === "job-boards.greenhouse.io" ||
      url.hostname === "boards.greenhouse.io") &&
    GREENHOUSE_JOB_PATH_PATTERN.test(url.pathname)
  );
}

export function getJobSource(url: URL): JobSource | null {
  if (isLinkedInJobUrl(url)) {
    return "linkedin";
  }

  if (isAshbyJobUrl(url)) {
    return "ashby";
  }

  if (isGreenhouseJobUrl(url)) {
    return "greenhouse";
  }

  return null;
}

export function isSupportedJobPageUrl(url: URL): boolean {
  return getJobSource(url) !== null;
}
