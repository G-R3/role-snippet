export type JobSource = "linkedin" | "ashby" | "greenhouse" | "indeed" | "yc";

const ASHBY_JOB_PATH_PATTERN =
  /^\/[^/]+\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const GREENHOUSE_JOB_PATH_PATTERN = /^\/([^/]+)\/jobs\/(\d+)\/?$/;
const LINKEDIN_JOB_PATH_PATTERN = /^\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/;
const YC_JOB_PATH_PATTERN = /^\/jobs\/(\d+)\/?$/;

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

function isIndeedJobUrl(url: URL): boolean {
  return (
    url.hostname === "www.indeed.com" &&
    url.pathname === "/viewjob" &&
    Boolean(url.searchParams.get("jk"))
  );
}

function isYcJobUrl(url: URL): boolean {
  return (
    url.hostname === "www.workatastartup.com" &&
    YC_JOB_PATH_PATTERN.test(url.pathname)
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

  if (isIndeedJobUrl(url)) {
    return "indeed";
  }

  if (isYcJobUrl(url)) {
    return "yc";
  }

  return null;
}

export function isSupportedJobPageUrl(url: URL): boolean {
  return getJobSource(url) !== null;
}

// Returns a provider-scoped identity that ignores tracking URL differences.
export function getJobPageIdentity(url: URL): string | null {
  const source = getJobSource(url);

  switch (source) {
    case "ashby": {
      const jobId = url.pathname.match(ASHBY_JOB_PATH_PATTERN)?.[1];
      return jobId ? `ashby:${jobId.toLowerCase()}` : null;
    }
    case "greenhouse": {
      const match = url.pathname.match(GREENHOUSE_JOB_PATH_PATTERN);
      const boardToken = match?.[1];
      const jobId = match?.[2];
      return boardToken && jobId
        ? `greenhouse:${boardToken.toLowerCase()}:${jobId}`
        : null;
    }
    case "indeed": {
      const jobId = url.searchParams.get("jk");
      return jobId ? `indeed:${jobId}` : null;
    }
    case "linkedin": {
      const jobId =
        url.searchParams.get("currentJobId") ??
        url.pathname.match(LINKEDIN_JOB_PATH_PATTERN)?.[1];

      return jobId
        ? `linkedin:${jobId}`
        : `linkedin:${url.pathname.replace(/\/$/, "")}`;
    }
    case "yc": {
      const jobId = url.pathname.match(YC_JOB_PATH_PATTERN)?.[1];
      return jobId ? `yc:${jobId}` : null;
    }
    case null:
      return null;
  }
}
