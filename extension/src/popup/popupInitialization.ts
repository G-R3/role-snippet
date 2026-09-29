import type { JobPost } from "../shared/job";
import { getJobPageIdentity } from "../shared/jobSource";

type ActiveTab = {
  id?: number;
  url?: string;
};

type StatusTone = "neutral" | "success" | "error";

export type PopupInitializationDependencies = {
  restoreSavedJobPost: () => Promise<JobPost | null>;
  getActiveTab: () => Promise<ActiveTab | null>;
  setCurrentUrl: (url: string, preserveDetails: boolean) => void;
  extractFromTab: (tabId: number) => Promise<void>;
  setStatus: (message: string, tone?: StatusTone) => void;
  setSyncDisabled: (disabled: boolean) => void;
};

function getJobIdentity(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return getJobPageIdentity(new URL(url));
  } catch {
    return null;
  }
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
    const isSavedJob = Boolean(
      activeJobIdentity &&
        activeJobIdentity === getJobIdentity(savedJobPost?.sourceUrl),
    );
    setCurrentUrl(tab.url, isSavedJob);

    if (!activeJobIdentity || !tab.id) {
      return;
    }

    if (isSavedJob) {
      setStatus("Restored saved edits for this job.", "success");
      return;
    }

    await extractFromTab(tab.id);
  } finally {
    setSyncDisabled(false);
  }
}
