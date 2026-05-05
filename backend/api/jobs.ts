import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isJobPost } from "../src/jobPost.js";
import { createNotionJobPage } from "../src/notionJobs.js";

function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const allowedOrigin = process.env.ALLOWED_EXTENSION_ORIGIN ?? "*";
  const requestOrigin = req.headers.origin;
  const origin = allowedOrigin === "*" ? "*" : requestOrigin === allowedOrigin ? allowedOrigin : "";

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function requireEnv(name: "NOTION_TOKEN" | "NOTION_DATABASE_ID"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
    return;
  }

  const jobPost = parseBody(req.body);

  if (!isJobPost(jobPost)) {
    res.status(400).json({
      ok: false,
      error: "Invalid job post payload."
    });
    return;
  }

  try {
    const notionPage = await createNotionJobPage(jobPost, {
      notionToken: requireEnv("NOTION_TOKEN"),
      databaseId: requireEnv("NOTION_DATABASE_ID")
    });

    res.status(201).json({
      ok: true,
      notionPage
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Notion row.";

    res.status(500).json({
      ok: false,
      error: message
    });
  }
}
