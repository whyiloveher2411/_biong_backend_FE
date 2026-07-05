import React from 'react';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    copyShortVideoAgentPromptToClipboard,
    type ShortVideoAgentPromptPhase,
} from 'helpers/marketingShortVideoAgentPrompt';
import { launchShortVideoAgent, launchShortVideoAgentContinue, launchShortVideoAgentImportAssemble, launchShortVideoAgentImportHtmlFull, launchShortVideoAgentRender } from 'helpers/marketingShortVideoAgentLaunch';
import {
    IMPORT_HTML_BEAT_HTML_SAVED_EVENT,
    openImportHtmlBeatGeminiFillOnly,
    openImportHtmlBeatGeminiForMissingBeats,
} from 'helpers/marketingImportHtmlWorkflow';
import {
    approveAudioScript,
    fetchImportHtmlContext,
    normalizePlatforms,
    parseApiMessage,
    regenerateAgentNarrationTts,
    retryAgentNarrationTts,
    saveAdminAudioScript,
    saveAgentHfTheme,
    saveAgentImportHtml,
    saveAgentTtsSettings,
    savePublishFlags,
    transcribeAgentAudio,
    uploadAgentAudioMp3,
    type AgentRenderMode,
    type AgentVideoContentResponse,
    type HfThemeCatalogItem,
    type ImportHtmlSummary,
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
import { buildBeatDivisionPrompt } from './agentVideoBeatDivisionPrompt';
import {
    applyHfPromptTypeToMissingBeats,
    beatMapToJson,
    countMissingBeatHtml,
    listBeatIdsWithHtml,
    listMissingBeatIds,
    parseBeatMapJson,
    validateBeatMap,
    type BeatMap,
    type BeatHtmlEntry,
} from './agentVideoBeatMap';
import { normalizeImportHtmlForAudio } from './agentVideoCustomHtmlPreview';
import { formatDurationSec } from './agentVideoHfPromptDuration';
import {
    buildBeatHtmlPrompt,
    parseImportHtmlContextMessage,
    type ImportHtmlContextPayload,
} from './agentVideoImportHtmlPrompt';
import { DEFAULT_HF_PROMPT_TYPE, isHfPromptTypeKey } from './agentVideoHfPromptCatalog';
import { extractBeatHtmlFromPastedText } from './agentVideoBeatHtmlClipboard';
import { buildImproveAudioScriptPrompt } from './agentVideoImproveScriptPrompt';
import { copyTextToClipboard, readTextFromClipboard } from '../../StoreScreenshots/storeScreenshotClipboard';

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
    const [postEligible, setPostEligible] = React.useState(false);
    const [socialPosted, setSocialPosted] = React.useState(false);
    const [renderMode, setRenderMode] = React.useState<AgentRenderMode>('creative');
    const [importHtml, setImportHtml] = React.useState('');
    const [beatMap, setBeatMap] = React.useState<BeatMap | null>(null);
    const [beatMapJsonDraft, setBeatMapJsonDraft] = React.useState('');
    const [beatHtml, setBeatHtml] = React.useState<Record<string, BeatHtmlEntry>>({});
    const [beatMapReady, setBeatMapReady] = React.useState(false);
    const [beatsHtmlTotal, setBeatsHtmlTotal] = React.useState(0);
    const [beatsHtmlCompleted, setBeatsHtmlCompleted] = React.useState(0);
    const [activeBeatId, setActiveBeatId] = React.useState('');
    const [beatEditorFocusRequest, setBeatEditorFocusRequest] = React.useState<{
        beatId: string;
        nonce: number;
    } | null>(null);
    const [beatPlaybackSeekRequest, setBeatPlaybackSeekRequest] = React.useState<{
        beatId: string;
        startSec: number;
        nonce: number;
    } | null>(null);
    const [hfPromptType, setHfPromptType] = React.useState(DEFAULT_HF_PROMPT_TYPE);
    const [whisperStatus, setWhisperStatus] = React.useState('none');
    const [importHtmlReady, setImportHtmlReady] = React.useState(false);
    const [whisperError, setWhisperError] = React.useState('');

    const [uploading, setUploading] = React.useState(false);
    const [savingTtsMode, setSavingTtsMode] = React.useState(false);
    const [savingHfTheme, setSavingHfTheme] = React.useState(false);
    const [savingPublishFlags, setSavingPublishFlags] = React.useState(false);
    const [savingScript, setSavingScript] = React.useState(false);
    const [approvingScript, setApprovingScript] = React.useState(false);
    const [retryingTts, setRetryingTts] = React.useState(false);
    const [regeneratingTts, setRegeneratingTts] = React.useState(false);
    const [launchingRender, setLaunchingRender] = React.useState(false);
    const [launchingScript, setLaunchingScript] = React.useState(false);
    const [launchingContinue, setLaunchingContinue] = React.useState(false);
    const [launchingImportAssemble, setLaunchingImportAssemble] = React.useState(false);
    const [launchingImportHtmlFull, setLaunchingImportHtmlFull] = React.useState(false);
    const [transcribingWhisper, setTranscribingWhisper] = React.useState(false);
    const [savingImportHtml, setSavingImportHtml] = React.useState(false);
    const [copyingBeatDivisionPrompt, setCopyingBeatDivisionPrompt] = React.useState(false);
    const [copyingCreateScriptPrompt, setCopyingCreateScriptPrompt] = React.useState(false);
    const [copyingBeatHtmlPromptBeatId, setCopyingBeatHtmlPromptBeatId] = React.useState('');
    const [pastingBeatHtmlBeatId, setPastingBeatHtmlBeatId] = React.useState('');
    const [deletingBeatHtmlBeatId, setDeletingBeatHtmlBeatId] = React.useState('');
    const [deletingAllBeatHtml, setDeletingAllBeatHtml] = React.useState(false);
    const [openingBeatGeminiBeatIds, setOpeningBeatGeminiBeatIds] = React.useState<string[]>([]);
    const [openingAllMissingBeatGemini, setOpeningAllMissingBeatGemini] = React.useState(false);

    const savedScriptRef = React.useRef('');
    const savedImportHtmlRef = React.useRef('');
    const savedBeatMapJsonRef = React.useRef('');
    const importHtmlSaveTimerRef = React.useRef<number | null>(null);
    const beatMapSaveTimerRef = React.useRef<number | null>(null);
    const beatHtmlSaveTimerRef = React.useRef<Record<string, number>>({});

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
        setPostEligible(Boolean(res?.post_eligible));
        setSocialPosted(Boolean(res?.social_posted));
        const nextRenderMode = res?.render_mode === 'import_html' ? 'import_html' : 'creative';
        setRenderMode(nextRenderMode);
        const importSummary = res?.import_html;
        const nextHtml = String(importSummary?.html || '');
        setImportHtml(nextHtml);
        savedImportHtmlRef.current = nextHtml;
        const nextBeatMap = importSummary?.beat_map ?? null;
        setBeatMap(nextBeatMap);
        const nextBeatMapJson = nextBeatMap ? beatMapToJson(nextBeatMap) : '';
        setBeatMapJsonDraft(nextBeatMapJson);
        savedBeatMapJsonRef.current = nextBeatMapJson;
        setBeatHtml((prev) => {
            const beatHtmlRaw = importSummary?.beat_html ?? {};
            const nextBeatHtml: Record<string, BeatHtmlEntry> = {};
            Object.entries(beatHtmlRaw).forEach(([beatId, entry]) => {
                if (entry && typeof entry === 'object') {
                    nextBeatHtml[beatId] = {
                        html: String(entry.html || ''),
                        updated_at: entry.updated_at,
                    };
                }
            });
            Object.keys(beatHtmlSaveTimerRef.current).forEach((beatId) => {
                if (prev[beatId]?.html?.trim()) {
                    nextBeatHtml[beatId] = prev[beatId];
                }
            });
            return nextBeatHtml;
        });
        setBeatMapReady(Boolean(importSummary?.beat_map_ready));
        setBeatsHtmlTotal(Number(importSummary?.beats_html_total || 0));
        setBeatsHtmlCompleted(Number(importSummary?.beats_html_completed || 0));
        setActiveBeatId((prev) => prev || nextBeatMap?.sections?.[0]?.id || '');
        const nextPromptType = String(importSummary?.hf_prompt_type || '').trim();
        setHfPromptType(isHfPromptTypeKey(nextPromptType) ? nextPromptType : DEFAULT_HF_PROMPT_TYPE);
        setWhisperStatus(String(importSummary?.whisper_status || res?.agent_workflow?.whisper_status || 'none'));
        setWhisperError(String(importSummary?.whisper_error || '').trim());
        setImportHtmlReady(Boolean(importSummary?.import_html_ready ?? res?.agent_workflow?.import_html_ready));
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

    React.useEffect(() => {
        if (!open || !shortVideoId) {
            return undefined;
        }
        const onImportHtmlBeatHtmlSaved = (event: Event) => {
            const custom = event as CustomEvent<{
                shortVideoId?: number;
                short_video_id?: number;
            }>;
            const detail = custom.detail || {};
            const savedShortVideoId = Number(detail.shortVideoId ?? detail.short_video_id ?? 0);
            if (savedShortVideoId > 0 && savedShortVideoId === shortVideoId) {
                loadRow();
            }
        };
        document.addEventListener(IMPORT_HTML_BEAT_HTML_SAVED_EVENT, onImportHtmlBeatHtmlSaved);
        return () => {
            document.removeEventListener(IMPORT_HTML_BEAT_HTML_SAVED_EVENT, onImportHtmlBeatHtmlSaved);
        };
    }, [loadRow, open, shortVideoId]);

    const shouldPoll = ttsPending || agentVideoStatus === 'processing' || whisperStatus === 'processing';
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

    const applyBeatMapDraft = React.useCallback((nextBeatMap: BeatMap) => {
        const json = beatMapToJson(nextBeatMap);
        const validIds = new Set(nextBeatMap.sections.map((section) => section.id));

        setBeatMap(nextBeatMap);
        setBeatMapJsonDraft(json);
        setBeatMapReady(nextBeatMap.sections.length > 0);
        setBeatsHtmlTotal(nextBeatMap.sections.length);
        setBeatHtml((prev) => Object.fromEntries(
            Object.entries(prev).filter(([beatId]) => validIds.has(beatId)),
        ));
        setBeatsHtmlCompleted(nextBeatMap.sections.filter(
            (section) => String(beatHtml[section.id]?.html || '').trim() !== '',
        ).length);
        setActiveBeatId((prev) => (prev && validIds.has(prev) ? prev : nextBeatMap.sections[0]?.id || ''));
    }, [beatHtml]);

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
            showMessage('Chưa có audio_script — hãy copy prompt sinh script trước', 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(audioScript);
            showMessage('Đã copy audio_script', 'success');
        } catch {
            showMessage('Không copy được script', 'error');
        }
    };

    const handleCopyCreateScriptPrompt = async () => {
        setCopyingCreateScriptPrompt(true);
        try {
            const result = await copyShortVideoAgentPromptToClipboard(shortVideoId, '1', { variant: 'chatbot' });
            showMessage(result.message, result.ok ? 'success' : 'error');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setCopyingCreateScriptPrompt(false);
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

    const handleLaunchAgentRender = async () => {
        setLaunchingRender(true);
        try {
            const result = await launchShortVideoAgentRender(shortVideoId);
            showMessage(result.message, result.ok ? 'success' : 'error');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setLaunchingRender(false);
        }
    };

    const handleLaunchAgentScript = async () => {
        setLaunchingScript(true);
        try {
            const result = await launchShortVideoAgent(shortVideoId, '1');
            showMessage(result.message, result.ok ? 'success' : 'error');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setLaunchingScript(false);
        }
    };

    const handleLaunchAgentContinue = async () => {
        setLaunchingContinue(true);
        try {
            const result = await launchShortVideoAgentContinue(shortVideoId);
            showMessage(result.message, result.ok ? 'success' : 'error');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setLaunchingContinue(false);
        }
    };

    const applyImportHtmlSummary = React.useCallback((summary: ImportHtmlSummary) => {
        if (summary.hf_prompt_type && isHfPromptTypeKey(summary.hf_prompt_type)) {
            setHfPromptType(summary.hf_prompt_type);
        }
        if (summary.whisper_status) {
            setWhisperStatus(summary.whisper_status);
        }
        setWhisperError(String(summary.whisper_error || '').trim());
        setImportHtmlReady(Boolean(summary.import_html_ready));
        setBeatMapReady(Boolean(summary.beat_map_ready));
        if (typeof summary.html === 'string') {
            setImportHtml(summary.html);
            savedImportHtmlRef.current = summary.html;
        }
        if (summary.beat_map) {
            applyBeatMapDraft(summary.beat_map);
            savedBeatMapJsonRef.current = beatMapToJson(summary.beat_map);
        }
        if (summary.beat_html) {
            setBeatHtml((prev) => {
                const nextBeatHtml: Record<string, BeatHtmlEntry> = {};
                Object.entries(summary.beat_html ?? {}).forEach(([beatId, entry]) => {
                    if (entry && typeof entry === 'object') {
                        nextBeatHtml[beatId] = {
                            html: String(entry.html || ''),
                            updated_at: entry.updated_at,
                        };
                    }
                });
                Object.keys(beatHtmlSaveTimerRef.current).forEach((beatId) => {
                    if (prev[beatId]?.html?.trim()) {
                        nextBeatHtml[beatId] = prev[beatId];
                    }
                });
                return nextBeatHtml;
            });
        }
        setBeatsHtmlTotal(Number(summary.beats_html_total || summary.beat_map?.sections?.length || 0));
        setBeatsHtmlCompleted(Number(summary.beats_html_completed || 0));
    }, [applyBeatMapDraft]);

    const persistImportHtml = React.useCallback(async (payload: {
        renderMode?: AgentRenderMode;
        hfPromptType?: string;
        html?: string;
        beatMap?: BeatMap;
        beatId?: string;
        beatHtml?: string;
    }) => {
        setSavingImportHtml(true);
        try {
            const res = await saveAgentImportHtml(shortVideoId, {
                renderMode: payload.renderMode,
                hfPromptType: payload.hfPromptType,
                html: payload.html,
                beatMap: payload.beatMap,
                beatId: payload.beatId,
                beatHtml: payload.beatHtml,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được HTML chatbot', 'error');
                return false;
            }
            if (payload.html !== undefined) {
                savedImportHtmlRef.current = payload.html;
            }
            if (payload.beatMap !== undefined) {
                savedBeatMapJsonRef.current = beatMapToJson(payload.beatMap);
            }
            if (res.render_mode) {
                setRenderMode(res.render_mode);
            }
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
            }
            if (payload.beatId) {
                const pendingTimer = beatHtmlSaveTimerRef.current[payload.beatId];
                if (pendingTimer != null) {
                    window.clearTimeout(pendingTimer);
                    delete beatHtmlSaveTimerRef.current[payload.beatId];
                }
            }
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingImportHtml(false);
        }
    }, [applyImportHtmlSummary, shortVideoId, showMessage]);

    const handleLaunchAgentImportAssemble = async () => {
        setLaunchingImportAssemble(true);
        try {
            const result = await launchShortVideoAgentImportAssemble(shortVideoId);
            showMessage(result.message, result.ok ? 'success' : 'error');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setLaunchingImportAssemble(false);
        }
    };

    const handleLaunchAgentImportHtmlFull = async () => {
        setLaunchingImportHtmlFull(true);
        try {
            if (beatMap && isHfPromptTypeKey(hfPromptType)) {
                const updatedMap = applyHfPromptTypeToMissingBeats(beatMap, beatHtml, hfPromptType);
                const beatMapChanged = updatedMap.sections.some(
                    (section, index) => section.hf_prompt_type !== beatMap.sections[index]?.hf_prompt_type,
                );
                if (beatMapChanged) {
                    const ok = await persistImportHtml({ beatMap: updatedMap, hfPromptType });
                    if (!ok) {
                        return;
                    }
                } else {
                    await persistImportHtml({ hfPromptType });
                }
            }
            const result = await launchShortVideoAgentImportHtmlFull(shortVideoId);
            showMessage(result.message, result.ok ? 'success' : 'error');
            if (result.ok) {
                loadRow();
            }
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setLaunchingImportHtmlFull(false);
        }
    };

    const handleRenderModeChange = async (nextMode: AgentRenderMode) => {
        if (nextMode === renderMode) {
            return;
        }
        if (hasAgentVideo && !window.confirm('Đổi luồng render có thể ảnh hưởng video hiện tại. Tiếp tục?')) {
            return;
        }
        const ok = await persistImportHtml({ renderMode: nextMode });
        if (ok) {
            showMessage(
                nextMode === 'import_html'
                    ? 'Đã chuyển sang luồng HTML chatbot'
                    : 'Đã chuyển sang luồng agent sáng tạo',
                'success',
            );
            loadRow();
        }
    };

    const handleHfPromptTypeChange = async (nextType: string) => {
        if (!isHfPromptTypeKey(nextType)) {
            return;
        }
        setHfPromptType(nextType);
        if (beatMap) {
            const updatedMap = applyHfPromptTypeToMissingBeats(beatMap, beatHtml, nextType);
            const beatMapChanged = updatedMap.sections.some(
                (section, index) => section.hf_prompt_type !== beatMap.sections[index]?.hf_prompt_type,
            );
            if (beatMapChanged) {
                await persistImportHtml({ beatMap: updatedMap, hfPromptType: nextType });
                return;
            }
        }
        await persistImportHtml({ hfPromptType: nextType });
    };

    const handleBeatMapJsonChange = (value: string) => {
        setBeatMapJsonDraft(value);
        if (beatMapSaveTimerRef.current != null) {
            window.clearTimeout(beatMapSaveTimerRef.current);
        }

        const parsed = parseBeatMapJson(value);
        if (parsed.map) {
            const validation = audioDurationSec != null && audioDurationSec > 0
                ? validateBeatMap(parsed.map, audioDurationSec)
                : { valid: true, errors: [] };
            if (validation.valid) {
                setRenderMode('import_html');
                applyBeatMapDraft(parsed.map);
            }
        }

        beatMapSaveTimerRef.current = window.setTimeout(() => {
            if (value === savedBeatMapJsonRef.current) {
                return;
            }
            const { map, errors } = parsed;
            if (!map) {
                showMessage(errors.join('; ') || 'beat_map JSON không hợp lệ', 'warning');
                return;
            }
            if (audioDurationSec != null && audioDurationSec > 0) {
                const validation = validateBeatMap(map, audioDurationSec);
                if (!validation.valid) {
                    showMessage(validation.errors.join('; '), 'warning');
                    return;
                }
            }
            setRenderMode('import_html');
            applyBeatMapDraft(map);
            void persistImportHtml({ renderMode: 'import_html', beatMap: map });
        }, 1000);
    };

    const commitBeatHtmlChange = React.useCallback(async (
        beatId: string,
        value: string,
        options?: { immediate?: boolean },
    ): Promise<boolean> => {
        let next = value;
        const section = beatMap?.sections.find((item) => item.id === beatId);
        if (section && section.durationSec > 0) {
            const { html: normalized, patches } = normalizeImportHtmlForAudio(value, section.durationSec);
            if (patches.length > 0) {
                next = normalized;
                showMessage(
                    `${beatId}: đã sửa duration → ${formatDurationSec(section.durationSec)}s (${patches.join('; ')})`,
                    'info',
                );
            }
        }

        const draftUpdatedAt = new Date().toISOString();
        setBeatHtml((prev) => ({
            ...prev,
            [beatId]: { html: next, updated_at: draftUpdatedAt },
        }));

        const existingTimer = beatHtmlSaveTimerRef.current[beatId];
        if (existingTimer != null) {
            window.clearTimeout(existingTimer);
            delete beatHtmlSaveTimerRef.current[beatId];
        }

        if (options?.immediate) {
            return persistImportHtml({ beatId, beatHtml: next });
        }

        beatHtmlSaveTimerRef.current[beatId] = window.setTimeout(() => {
            delete beatHtmlSaveTimerRef.current[beatId];
            void persistImportHtml({ beatId, beatHtml: next });
        }, 1000);
        return true;
    }, [beatMap, persistImportHtml, showMessage]);

    const handleBeatHtmlChange = (beatId: string, value: string) => {
        void commitBeatHtmlChange(beatId, value);
    };

    const focusBeatEditor = React.useCallback((beatId: string) => {
        setActiveBeatId(beatId);
        setBeatEditorFocusRequest({ beatId, nonce: Date.now() });
    }, []);

    const handleCopyBeatDivisionPrompt = async () => {
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        if (!audioDurationSec || audioDurationSec <= 0) {
            showMessage('Chưa có thời lượng audio', 'warning');
            return;
        }
        setCopyingBeatDivisionPrompt(true);
        try {
            const res = await fetchImportHtmlContext(shortVideoId) as ImportHtmlContextPayload;
            if (!res?.success) {
                showMessage(parseImportHtmlContextMessage(res?.message) || 'Không lấy được context', 'error');
                return;
            }
            const prompt = buildBeatDivisionPrompt(res);
            await copyTextToClipboard(prompt);
            showMessage('Đã copy prompt chia beat', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setCopyingBeatDivisionPrompt(false);
        }
    };

    const handleCopyBeatHtmlPrompt = async (beatId: string) => {
        if (!beatMapReady || !beatMap) {
            showMessage('Cần beat-map hợp lệ trước', 'warning');
            return;
        }
        const beat = beatMap.sections.find((item) => item.id === beatId);
        if (!beat) {
            showMessage('Không tìm thấy beat', 'error');
            return;
        }
        setCopyingBeatHtmlPromptBeatId(beatId);
        try {
            const res = await fetchImportHtmlContext(shortVideoId) as ImportHtmlContextPayload;
            if (!res?.success) {
                showMessage(parseImportHtmlContextMessage(res?.message) || 'Không lấy được context', 'error');
                return;
            }
            const prompt = await buildBeatHtmlPrompt({ ...res, beat_map: beatMap }, beat);
            await copyTextToClipboard(prompt);
            showMessage(`Đã copy prompt HTML ${beatId}`, 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setCopyingBeatHtmlPromptBeatId('');
        }
    };

    const handlePasteBeatHtml = async (beatId: string) => {
        setPastingBeatHtmlBeatId(beatId);
        try {
            const raw = await readTextFromClipboard();
            const text = extractBeatHtmlFromPastedText(raw);
            if (!text.trim()) {
                showMessage('Clipboard trống hoặc không có HTML hợp lệ', 'warning');
                return;
            }
            const saved = await commitBeatHtmlChange(beatId, text, { immediate: true });
            if (!saved) {
                return;
            }
            focusBeatEditor(beatId);
            const section = beatMap?.sections.find((item) => item.id === beatId);
            if (section) {
                setBeatPlaybackSeekRequest({
                    beatId,
                    startSec: section.startSec,
                    nonce: Date.now(),
                });
            }
            showMessage(`Đã dán và lưu HTML ${beatId}`, 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setPastingBeatHtmlBeatId('');
        }
    };

    const handleDeleteBeatHtml = async (beatId: string) => {
        const beatLabel = beatMap?.sections.find((item) => item.id === beatId)?.id || beatId;
        if (!beatHtml[beatId]?.html?.trim()) {
            showMessage('Beat này chưa có HTML để xóa', 'warning');
            return;
        }
        if (!window.confirm(`Xóa HTML của ${beatLabel}? Pipeline auto có thể chạy lại beat này.`)) {
            return;
        }

        setDeletingBeatHtmlBeatId(beatId);
        try {
            const pendingTimer = beatHtmlSaveTimerRef.current[beatId];
            if (pendingTimer != null) {
                window.clearTimeout(pendingTimer);
                delete beatHtmlSaveTimerRef.current[beatId];
            }

            const saved = await persistImportHtml({ beatId, beatHtml: '' });
            if (!saved) {
                return;
            }

            setBeatHtml((prev) => {
                const next = { ...prev };
                delete next[beatId];
                return next;
            });
            focusBeatEditor(beatId);
            showMessage(`Đã xóa HTML ${beatLabel} — có thể chạy lại pipeline`, 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setDeletingBeatHtmlBeatId('');
        }
    };

    const handleDeleteAllBeatHtml = async () => {
        const beatIds = listBeatIdsWithHtml(beatHtml);
        if (!beatIds.length) {
            showMessage('Không có beat nào có HTML để xóa', 'warning');
            return;
        }
        if (!window.confirm(
            `Xóa HTML của ${beatIds.length} beat đang có dữ liệu? Pipeline auto có thể chạy lại các beat này.`,
        )) {
            return;
        }

        setDeletingAllBeatHtml(true);
        try {
            Object.keys(beatHtmlSaveTimerRef.current).forEach((beatId) => {
                const pendingTimer = beatHtmlSaveTimerRef.current[beatId];
                if (pendingTimer != null) {
                    window.clearTimeout(pendingTimer);
                    delete beatHtmlSaveTimerRef.current[beatId];
                }
            });

            for (const beatId of beatIds) {
                const saved = await persistImportHtml({ beatId, beatHtml: '' });
                if (!saved) {
                    return;
                }
            }

            setBeatHtml((prev) => {
                const next = { ...prev };
                beatIds.forEach((beatId) => {
                    delete next[beatId];
                });
                return next;
            });
            showMessage(`Đã xóa HTML ${beatIds.length} beat — có thể chạy lại pipeline`, 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setDeletingAllBeatHtml(false);
        }
    };

    const handleOpenBeatGemini = (beatId: string) => {
        if (!beatMapReady || !beatMap) {
            showMessage('Cần beat-map hợp lệ trước', 'warning');
            return;
        }
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        const beat = beatMap.sections.find((item) => item.id === beatId);
        if (!beat) {
            showMessage('Không tìm thấy beat', 'error');
            return;
        }
        if (openingBeatGeminiBeatIds.includes(beatId)) {
            return;
        }

        setOpeningBeatGeminiBeatIds((prev) => (prev.includes(beatId) ? prev : [...prev, beatId]));
        void (async () => {
            try {
                await openImportHtmlBeatGeminiFillOnly({
                    shortVideoId,
                    beatId,
                    stage: 'import_html_beat_html',
                });
                focusBeatEditor(beatId);
                showMessage(`Đã mở Gemini cho ${beatId} — kiểm tra tab mới và bấm Gửi`, 'success');
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setOpeningBeatGeminiBeatIds((prev) => prev.filter((id) => id !== beatId));
            }
        })();
    };

    const handleOpenAllMissingBeatGemini = () => {
        if (!beatMapReady || !beatMap) {
            showMessage('Cần beat-map hợp lệ trước', 'warning');
            return;
        }
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        const missingBeatIds = listMissingBeatIds(beatMap, beatHtml);
        if (!missingBeatIds.length) {
            showMessage('Không có beat thiếu HTML', 'info');
            return;
        }
        if (openingAllMissingBeatGemini) {
            return;
        }

        setOpeningAllMissingBeatGemini(true);
        setOpeningBeatGeminiBeatIds((prev) => Array.from(new Set([...prev, ...missingBeatIds])));
        void (async () => {
            try {
                const result = await openImportHtmlBeatGeminiForMissingBeats({
                    shortVideoId,
                    beatIds: missingBeatIds,
                    autoSubmit: true,
                });
                const failNote = result.failed.length
                    ? ` (${result.failed.length} beat lỗi: ${result.failed.join(', ')})`
                    : '';
                showMessage(
                    `Đã mở ${result.opened} tab Gemini — kiểm tra từng tab, copy HTML rồi bấm Lưu HTML vào CMS${failNote}`,
                    result.failed.length ? 'warning' : 'success',
                );
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setOpeningAllMissingBeatGemini(false);
                setOpeningBeatGeminiBeatIds((prev) => prev.filter((id) => !missingBeatIds.includes(id)));
            }
        })();
    };

    const handleImportHtmlChange = (value: string) => {
        setImportHtml(value);
        if (importHtmlSaveTimerRef.current != null) {
            window.clearTimeout(importHtmlSaveTimerRef.current);
        }
        importHtmlSaveTimerRef.current = window.setTimeout(() => {
            if (value === savedImportHtmlRef.current) {
                return;
            }
            void persistImportHtml({ html: value });
        }, 1000);
    };

    const runWhisperTranscribe = React.useCallback(async (options?: { force?: boolean }) => {
        if (!hasAudio || !scriptApproved) {
            return;
        }
        setTranscribingWhisper(true);
        setWhisperStatus('processing');
        try {
            const res = await transcribeAgentAudio(shortVideoId, { force: options?.force });
            if (!res?.success) {
                setWhisperStatus(String(res?.status || 'failed'));
                showMessage(parseApiMessage(res?.message) || 'Whisper thất bại', 'error');
                loadRow();
                return;
            }
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
            }
            showMessage(parseApiMessage(res?.message) || 'Whisper hoàn tất', 'success');
            loadRow();
        } catch (e) {
            setWhisperStatus('failed');
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setTranscribingWhisper(false);
        }
    }, [applyImportHtmlSummary, hasAudio, loadRow, scriptApproved, shortVideoId, showMessage]);

    React.useEffect(() => () => {
        if (importHtmlSaveTimerRef.current != null) {
            window.clearTimeout(importHtmlSaveTimerRef.current);
        }
        if (beatMapSaveTimerRef.current != null) {
            window.clearTimeout(beatMapSaveTimerRef.current);
        }
        Object.values(beatHtmlSaveTimerRef.current).forEach((timerId) => {
            window.clearTimeout(timerId);
        });
    }, []);

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

    const handlePostEligibleChange = async (checked: boolean) => {
        setSavingPublishFlags(true);
        try {
            const res = await savePublishFlags(shortVideoId, { postEligible: checked });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không cập nhật được trạng thái', 'error');
                return;
            }
            setPostEligible(Boolean(res?.post_eligible));
            showMessage(parseApiMessage(res?.message) || 'Đã cập nhật trạng thái', 'success');
            loadRow();
            onUploaded?.();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingPublishFlags(false);
        }
    };

    const handleSocialPostedChange = async (checked: boolean) => {
        setSavingPublishFlags(true);
        try {
            const res = await savePublishFlags(shortVideoId, { socialPosted: checked });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không cập nhật được trạng thái', 'error');
                return;
            }
            setSocialPosted(Boolean(res?.social_posted));
            showMessage(parseApiMessage(res?.message) || 'Đã cập nhật trạng thái', 'success');
            loadRow();
            onUploaded?.();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingPublishFlags(false);
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

    const missingBeatHtmlCount = React.useMemo(
        () => countMissingBeatHtml(beatMap, beatHtml),
        [beatMap, beatHtml],
    );

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
        postEligible,
        socialPosted,
        renderMode,
        importHtml,
        beatMap,
        beatMapJsonDraft,
        beatHtml,
        missingBeatHtmlCount,
        beatMapReady,
        beatsHtmlTotal,
        beatsHtmlCompleted,
        activeBeatId,
        setActiveBeatId,
        beatEditorFocusRequest,
        beatPlaybackSeekRequest,
        focusBeatEditor,
        hfPromptType,
        whisperStatus,
        whisperError,
        importHtmlReady,
        uploading,
        savingTtsMode,
        savingHfTheme,
        savingPublishFlags,
        savingScript,
        approvingScript,
        retryingTts,
        regeneratingTts,
        launchingRender,
        launchingScript,
        launchingContinue,
        launchingImportAssemble,
        launchingImportHtmlFull,
        transcribingWhisper,
        savingImportHtml,
        copyingBeatDivisionPrompt,
        copyingCreateScriptPrompt,
        copyingBeatHtmlPromptBeatId,
        pastingBeatHtmlBeatId,
        deletingBeatHtmlBeatId,
        deletingAllBeatHtml,
        openingBeatGeminiBeatIds,
        openingAllMissingBeatGemini,
        hasScript,
        hasAudio,
        statusChip,
        chainLabel,
        loadRow,
        handleTtsAutoChange,
        handleHfThemeChange,
        handlePostEligibleChange,
        handleSocialPostedChange,
        handlePlatformToggle,
        handleCopyScript,
        handleCopyCreateScriptPrompt,
        handleCopyImproveScriptPrompt,
        handleCopyPrompt,
        handleLaunchAgentRender,
        handleLaunchAgentScript,
        handleLaunchAgentContinue,
        handleLaunchAgentImportAssemble,
        handleLaunchAgentImportHtmlFull,
        handleRenderModeChange,
        handleHfPromptTypeChange,
        handleBeatMapJsonChange,
        handleBeatHtmlChange,
        handleCopyBeatDivisionPrompt,
        handleCopyBeatHtmlPrompt,
        handlePasteBeatHtml,
        handleDeleteBeatHtml,
        handleDeleteAllBeatHtml,
        handleOpenBeatGemini,
        handleOpenAllMissingBeatGemini,
        handleImportHtmlChange,
        runWhisperTranscribe,
        handleCopyChatbotPrompt: handleCopyBeatDivisionPrompt,
        handleSaveScript,
        handleApproveScript,
        handleRegenerateTts,
        handleRetryTts,
        handleUploadMp3,
    };
}
