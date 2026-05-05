# LinkSnaggedIn

Chrome extension for extracting LinkedIn job post details and preparing them for Notion.

## What v1 Does

- Extracts the title, company, description, source URL, and extraction timestamp from the active LinkedIn job page.
- Shows a preview in the extension popup.
- Copies the extracted job as plain text, Markdown, or JSON for manual Notion entry.
- Keeps a typed sync boundary ready for a future Notion API backend.

## What v1 Does Not Do

This version does not write to Notion automatically. Automatic Notion row creation should be added through a small backend or serverless function that stores the Notion API token outside the Chrome extension.

## Development

Install dependencies:

```sh
bun install
```

Run verification:

```sh
bun run verify
```

Build only:

```sh
bun run build
```

The loadable extension is emitted to `dist/`.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` directory.
5. Open a LinkedIn job page.
6. Click the LinkSnaggedIn extension icon and choose Extract job post.

## Future Notion Sync

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

A future backend can accept this payload, map it to Notion database properties, and create rows with server-side `NOTION_TOKEN` and `NOTION_DATABASE_ID` values.
