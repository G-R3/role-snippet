import type { JobPost } from "./job";

export function formatJobPostAsPlainText(jobPost: JobPost): string {
  const notes = jobPost.notes.trim();
  const location = jobPost.location.trim();

  return [
    `Title: ${jobPost.title}`,
    `Company: ${jobPost.company}`,
    ...(location ? [`Location: ${location}`] : []),
    `Source: ${jobPost.sourceUrl}`,
    ...(notes ? [`Notes: ${notes}`] : []),
    "",
    "Description:",
    jobPost.description,
  ].join("\n");
}

export function formatJobPostAsMarkdown(jobPost: JobPost): string {
  const notes = jobPost.notes.trim();
  const location = jobPost.location.trim();

  return [
    `# ${jobPost.title}`,
    "",
    `**Company:** ${jobPost.company}`,
    ...(location ? [`**Location:** ${location}`] : []),
    `**Source:** ${jobPost.sourceUrl}`,
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
