import { isJsonRecord } from "./json";
import {
  htmlToMultilineText,
  normalizeInlineText,
  normalizeMultilineText,
} from "./text";
import type { ExtractedJobDetails, JobPageExtractor } from "./types";

type YcPageData = Omit<ExtractedJobDetails, "location">;

function getPageData(): YcPageData {
  const rawPageData = document
    .querySelector("[data-page]")
    ?.getAttribute("data-page");

  if (!rawPageData) {
    return { title: "", company: "", description: "" };
  }

  try {
    const pageData: unknown = JSON.parse(rawPageData);

    if (!isJsonRecord(pageData) || !isJsonRecord(pageData.props)) {
      return { title: "", company: "", description: "" };
    }

    const job = isJsonRecord(pageData.props.job) ? pageData.props.job : null;
    const company = isJsonRecord(pageData.props.company)
      ? pageData.props.company
      : null;

    return {
      title: typeof job?.title === "string" ? job.title.trim() : "",
      company: typeof company?.name === "string" ? company.name.trim() : "",
      description: htmlToMultilineText(
        typeof job?.descriptionHtml === "string"
          ? job.descriptionHtml.trim()
          : "",
      ),
    };
  } catch {
    return { title: "", company: "", description: "" };
  }
}

function getCompanyFromDom(): string {
  const companyLink = document.querySelector<HTMLAnchorElement>(
    'h1 a[href^="/companies/"]',
  );
  return normalizeInlineText(
    companyLink?.innerText || companyLink?.textContent || "",
  );
}

function getTitleFromDom(): string {
  const heading = document.querySelector("h1");
  const leadingText = heading?.firstChild?.textContent ?? "";
  return normalizeInlineText(leadingText)
    .replace(/\s+at$/i, "")
    .trim();
}

function getMetaContent(property: string): string {
  return (
    document
      .querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      ?.getAttribute("content")
      ?.trim() ?? ""
  );
}

function getTitleFromMetadata(company: string): string {
  const title = getMetaContent("og:title").split(" | ", 1)[0]?.trim() ?? "";

  if (company && title.endsWith(` at ${company}`)) {
    return title.slice(0, -` at ${company}`.length).trim();
  }

  return title;
}

function getDescriptionFromMetadata(): string {
  return normalizeMultilineText(
    getMetaContent("og:description")
      .replace(/\\\s*(?=\n|$)/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/^_(.*)_$/gm, "$1"),
  );
}

export const ycExtractor: JobPageExtractor = {
  extract(): ExtractedJobDetails {
    const pageData = getPageData();
    const company = pageData.company || getCompanyFromDom();

    return {
      title:
        pageData.title || getTitleFromDom() || getTitleFromMetadata(company),
      company,
      location: "",
      description: pageData.description || getDescriptionFromMetadata(),
    };
  },
};
