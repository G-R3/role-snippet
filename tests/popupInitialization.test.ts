import { describe, expect, test } from "bun:test";
import {
  initializePopup,
  type PopupInitializationDependencies,
} from "../extension/src/popup/popupInitialization";
import type { JobPost } from "../extension/src/shared/job";

const savedJobPost: JobPost = {
  sourceUrl:
    "https://www.linkedin.com/jobs/view/1234567890/?alternateChannel=search",
  title: "Software Engineer",
  company: "Example",
  location: "Remote",
  description: "Build useful software.",
  notes: "Saved edit",
};

type HarnessOptions = {
  savedJobPost?: JobPost | null;
  activeTab?: { id?: number; url?: string } | null;
};

function createHarness(options: HarnessOptions = {}) {
  const events: string[] = [];
  const extractedTabIds: number[] = [];
  const statuses: Array<{ message: string; tone?: string }> = [];
  const dependencies: PopupInitializationDependencies = {
    async restoreSavedJobPost() {
      events.push("restore");
      return options.savedJobPost ?? null;
    },
    async getActiveTab() {
      events.push("active-tab");
      return options.activeTab ?? null;
    },
    async extractFromTab(tabId) {
      events.push("extract");
      extractedTabIds.push(tabId);
    },
    setStatus(message, tone) {
      statuses.push({ message, tone });
    },
    setSyncDisabled(disabled) {
      events.push(disabled ? "sync-disabled" : "sync-enabled");
    },
  };

  return { dependencies, events, extractedTabIds, statuses };
}

describe("popup initialization", () => {
  test("disables sync until a new active job has been extracted", async () => {
    const harness = createHarness({
      savedJobPost,
      activeTab: {
        id: 42,
        url: "https://job-boards.greenhouse.io/example/jobs/1234567",
      },
    });

    await initializePopup(harness.dependencies);

    expect(harness.extractedTabIds).toEqual([42]);
    expect(harness.events).toEqual([
      "sync-disabled",
      "restore",
      "active-tab",
      "extract",
      "sync-enabled",
    ]);
  });

  test("restores edits without extracting when URLs identify the same job", async () => {
    const harness = createHarness({
      savedJobPost,
      activeTab: {
        id: 42,
        url: "https://www.linkedin.com/jobs/collections/top-applicant/?currentJobId=1234567890",
      },
    });

    await initializePopup(harness.dependencies);

    expect(harness.extractedTabIds).toEqual([]);
    expect(harness.statuses.at(-1)).toEqual({
      message: "Restored saved edits for this job.",
      tone: "success",
    });
    expect(harness.events.at(-1)).toBe("sync-enabled");
  });

  test("shows the saved draft on an unsupported page", async () => {
    const harness = createHarness({
      savedJobPost,
      activeTab: { id: 42, url: "https://example.com" },
    });

    await initializePopup(harness.dependencies);

    expect(harness.extractedTabIds).toEqual([]);
    expect(harness.statuses.at(-1)?.message).toBe(
      "Showing the last saved job.",
    );
  });

  test("leaves an empty popup ready for manual entry without a saved draft", async () => {
    const harness = createHarness({
      activeTab: { id: 42, url: "https://example.com" },
    });

    await initializePopup(harness.dependencies);

    expect(harness.extractedTabIds).toEqual([]);
    expect(harness.statuses.at(-1)?.message).toBe(
      "Open a supported job post or enter its details manually.",
    );
    expect(harness.events.at(-1)).toBe("sync-enabled");
  });

  test("re-enables sync if extraction unexpectedly fails", async () => {
    const harness = createHarness({
      activeTab: {
        id: 42,
        url: "https://www.workatastartup.com/jobs/12345",
      },
    });
    harness.dependencies.extractFromTab = async () => {
      throw new Error("Extraction failed");
    };

    await expect(initializePopup(harness.dependencies)).rejects.toThrow(
      "Extraction failed",
    );
    expect(harness.events.at(-1)).toBe("sync-enabled");
  });
});
