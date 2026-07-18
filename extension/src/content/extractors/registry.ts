import { getJobSource } from "../../shared/jobSource";
import { ashbyExtractor } from "./ashby";
import { linkedInExtractor } from "./linkedin";
import type { JobPageExtractor, JobPageExtractors } from "./types";

const jobPageExtractors: JobPageExtractors = {
  linkedin: linkedInExtractor,
  ashby: ashbyExtractor,
};

export function findJobPageExtractor(url: URL): JobPageExtractor | undefined {
  const source = getJobSource(url);

  return source ? jobPageExtractors[source] : undefined;
}
