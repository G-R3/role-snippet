# LinkSnaggedIn

Chrome extension for extracting LinkedIn job post details and preparing them for Notion.

## What v1 Does

- Extracts the title, company, description, source URL, and extraction timestamp from the active LinkedIn job page.
- Shows a preview in the extension popup.
- Copies individual fields or the full job as plain text, Markdown, or JSON.
- Adds the extracted job to a Notion database through a Vercel backend.

## Notion Database Mapping

The backend maps extracted jobs into these Notion database properties:

- `Role`: LinkedIn job title.
- `Company`: company name.
- `Status`: `Applied`.
- `Job URL`: LinkedIn URL.
- `Description`: job description.
- `Applied`: current date.

## Development

Install extension dependencies:

```sh
bun install
```

Install backend dependencies:

```sh
cd backend
bun install
```

Run all verification:

```sh
bun run verify:all
```

Run extension verification only:

```sh
bun run verify
```

Build only:

```sh
bun run build
```

The loadable extension is emitted to `dist/`.

## Backend Setup

1. Create a Notion internal integration and copy its token.
2. Share your Notion jobs database with that integration.
3. Copy `backend/.env.example` to `backend/.env.local`.
4. Set:

```sh
NOTION_TOKEN=secret_your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
ALLOWED_EXTENSION_ORIGIN=*
```

For production, deploy `backend/` to Vercel and add the same environment variables in the Vercel project settings.

The Vercel route in `backend/api/jobs.ts` is intentionally thin. The reusable Notion logic lives in:

- `backend/src/jobPost.ts`: shared `JobPost` validation.
- `backend/src/notionJobs.ts`: Notion database mapping and row creation.

That split keeps a future Cloudflare Workers migration smaller: a Worker would replace only the HTTP wrapper while reusing the Notion mapping module.

## Extension Backend URL

The extension calls the URL in `extension/src/shared/config.ts`.

By default it is:

```ts
export const NOTION_BACKEND_JOBS_URL = "http://localhost:3000/api/jobs";
```

After deploying the backend, replace it with your Vercel URL:

```ts
export const NOTION_BACKEND_JOBS_URL =
  "https://your-project.vercel.app/api/jobs";
```

The manifest already allows local development and Vercel preview/production URLs:

- `http://localhost:3000/*`
- `https://*.vercel.app/*`

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` directory.
5. Open a LinkedIn job page.
6. Click the LinkSnaggedIn extension icon and choose Extract job post.
7. Click Add to Notion to create a row in your configured database.

## Job Payload

The extension already uses the shared `JobPost` payload:

```ts
type JobPost = {
  sourceUrl: string;
  title: string;
  company: string;
  description: string;
  extractedAt: string;
};
```
