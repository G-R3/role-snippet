import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { ycExtractor } from "../extension/src/content/extractors/yc";

function setDocument(html = ""): Document {
  const document = new Window().document;
  document.body.innerHTML = html;
  globalThis.document = document;
  return document;
}

function addPageData(document: Document, value: unknown): void {
  const root = document.createElement("div");
  root.setAttribute("data-page", JSON.stringify(value));
  document.body.append(root);
}

describe("ycExtractor", () => {
  beforeEach(() => {
    setDocument();
  });

  test("extracts the structured YC page payload", () => {
    const document = setDocument();
    addPageData(document, {
      props: {
        job: {
          title: "Widget Engineer",
          descriptionHtml:
            "<p>Build the product.</p><ul><li>TypeScript</li><li>React</li></ul>",
        },
        company: { name: "Example Company Alpha" },
      },
    });

    expect(ycExtractor.extract()).toEqual({
      title: "Widget Engineer",
      company: "Example Company Alpha",
      location: "",
      description: "Build the product.\n- TypeScript\n- React",
    });
  });

  test("falls back structurally when page data is malformed", () => {
    const document = setDocument(`
      <div data-page="not-json"></div>
      <h1>Platform Engineer at <a href="/companies/example-company">Example Company</a></h1>
      <meta property="og:title" content="Platform Engineer at Example Company | Jobs">
    `);
    const description = document.createElement("meta");
    description.setAttribute("property", "og:description");
    description.content = [
      "**Build systems.** \\",
      "\\",
      "_Work with customers._",
    ].join("\n");
    document.head.append(description);

    expect(ycExtractor.extract()).toEqual({
      title: "Platform Engineer",
      company: "Example Company",
      location: "",
      description: "Build systems.\nWork with customers.",
    });
  });

  test("handles partial and incorrectly typed structured data", () => {
    const document = setDocument(`
      <h1>Product Designer at <a href="/companies/example-company-gamma">Example Company Gamma</a></h1>
      <meta property="og:description" content="Design excellent products.">
    `);
    addPageData(document, {
      props: {
        job: { title: 42, descriptionHtml: null },
        company: { name: false },
      },
    });

    expect(ycExtractor.extract()).toEqual({
      title: "Product Designer",
      company: "Example Company Gamma",
      location: "",
      description: "Design excellent products.",
    });
  });
});
