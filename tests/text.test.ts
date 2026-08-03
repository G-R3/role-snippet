import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { htmlToMultilineText } from "../extension/src/content/extractors/text";

describe("htmlToMultilineText", () => {
  test("preserves block, line break, and list boundaries in minified HTML", () => {
    const document = new Window().document;
    const html =
      "<h2>Responsibilities</h2><p>Build products<br>Ship improvements</p><ul><li>TypeScript</li><li>React</li></ul>";

    expect(htmlToMultilineText(html, document)).toBe(
      [
        "Responsibilities",
        "Build products",
        "Ship improvements",
        "- TypeScript",
        "- React",
      ].join("\n"),
    );
  });

  test("ignores comments and preserves nested inline text", () => {
    const document = new Window().document;

    expect(
      htmlToMultilineText(
        "<!-- hidden --><p>Work with <strong>customers</strong>.</p>",
        document,
      ),
    ).toBe("Work with customers.");
  });

  test("ignores non-content elements and separates table cells", () => {
    const document = new Window().document;
    const html = [
      "<style>.hidden { display: none; }</style>",
      "<script>hidden()</script>",
      "<table><tr><th>Salary</th><th>Equity</th></tr>",
      "<tr><td>$100k</td><td>1%</td></tr></table>",
    ].join("");

    expect(htmlToMultilineText(html, document)).toBe(
      ["Salary", "Equity", "$100k", "1%"].join("\n"),
    );
  });
});
