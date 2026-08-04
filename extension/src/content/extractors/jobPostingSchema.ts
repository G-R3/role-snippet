import { isJsonRecord, type JsonRecord } from "./json";

function isJobPosting(value: JsonRecord): boolean {
  const type = value["@type"];

  return (
    type === "JobPosting" ||
    (Array.isArray(type) && type.includes("JobPosting"))
  );
}

function findJobPosting(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const jobPosting = findJobPosting(entry);

      if (jobPosting) {
        return jobPosting;
      }
    }

    return null;
  }

  if (!isJsonRecord(value)) {
    return null;
  }

  return isJobPosting(value) ? value : findJobPosting(value["@graph"]);
}

export function getJobPostingFromJsonLd(): JsonRecord | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );

  for (const script of scripts) {
    try {
      const jobPosting = findJobPosting(JSON.parse(script.textContent ?? ""));

      if (jobPosting) {
        return jobPosting;
      }
    } catch {
      // Unrelated structured data can be malformed; continue to later scripts.
    }
  }

  return null;
}
