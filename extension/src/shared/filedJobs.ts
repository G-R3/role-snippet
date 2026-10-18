import { getJobPageIdentity, parseUrl } from "./jobSource";

export const FILED_JOBS_KEY = "filedJobs";
const MAX_FILED_JOBS = 500;

export type FiledJob = {
  filedAt: string;
  notionUrl?: string;
};

export type FiledJobs = Record<string, FiledJob>;

function isFiledJob(value: unknown): value is FiledJob {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FiledJob>;
  return (
    typeof candidate.filedAt === "string" &&
    (candidate.notionUrl === undefined ||
      typeof candidate.notionUrl === "string")
  );
}

export async function readFiledJobs(): Promise<FiledJobs> {
  const stored = await chrome.storage.local.get(FILED_JOBS_KEY);
  return parseFiledJobs(stored[FILED_JOBS_KEY]);
}

export function parseFiledJobs(value: unknown): FiledJobs {
  if (!value || typeof value !== "object") {
    return {};
  }

  const filedJobs: FiledJobs = {};

  for (const [key, filedJob] of Object.entries(value)) {
    if (isFiledJob(filedJob)) {
      filedJobs[key] = filedJob;
    }
  }

  return filedJobs;
}

// Supported boards key by job identity; anything else keys by its address.
export function getFiledJobKey(sourceUrl: string | undefined): string | null {
  const url = parseUrl(sourceUrl);

  if (!url) {
    return null;
  }

  return (
    getJobPageIdentity(url) ??
    `url:${url.origin}${url.pathname.replace(/\/$/, "")}`
  );
}

// Keeps the newest entries so storage stays bounded.
export function addFiledJob(
  filedJobs: FiledJobs,
  key: string,
  filedJob: FiledJob,
): FiledJobs {
  const { [key]: _previous, ...rest } = filedJobs;
  const entries = Object.entries(rest)
    .sort(([, a], [, b]) => b.filedAt.localeCompare(a.filedAt))
    .slice(0, MAX_FILED_JOBS - 1);

  return { [key]: filedJob, ...Object.fromEntries(entries) };
}

export function formatFiledDate(filedAt: string, now = new Date()): string {
  const date = new Date(filedAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (date.toDateString() === now.toDateString()) {
    return "today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}
