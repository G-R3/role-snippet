import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
  type JobPostInputElements,
  readFromInputs,
  writeToInputs,
} from "../extension/src/popup/jobPostForm";
import { JOB_POST_FIELDS, type JobPost } from "../extension/src/shared/job";

function createInputs(): JobPostInputElements {
  const document = new Window().document;

  return {
    sourceUrl: document.createElement("input"),
    title: document.createElement("input"),
    company: document.createElement("input"),
    location: document.createElement("input"),
    description: document.createElement("textarea"),
    notes: document.createElement("textarea"),
  };
}

const jobPost: JobPost = {
  sourceUrl: "https://example.com/jobs/widget-engineer",
  title: "Widget Engineer",
  company: "Example Company",
  location: "New York, NY",
  description: "Build reliable widgets.",
  notes: "Follow up on Friday.",
};

describe("job post form", () => {
  test("writes extracted values over the current inputs", () => {
    const inputs = createInputs();

    for (const field of JOB_POST_FIELDS) {
      inputs[field].value = "Manual value";
    }

    writeToInputs(inputs, jobPost);

    for (const field of JOB_POST_FIELDS) {
      expect(inputs[field].value).toBe(jobPost[field]);
    }
  });

  test("reads the current input values", () => {
    const inputs = createInputs();

    for (const field of JOB_POST_FIELDS) {
      inputs[field].value = jobPost[field];
    }

    expect(readFromInputs(inputs)).toEqual(jobPost);
  });
});
