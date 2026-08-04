import { normalizeInlineText, normalizeMultilineText } from "./text";
import type { ExtractedJobDetails, JobPageExtractor } from "./types";

function getElementInlineText(selector: string): string {
  const element = document.querySelector(selector);

  return element instanceof HTMLElement
    ? normalizeInlineText(element.innerText || element.textContent || "")
    : "";
}

function getElementMultilineText(selector: string): string {
  const element = document.querySelector(selector);

  return element instanceof HTMLElement
    ? normalizeMultilineText(element.innerText || element.textContent || "")
    : "";
}

function getMetaContent(property: string): string {
  return normalizeInlineText(
    document
      .querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      ?.getAttribute("content") ?? "",
  );
}

function getCompanyFromLogo(): string {
  const logo = document.querySelector<HTMLImageElement>(
    ".logo img[alt], img.logo[alt]",
  );
  const alt = normalizeInlineText(logo?.alt ?? "");

  return alt.replace(/\s+logo$/i, "").trim();
}

export const greenhouseExtractor: JobPageExtractor = {
  extract(): ExtractedJobDetails {
    return {
      title:
        getElementInlineText(".job__title h1") ||
        getMetaContent("og:title") ||
        getElementInlineText("h1"),
      company: getCompanyFromLogo(),
      location: getElementInlineText(".job__location > div"),
      description: getElementMultilineText(".job__description"),
    };
  },
};
