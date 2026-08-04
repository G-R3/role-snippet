import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { ycExtractor } from "../extension/src/content/extractors/yc";

function setDocument(html = ""): void {
  const document = new Window().document;
  document.body.innerHTML = html;
  Object.assign(globalThis, { document });
}

function addPageData(value: unknown): void {
  const root = document.createElement("div");
  root.setAttribute("data-page", JSON.stringify(value));
  document.body.append(root);
}

describe("ycExtractor", () => {
  beforeEach(() => {
    setDocument();
  });

  test("extracts the structured YC page payload", () => {
    setDocument();
    addPageData({
      props: {
        job: {
          title: "Widget Engineer",
          location:
            "North Harbor / South Harbor / Remote",
          descriptionHtml:
            "<p>Build the product.</p><ul><li>TypeScript</li><li>React</li></ul>",
        },
        company: { name: "Example Company Alpha" },
      },
    });

    expect(ycExtractor.extract()).toEqual({
      title: "Widget Engineer",
      company: "Example Company Alpha",
      location:
        "North Harbor / South Harbor / Remote",
      description: "Build the product.\n- TypeScript\n- React",
    });
  });

  test("falls back structurally when page data is malformed", () => {
    setDocument(`
      <div data-page="not-json"></div>
      <div><svg data-icon="location-dot"></svg><span>Unrelated location</span></div>
      <section>
        <h1>Platform Engineer at <a href="/companies/example-company">Example Company</a></h1>
        <div><svg data-icon="location-dot"></svg><span>Remote (US)</span></div>
      </section>
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
      location: "Remote (US)",
      description: "Build systems.\nWork with customers.",
    });
  });

  test("handles partial and incorrectly typed structured data", () => {
    setDocument(`
      <h1>Product Designer at <a href="/companies/example-company-gamma">Example Company Gamma</a></h1>
      <meta property="og:description" content="Design excellent products.">
    `);
    addPageData({
      props: {
        job: { title: 42, location: false, descriptionHtml: null },
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
