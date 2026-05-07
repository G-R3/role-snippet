import { Client } from "@notionhq/client";
import type { JobPost } from "./jobPost.js";

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

export type NotionJobConfig = {
  notionToken: string;
  databaseId: string;
};

export type CreatedNotionJobPage = {
  id: string;
  url: string;
};

const STATUS_VALUE = "Applied";
const MAX_RICH_TEXT_CHUNK_LENGTH = 2000;

function getCurrentDateTime(): string {
  return new Date().toISOString();
}

function textChunks(value: string): Array<{ text: { content: string } }> {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return [];
  }

  const chunks: Array<{ text: { content: string } }> = [];

  for (
    let index = 0;
    index < normalizedValue.length;
    index += MAX_RICH_TEXT_CHUNK_LENGTH
  ) {
    chunks.push({
      text: {
        content: normalizedValue.slice(
          index,
          index + MAX_RICH_TEXT_CHUNK_LENGTH,
        ),
      },
    });
  }

  return chunks;
}

function lowercaseField(value: string): string {
  return value.trim().toLowerCase();
}

function buildStatusProperty(
  statusPropertyType: string | undefined,
): NotionProperty {
  if (statusPropertyType === "select") {
    return {
      select: {
        name: STATUS_VALUE,
      },
    };
  }

  return {
    status: {
      name: STATUS_VALUE,
    },
  };
}

function hasDatabaseProperties(
  value: unknown,
): value is NotionDatabaseWithProperties {
  return Boolean(value && typeof value === "object" && "properties" in value);
}

function getPageUrl(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const page = value as NotionPageWithUrl;
  return typeof page.url === "string" ? page.url : "";
}

async function getStatusPropertyType(
  notion: Client,
  databaseId: string,
): Promise<string | undefined> {
  const database = await notion.databases.retrieve({
    database_id: databaseId,
  });

  if (!hasDatabaseProperties(database)) {
    return undefined;
  }

  const statusProperty = database.properties.Status;

  return statusProperty?.type;
}

export async function createNotionJobPage(
  jobPost: JobPost,
  config: NotionJobConfig,
): Promise<CreatedNotionJobPage> {
  const notion = new Client({
    auth: config.notionToken,
  });
  const statusPropertyType = await getStatusPropertyType(
    notion,
    config.databaseId,
  );

  const page = await notion.pages.create({
    parent: {
      database_id: config.databaseId,
    },
    properties: {
      Role: {
        title: textChunks(lowercaseField(jobPost.title)),
      },
      Company: {
        rich_text: textChunks(lowercaseField(jobPost.company)),
      },
      Status: buildStatusProperty(statusPropertyType),
      "Job URL": {
        url: jobPost.sourceUrl,
      },
      Description: {
        rich_text: textChunks(jobPost.description),
      },
      Applied: {
        date: {
          start: getCurrentDateTime(),
        },
      },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              text: {
                content: "Job Description",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: textChunks(jobPost.description),
        },
      },
    ],
  });

  return {
    id: page.id,
    url: getPageUrl(page),
  };
}
