import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { greenhouseExtractor } from "../extension/src/content/extractors/greenhouse";

function setPage(html = ""): void {
  const pageWindow = new Window();
  pageWindow.document.body.innerHTML = html;

  Object.assign(globalThis, {
    document: pageWindow.document,
    HTMLElement: pageWindow.HTMLElement,
    HTMLImageElement: pageWindow.HTMLImageElement,
  });
}

describe("greenhouseExtractor", () => {
  beforeEach(() => {
    setPage();
  });

  test("extracts the direct-logo and multi-location page layout", () => {
    setPage(`
      <meta property="og:title" content="Widget Engineer">
      <meta property="og:description" content="Los Angeles, CA, United States; New York, NY, United States">
      <img class="logo" alt="Example Company Lambda Logo">
      <div class="job__title">
        <h1>Widget Engineer</h1>
        <div class="job__location">
          <svg></svg>
          <div>Los Angeles, CA, United States; New York, NY, United States</div>
        </div>
      </div>
      <div class="job__description">Build the example platform.</div>
    `);

    expect(greenhouseExtractor.extract()).toEqual({
      title: "Widget Engineer",
      company: "Example Company Lambda",
      location: "Los Angeles, CA, United States; New York, NY, United States",
      description: "Build the example platform.",
    });
  });

  test("extracts the linked-logo and remote-location page layout", () => {
    setPage(`
      <meta property="og:title" content="Widget Engineer">
      <meta property="og:description" content="United States - Remote">
      <a class="logo"><img alt="Example Company Mu Logo"></a>
      <div class="job__title">
        <h1>Widget Engineer</h1>
        <div class="job__location"><svg></svg><div>United States - Remote</div></div>
      </div>
      <div class="job__description">Build internal software.</div>
    `);

    expect(greenhouseExtractor.extract()).toEqual({
      title: "Widget Engineer",
      company: "Example Company Mu",
      location: "United States - Remote",
      description: "Build internal software.",
    });
  });

  test("falls back to title metadata without treating description as location", () => {
    setPage(`
      <meta property="og:title" content="Platform Engineer">
      <meta property="og:description" content="Remote - Americas">
      <a class="logo"><img alt="Example Company Logo"></a>
      <h1>About the role</h1>
      <div class="job__description">Build systems.</div>
    `);

    expect(greenhouseExtractor.extract()).toEqual({
      title: "Platform Engineer",
      company: "Example Company",
      location: "",
      description: "Build systems.",
    });
  });
});
