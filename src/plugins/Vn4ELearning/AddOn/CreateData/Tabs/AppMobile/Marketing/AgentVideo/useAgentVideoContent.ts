import React from 'react';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    copyShortVideoAgentPromptToClipboard,
    type ShortVideoAgentPromptPhase,
} from 'helpers/marketingShortVideoAgentPrompt';
import {
    approveAudioScript,
    normalizePlatforms,
    parseApiMessage,
    regenerateAgentNarrationTts,
    retryAgentNarrationTts,
    saveAdminAudioScript,
    saveAgentHfTheme,
    saveAgentTtsSettings,
    uploadAgentAudioMp3,
    type AgentVideoContentResponse,
    type HfThemeCatalogItem,
} from './agentVideoApi';
import {
    DEFAULT_TTS_PLATFORMS,
    formatTtsChain,
    resolveWorkflowChip,
} from './agentVideoUi';
import {
    clearAgentVideoScriptDraft,
    readAgentVideoScriptDraft,
    writeAgentVideoScriptDraft,
} from './agentVideoDraft';
import { buildImproveAudioScriptPrompt } from './agentVideoImproveScriptPrompt';
import { copyTextToClipboard } from '../../StoreScreenshots/storeScreenshotClipboard';

type UseAgentVideoContentArgs = {
    open: boolean;
    shortVideoId: number;
    onUploaded?: () => void;
};

export function useAgentVideoContent({ open, shortVideoId, onUploaded }: UseAgentVideoContentArgs) {
    const api = useAjax();
    const { showMessage } = useFloatingMessages();
    const apiRef = React.useRef(api);
    apiRef.current = api;

    const [title, setTitle] = React.useState('');
    const [audioScript, setAudioScript] = React.useState('');
    const [scriptApproved, setScriptApproved] = React.useState(false);
    const [audioFileUrl, setAudioFileUrl] = React.useState('');
    const [audioDurationSec, setAudioDurationSec] = React.useState<number | null>(null);
    const [agentTtsAuto, setAgentTtsAuto] = React.useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>(DEFAULT_TTS_PLATFORMS);
    const [ttsPending, setTtsPending] = React.useState(false);
    const [ttsFailed, setTtsFailed] = React.useState(false);
    const [needsTtsEnqueue, setNeedsTtsEnqueue] = React.useState(false);
    const [lastError, setLastError] = React.useState('');
    const [agentVideoStatus, setAgentVideoStatus] = React.useState('none');
    const [agentVideoUrl, setAgentVideoUrl] = React.useState('');
    const [agentVideoRenderedAt, setAgentVideoRenderedAt] = React.useState('');
    const [agentTtsJobId, setAgentTtsJobId] = React.useState<number | null>(null);
    const [agentTtsStatus, setAgentTtsStatus] = React.useState('');
    const [ttsChain, setTtsChain] = React.useState<string[]>([]);
    const [workflowMode, setWorkflowMode] = React.useState('');
    const [workflowPhase, setWorkflowPhase] = React.useState('');
    const [readyForPhase2, setReadyForPhase2] = React.useState(false);
    const [hasAgentVideo, setHasAgentVideo] = React.useState(false);
    const [agentVideoSummary, setAgentVideoSummary] = React.useState<AgentVideoContentResponse['agent_video_summary']>();
    const [hfTheme, setHfTheme] = React.useState('auto');
    const [hfThemeResolved, setHfThemeResolved] = React.useState('');
    const [hfThemeSource, setHfThemeSource] = React.useState('');
    const [hfThemeCatalog, setHfThemeCatalog] = React.useState<HfThemeCatalogItem[]>([]);
    const [marketingPostId, setMarketingPostId] = React.useState(0);
    const [thumbnail, setThumbnail] = React.useState<unknown>(null);

    const [uploading, setUploading] = React.useState(false);
    const [savingTtsMode, setSavingTtsMode] = React.useState(false);
    const [savingHfTheme, setSavingHfTheme] = React.useState(false);
    const [savingScript, setSavingScript] = React.useState(false);
    const [approvingScript, setApprovingScript] = React.useState(false);
    const [retryingTts, setRetryingTts] = React.useState(false);
    const [regeneratingTts, setRegeneratingTts] = React.useState(false);

    const savedScriptRef = React.useRef('');

    const resolveScriptFromResponse = React.useCallback((serverScript: string): string => {
        const draft = readAgentVideoScriptDraft(shortVideoId);
        if (draft !== null && draft !== serverScript) {
            return draft;
        }
        if (draft !== null && draft === serverScript) {
            clearAgentVideoScriptDraft(shortVideoId);
        }
        return serverScript;
    }, [shortVideoId]);

    const applyResponse = React.useCallback((res: AgentVideoContentResponse) => {
        if (!res?.success) {
            return;
        }
        const serverScript = String(res?.audio_script || '').trim();
        savedScriptRef.current = serverScript;
        setTitle(String(res?.title || '').trim());
        setAudioScript(resolveScriptFromResponse(serverScript));
        setScriptApproved(Boolean(res?.audio_script_approved ?? res?.agent_workflow?.script_approved));
        setAudioFileUrl(String(res?.audio_file || '').trim());
        setAgentTtsAuto(Boolean(res?.agent_tts_auto));
        setTtsPending(Boolean(res?.tts_pending ?? res?.agent_workflow?.tts_pending));
        setTtsFailed(Boolean(res?.tts_failed ?? res?.agent_workflow?.tts_failed));
        setNeedsTtsEnqueue(Boolean(res?.needs_tts_enqueue));
        setLastError(String(res?.last_error || '').trim());
        setSelectedPlatforms(normalizePlatforms(res?.agent_tts_platforms));
        const dur = Number(res?.audio_file_duration_sec || 0);
        setAudioDurationSec(dur > 0 ? dur : null);
        setAgentVideoStatus(String(res?.agent_video_status || 'none'));
        setAgentVideoUrl(String(res?.agent_video_url || '').trim());
        setAgentVideoRenderedAt(String(res?.agent_video_rendered_at || '').trim());
        setAgentTtsJobId(res?.agent_tts_job_id ?? null);
        setAgentTtsStatus(String(res?.agent_tts_status || '').trim());
        setTtsChain(Array.isArray(res?.tts_chain) ? res.tts_chain : []);
        setWorkflowMode(String(res?.workflow_mode || '').trim());
        setWorkflowPhase(String(res?.agent_workflow?.phase || '').trim());
        setReadyForPhase2(Boolean(res?.agent_workflow?.ready_for_phase_2));
        setHasAgentVideo(Boolean(res?.agent_workflow?.has_agent_video) || String(res?.agent_video_url || '').trim() !== '');
        setAgentVideoSummary(res?.agent_video_summary);
        setHfTheme(String(res?.hf_theme || 'auto').trim() || 'auto');
        setHfThemeResolved(String(res?.hf_theme_resolved || '').trim());
        setHfThemeSource(String(res?.hf_theme_source || '').trim());
        setHfThemeCatalog(Array.isArray(res?.hf_theme_catalog) ? res.hf_theme_catalog : []);
        const mpId = Number(res?.marketing_post_id || 0);
        setMarketingPostId(Number.isFinite(mpId) && mpId > 0 ? mpId : 0);
        setThumbnail(res?.thumbnail ?? null);
    }, [resolveScriptFromResponse]);

    const handleAudioScriptChange = React.useCallback((value: string) => {
        setAudioScript(value);
        writeAgentVideoScriptDraft(shortVideoId, value);
    }, [shortVideoId]);

    const loadRow = React.useCallback((options?: { syncTtsQueue?: boolean }) => {
        if (!shortVideoId || !open) {
            return;
        }
        apiRef.current.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-audio-content',
            method: 'POST',
            data: {
                short_video_id: shortVideoId,
                id: shortVideoId,
                ...(options?.syncTtsQueue ? { sync_tts_queue: 1 } : {}),
            },
            loading: false,
            success: (res: AgentVideoContentResponse) => {
                applyResponse(res);
            },
        });
    }, [applyResponse, open, shortVideoId]);

    React.useEffect(() => {
        if (!open || !shortVideoId) {
            return;
        }
        loadRow({ syncTtsQueue: true });
    }, [loadRow, open, shortVideoId]);

    const shouldPoll = ttsPending || agentVideoStatus === 'processing';
    React.useEffect(() => {
        if (!open || !shortVideoId || !shouldPoll) {
            return undefined;
        }
        const timer = window.setInterval(() => {
            loadRow();
        }, 5000);
        return () => window.clearInterval(timer);
    }, [loadRow, open, shortVideoId, shouldPoll]);

    const hasScript = audioScript.length > 0;
    const scriptDirty = hasScript && audioScript !== savedScriptRef.current;
    const hasAudio = audioFileUrl.length > 0;
    const statusChip = resolveWorkflowChip({
        hasScript,
        scriptApproved,
        hasAudio,
        hasAgentVideo,
        ttsPending,
        ttsFailed,
        agentVideoStatus,
    });
    const chainLabel = formatTtsChain(selectedPlatforms);

    const persistTtsSettings = async (
        nextAuto: boolean,
        nextPlatforms: string[],
        successMessage?: string,
    ) => {
        setSavingTtsMode(true);
        try {
            const res = await saveAgentTtsSettings(shortVideoId, nextAuto, nextPlatforms);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được cấu hình TTS', 'error');
                return;
            }
            setAgentTtsAuto(nextAuto);
            setSelectedPlatforms(nextPlatforms);
            if (successMessage) {
                showMessage(successMessage, 'success');
            }
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingTtsMode(false);
        }
    };

    const handleTtsAutoChange = async (checked: boolean) => {
        const platforms = checked && selectedPlatforms.length === 0
            ? DEFAULT_TTS_PLATFORMS
            : selectedPlatforms;
        await persistTtsSettings(
            checked,
            platforms,
        );
    };

    const handlePlatformToggle = async (platformKey: string) => {
        if (!agentTtsAuto || savingTtsMode) {
            return;
        }
        const isSelected = selectedPlatforms.includes(platformKey);
        const nextPlatforms = isSelected
            ? selectedPlatforms.filter((key) => key !== platformKey)
            : [...selectedPlatforms, platformKey];

        if (nextPlatforms.length === 0) {
            showMessage('Phải chọn ít nhất một nền tảng TTS', 'warning');
            return;
        }

        const ordered = DEFAULT_TTS_PLATFORMS.filter((key) => nextPlatforms.includes(key));
        await persistTtsSettings(agentTtsAuto, ordered);
    };

    const handleCopyScript = async () => {
        if (!audioScript) {
            showMessage('Chưa có audio_script — chạy agent bước 1 trước', 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(audioScript);
            showMessage('Đã copy audio_script', 'success');
        } catch {
            showMessage('Không copy được script', 'error');
        }
    };

    const handleCopyImproveScriptPrompt = async () => {
        if (!audioScript.trim()) {
            showMessage('Chưa có audio script', 'warning');
            return;
        }
        const prompt = buildImproveAudioScriptPrompt(title, audioScript);
        if (!prompt) {
            showMessage('Chưa có audio script', 'warning');
            return;
        }
        try {
            await copyTextToClipboard(prompt);
            showMessage('Đã copy prompt cải thiện script', 'success');
        } catch {
            showMessage('Không copy được prompt', 'error');
        }
    };

    const handleCopyPrompt = async (phase: ShortVideoAgentPromptPhase) => {
        const result = await copyShortVideoAgentPromptToClipboard(shortVideoId, phase);
        showMessage(result.message, result.ok ? 'success' : 'error');
    };

    const handleSaveScript = async () => {
        if (!audioScript.trim()) {
            showMessage('Script trống', 'warning');
            return;
        }
        setSavingScript(true);
        try {
            const json = await saveAdminAudioScript(shortVideoId, audioScript);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không lưu được script', 'error');
                return;
            }
            setScriptApproved(false);
            savedScriptRef.current = audioScript.trim();
            clearAgentVideoScriptDraft(shortVideoId);
            showMessage(parseApiMessage(json?.message) || 'Đã lưu script', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingScript(false);
        }
    };

    const handleApproveScript = async () => {
        setApprovingScript(true);
        try {
            const json = await approveAudioScript(shortVideoId);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không duyệt được script', 'error');
                return;
            }
            setScriptApproved(true);
            showMessage(parseApiMessage(json?.message) || 'Đã duyệt script', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setApprovingScript(false);
        }
    };

    const handleHfThemeChange = async (nextTheme: string) => {
        setSavingHfTheme(true);
        try {
            const res = await saveAgentHfTheme(shortVideoId, nextTheme);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được theme', 'error');
                return;
            }
            setHfTheme(String(res?.hf_theme || nextTheme));
            setHfThemeResolved(String(res?.hf_theme_resolved || '').trim());
            setHfThemeSource(String(res?.hf_theme_source || '').trim());
            showMessage(parseApiMessage(res?.message) || 'Đã lưu theme HyperFrames', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingHfTheme(false);
        }
    };

    const handleRegenerateTts = async () => {
        if (!window.confirm('Tạo lại audio TTS? MP3 hiện tại sẽ bị thay thế sau khi queue hoàn tất.')) {
            return;
        }
        setRegeneratingTts(true);
        try {
            const json = await regenerateAgentNarrationTts(shortVideoId);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không tạo lại được audio TTS', 'error');
                return;
            }
            setAudioFileUrl('');
            setAudioDurationSec(null);
            setTtsPending(true);
            setTtsFailed(false);
            setNeedsTtsEnqueue(false);
            showMessage(parseApiMessage(json?.message) || 'Đã reset audio và queue TTS mới', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setRegeneratingTts(false);
        }
    };

    const handleRetryTts = async (successMessage = 'Đã đưa TTS vào hàng đợi') => {
        setRetryingTts(true);
        try {
            const json = await retryAgentNarrationTts(shortVideoId);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không thử lại được TTS', 'error');
                return;
            }
            showMessage(parseApiMessage(json?.message) || successMessage, 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setRetryingTts(false);
        }
    };

    const handleUploadMp3 = async (file: File) => {
        if (!/\.mp3$/i.test(file.name)) {
            showMessage('Chỉ chấp nhận file MP3', 'error');
            return;
        }
        setUploading(true);
        try {
            const res = await uploadAgentAudioMp3(shortVideoId, file);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Upload thất bại', 'error');
                return;
            }
            showMessage(parseApiMessage(res?.message) || 'Đã upload MP3', 'success');
            loadRow();
            onUploaded?.();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setUploading(false);
        }
    };

    return {
        title,
        shortVideoId,
        audioScript,
        setAudioScript: handleAudioScriptChange,
        scriptDirty,
        scriptApproved,
        audioFileUrl,
        audioDurationSec,
        agentTtsAuto,
        selectedPlatforms,
        ttsPending,
        ttsFailed,
        needsTtsEnqueue,
        lastError,
        agentVideoStatus,
        agentVideoUrl,
        agentVideoRenderedAt,
        agentTtsJobId,
        agentTtsStatus,
        ttsChain,
        workflowMode,
        workflowPhase,
        readyForPhase2,
        hasAgentVideo,
        agentVideoSummary,
        hfTheme,
        hfThemeResolved,
        hfThemeSource,
        hfThemeCatalog,
        marketingPostId,
        thumbnail,
        uploading,
        savingTtsMode,
        savingHfTheme,
        savingScript,
        approvingScript,
        retryingTts,
        regeneratingTts,
        hasScript,
        hasAudio,
        statusChip,
        chainLabel,
        loadRow,
        handleTtsAutoChange,
        handleHfThemeChange,
        handlePlatformToggle,
        handleCopyScript,
        handleCopyImproveScriptPrompt,
        handleCopyPrompt,
        handleSaveScript,
        handleApproveScript,
        handleRegenerateTts,
        handleRetryTts,
        handleUploadMp3,
    };
}
