import type { JobPost } from "../shared/job";
import { getJobPageIdentity, parseUrl } from "../shared/jobSource";

type ActiveTab = {
  id?: number;
  url?: string;
};

type StatusTone = "neutral" | "error";

export type PopupInitializationDependencies = {
  restoreSavedJobPost: () => Promise<JobPost | null>;
  getActiveTab: () => Promise<ActiveTab | null>;
  setCurrentUrl: (url: string, preserveDetails: boolean) => void;
  extractFromTab: (tabId: number) => Promise<void>;
  setStatus: (message: string, tone?: StatusTone) => void;
  setSyncDisabled: (disabled: boolean) => void;
};

function getJobIdentity(value: string | undefined): string | null {
  const url = parseUrl(value);
  return url ? getJobPageIdentity(url) : null;
}

// Captures the active URL before attempting job detail extraction.
export async function initializePopup({
  restoreSavedJobPost,
  getActiveTab,
  setCurrentUrl,
  extractFromTab,
  setStatus,
  setSyncDisabled,
}: PopupInitializationDependencies): Promise<void> {
  setSyncDisabled(true);

  try {
    let savedJobPost: JobPost | null = null;

    try {
      savedJobPost = await restoreSavedJobPost();
    } catch {
      setStatus("Could not restore the last saved job.", "error");
    }

    const tab = await getActiveTab();
    if (!tab?.url) {
      setStatus(
        savedJobPost
          ? "Showing the last saved job."
          : "Open a job post or enter its details manually.",
      );
      return;
    }

    const activeJobIdentity = getJobIdentity(tab.url);
    const savedJobIdentity = getJobIdentity(savedJobPost?.sourceUrl);
    // Saved edits for this job are kept, and so is a draft typed by hand,
    // until a job page Role Snippet can read replaces it.
    const keepsSavedJob = Boolean(
      savedJobPost &&
        (activeJobIdentity
          ? activeJobIdentity === savedJobIdentity
          : !savedJobIdentity),
    );
    setCurrentUrl(tab.url, keepsSavedJob);

    // Saved edits are restored as they are, without reading the page again
    // over them.
    if (!activeJobIdentity || !tab.id || keepsSavedJob) {
      return;
    }

    await extractFromTab(tab.id);
  } finally {
    setSyncDisabled(false);
  }
}
