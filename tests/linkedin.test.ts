import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { linkedInExtractor } from "../extension/src/content/extractors/linkedin";

function setPage(url: string, html: string): void {
  const pageWindow = new Window({ url });
  pageWindow.document.body.innerHTML = html;

  Object.assign(globalThis, {
    window: pageWindow,
    document: pageWindow.document,
    HTMLElement: pageWindow.HTMLElement,
    HTMLAnchorElement: pageWindow.HTMLAnchorElement,
    HTMLImageElement: pageWindow.HTMLImageElement,
  });
}

describe("linkedInExtractor", () => {
  beforeEach(() => {
    setPage("https://www.linkedin.com/jobs/", "");
  });

  test("adds location from the collections layout without changing existing fields", () => {
    setPage(
      "https://www.linkedin.com/jobs/collections/top-applicant/?currentJobId=1111111111",
      `
        <div class="job-details-jobs-unified-top-card__company-name">
          <a href="/company/example-company-delta/life">Example Company Delta</a>
        </div>
        <div class="job-details-jobs-unified-top-card__job-title">
          <h1><a href="/jobs/view/1111111111/">Widget Engineer</a></h1>
        </div>
        <div class="job-details-jobs-unified-top-card__tertiary-description-container">
          <span dir="ltr">
            <span class="tvm__text tvm__text--low-emphasis">New York, NY</span>
            <span class="tvm__text tvm__text--low-emphasis"> · </span>
            <span class="tvm__text tvm__text--low-emphasis">Reposted 3 days ago</span>
          </span>
        </div>
        <div id="job-details">About the job
Build reliable example software.</div>
      `,
    );

    expect(linkedInExtractor.extract()).toEqual({
      title: "Widget Engineer",
      company: "Example Company Delta",
      location: "New York, NY",
      description: "Build reliable example software.",
    });
  });

  test("finds location structurally in the SDUI search-results layout", () => {
    setPage(
      "https://www.linkedin.com/jobs/search-results/?currentJobId=2222222222",
      `
        <div data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails">
          <div>
            <a href="/company/example-company-epsilon/life/">
              <div aria-label="Company, Example Company Epsilon."><p>Example Company Epsilon</p></div>
            </a>
            <p><a href="/jobs/view/2222222222/">Service Engineer</a></p>
            <p>
              <span>New York City Metropolitan Area</span>
              <span> · </span>
              <span>Reposted 5 days ago</span>
            </p>
            <p><span>Promoted by hirer · Responses managed off LinkedIn</span></p>
          </div>
        </div>
        <div componentkey="JobDetails_AboutTheJob_2222222222">About the job
Build resilient backend systems.</div>
      `,
    );

    expect(linkedInExtractor.extract()).toEqual({
      title: "Service Engineer",
      company: "Example Company Epsilon",
      location: "New York City Metropolitan Area",
      description: "Build resilient backend systems.",
    });
  });

  test("finds location in the standalone SDUI job-details layout", () => {
    setPage(
      "https://www.linkedin.com/jobs/view/3333333333/",
      `
        <a href="/jobs/view/3333333333/"><span>Example promotion</span></a>
        <div data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.JobDetails">
          <a href="/company/example-company-zeta/life/">
            <div aria-label="Company, Example Company Zeta."><p>Example Company Zeta</p></div>
          </a>
          <p>Interface Engineer<span></span><a href="#" aria-label="Verified job"></a></p>
          <p>
            <span>New York, NY</span>
            <span> · </span>
            <span>6 days ago</span>
            <span> · </span>
            <span>Over 100 people clicked apply</span>
          </p>
          <p><span>Promoted by hirer · Responses managed off LinkedIn</span></p>
          <a href="/jobs/view/3333333333/"><span>Hybrid</span></a>
        </div>
      `,
    );
    document.title = "Interface Engineer | Example Company Zeta | LinkedIn";

    expect(linkedInExtractor.extract()).toEqual({
      title: "Interface Engineer",
      company: "Example Company Zeta",
      location: "New York, NY",
      description: "",
    });
  });

  test("leaves existing metadata intact when location is unavailable", () => {
    setPage(
      "https://www.linkedin.com/jobs/view/4444444444/",
      `
        <h1>Platform Engineer</h1>
        <div class="topcard__org-name-link">Example Company Eta</div>
        <div id="job-details">About the job
Operate the platform.</div>
      `,
    );

    expect(linkedInExtractor.extract()).toEqual({
      title: "Platform Engineer",
      company: "Example Company Eta",
      location: "",
      description: "Operate the platform.",
    });
  });
});
