const DRAFT_STORAGE_PREFIX = 'agent_video_script_draft_';

type ScriptDraftRecord = {
    script: string;
    at: number;
};

export function readAgentVideoScriptDraft(shortVideoId: number): string | null {
    if (!shortVideoId || typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}${shortVideoId}`);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as ScriptDraftRecord;
        return typeof parsed?.script === 'string' ? parsed.script : null;
    } catch {
        return null;
    }
}

export function writeAgentVideoScriptDraft(shortVideoId: number, script: string): void {
    if (!shortVideoId || typeof window === 'undefined') {
        return;
    }
    const record: ScriptDraftRecord = { script, at: Date.now() };
    window.sessionStorage.setItem(`${DRAFT_STORAGE_PREFIX}${shortVideoId}`, JSON.stringify(record));
}

export function clearAgentVideoScriptDraft(shortVideoId: number): void {
    if (!shortVideoId || typeof window === 'undefined') {
        return;
    }
    window.sessionStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${shortVideoId}`);
}
