import { Client } from "@notionhq/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type JobPost = {
  sourceUrl: string;
  title: string;
  company: string;
  description: string;
  extractedAt: string;
};

type NotionProperty =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { url: string }
  | { date: { start: string } }
  | { status: { name: string } }
  | { select: { name: string } };

type NotionDatabaseWithProperties = {
  properties: Record<string, { type?: string } | undefined>;
};

type NotionPageWithUrl = {
  id: string;
  url?: string;
};

const STATUS_VALUE = "Applied";
const MAX_RICH_TEXT_CHUNK_LENGTH = 2000;

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

function isJobPost(value: unknown): value is JobPost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof JobPost, unknown>>;
  return (
    typeof candidate.sourceUrl === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.extractedAt === "string"
  );
}

function requireEnv(name: "NOTION_TOKEN" | "NOTION_DATABASE_ID"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function textChunks(value: string): Array<{ text: { content: string } }> {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return [];
  }

  const chunks: Array<{ text: { content: string } }> = [];

  for (let index = 0; index < normalizedValue.length; index += MAX_RICH_TEXT_CHUNK_LENGTH) {
    chunks.push({
      text: {
        content: normalizedValue.slice(index, index + MAX_RICH_TEXT_CHUNK_LENGTH)
      }
    });
  }

  return chunks;
}

function lowercaseField(value: string): string {
  return value.trim().toLowerCase();
}

function buildStatusProperty(statusPropertyType: string | undefined): NotionProperty {
  if (statusPropertyType === "select") {
    return {
      select: {
        name: STATUS_VALUE
      }
    };
  }

  return {
    status: {
      name: STATUS_VALUE
    }
  };
}

function hasDatabaseProperties(value: unknown): value is NotionDatabaseWithProperties {
  return Boolean(value && typeof value === "object" && "properties" in value);
}

function getPageUrl(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const page = value as NotionPageWithUrl;
  return typeof page.url === "string" ? page.url : "";
}

async function getStatusPropertyType(notion: Client, databaseId: string): Promise<string | undefined> {
  const database = await notion.databases.retrieve({
    database_id: databaseId
  });

  if (!hasDatabaseProperties(database)) {
    return undefined;
  }

  const statusProperty = database.properties.Status;

  return statusProperty?.type;
}

async function createNotionJobPage(jobPost: JobPost): Promise<{ id: string; url: string }> {
  const notionToken = requireEnv("NOTION_TOKEN");
  const databaseId = requireEnv("NOTION_DATABASE_ID");
  const notion = new Client({
    auth: notionToken
  });
  const statusPropertyType = await getStatusPropertyType(notion, databaseId);

  const page = await notion.pages.create({
    parent: {
      database_id: databaseId
    },
    properties: {
      Role: {
        title: textChunks(lowercaseField(jobPost.title))
      },
      Company: {
        rich_text: textChunks(lowercaseField(jobPost.company))
      },
      Status: buildStatusProperty(statusPropertyType),
      "Job URL": {
        url: jobPost.sourceUrl
      },
      Description: {
        rich_text: textChunks(jobPost.description)
      },
      Applied: {
        date: {
          start: getTodayDate()
        }
      }
    }
  });

  return {
    id: page.id,
    url: getPageUrl(page)
  };
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
    const notionPage = await createNotionJobPage(jobPost);

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
