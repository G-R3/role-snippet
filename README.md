# Role Snippet

Chrome extension for saving LinkedIn job post details to Notion.

## What v1 Does

- Extracts the title, company, description, source URL, and extraction timestamp from the active LinkedIn job page.
- Lets you add optional manual notes before syncing to Notion.
- Shows a preview in the extension popup.
- Copies individual fields or the full job as plain text, Markdown, or JSON.
- Adds the extracted job to a Notion database through a Vercel backend.

## Notion Database Mapping

The backend maps extracted jobs into these Notion database properties:

- `Role`: LinkedIn job title, normalized to lowercase.
- `Company`: company name, normalized to lowercase.
- `Status`: `Applied`.
- `Job URL`: LinkedIn URL.
- `Description`: job description.
- `Notes`: optional notes entered manually in the extension.
- `Applied`: current timestamp.

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
ROLE_SNIPPET_EXTENSION_ID=your_chrome_extension_id
ROLE_SNIPPET_API_KEY=your_generated_role_snippet_api_key
```

For production, deploy `backend/` to Vercel and add the same environment variables in the Vercel project settings.

The Vercel route in `backend/api/jobs.ts` handles the HTTP request, CORS, authorization, and payload validation. The reusable job and Notion logic lives in:

- `backend/src/jobPost.ts`: `JobPost` payload validation.
- `backend/src/notionJobs.ts`: Notion database mapping and row creation.

That split keeps the platform-specific HTTP wrapper separate from the Notion mapping code, which should make migrations/deployment to other platforms easier.

## Extension Backend URL

The extension calls the URL in `extension/src/shared/config.ts`.

By default it points at the deployed Vercel backend:

```ts
export const NOTION_BACKEND_JOBS_URL =
  "https://role-snippet-backend.vercel.app/api/jobs";
```

After deploying your own backend, replace it with that backend URL:

```ts
export const NOTION_BACKEND_JOBS_URL =
  "https://your-project.vercel.app/api/jobs";
```

The manifest must allow the backend host in `extension/manifest.json`:

- `https://role-snippet-backend.vercel.app/*`

If you change the backend URL, update `host_permissions` to match.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` directory.
5. Open a LinkedIn job page.
6. Click the Role Snippet extension icon and choose Extract job post.
7. Click Add to Notion to create a row in your configured database.

## Job Payload

The extension and backend expect this `JobPost` payload shape:

```ts
type JobPost = {
  sourceUrl: string;
  title: string;
  company: string;
  description: string;
  notes: string;
  extractedAt: string;
};
```
