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

// Restores the draft first, then extracts only when the active tab is a new job.
export async function initializePopup({
  restoreSavedJobPost,
  getActiveTab,
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
    const activeJobIdentity = getJobIdentity(tab?.url);

    if (!tab?.id || !activeJobIdentity) {
      setStatus(
        savedJobPost
          ? "Showing the last saved job."
          : "Open a supported job post or enter its details manually.",
      );
      return;
    }

    if (activeJobIdentity === getJobIdentity(savedJobPost?.sourceUrl)) {
      setStatus("Restored saved edits for this job.", "success");
      return;
    }

    await extractFromTab(tab.id);
  } finally {
    setSyncDisabled(false);
  }
}
