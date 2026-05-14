# Role Snippet

Chrome extension for saving job post details from THAT website that shall not be name to my Notion db. The struggle is real, but so is the speed.

## Setup

This is a personal extension but if you're interested here are steps to get it up and runnning!!

```sh
bun install
cd backend && bun install
```

Create `backend/.env.local` from `backend/.env.example`:

```sh
NOTION_TOKEN=secret_your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
ROLE_SNIPPET_EXTENSION_ID=your_chrome_extension_id
ROLE_SNIPPET_API_KEY=your_generated_role_snippet_api_key
```

For production, deploy `backend/` to Vercel and add the same environment variables in the Vercel project settings.

## Development

```sh
bun run verify:all
bun run build
```

The loadable extension is emitted to `dist/`.

## Extension Backend URL

Set the backend endpoint in `extension/src/shared/config.ts`:

```ts
export const NOTION_BACKEND_JOBS_URL =
  "https://your-project.vercel.app/api/jobs";
```

If the host changes, update `host_permissions` in `extension/manifest.json`.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` directory.
5. Open a job page.
6. Click the Role Snippet extension icon and choose Extract job post.
7. Click Add to Notion to create a row in your configured database.
