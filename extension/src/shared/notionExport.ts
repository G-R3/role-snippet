import type { JobPost } from "./job";

export function formatJobPostAsPlainText(jobPost: JobPost): string {
  const notes = jobPost.notes.trim();

  return [
    `Title: ${jobPost.title}`,
    `Company: ${jobPost.company}`,
    `Source: ${jobPost.sourceUrl}`,
    `Extracted: ${jobPost.extractedAt}`,
    ...(notes ? [`Notes: ${notes}`] : []),
    "",
    "Description:",
    jobPost.description,
  ].join("\n");
}

export function formatJobPostAsMarkdown(jobPost: JobPost): string {
  const notes = jobPost.notes.trim();

  return [
    `# ${jobPost.title}`,
    "",
    `**Company:** ${jobPost.company}`,
    `**Source:** ${jobPost.sourceUrl}`,
    `**Extracted:** ${jobPost.extractedAt}`,
    ...(notes ? [`**Notes:** ${notes}`] : []),
    "",
    "## Job Description",
    "",
    jobPost.description,
  ].join("\n");
}

export function formatJobPostAsJson(jobPost: JobPost): string {
  return `${JSON.stringify(jobPost, null, 2)}\n`;
}
