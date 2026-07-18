import { ashbyExtractor } from "./ashby";
import { linkedInExtractor } from "./linkedin";
import type { JobPageExtractor } from "./types";

const jobPageExtractors: JobPageExtractor[] = [
  linkedInExtractor,
  ashbyExtractor,
];

export function findJobPageExtractor(url: URL): JobPageExtractor | undefined {
  return jobPageExtractors.find((extractor) => extractor.matches(url));
}

export function isSupportedJobPageUrl(url: URL): boolean {
  return Boolean(findJobPageExtractor(url));
}
