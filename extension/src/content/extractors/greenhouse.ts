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

function getCompanyFromLogo(): string {
  const logo = document.querySelector<HTMLImageElement>(".logo img[alt]");
  const alt = normalizeInlineText(logo?.alt ?? "");

  return alt.replace(/\s+logo$/i, "").trim();
}

export const greenhouseExtractor: JobPageExtractor = {
  extract(): ExtractedJobDetails {
    return {
      title: getElementInlineText(".job__title h1") || getElementInlineText("h1"),
      company: getCompanyFromLogo(),
      description: getElementMultilineText(".job__description"),
    };
  },
};
