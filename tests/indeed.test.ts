import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { indeedExtractor } from "../extension/src/content/extractors/indeed";

function setPage(html = ""): void {
  const pageWindow = new Window();
  pageWindow.document.body.innerHTML = html;

  Object.assign(globalThis, {
    window: pageWindow,
    document: pageWindow.document,
    HTMLElement: pageWindow.HTMLElement,
  });
}

describe("indeedExtractor", () => {
  beforeEach(() => {
    setPage();
  });

  test("extracts Indeed job posting schema", () => {
    setPage(`
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Widget Engineer",
          "hiringOrganization": { "name": "Example Company Omicron" },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Remote",
              "addressCountry": "US"
            }
          },
          "description": "<p><b>About Example Company Omicron</b></p><p>Build useful software.</p><ul><li>Own features</li><li>Ship continuously</li></ul>"
        }
      </script>
    `);

    expect(indeedExtractor.extract()).toEqual({
      title: "Widget Engineer",
      company: "Example Company Omicron",
      location: "Remote, US",
      description:
        "About Example Company Omicron\nBuild useful software.\n- Own features\n- Ship continuously",
    });
  });

  test("falls back to Indeed's stable DOM hooks", () => {
    setPage(`
      <script type="application/ld+json">not valid json</script>
      <h1 data-testid="jobsearch-JobInfoHeader-title">
        <span>Gadget Engineer</span>
      </h1>
      <div data-testid="inlineHeader-companyName"><a>Example Company Pi</a></div>
      <div data-testid="inlineHeader-companyLocation"><div>Remote</div></div>
      <div id="jobDescriptionText">
        <p>Build products.</p>
        <ul><li>TypeScript</li><li>CSS</li></ul>
      </div>
    `);

    expect(indeedExtractor.extract()).toEqual({
      title: "Gadget Engineer",
      company: "Example Company Pi",
      location: "Remote",
      description: "Build products.\n- TypeScript\n- CSS",
    });
  });
});
