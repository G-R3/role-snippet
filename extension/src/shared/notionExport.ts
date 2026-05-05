import type { JobPost } from "./job";

export function formatJobPostAsPlainText(jobPost: JobPost): string {
  return [
    `Title: ${jobPost.title}`,
    `Company: ${jobPost.company}`,
    `Source: ${jobPost.sourceUrl}`,
    `Extracted: ${jobPost.extractedAt}`,
    "",
    "Description:",
    jobPost.description
  ].join("\n");
}

export function formatJobPostAsMarkdown(jobPost: JobPost): string {
  return [
    `# ${jobPost.title}`,
    "",
    `**Company:** ${jobPost.company}`,
    `**Source:** ${jobPost.sourceUrl}`,
    `**Extracted:** ${jobPost.extractedAt}`,
    "",
    "## Job Description",
    "",
    jobPost.description
  ].join("\n");
}

export function formatJobPostAsJson(jobPost: JobPost): string {
  return `${JSON.stringify(jobPost, null, 2)}\n`;
}
