import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { ashbyExtractor } from "../extension/src/content/extractors/ashby";

function setPage(html = ""): void {
  const pageWindow = new Window();
  pageWindow.document.body.innerHTML = html;

  Object.assign(globalThis, {
    window: pageWindow,
    document: pageWindow.document,
    HTMLElement: pageWindow.HTMLElement,
    HTMLImageElement: pageWindow.HTMLImageElement,
  });
}

describe("ashbyExtractor", () => {
  beforeEach(() => {
    setPage();
  });

  test("adds schema location without changing existing schema fields", () => {
    setPage(`
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Widget Engineer – Remote",
          "hiringOrganization": { "name": "Example Company Iota" },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "United States"
            }
          },
          "description": "<p>Build example software.</p><ul><li>TypeScript</li><li>Rust</li></ul>"
        }
      </script>
    `);

    expect(ashbyExtractor.extract()).toEqual({
      title: "Widget Engineer – Remote",
      company: "Example Company Iota",
      location: "United States",
      description: "Build example software.\n- TypeScript\n- Rust",
    });
  });

  test("falls back structurally and ignores applicant eligibility metadata", () => {
    setPage(`
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "applicantLocationRequirements": {
            "@type": "Country",
            "name": "United States"
          }
        }
      </script>
      <header class="ashby-job-posting-header"><img alt="Example Company Kappa"></header>
      <h1 class="ashby-job-posting-heading">Product Engineer</h1>
      <aside>
        <section><h2>Location</h2><p>Remote - Americas</p></section>
        <section><h2>Employment Type</h2><p>Full time</p></section>
      </aside>
      <div id="overview"><div class="_descriptionText_test">Build products.</div></div>
    `);

    expect(ashbyExtractor.extract()).toEqual({
      title: "Product Engineer",
      company: "Example Company Kappa",
      location: "Remote - Americas",
      description: "Build products.",
    });
  });
});
