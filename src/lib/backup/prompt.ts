const STORAGE_KEY = "detailing_sop_backup_prompts";

interface PromptState {
  dismissed_job_ids: string[];
}

function readState(): PromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed_job_ids: [] };
    const parsed = JSON.parse(raw) as PromptState;
    if (!Array.isArray(parsed.dismissed_job_ids)) {
      return { dismissed_job_ids: [] };
    }
    return parsed;
  } catch {
    return { dismissed_job_ids: [] };
  }
}

function writeState(state: PromptState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function shouldShowBackupPrompt(jobId: string): boolean {
  const state = readState();
  return !state.dismissed_job_ids.includes(jobId);
}

export function dismissBackupPrompt(jobId: string): void {
  const state = readState();
  if (state.dismissed_job_ids.includes(jobId)) return;
  writeState({
    dismissed_job_ids: [...state.dismissed_job_ids, jobId],
  });
}
