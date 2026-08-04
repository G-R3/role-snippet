import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { getJobPostingFromJsonLd } from "../extension/src/content/extractors/jobPostingSchema";

function setPage(html = ""): void {
  const pageWindow = new Window();
  pageWindow.document.body.innerHTML = html;

  Object.assign(globalThis, {
    window: pageWindow,
    document: pageWindow.document,
  });
}

describe("getJobPostingFromJsonLd", () => {
  beforeEach(() => {
    setPage();
  });

  test("finds a JobPosting in an array or @graph", () => {
    setPage(`
      <script type="application/ld+json">
        [
          { "@type": "Organization", "name": "Example Company Rho" },
          {
            "@graph": [
              { "@type": ["Thing", "JobPosting"], "title": "Engineer" }
            ]
          }
        ]
      </script>
    `);

    expect(getJobPostingFromJsonLd()).toEqual({
      "@type": ["Thing", "JobPosting"],
      title: "Engineer",
    });
  });

  test("continues after malformed structured data", () => {
    setPage(`
      <script type="application/ld+json">not valid json</script>
      <script type="application/ld+json">
        { "@type": "JobPosting", "title": "Product Engineer" }
      </script>
    `);

    expect(getJobPostingFromJsonLd()?.title).toBe("Product Engineer");
  });
});
