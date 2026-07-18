export type JobSource = "linkedin" | "ashby";

const ASHBY_JOB_PATH_PATTERN =
  /^\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;

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

export function getJobSource(url: URL): JobSource | null {
  if (isLinkedInJobUrl(url)) {
    return "linkedin";
  }

  if (isAshbyJobUrl(url)) {
    return "ashby";
  }

  return null;
}

export function isSupportedJobPageUrl(url: URL): boolean {
  return getJobSource(url) !== null;
}
