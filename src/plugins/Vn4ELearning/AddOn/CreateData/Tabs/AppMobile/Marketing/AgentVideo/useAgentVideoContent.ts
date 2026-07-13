import React from 'react';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    copyShortVideoAgentPromptToClipboard,
    type ShortVideoAgentPromptPhase,
} from 'helpers/marketingShortVideoAgentPrompt';
import { launchShortVideoAgent, launchShortVideoAgentContinue, launchShortVideoAgentImportAssemble, launchShortVideoAgentImportHtmlFull, launchShortVideoAgentRender, launchImportHtmlAssemble, launchImportHtmlPreview, launchImportHtmlRender } from 'helpers/marketingShortVideoAgentLaunch';
import {
    AGENT_AUDIO_SCRIPT_SAVED_EVENT,
} from 'helpers/marketingAgentAudioScriptGeminiWorkflow';
import {
    IMPORT_HTML_BEAT_HTML_SAVED_EVENT,
    fetchImportHtmlBeatHtmlPrompt,
    generateBeatHtmlViaGeminiWeb,
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
    saveAgentOmnivoiceVoice,
    saveAgentSourceContent,
    saveAgentCaptionAlignments,
    saveTtsPhoneticDict,
    fetchGithubReadme,
    importGithubReadmeMedia,
    searchAgentBgm,
    saveAgentTtsSettings,
    saveAgentAutoFillBeatHtml,
    enqueueGeminiWebBeatFill,
    enqueueGeminiWebBeatDivision,
    enqueueGeminiWebAudioScript,
    startFullAutoPipeline,
    cancelFullAutoPipeline,
    FULL_AUTO_PIPELINE_STEP_LABELS,
    savePublishFlags,
    resolveOmnivoiceVoicePreviewUrl,
    resolveOmnivoiceVoiceDesignPreviewUrl,
    transcribeAgentAudio,
    uploadAgentAudioMp3,
    uploadAgentVisualImage,
    type AgentRenderMode,
    type AgentVideoContentResponse,
    type AgentSourceFormatCatalogItem,
    type FullAutoPipelineSummary,
    type GithubTopEnrichSummary,
    type HfThemeCatalogItem,
    type OmnivoiceVoiceCatalogItem,
    type OmnivoiceVoiceMode,
    type OmnivoiceVoiceDesignTokenGroup,
    type SaveOmnivoiceVoicePayload,
    type ImportHtmlSummary,
    type ImportHtmlAssets,
    type ImportHtmlBgmSegment,
    type ImportHtmlVisualCatalogItem,
    type ImportHtmlGithubImageShot,
    type ImportHtmlMarketingPostImage,
    type GithubReadmeMediaItem,
    type ImportHtmlComposition,
    type AgentBgmSearchItem,
    type WhisperWord,
    type CaptionAlignOverride,
    type TtsPhoneticDictEntry,
} from './agentVideoApi';
import {
    bgmPreviewUrl,
    enrichBgmSearchItems,
    enrichBgmSegments,
    probeAudioDurationSec,
} from './agentBgmPreview';
import {
    DEFAULT_TTS_PLATFORMS,
    TTS_PLATFORM_KEYS,
    formatTtsChain,
    resolveWorkflowChip,
} from './agentVideoUi';
import {
    clearAgentVideoScriptDraft,
    readAgentVideoScriptDraftRecord,
    writeAgentVideoScriptDraft,
} from './agentVideoDraft';
import { isCaptionSyncAssembleError } from './agentVideoImportHtmlBlockers';
import {
    applyHfPromptTypeToMissingBeats,
    beatMapToJson,
    countMissingBeatHtml,
    listBeatIdsWithHtml,
    listMissingBeatIds,
    listBeatRenderErrorIds,
    parseBeatHtmlEntry,
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
import { copyTextToClipboard, readTextFromClipboard } from '../../StoreScreenshots/storeScreenshotClipboard';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import { mergeGithubStatsIntoAdditionalInfo } from './agentVideoGithubStatsMerge';

function normalizeGithubReadmeMediaList(raw: unknown): GithubReadmeMediaItem[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .filter((item): item is GithubReadmeMediaItem => (
            Boolean(item)
            && typeof item === 'object'
            && typeof (item as GithubReadmeMediaItem).resolved_url === 'string'
            && String((item as GithubReadmeMediaItem).resolved_url).trim() !== ''
        ))
        .map((item, index) => ({
            id: String(item.id || `gh-media-${index + 1}`),
            media_type: item.media_type === 'video' ? 'video' : 'image',
            resolved_url: String(item.resolved_url).trim(),
            origin_path: String(item.origin_path || '').trim(),
            alt: String(item.alt || '').trim(),
            ext: String(item.ext || '').trim(),
        }));
}

function toStringIdList(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const out: string[] = [];
    for (let i = 0; i < value.length; i += 1) {
        out.push(String(value[i]));
    }
    return out;
}

function mergeUniqueIds(prev: string[], ids: string[]): string[] {
    const merged = prev.slice();
    for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        if (merged.indexOf(id) === -1) {
            merged.push(id);
        }
    }
    return merged;
}

import {
    applyTokenOverride,
    buildCaptionSyncPayload,
    hasCaptionOverrideChanges,
    mergeCaptionOverrides,
    overridesToList,
    useWhisperScriptAlign,
} from './useWhisperScriptAlign';
import type { WhisperCompareFilter } from './agentVideoWhisperCompareUi';
import { normalizePhoneticSourceTerm, mergeTtsPhoneticDictEntries } from './agentVideoPhoneticDictUi';
import {
    buildAgentMediaSuggestionPrompt,
    openAgentMediaSuggestionGemini,
} from 'helpers/marketingAgentMediaSuggestGeminiWorkflow';
import {
    buildAgentGithubImageShotsPrompt,
    openAgentGithubImageShotsGemini,
} from 'helpers/marketingAgentGithubImageShotsGeminiWorkflow';

type UseAgentVideoContentArgs = {
    open: boolean;
    shortVideoId: number;
    onUploaded?: () => void;
};

export function useAgentVideoContent({ open, shortVideoId, onUploaded }: UseAgentVideoContentArgs) {
    const MARKETING_POST_SAVED_EVENT = 'vn4-marketing-post-saved';
    const api = useAjax();
    const { showMessage } = useFloatingMessages();
    const { openCreateScriptGemini, openImproveScriptGemini } = useAgentVideoOpenGeminiScriptActions();
    const apiRef = React.useRef(api);
    apiRef.current = api;

    const [title, setTitle] = React.useState('');
    const [audioScript, setAudioScript] = React.useState('');
    const [scriptApproved, setScriptApproved] = React.useState(false);
    const [audioFileUrl, setAudioFileUrl] = React.useState('');
    const [audioDurationSec, setAudioDurationSec] = React.useState<number | null>(null);
    const [agentTtsAuto, setAgentTtsAuto] = React.useState(true);
    const [agentAutoFillBeatHtml, setAgentAutoFillBeatHtml] = React.useState(false);
    const [savingAutoFillBeatHtml, setSavingAutoFillBeatHtml] = React.useState(false);
    const [geminiFillStatus, setGeminiFillStatus] = React.useState('none');
    const [geminiFillProgress, setGeminiFillProgress] = React.useState<{
        current: number;
        total: number;
        beatId: string;
        succeeded: number;
        failed: string[];
        error: string;
    } | null>(null);
    const [geminiDivisionStatus, setGeminiDivisionStatus] = React.useState('none');
    const [geminiDivisionError, setGeminiDivisionError] = React.useState('');
    const [geminiScriptStatus, setGeminiScriptStatus] = React.useState('none');
    const [geminiScriptMode, setGeminiScriptMode] = React.useState('');
    const [geminiScriptError, setGeminiScriptError] = React.useState('');
    const [fullAutoPipeline, setFullAutoPipeline] = React.useState<FullAutoPipelineSummary | null>(null);
    const [githubTopEnrich, setGithubTopEnrich] = React.useState<GithubTopEnrichSummary | null>(null);
    const [githubTopRepos, setGithubTopRepos] = React.useState<NonNullable<ImportHtmlAssets['github_top_repos']> | null>(null);
    const [startingFullAuto, setStartingFullAuto] = React.useState(false);
    const [cancellingFullAuto, setCancellingFullAuto] = React.useState(false);
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
    const [omnivoiceVoice, setOmnivoiceVoice] = React.useState('minh_quân');
    const [omnivoiceVoiceMode, setOmnivoiceVoiceMode] = React.useState<OmnivoiceVoiceMode>('clone');
    const [omnivoiceVoiceDesign, setOmnivoiceVoiceDesign] = React.useState('male, middle-aged, very low pitch');
    const [omnivoiceSpeed, setOmnivoiceSpeed] = React.useState(1);
    const [omnivoiceVoiceCatalog, setOmnivoiceVoiceCatalog] = React.useState<OmnivoiceVoiceCatalogItem[]>([]);
    const [omnivoiceVoiceDesignTokens, setOmnivoiceVoiceDesignTokens] = React.useState<OmnivoiceVoiceDesignTokenGroup[]>([]);
    const [savingOmnivoiceVoice, setSavingOmnivoiceVoice] = React.useState(false);
    const [previewingVoiceDesign, setPreviewingVoiceDesign] = React.useState(false);
    const [playingVoiceUrl, setPlayingVoiceUrl] = React.useState<string | null>(null);
    const voicePreviewAudioRef = React.useRef<HTMLAudioElement | null>(null);
    const [marketingPostId, setMarketingPostId] = React.useState(0);
    const [agentSourceContent, setAgentSourceContent] = React.useState('');
    const [savedAgentSourceContent, setSavedAgentSourceContent] = React.useState('');
    const [agentAdditionalInfo, setAgentAdditionalInfo] = React.useState('');
    const [savedAgentAdditionalInfo, setSavedAgentAdditionalInfo] = React.useState('');
    const [agentGithubRepo, setAgentGithubRepo] = React.useState('');
    const [savedAgentGithubRepo, setSavedAgentGithubRepo] = React.useState('');
    const [agentSourceFormat, setAgentSourceFormat] = React.useState('github_repo_review');
    const [savedAgentSourceFormat, setSavedAgentSourceFormat] = React.useState('github_repo_review');
    const [agentSourceFormatCatalog, setAgentSourceFormatCatalog] = React.useState<AgentSourceFormatCatalogItem[]>([]);
    const [contentPlainText, setContentPlainText] = React.useState('');
    const [savingSourceContent, setSavingSourceContent] = React.useState(false);
    const [fetchingGithubReadme, setFetchingGithubReadme] = React.useState(false);
    const [appMobileTitle, setAppMobileTitle] = React.useState('');
    const [thumbnail, setThumbnail] = React.useState<unknown>(null);
    const [postEligible, setPostEligible] = React.useState(false);
    const [socialPosted, setSocialPosted] = React.useState(false);
    const [renderMode, setRenderMode] = React.useState<AgentRenderMode>('import_html');
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
    const [whisperStale, setWhisperStale] = React.useState(false);
    const [importHtmlReady, setImportHtmlReady] = React.useState(false);
    const [bgmSegments, setBgmSegments] = React.useState<ImportHtmlBgmSegment[]>([]);
    const [sfxBeatTransition, setSfxBeatTransition] = React.useState(true);
    const [sfxHook, setSfxHook] = React.useState(false);
    const [composition, setComposition] = React.useState<ImportHtmlComposition | null>(null);
    const [bgmTotalSec, setBgmTotalSec] = React.useState(0);
    const [bgmCoversVideo, setBgmCoversVideo] = React.useState(false);
    const [launchingAssemble, setLaunchingAssemble] = React.useState(false);
    const [captionMismatchDialogOpen, setCaptionMismatchDialogOpen] = React.useState(false);
    const [captionMismatchDialogMessage, setCaptionMismatchDialogMessage] = React.useState('');
    const [launchingPreview, setLaunchingPreview] = React.useState(false);
    const [previewStudioUrl, setPreviewStudioUrl] = React.useState('');
    const [launchingScriptRender, setLaunchingScriptRender] = React.useState(false);
    const [savingImportAssets, setSavingImportAssets] = React.useState(false);
    const [searchingBgm, setSearchingBgm] = React.useState(false);
    const [bgmSearchQuery, setBgmSearchQuery] = React.useState('lofi ambient');
    const [bgmSearchResults, setBgmSearchResults] = React.useState<AgentBgmSearchItem[]>([]);
    const [visualCatalog, setVisualCatalog] = React.useState<ImportHtmlVisualCatalogItem[]>([]);
    const [githubImageShots, setGithubImageShots] = React.useState<ImportHtmlGithubImageShot[]>([]);
    const [readmeMedia, setReadmeMedia] = React.useState<GithubReadmeMediaItem[]>([]);
    const [importingReadmeMediaIds, setImportingReadmeMediaIds] = React.useState<string[]>([]);
    const [importingAllReadmeMedia, setImportingAllReadmeMedia] = React.useState(false);
    const [marketingPostImages, setMarketingPostImages] = React.useState<ImportHtmlMarketingPostImage[]>([]);
    const [pastingGithubShotId, setPastingGithubShotId] = React.useState<string | null>(null);
    const [whisperError, setWhisperError] = React.useState('');
    const [whisperWords, setWhisperWords] = React.useState<WhisperWord[]>([]);
    const [ttsPhoneticDict, setTtsPhoneticDict] = React.useState<TtsPhoneticDictEntry[]>([]);
    const [savingPhoneticDict, setSavingPhoneticDict] = React.useState(false);
    const [captionOverrides, setCaptionOverrides] = React.useState<Record<number, CaptionAlignOverride>>({});
    const [compareDrawerOpen, setCompareDrawerOpen] = React.useState(false);
    const [compareFocusIndex, setCompareFocusIndex] = React.useState<number | null>(null);
    const [compareFilter, setCompareFilter] = React.useState<WhisperCompareFilter>('all');
    const [whisperCompareIssuesOnly, setWhisperCompareIssuesOnly] = React.useState(false);
    const [savingCaptionAlignments, setSavingCaptionAlignments] = React.useState(false);

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
    const [openingBeatDivisionGemini, setOpeningBeatDivisionGemini] = React.useState(false);
    const [openingBeatDivisionGeminiHeadless, setOpeningBeatDivisionGeminiHeadless] = React.useState(false);
    const [openingCreateScriptGemini, setOpeningCreateScriptGemini] = React.useState(false);
    const [openingImproveScriptGemini, setOpeningImproveScriptGemini] = React.useState(false);
    const [openingCreateScriptGeminiHeadless, setOpeningCreateScriptGeminiHeadless] = React.useState(false);
    const [openingImproveScriptGeminiHeadless, setOpeningImproveScriptGeminiHeadless] = React.useState(false);
    const [openingMediaSuggestGemini, setOpeningMediaSuggestGemini] = React.useState(false);
    const [openingGithubImageShotsGemini, setOpeningGithubImageShotsGemini] = React.useState(false);
    const [copyingBeatHtmlPromptBeatId, setCopyingBeatHtmlPromptBeatId] = React.useState('');
    const [pastingBeatHtmlBeatId, setPastingBeatHtmlBeatId] = React.useState('');
    const [deletingBeatHtmlBeatId, setDeletingBeatHtmlBeatId] = React.useState('');
    const [deletingAllBeatHtml, setDeletingAllBeatHtml] = React.useState(false);
    const [openingBeatGeminiBeatIds, setOpeningBeatGeminiBeatIds] = React.useState<string[]>([]);
    const [openingBeatGeminiHeadlessBeatIds, setOpeningBeatGeminiHeadlessBeatIds] = React.useState<string[]>([]);
    const [refiningBeatHtmlBeatId, setRefiningBeatHtmlBeatId] = React.useState('');
    const [openingAllMissingBeatGemini, setOpeningAllMissingBeatGemini] = React.useState(false);
    const [fillingAllMissingBeatGeminiHeadless, setFillingAllMissingBeatGeminiHeadless] = React.useState(false);
    const [fillingAllMissingBeatGeminiHeadlessProgress, setFillingAllMissingBeatGeminiHeadlessProgress] = React.useState<{
        current: number;
        total: number;
        beatId: string;
    } | null>(null);

    const savedScriptRef = React.useRef('');
    const savedImportHtmlRef = React.useRef('');
    const savedBeatMapJsonRef = React.useRef('');
    const importHtmlSaveTimerRef = React.useRef<number | null>(null);
    const beatMapSaveTimerRef = React.useRef<number | null>(null);
    const beatHtmlSaveTimerRef = React.useRef<Record<string, number>>({});
    const visualCatalogSavedRef = React.useRef<string>('[]');
    const githubImageShotsSavedRef = React.useRef<string>('[]');
    const autoWhisperStartedRef = React.useRef('');

    const resolveScriptFromResponse = React.useCallback((
        serverScript: string,
        options?: {
            serverUpdatedAt?: string;
            preferServer?: boolean;
        },
    ): string => {
        const draftRecord = readAgentVideoScriptDraftRecord(shortVideoId);
        if (!draftRecord) {
            return serverScript;
        }

        const draft = draftRecord.script;
        const preferServer = Boolean(options?.preferServer)
            || (draft.trim() === '' && serverScript.trim() !== '');

        const serverUpdatedMs = Date.parse(String(options?.serverUpdatedAt || '').trim());
        const serverIsNewer = Number.isFinite(serverUpdatedMs)
            && serverUpdatedMs > 0
            && serverUpdatedMs > (draftRecord.at || 0);

        if (preferServer || serverIsNewer) {
            clearAgentVideoScriptDraft(shortVideoId);
            return serverScript;
        }

        if (draft !== serverScript) {
            return draft;
        }

        clearAgentVideoScriptDraft(shortVideoId);
        return serverScript;
    }, [shortVideoId]);

    const applyImportHtmlResources = React.useCallback((summary: ImportHtmlSummary | null | undefined) => {
        if (!summary) {
            return;
        }
        const segmentsRaw = summary.assets?.bgm_segments;
        const segments = Array.isArray(segmentsRaw) ? segmentsRaw : [];
        void enrichBgmSegments(segments).then(setBgmSegments);
        if (summary.assets) {
            setSfxBeatTransition(
                typeof summary.assets.sfx_beat_transition === 'boolean'
                    ? summary.assets.sfx_beat_transition
                    : true,
            );
            setSfxHook(Boolean(summary.assets.sfx_hook));
        }
        if (summary.composition) {
            setComposition(summary.composition);
        }
        setBgmTotalSec(Number(summary.bgm_total_sec || 0));
        setBgmCoversVideo(Boolean(summary.bgm_covers_video));
        const visualCatalogRaw = summary.assets?.visual_catalog;
        const loadedVisualCatalog = Array.isArray(visualCatalogRaw) ? visualCatalogRaw : [];
        setVisualCatalog(loadedVisualCatalog);
        visualCatalogSavedRef.current = JSON.stringify(loadedVisualCatalog);
        const githubShotsRaw = summary.assets?.github_image_shots;
        const loadedGithubShots = Array.isArray(githubShotsRaw) ? githubShotsRaw : [];
        setGithubImageShots(loadedGithubShots);
        githubImageShotsSavedRef.current = JSON.stringify(loadedGithubShots);
        const readmeMediaRaw = summary.assets?.readme_media;
        if (Array.isArray(readmeMediaRaw) && readmeMediaRaw.length > 0) {
            setReadmeMedia(normalizeGithubReadmeMediaList(readmeMediaRaw));
        }
        const topReposRaw = summary.assets?.github_top_repos;
        if (topReposRaw && typeof topReposRaw === 'object') {
            setGithubTopRepos({
                period: String(topReposRaw.period || ''),
                limit: topReposRaw.limit,
                repos: Array.isArray(topReposRaw.repos) ? topReposRaw.repos : [],
            });
        } else {
            setGithubTopRepos(null);
        }
        if (Array.isArray(summary.marketing_post_images)) {
            setMarketingPostImages(summary.marketing_post_images);
        }
    }, []);

    const applyResponse = React.useCallback((res: AgentVideoContentResponse) => {
        if (!res?.success) {
            return;
        }
        const serverScript = String(res?.audio_script || '').trim();
        savedScriptRef.current = serverScript;
        setTitle(String(res?.title || '').trim());
        setTtsPhoneticDict(mergeTtsPhoneticDictEntries(
            Array.isArray(res?.tts_phonetic_dict) ? res.tts_phonetic_dict : [],
        ));
        const geminiScript = res?.gemini_script;
        const geminiScriptStatusNext = String(geminiScript?.status || 'none');
        const pipelineStatus = String(res?.full_auto_pipeline?.status || '').trim();
        const serverScriptUpdatedAt = String(
            res?.audio_script_updated_at
            || res?.audio_script_generated_at
            || '',
        ).trim();
        setAudioScript(resolveScriptFromResponse(serverScript, {
            serverUpdatedAt: serverScriptUpdatedAt,
            // Full-auto đang chạy: server là nguồn sự thật (tránh draft trống/cũ đè script pipeline).
            preferServer: pipelineStatus === 'running'
                || geminiScriptStatusNext === 'processing'
                || geminiScriptStatusNext === 'queued',
        }));
        setScriptApproved(Boolean(res?.audio_script_approved ?? res?.agent_workflow?.script_approved));
        setAudioFileUrl(String(res?.audio_file || '').trim());
        setAgentTtsAuto(Boolean(res?.agent_tts_auto));
        setAgentAutoFillBeatHtml(Boolean(res?.agent_auto_fill_beat_html));
        const geminiFill = res?.import_html?.gemini_fill;
        const nextGeminiStatus = String(geminiFill?.status || 'none');
        setGeminiFillStatus(nextGeminiStatus);
        if (geminiFill?.progress || nextGeminiStatus !== 'none') {
            setGeminiFillProgress({
                current: Number(geminiFill?.progress?.current || 0),
                total: Number(geminiFill?.progress?.total || 0),
                beatId: String(geminiFill?.progress?.beat_id || ''),
                succeeded: Number(geminiFill?.progress?.succeeded || 0),
                failed: toStringIdList(geminiFill?.progress?.failed),
                error: String(geminiFill?.error || '').trim(),
            });
        } else {
            setGeminiFillProgress(null);
        }
        const geminiDivision = res?.import_html?.gemini_division;
        setGeminiDivisionStatus(String(geminiDivision?.status || 'none'));
        setGeminiDivisionError(String(geminiDivision?.error || '').trim());
        setGeminiScriptStatus(geminiScriptStatusNext);
        setGeminiScriptMode(String(geminiScript?.mode || '').trim());
        setGeminiScriptError(String(geminiScript?.error || '').trim());
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
        setOmnivoiceVoice(String(res?.agent_omnivoice_voice || 'minh_quân').trim() || 'minh_quân');
        setOmnivoiceVoiceMode(res?.agent_omnivoice_voice_mode === 'design' ? 'design' : 'clone');
        setOmnivoiceVoiceDesign(
            String(res?.agent_omnivoice_voice_design || 'male, middle-aged, very low pitch').trim()
                || 'male, middle-aged, very low pitch',
        );
        {
            const rawSpeed = Number(res?.agent_omnivoice_speed);
            const nextSpeed = Number.isFinite(rawSpeed)
                ? Math.max(0.5, Math.min(1.5, rawSpeed))
                : 1;
            setOmnivoiceSpeed(nextSpeed);
        }
        setOmnivoiceVoiceCatalog(
            Array.isArray(res?.omnivoice_voice_catalog) ? res.omnivoice_voice_catalog : [],
        );
        setOmnivoiceVoiceDesignTokens(
            Array.isArray(res?.omnivoice_voice_design_tokens) ? res.omnivoice_voice_design_tokens : [],
        );
        const mpId = Number(res?.marketing_post_id || 0);
        setMarketingPostId(Number.isFinite(mpId) && mpId > 0 ? mpId : 0);
        const nextSource = String(res?.agent_source_content || '');
        setAgentSourceContent(nextSource);
        setSavedAgentSourceContent(nextSource);
        const nextAdditional = String(res?.agent_additional_info || '');
        setAgentAdditionalInfo(nextAdditional);
        setSavedAgentAdditionalInfo(nextAdditional);
        const nextGithub = String(res?.agent_github_repo || '').trim();
        setAgentGithubRepo(nextGithub);
        setSavedAgentGithubRepo(nextGithub);
        const nextFormat = String(res?.agent_source_format || 'github_repo_review').trim() || 'github_repo_review';
        setAgentSourceFormat(nextFormat);
        setSavedAgentSourceFormat(nextFormat);
        setAgentSourceFormatCatalog(
            Array.isArray(res?.agent_source_format_catalog) ? res.agent_source_format_catalog : [],
        );
        setContentPlainText(String(res?.content_plain_text || '').trim());
        setAppMobileTitle(String(res?.app_mobile_title || '').trim());
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
                const parsed = parseBeatHtmlEntry(entry);
                if (parsed) {
                    nextBeatHtml[beatId] = parsed;
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
        setWhisperStale(Boolean(importSummary?.whisper_stale));
        setWhisperError(String(importSummary?.whisper_error || '').trim());
        if (Array.isArray(importSummary?.whisper_words)) {
            setWhisperWords(importSummary?.whisper_words ?? []);
        }
        setImportHtmlReady(Boolean(importSummary?.import_html_ready ?? res?.agent_workflow?.import_html_ready));
        applyImportHtmlResources(importSummary);
        // readme_media top-level (quét từ content) ưu tiên hơn assets
        if (Array.isArray(res?.readme_media)) {
            setReadmeMedia(normalizeGithubReadmeMediaList(res.readme_media));
        }
        setFullAutoPipeline(res?.full_auto_pipeline ?? null);
        setGithubTopEnrich(res?.github_top_enrich ?? null);
    }, [applyImportHtmlResources, resolveScriptFromResponse]);

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
        const onAgentAudioScriptSaved = (event: Event) => {
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
        const onMarketingPostSaved = (event: Event) => {
            const custom = event as CustomEvent<{
                postId?: number;
                post_id?: number;
            }>;
            const detail = custom.detail || {};
            const savedPostId = Number(detail.postId ?? detail.post_id ?? 0);
            if (savedPostId > 0 && savedPostId === marketingPostId) {
                loadRow();
            }
        };
        document.addEventListener(IMPORT_HTML_BEAT_HTML_SAVED_EVENT, onImportHtmlBeatHtmlSaved);
        document.addEventListener(AGENT_AUDIO_SCRIPT_SAVED_EVENT, onAgentAudioScriptSaved);
        document.addEventListener(MARKETING_POST_SAVED_EVENT, onMarketingPostSaved);
        return () => {
            document.removeEventListener(IMPORT_HTML_BEAT_HTML_SAVED_EVENT, onImportHtmlBeatHtmlSaved);
            document.removeEventListener(AGENT_AUDIO_SCRIPT_SAVED_EVENT, onAgentAudioScriptSaved);
            document.removeEventListener(MARKETING_POST_SAVED_EVENT, onMarketingPostSaved);
        };
    }, [loadRow, marketingPostId, open, shortVideoId]);

    const shouldPoll = ttsPending
        || agentVideoStatus === 'processing'
        || whisperStatus === 'processing'
        || geminiFillStatus === 'queued'
        || geminiFillStatus === 'processing'
        || geminiDivisionStatus === 'queued'
        || geminiDivisionStatus === 'processing'
        || geminiScriptStatus === 'queued'
        || geminiScriptStatus === 'processing'
        || fullAutoPipeline?.status === 'running'
        || githubTopEnrich?.status === 'preparing';
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
        geminiFillStatus,
    });
    const chainLabel = formatTtsChain(selectedPlatforms);

    const persistTtsSettings = async (
        nextAuto: boolean,
        nextPlatforms: string[],
        successMessage?: string,
        nextSpeed?: number,
    ) => {
        setSavingTtsMode(true);
        try {
            const res = await saveAgentTtsSettings(
                shortVideoId,
                nextAuto,
                nextPlatforms,
                nextSpeed,
            );
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được cấu hình TTS', 'error');
                return;
            }
            setAgentTtsAuto(nextAuto);
            setSelectedPlatforms(nextPlatforms);
            if (nextSpeed !== undefined) {
                setOmnivoiceSpeed(nextSpeed);
            }
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

        const ordered = TTS_PLATFORM_KEYS.filter((key) => nextPlatforms.includes(key));
        await persistTtsSettings(agentTtsAuto, ordered);
    };

    const handleOmnivoiceSpeedChange = async (nextSpeed: number) => {
        if (savingTtsMode) {
            return;
        }
        const clamped = Math.max(0.5, Math.min(1.5, nextSpeed));
        if (Math.abs(clamped - omnivoiceSpeed) < 0.001) {
            return;
        }
        setSavingTtsMode(true);
        try {
            const res = await saveAgentTtsSettings(
                shortVideoId,
                undefined,
                undefined,
                clamped,
            );
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được tốc độ OmniVoice', 'error');
                return;
            }
            setOmnivoiceSpeed(clamped);
            showMessage('Đã lưu tốc độ OmniVoice', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingTtsMode(false);
        }
    };

    const handleCopyScript = async () => {
        if (!audioScript) {
            showMessage('Chưa có audio_script — hãy mở Gemini sinh script trước', 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(audioScript);
            showMessage('Đã copy audio_script', 'success');
        } catch {
            showMessage('Không copy được script', 'error');
        }
    };

    const handleOpenCreateScriptGemini = async () => {
        setOpeningCreateScriptGemini(true);
        try {
            await openCreateScriptGemini({
                shortVideoId,
                title,
                audioScript,
                hasScript,
                marketingPostId,
                sourceContent: contentPlainText || savedAgentSourceContent,
                additionalInfo: savedAgentAdditionalInfo,
            });
        } finally {
            setOpeningCreateScriptGemini(false);
        }
    };

    const handleOpenImproveScriptGemini = async () => {
        setOpeningImproveScriptGemini(true);
        try {
            await openImproveScriptGemini({
                shortVideoId,
                title,
                audioScript,
                hasScript,
                appMobileTitle,
                marketingPostId,
                sourceContent: contentPlainText || savedAgentSourceContent,
                additionalInfo: savedAgentAdditionalInfo,
            });
        } finally {
            setOpeningImproveScriptGemini(false);
        }
    };

    const assertScriptSourceReady = (): boolean => {
        if (Number(marketingPostId || 0) > 0) {
            return true;
        }
        if (String(contentPlainText || savedAgentSourceContent || '').trim()) {
            return true;
        }
        showMessage(
            'Chưa có nội dung nguồn — mở tab Content, nhập nội dung hoặc fetch README rồi Lưu trước khi sinh/cải thiện script',
            'warning',
        );
        return false;
    };

    const handleEnqueueCreateScriptGeminiHeadless = async () => {
        if (!shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
            return;
        }
        if (!assertScriptSourceReady()) {
            return;
        }
        if (
            openingCreateScriptGeminiHeadless
            || openingImproveScriptGeminiHeadless
            || geminiScriptStatus === 'queued'
            || geminiScriptStatus === 'processing'
        ) {
            return;
        }
        setOpeningCreateScriptGeminiHeadless(true);
        try {
            const res = await enqueueGeminiWebAudioScript(shortVideoId, 'create', true);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Enqueue sinh script Headless thất bại',
                    'error',
                );
                return;
            }
            if (res.gemini_script) {
                setGeminiScriptStatus(String(res.gemini_script.status || 'queued'));
                setGeminiScriptMode(String(res.gemini_script.mode || 'create'));
                setGeminiScriptError(String(res.gemini_script.error || '').trim());
            } else {
                setGeminiScriptStatus('queued');
                setGeminiScriptMode('create');
                setGeminiScriptError('');
            }
            showMessage(
                parseApiMessage(res?.message)
                    || 'Đã đưa sinh script vào queue Gemini Headless — có thể đóng CMS',
                'success',
            );
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningCreateScriptGeminiHeadless(false);
        }
    };

    const handleEnqueueImproveScriptGeminiHeadless = async () => {
        if (!shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
            return;
        }
        if (!hasScript || !audioScript.trim()) {
            showMessage('Chưa có audio script', 'warning');
            return;
        }
        if (!assertScriptSourceReady()) {
            return;
        }
        if (
            openingCreateScriptGeminiHeadless
            || openingImproveScriptGeminiHeadless
            || geminiScriptStatus === 'queued'
            || geminiScriptStatus === 'processing'
        ) {
            return;
        }
        setOpeningImproveScriptGeminiHeadless(true);
        try {
            const res = await enqueueGeminiWebAudioScript(shortVideoId, 'improve', true);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Enqueue cải thiện script Headless thất bại',
                    'error',
                );
                return;
            }
            if (res.gemini_script) {
                setGeminiScriptStatus(String(res.gemini_script.status || 'queued'));
                setGeminiScriptMode(String(res.gemini_script.mode || 'improve'));
                setGeminiScriptError(String(res.gemini_script.error || '').trim());
            } else {
                setGeminiScriptStatus('queued');
                setGeminiScriptMode('improve');
                setGeminiScriptError('');
            }
            showMessage(
                parseApiMessage(res?.message)
                    || 'Đã đưa cải thiện script vào queue Gemini Headless — có thể đóng CMS',
                'success',
            );
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningImproveScriptGeminiHeadless(false);
        }
    };

    const handleOpenMediaSuggestGemini = async () => {
        if (!marketingPostId) {
            showMessage('Thiếu marketing_post_id để mở gợi ý media', 'warning');
            return;
        }
        setOpeningMediaSuggestGemini(true);
        try {
            const contextRes = await fetchImportHtmlContext(shortVideoId) as ImportHtmlContextPayload;
            if (!contextRes?.success) {
                showMessage(parseImportHtmlContextMessage(contextRes?.message) || 'Không lấy được context media', 'error');
                return;
            }
            const prompt = buildAgentMediaSuggestionPrompt({
                shortVideoId,
                title,
                appMobileTitle,
                audioScript,
                contextPayload: contextRes,
            });
            await openAgentMediaSuggestionGemini({
                shortVideoId,
                marketingPostId,
                prompt,
                autoSubmit: true,
            });
            showMessage('Đã mở Gemini gợi ý media — tab sẽ tự lưu về CMS khi hoàn tất', 'success');
            window.setTimeout(() => {
                loadRow();
            }, 3000);
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningMediaSuggestGemini(false);
        }
    };

    const handleOpenGithubImageShotsGemini = async () => {
        if (!String(audioScript || '').trim()) {
            showMessage('Cần có audio script trước khi gợi ý image GitHub', 'warning');
            return;
        }
        setOpeningGithubImageShotsGemini(true);
        try {
            const prompt = buildAgentGithubImageShotsPrompt({
                shortVideoId,
                title,
                appMobileTitle,
                githubRepo: agentGithubRepo,
                audioScript,
                sourceContent: savedAgentSourceContent,
            });
            await openAgentGithubImageShotsGemini({
                shortVideoId,
                prompt,
                autoSubmit: true,
            });
            showMessage('Đã mở Gemini gợi ý image GitHub — tab sẽ tự lưu về CMS khi hoàn tất', 'success');
            window.setTimeout(() => {
                loadRow();
            }, 3000);
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningGithubImageShotsGemini(false);
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
        setWhisperStale(Boolean(summary.whisper_stale));
        setWhisperError(String(summary.whisper_error || '').trim());
        if (Array.isArray(summary.whisper_words)) {
            setWhisperWords(summary.whisper_words);
        }
        setImportHtmlReady(Boolean(summary.import_html_ready));
        setBeatMapReady(Boolean(summary.beat_map_ready));
        if (summary.gemini_fill) {
            const fill = summary.gemini_fill;
            const nextGeminiStatus = String(fill.status || 'none');
            setGeminiFillStatus(nextGeminiStatus);
            setGeminiFillProgress({
                current: Number(fill.progress?.current || 0),
                total: Number(fill.progress?.total || 0),
                beatId: String(fill.progress?.beat_id || ''),
                succeeded: Number(fill.progress?.succeeded || 0),
                failed: toStringIdList(fill.progress?.failed),
                error: String(fill.error || '').trim(),
            });
        }
        if (summary.gemini_division) {
            setGeminiDivisionStatus(String(summary.gemini_division.status || 'none'));
            setGeminiDivisionError(String(summary.gemini_division.error || '').trim());
        }
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
                    const parsed = parseBeatHtmlEntry(entry);
                    if (parsed) {
                        nextBeatHtml[beatId] = parsed;
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
        applyImportHtmlResources(summary);
    }, [applyBeatMapDraft, applyImportHtmlResources]);

    const persistImportHtml = React.useCallback(async (payload: {
        renderMode?: AgentRenderMode;
        hfPromptType?: string;
        html?: string;
        beatMap?: BeatMap;
        beatId?: string;
        beatHtml?: string;
        creativePrompt?: string;
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
                creativePrompt: payload.creativePrompt,
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

    const persistImportHtmlAssets = React.useCallback(async (options?: {
        bgmSegments?: ImportHtmlBgmSegment[];
        sfxBeatTransition?: boolean;
        sfxHook?: boolean;
        visualCatalog?: ImportHtmlVisualCatalogItem[];
        githubImageShots?: ImportHtmlGithubImageShot[];
        silent?: boolean;
    }) => {
        const nextBgm = options?.bgmSegments ?? bgmSegments;
        const nextSfxBeat = options?.sfxBeatTransition ?? sfxBeatTransition;
        const nextSfxHook = options?.sfxHook ?? sfxHook;
        const nextVisual = options?.visualCatalog ?? visualCatalog;
        const nextGithubShots = options?.githubImageShots ?? githubImageShots;
        const silent = Boolean(options?.silent);

        setSavingImportAssets(true);
        try {
            const res = await saveAgentImportHtml(shortVideoId, {
                bgmSegments: nextBgm,
                sfxBeatTransition: nextSfxBeat,
                sfxHook: nextSfxHook,
                visualCatalog: nextVisual,
                githubImageShots: nextGithubShots,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được tài nguyên', 'error');
                return false;
            }
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
            }
            const savedBgmRaw = res.import_html?.assets?.bgm_segments;
            const savedBgmCount = Array.isArray(savedBgmRaw) ? savedBgmRaw.length : 0;
            if (nextBgm.length > 0 && savedBgmCount === 0) {
                showMessage('Không lưu được nhạc nền — URL tải không hợp lệ', 'error');
                return false;
            }
            const savedVisualRaw = res.import_html?.assets?.visual_catalog;
            const savedVisualCatalog = Array.isArray(savedVisualRaw) ? savedVisualRaw : [];
            if (nextVisual.length > 0 && savedVisualCatalog.length === 0) {
                showMessage('Không lưu được thư viện hình ảnh/video — kiểm tra URL hoặc cập nhật backend', 'error');
                return false;
            }
            visualCatalogSavedRef.current = JSON.stringify(savedVisualCatalog);
            const savedGithubRaw = res.import_html?.assets?.github_image_shots;
            githubImageShotsSavedRef.current = JSON.stringify(Array.isArray(savedGithubRaw) ? savedGithubRaw : []);
            if (!silent) {
                showMessage('Đã lưu tài nguyên ghép video', 'success');
            }
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingImportAssets(false);
        }
    }, [applyImportHtmlSummary, bgmSegments, githubImageShots, sfxBeatTransition, sfxHook, visualCatalog, shortVideoId, showMessage]);

    const readClipboardImageFile = React.useCallback(async (): Promise<File | null> => {
        if (!navigator.clipboard?.read) {
            return null;
        }
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find((type) => type.startsWith('image/'));
                if (!imageType) {
                    continue;
                }
                const blob = await item.getType(imageType);
                const ext = imageType === 'image/png'
                    ? 'png'
                    : imageType === 'image/webp'
                        ? 'webp'
                        : 'jpg';
                return new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imageType });
            }
        } catch {
            return null;
        }
        return null;
    }, []);

    const handlePasteGithubImageShot = React.useCallback(async (shotId: string) => {
        const shot = githubImageShots.find((item) => item.id === shotId);
        if (!shot) {
            return;
        }
        setPastingGithubShotId(shotId);
        try {
            const file = await readClipboardImageFile();
            if (!file) {
                showMessage('Clipboard không có ảnh — hãy copy ảnh rồi thử lại', 'warning');
                return;
            }
            const res = await uploadAgentVisualImage(shortVideoId, file);
            if (!res?.success) {
                throw new Error(parseApiMessage(res?.message) || 'Upload ảnh thất bại');
            }
            const url = String(res.url || '').trim();
            if (!url) {
                throw new Error('Server không trả URL ảnh');
            }
            const previewUrl = String(res.preview_url || url).trim() || url;
            const nextId = `vis-upload-${Date.now()}`;
            const caption = shot.description;
            const nextCatalogItem: ImportHtmlVisualCatalogItem = {
                id: nextId,
                media_type: 'image',
                url,
                preview_url: previewUrl,
                title: caption,
                caption,
                provider: 'upload',
                source: 'user_upload',
            };
            const prevCatalogId = String(shot.visual_catalog_id || '').trim();
            let nextCatalog = visualCatalog.filter((entry) => (
                entry.id !== prevCatalogId && entry.url !== url
            ));
            nextCatalog = [...nextCatalog, nextCatalogItem];
            const nextShots = githubImageShots.map((item) => (
                item.id === shotId
                    ? { ...item, visual_catalog_id: nextId }
                    : item
            ));
            setVisualCatalog(nextCatalog);
            setGithubImageShots(nextShots);
            const ok = await persistImportHtmlAssets({
                visualCatalog: nextCatalog,
                githubImageShots: nextShots,
                silent: true,
            });
            if (ok) {
                showMessage(
                    prevCatalogId ? 'Đã cập nhật ảnh từ clipboard' : 'Đã gắn ảnh từ clipboard vào mô tả',
                    'success',
                );
            }
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setPastingGithubShotId(null);
        }
    }, [
        githubImageShots,
        persistImportHtmlAssets,
        readClipboardImageFile,
        shortVideoId,
        showMessage,
        visualCatalog,
    ]);

    const handleUnlinkGithubImageShot = React.useCallback(async (shotId: string) => {
        const shot = githubImageShots.find((item) => item.id === shotId);
        if (!shot?.visual_catalog_id) {
            return;
        }
        const catalogId = shot.visual_catalog_id;
        const nextShots = githubImageShots.map((item) => {
            if (item.id !== shotId) {
                return item;
            }
            return {
                id: item.id,
                description: item.description,
            };
        });
        const nextCatalog = visualCatalog.filter((item) => item.id !== catalogId);
        setGithubImageShots(nextShots);
        setVisualCatalog(nextCatalog);
        await persistImportHtmlAssets({
            visualCatalog: nextCatalog,
            githubImageShots: nextShots,
            silent: true,
        });
    }, [githubImageShots, persistImportHtmlAssets, visualCatalog]);

    const handleUpdateGithubImageShotDescription = React.useCallback((shotId: string, description: string) => {
        setGithubImageShots((prev) => prev.map((item) => (
            item.id === shotId ? { ...item, description } : item
        )));
    }, []);

    const handleAddVisualCatalogItem = React.useCallback((item: ImportHtmlVisualCatalogItem) => {
        const url = String(item.url || '').trim();
        if (!url) {
            return;
        }
        setVisualCatalog((prev) => {
            if (prev.some((entry) => entry.url === url)) {
                return prev;
            }
            return [...prev, item];
        });
    }, []);

    const handleRemoveVisualCatalogItem = React.useCallback((index: number) => {
        setVisualCatalog((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpdateVisualCatalogItem = React.useCallback((
        index: number,
        partial: Partial<ImportHtmlVisualCatalogItem>,
    ) => {
        setVisualCatalog((prev) => {
            if (index < 0 || index >= prev.length) {
                return prev;
            }
            const current = prev[index];
            const nextCaption = partial.caption !== undefined
                ? String(partial.caption).trim()
                : String(current.caption || '').trim();
            const nextTitle = partial.title !== undefined
                ? String(partial.title).trim()
                : (nextCaption || String(current.title || '').trim());
            const nextItem: ImportHtmlVisualCatalogItem = {
                ...current,
                ...partial,
                caption: nextCaption,
                title: nextTitle || nextCaption || current.title || current.id,
            };
            return prev.map((item, i) => (i === index ? nextItem : item));
        });
    }, []);

    const isVisualCatalogDirty = JSON.stringify(visualCatalog) !== visualCatalogSavedRef.current
        || JSON.stringify(githubImageShots) !== githubImageShotsSavedRef.current;

    const persistVisualCatalogIfDirty = React.useCallback(async () => {
        if (!isVisualCatalogDirty) {
            return true;
        }
        return persistImportHtmlAssets({ silent: true });
    }, [isVisualCatalogDirty, persistImportHtmlAssets]);

    const handleSearchAgentBgm = React.useCallback(async () => {
        setSearchingBgm(true);
        try {
            const res = await searchAgentBgm(bgmSearchQuery.trim() || 'lofi ambient', 8);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Tìm BGM thất bại', 'error');
                return;
            }
            const rawItems = Array.isArray(res.items) ? res.items : [];
            const playable = rawItems.filter((item) => Boolean(bgmPreviewUrl(item)));
            if (playable.length === 0) {
                showMessage(
                    'Không có track nào có URL audio trực tiếp (Pixabay Audio API có thể bị 403).',
                    'error',
                );
                setBgmSearchResults([]);
                return;
            }
            const enriched = await enrichBgmSearchItems(playable);
            setBgmSearchResults(enriched);
            if (typeof res.fallback_note === 'string' && res.fallback_note.trim()) {
                showMessage(res.fallback_note.trim(), 'info');
            }
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSearchingBgm(false);
        }
    }, [bgmSearchQuery, showMessage]);

    const handleAddBgmSegment = React.useCallback(async (item: AgentBgmSearchItem) => {
        const downloadUrl = String(item.download_url || '').trim();
        if (!downloadUrl) {
            return;
        }
        const previewUrl = bgmPreviewUrl(item);
        if (!previewUrl) {
            showMessage(
                'Track này không có URL audio trực tiếp — không thể preview/tải. Thử tìm lại hoặc chọn bài khác.',
                'error',
            );
            return;
        }
        let durationSec = Number(item.duration_sec || 0);
        if (durationSec <= 0 && previewUrl) {
            durationSec = await probeAudioDurationSec(previewUrl);
        }
        let nextSegments: ImportHtmlBgmSegment[] | null = null;
        setBgmSegments((prev) => {
            if (prev.some((seg) => seg.download_url === downloadUrl)) {
                nextSegments = prev;
                return prev;
            }
            nextSegments = [
                ...prev,
                {
                    id: String(item.id || `bgm-${prev.length + 1}`),
                    title: String(item.title || ''),
                    download_url: downloadUrl,
                    preview_url: previewUrl,
                    duration_sec: durationSec,
                    provider: String(item.provider || 'pixabay'),
                },
            ];
            return nextSegments;
        });
        if (nextSegments) {
            await persistImportHtmlAssets({ bgmSegments: nextSegments, silent: true });
        }
    }, [persistImportHtmlAssets, showMessage]);

    const handleRemoveBgmSegment = React.useCallback(async (index: number) => {
        let nextSegments: ImportHtmlBgmSegment[] | null = null;
        setBgmSegments((prev) => {
            nextSegments = prev.filter((_, i) => i !== index);
            return nextSegments;
        });
        if (nextSegments) {
            await persistImportHtmlAssets({ bgmSegments: nextSegments, silent: true });
        }
    }, [persistImportHtmlAssets]);

    const handleSfxBeatTransitionChange = React.useCallback(async (checked: boolean) => {
        setSfxBeatTransition(checked);
        await persistImportHtmlAssets({ sfxBeatTransition: checked, silent: true });
    }, [persistImportHtmlAssets]);

    const handleSfxHookChange = React.useCallback(async (checked: boolean) => {
        setSfxHook(checked);
        await persistImportHtmlAssets({ sfxHook: checked, silent: true });
    }, [persistImportHtmlAssets]);

    const handleLaunchImportHtmlAssemble = async () => {
        setLaunchingAssemble(true);
        try {
            const result = await launchImportHtmlAssemble(shortVideoId);
            showMessage(result.message, result.ok ? 'success' : 'error');
            loadRow();
            if (!result.ok && isCaptionSyncAssembleError(result.message || '')) {
                setCaptionMismatchDialogMessage(String(result.message || '').trim());
                setCaptionMismatchDialogOpen(true);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            showMessage(message, 'error');
            loadRow();
            if (isCaptionSyncAssembleError(message)) {
                setCaptionMismatchDialogMessage(message);
                setCaptionMismatchDialogOpen(true);
            }
        } finally {
            setLaunchingAssemble(false);
        }
    };

    const handleDismissCaptionMismatchDialog = React.useCallback(() => {
        setCaptionMismatchDialogOpen(false);
    }, []);

    const handleLaunchImportHtmlAssembleAllowMismatch = async () => {
        setCaptionMismatchDialogOpen(false);
        setLaunchingAssemble(true);
        try {
            const result = await launchImportHtmlAssemble(shortVideoId, {
                allowCaptionMismatch: true,
            });
            showMessage(result.message, result.ok ? 'success' : 'error');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            loadRow();
        } finally {
            setLaunchingAssemble(false);
        }
    };

    const handleLaunchImportHtmlPreview = async () => {
        setLaunchingPreview(true);
        try {
            const result = await launchImportHtmlPreview(shortVideoId);
            if (result.previewUrl) {
                setPreviewStudioUrl(result.previewUrl);
            }
            showMessage(result.message, result.ok ? 'success' : 'error');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setLaunchingPreview(false);
        }
    };

    const handleLaunchImportHtmlRender = async () => {
        setLaunchingScriptRender(true);
        try {
            const result = await launchImportHtmlRender(shortVideoId);
            showMessage(result.message, result.ok ? 'success' : 'error');
            loadRow();
            if (!result.ok && isCaptionSyncAssembleError(result.message || '')) {
                setCaptionMismatchDialogMessage(String(result.message || '').trim());
                setCaptionMismatchDialogOpen(true);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            showMessage(message, 'error');
            loadRow();
            if (isCaptionSyncAssembleError(message)) {
                setCaptionMismatchDialogMessage(message);
                setCaptionMismatchDialogOpen(true);
            }
        } finally {
            setLaunchingScriptRender(false);
        }
    };

    const handleLaunchImportHtmlRenderAllowMismatch = async () => {
        setCaptionMismatchDialogOpen(false);
        setLaunchingScriptRender(true);
        try {
            const result = await launchImportHtmlRender(shortVideoId, {
                allowCaptionMismatch: true,
            });
            showMessage(result.message, result.ok ? 'success' : 'error');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            loadRow();
        } finally {
            setLaunchingScriptRender(false);
        }
    };

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
            const relaxDurationBounds = ['github_top_daily', 'github_top_weekly', 'github_top_monthly'].includes(
                String(agentSourceFormat || ''),
            );
            const validation = audioDurationSec != null && audioDurationSec > 0
                ? validateBeatMap(parsed.map, audioDurationSec, { relaxDurationBounds })
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
                const relaxDurationBounds = ['github_top_daily', 'github_top_weekly', 'github_top_monthly'].includes(
                    String(agentSourceFormat || ''),
                );
                const validation = validateBeatMap(map, audioDurationSec, { relaxDurationBounds });
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
        options?: { immediate?: boolean; creativePrompt?: string },
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
        const creativePrompt = options?.creativePrompt;
        setBeatHtml((prev) => ({
            ...prev,
            [beatId]: {
                ...prev[beatId],
                html: next,
                updated_at: draftUpdatedAt,
                ...(creativePrompt !== undefined ? { creative_prompt: creativePrompt } : {}),
            },
        }));

        const existingTimer = beatHtmlSaveTimerRef.current[beatId];
        if (existingTimer != null) {
            window.clearTimeout(existingTimer);
            delete beatHtmlSaveTimerRef.current[beatId];
        }

        if (options?.immediate) {
            return persistImportHtml({
                beatId,
                beatHtml: next,
                ...(creativePrompt !== undefined ? { creativePrompt } : {}),
            });
        }

        beatHtmlSaveTimerRef.current[beatId] = window.setTimeout(() => {
            delete beatHtmlSaveTimerRef.current[beatId];
            void persistImportHtml({
                beatId,
                beatHtml: next,
                ...(creativePrompt !== undefined ? { creativePrompt } : {}),
            });
        }, 1000);
        return true;
    }, [beatMap, persistImportHtml, showMessage]);

    const handleRefineBeatHtmlViaGemini = React.useCallback(async (
        beatId: string,
        input: { prompt: string; html: string },
    ): Promise<string | null> => {
        const prompt = String(input.prompt || '').trim();
        if (!prompt) {
            showMessage('Nhập prompt trước khi gọi AI', 'warning');
            return null;
        }
        const existingHtml = String(input.html || '').trim();
        if (!existingHtml) {
            showMessage('Chưa có HTML beat để refine', 'warning');
            return null;
        }

        setRefiningBeatHtmlBeatId(beatId);
        try {
            const res = await generateBeatHtmlViaGeminiWeb(shortVideoId, beatId, {
                mode: 'refine',
                userPrompt: prompt,
                existingHtml,
                persistHtml: false,
                persistPrompt: true,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Gemini refine thất bại', 'error');
                return null;
            }

            setBeatHtml((prev) => ({
                ...prev,
                [beatId]: {
                    ...prev[beatId],
                    // Giữ html cũ trên state CMS; draft drawer nhận HTML mới qua return value.
                    html: prev[beatId]?.html || existingHtml,
                    creative_prompt: prompt,
                    updated_at: prev[beatId]?.updated_at,
                },
            }));

            const html = String(res.html || '').trim();
            if (!html) {
                showMessage('Gemini trả HTML trống', 'error');
                return null;
            }
            if (html === existingHtml) {
                showMessage(
                    'Gemini trả HTML giống bản cũ — thử prompt cụ thể hơn hoặc chạy lại AI',
                    'warning',
                );
            } else {
                showMessage(`Đã refine ${beatId} — kiểm tra draft rồi bấm Lưu`, 'success');
            }
            return html;
        } finally {
            setRefiningBeatHtmlBeatId('');
        }
    }, [shortVideoId, showMessage]);

    const handleBeatHtmlChange = (beatId: string, value: string) => {
        void commitBeatHtmlChange(beatId, value);
    };

    const focusBeatEditor = React.useCallback((beatId: string) => {
        setActiveBeatId(beatId);
        setBeatEditorFocusRequest({ beatId, nonce: Date.now() });
    }, []);

    const handleOpenBeatDivisionGemini = async () => {
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        if (!audioDurationSec || audioDurationSec <= 0) {
            showMessage('Chưa có thời lượng audio', 'warning');
            return;
        }
        setOpeningBeatDivisionGemini(true);
        try {
            await openImportHtmlBeatGeminiFillOnly({
                shortVideoId,
                stage: 'import_html_beat_division',
                autoSubmit: true,
            });
            showMessage('Đã mở Gemini chia beat — copy JSON rồi bấm Lưu beat-map vào CMS', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningBeatDivisionGemini(false);
        }
    };

    const handleEnqueueBeatDivisionGeminiHeadless = async () => {
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        if (!audioDurationSec || audioDurationSec <= 0) {
            showMessage('Chưa có thời lượng audio', 'warning');
            return;
        }
        if (renderMode !== 'import_html') {
            showMessage('Chỉ áp dụng khi render_mode = HTML chatbot', 'warning');
            return;
        }
        if (
            openingBeatDivisionGeminiHeadless
            || geminiDivisionStatus === 'queued'
            || geminiDivisionStatus === 'processing'
        ) {
            return;
        }
        setOpeningBeatDivisionGeminiHeadless(true);
        try {
            const res = await enqueueGeminiWebBeatDivision(shortVideoId, true);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Enqueue chia beat Headless thất bại',
                    'error',
                );
                return;
            }
            if (res.gemini_division) {
                setGeminiDivisionStatus(String(res.gemini_division.status || 'queued'));
                setGeminiDivisionError(String(res.gemini_division.error || '').trim());
            } else {
                setGeminiDivisionStatus('queued');
                setGeminiDivisionError('');
            }
            showMessage(
                parseApiMessage(res?.message)
                    || 'Đã đưa chia beat vào queue Gemini Headless — có thể đóng CMS',
                'success',
            );
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningBeatDivisionGeminiHeadless(false);
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
            const serverRes = await fetchImportHtmlBeatHtmlPrompt(shortVideoId, beatId);
            let prompt = String(serverRes?.prompt || '').trim();
            if (!serverRes?.success || !prompt) {
                const res = await fetchImportHtmlContext(shortVideoId) as ImportHtmlContextPayload;
                if (!res?.success) {
                    showMessage(
                        parseImportHtmlContextMessage(res?.message)
                            || parseApiMessage(serverRes?.message)
                            || 'Không lấy được prompt beat HTML',
                        'error',
                    );
                    return;
                }
                prompt = await buildBeatHtmlPrompt({ ...res, beat_map: beatMap }, beat);
            }
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

    const handleOpenBeatGeminiHeadless = (beatId: string) => {
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
        if (
            openingBeatGeminiHeadlessBeatIds.includes(beatId)
            || openingBeatGeminiBeatIds.includes(beatId)
            || fillingAllMissingBeatGeminiHeadless
        ) {
            return;
        }

        setOpeningBeatGeminiHeadlessBeatIds((prev) => (
            prev.includes(beatId) ? prev : [...prev, beatId]
        ));
        void (async () => {
            try {
                showMessage(
                    `Đang chạy Gemini Headless cho ${beatId}…`,
                    'info',
                );
                showMessage(
                    `Đang chạy Gemini Headless cho ${beatId} (queue worker / API sync)…`,
                    'info',
                );
                const res = await generateBeatHtmlViaGeminiWeb(shortVideoId, beatId);
                if (!res?.success) {
                    showMessage(
                        parseApiMessage(res?.message) || 'Gemini Headless thất bại',
                        'error',
                    );
                    return;
                }
                focusBeatEditor(beatId);
                await loadRow();
                showMessage(
                    parseApiMessage(res?.message) || `Đã lưu HTML ${beatId} qua Gemini Headless`,
                    'success',
                );
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setOpeningBeatGeminiHeadlessBeatIds((prev) => prev.filter((id) => id !== beatId));
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
        if (openingAllMissingBeatGemini || fillingAllMissingBeatGeminiHeadless) {
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

    const handleFillAllMissingBeatGeminiHeadless = () => {
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
        if (
            fillingAllMissingBeatGeminiHeadless
            || openingAllMissingBeatGemini
            || geminiFillStatus === 'queued'
            || geminiFillStatus === 'processing'
        ) {
            return;
        }

        setFillingAllMissingBeatGeminiHeadless(true);
        setFillingAllMissingBeatGeminiHeadlessProgress({
            current: 0,
            total: missingBeatIds.length,
            beatId: '',
        });
        void (async () => {
            try {
                const res = await enqueueGeminiWebBeatFill(shortVideoId, missingBeatIds, true);
                if (!res?.success) {
                    showMessage(
                        parseApiMessage(res?.message) || 'Enqueue Gemini fill thất bại',
                        'error',
                    );
                    return;
                }
                if (res.gemini_fill) {
                    const fill = res.gemini_fill;
                    setGeminiFillStatus(String(fill.status || 'queued'));
                    setGeminiFillProgress({
                        current: Number(fill.progress?.current || 0),
                        total: Number(fill.progress?.total || missingBeatIds.length),
                        beatId: String(fill.progress?.beat_id || ''),
                        succeeded: Number(fill.progress?.succeeded || 0),
                        failed: toStringIdList(fill.progress?.failed),
                        error: String(fill.error || '').trim(),
                    });
                } else {
                    setGeminiFillStatus('queued');
                }
                await loadRow();
                showMessage(
                    parseApiMessage(res?.message)
                        || `Đã đưa ${res.queued ?? missingBeatIds.length} beat vào queue — có thể đóng CMS`,
                    'success',
                );
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setFillingAllMissingBeatGeminiHeadless(false);
                setFillingAllMissingBeatGeminiHeadlessProgress(null);
            }
        })();
    };

    const handleAutoFillBeatHtmlChange = async (checked: boolean) => {
        if (savingAutoFillBeatHtml) {
            return;
        }
        setSavingAutoFillBeatHtml(true);
        try {
            const res = await saveAgentAutoFillBeatHtml(shortVideoId, checked);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình auto-fill beat',
                    'error',
                );
                return;
            }
            setAgentAutoFillBeatHtml(checked);
            showMessage(
                parseApiMessage(res?.message)
                    || (checked
                        ? 'Đã bật tự động fill HTML beat (queue)'
                        : 'Đã tắt tự động fill HTML beat'),
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingAutoFillBeatHtml(false);
        }
    };

    const handleStartFullAutoPipeline = async (
        mode: 'resume' | 'restart' = 'resume',
        fromStep?: string,
    ) => {
        if (startingFullAuto) {
            return;
        }
        setStartingFullAuto(true);
        try {
            const res = await startFullAutoPipeline(shortVideoId, mode, fromStep);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không khởi chạy được pipeline A→Z',
                    'error',
                );
                return;
            }
            if (res.full_auto_pipeline) {
                setFullAutoPipeline(res.full_auto_pipeline);
            }
            const stepLabel = fromStep
                && (FULL_AUTO_PIPELINE_STEP_LABELS as Record<string, string>)[fromStep]
                ? (FULL_AUTO_PIPELINE_STEP_LABELS as Record<string, string>)[fromStep]
                : fromStep;
            showMessage(
                parseApiMessage(res?.message)
                    || (mode === 'restart'
                        ? (fromStep && fromStep !== 'script_create'
                            ? `Đã chạy lại từ bước «${stepLabel}»`
                            : 'Đã chạy lại pipeline A→Z từ đầu')
                        : 'Đã bật / tiếp tục pipeline A→Z'),
                'success',
            );
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setStartingFullAuto(false);
        }
    };

    const handleCancelFullAutoPipeline = async () => {
        if (cancellingFullAuto) {
            return;
        }
        setCancellingFullAuto(true);
        try {
            const res = await cancelFullAutoPipeline(shortVideoId);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không tạm dừng được pipeline',
                    'error',
                );
                return;
            }
            if (res.full_auto_pipeline) {
                setFullAutoPipeline(res.full_auto_pipeline);
            }
            showMessage(parseApiMessage(res?.message) || 'Đã tạm dừng pipeline A→Z', 'success');
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setCancellingFullAuto(false);
        }
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

    const whisperScriptAlign = useWhisperScriptAlign({
        audioScript,
        whisperWords,
        overrides: captionOverrides,
        phoneticDict: ttsPhoneticDict,
    });

    const whisperAlignKeyRef = React.useRef('');
    React.useEffect(() => {
        const nextKey = `${audioScript}::${whisperWords.map((w) => `${w.text}:${w.start}`).join('|')}`;
        if (whisperAlignKeyRef.current && whisperAlignKeyRef.current !== nextKey) {
            setCaptionOverrides({});
        }
        whisperAlignKeyRef.current = nextKey;
    }, [audioScript, whisperWords]);

    const openWhisperCompare = React.useCallback((focusIndex?: number) => {
        setCompareFocusIndex(focusIndex ?? null);
        setCompareDrawerOpen(true);
    }, []);

    const handleWhisperChooseToken = React.useCallback((tokenIndex: number, choice: 'script' | 'whisper') => {
        if (!whisperScriptAlign) {
            return;
        }
        const patch = applyTokenOverride(whisperScriptAlign, tokenIndex, choice, whisperWords);
        setCaptionOverrides((prev) => mergeCaptionOverrides(prev, patch));
    }, [whisperScriptAlign, whisperWords]);

    const saveCaptionAlignments = React.useCallback(async () => {
        if (!whisperScriptAlign) {
            return false;
        }
        setSavingCaptionAlignments(true);
        try {
            const res = await saveAgentCaptionAlignments(shortVideoId, {
                words: whisperScriptAlign.captionWords,
                overrides: overridesToList(captionOverrides),
                captionSync: buildCaptionSyncPayload(whisperScriptAlign),
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được karaoke', 'error');
                return false;
            }
            setCaptionOverrides({});
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
            }
            showMessage(parseApiMessage(res?.message) || 'Đã lưu chỉnh sửa karaoke', 'success');
            loadRow();
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingCaptionAlignments(false);
        }
    }, [
        applyImportHtmlSummary,
        captionOverrides,
        loadRow,
        shortVideoId,
        showMessage,
        whisperScriptAlign,
    ]);

    const handleSavePhoneticDict = React.useCallback(async (payload: {
        sourceTerm: string;
        phonetic: string;
        id?: number;
        caseSensitive?: boolean;
    }) => {
        const sourceTerm = normalizePhoneticSourceTerm(payload.sourceTerm);
        const phonetic = payload.phonetic.trim();
        if (!sourceTerm || !phonetic) {
            showMessage('Từ gốc và phiên âm không được để trống', 'error');
            return false;
        }

        setSavingPhoneticDict(true);
        try {
            const res = await saveTtsPhoneticDict({
                source_term: sourceTerm,
                phonetic,
                id: payload.id,
                enabled: true,
                case_sensitive: Boolean(payload.caseSensitive),
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được phiên âm', 'error');
                return false;
            }

            if (Array.isArray(res.entries)) {
                setTtsPhoneticDict(mergeTtsPhoneticDictEntries(res.entries));
            } else if (res.entry) {
                setTtsPhoneticDict((prev) => {
                    const next = prev.filter((item) => item.source_term.trim().toLowerCase()
                        !== sourceTerm.toLowerCase());
                    next.push(res.entry as TtsPhoneticDictEntry);
                    return mergeTtsPhoneticDictEntries(next);
                });
            }

            showMessage(parseApiMessage(res?.message) || 'Đã lưu phiên âm', 'success');
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingPhoneticDict(false);
        }
    }, [showMessage]);

    React.useEffect(() => {
        if (!open) {
            autoWhisperStartedRef.current = '';
            return;
        }
        if (!scriptApproved || !hasAudio) {
            return;
        }
        if (transcribingWhisper || whisperStatus === 'processing') {
            return;
        }

        const needsWhisper = whisperStatus === 'none'
            || whisperStatus === 'failed'
            || whisperStale;
        if (!needsWhisper) {
            return;
        }

        const audioKey = audioFileUrl.trim();
        if (!audioKey) {
            return;
        }

        const runKey = `${audioKey}:${whisperStatus}:${whisperStale}`;
        if (autoWhisperStartedRef.current === runKey) {
            return;
        }
        autoWhisperStartedRef.current = runKey;
        void runWhisperTranscribe();
    }, [
        audioFileUrl,
        hasAudio,
        open,
        runWhisperTranscribe,
        scriptApproved,
        transcribingWhisper,
        whisperStale,
        whisperStatus,
    ]);

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
            setScriptApproved(Boolean(json?.audio_script_approved) === true);
            savedScriptRef.current = audioScript.trim();
            clearAgentVideoScriptDraft(shortVideoId);
            if (json?.audio_reset) {
                setAudioFileUrl('');
                setAudioDurationSec(null);
                setTtsPending(false);
                setTtsFailed(false);
            }
            showMessage(parseApiMessage(json?.message) || 'Đã lưu script', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingScript(false);
        }
    };

    const handleSaveSourceContent = async (contentOverride?: string, additionalInfoOverride?: string) => {
        const contentToSave = contentOverride !== undefined
            ? String(contentOverride)
            : agentSourceContent;
        const additionalToSave = additionalInfoOverride !== undefined
            ? String(additionalInfoOverride)
            : agentAdditionalInfo;
        const linked = marketingPostId > 0;

        if (linked) {
            if (additionalToSave === savedAgentAdditionalInfo) {
                return;
            }
        } else if (
            contentToSave === savedAgentSourceContent
            && agentGithubRepo === savedAgentGithubRepo
            && agentSourceFormat === savedAgentSourceFormat
            && additionalToSave === savedAgentAdditionalInfo
        ) {
            return;
        }

        setSavingSourceContent(true);
        try {
            const json = await saveAgentSourceContent(
                shortVideoId,
                linked ? '' : contentToSave,
                linked ? undefined : agentGithubRepo.trim(),
                linked ? undefined : agentSourceFormat,
                additionalToSave,
            );
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không lưu được nội dung', 'error');
                return;
            }
            const nextAdditional = String(json?.agent_additional_info ?? additionalToSave);
            setAgentAdditionalInfo(nextAdditional);
            setSavedAgentAdditionalInfo(nextAdditional);

            if (!linked) {
                const nextSource = String(json?.agent_source_content ?? contentToSave);
                const nextGithub = String(json?.agent_github_repo ?? agentGithubRepo).trim();
                const nextFormat = String(json?.agent_source_format ?? agentSourceFormat).trim() || 'github_repo_review';
                setAgentSourceContent(nextSource);
                setSavedAgentSourceContent(nextSource);
                setAgentGithubRepo(nextGithub);
                setSavedAgentGithubRepo(nextGithub);
                setAgentSourceFormat(nextFormat);
                setSavedAgentSourceFormat(nextFormat);
                setContentPlainText(String(json?.content_plain_text ?? nextSource).trim());
                if (Array.isArray(json?.readme_media)) {
                    setReadmeMedia(normalizeGithubReadmeMediaList(json.readme_media));
                }
            }

            showMessage(parseApiMessage(json?.message) || (linked ? 'Đã lưu thông tin thêm' : 'Đã lưu nội dung nguồn'), 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingSourceContent(false);
        }
    };

    const handleFetchGithubReadme = async () => {
        if (marketingPostId > 0) {
            showMessage('Đã liên kết marketing post — không lấy thông tin GitHub', 'warning');
            return;
        }
        const repo = agentGithubRepo.trim();
        if (!repo) {
            showMessage('Nhập GitHub repo trước', 'warning');
            return;
        }
        setFetchingGithubReadme(true);
        try {
            const json = await fetchGithubReadme(shortVideoId, repo, agentAdditionalInfo);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không lấy được thông tin repo', 'error');
                return;
            }

            const normalizedRepo = String(json?.agent_github_repo || json?.github_repo || repo).trim();
            if (normalizedRepo) {
                setAgentGithubRepo(normalizedRepo);
            }

            const readme = String(json?.readme || '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            const hasReadme = readme.trim() !== '';
            const statsLine = String(json?.repo_stats?.line || '').trim();
            const hasStats = statsLine !== '';

            if (!hasReadme && !hasStats) {
                showMessage('Không lấy được README hoặc thống kê repo', 'warning');
                return;
            }

            if (hasReadme) {
                const block = `\n\n---\n# README\n\n${readme.trim()}\n`;
                setAgentSourceContent((prev) => {
                    const base = prev.trimEnd();
                    return base ? `${base}${block}` : readme.trim();
                });
            }

            if (hasStats) {
                const merged = json?.additional_info_merged
                    ?? mergeGithubStatsIntoAdditionalInfo(
                        agentAdditionalInfo,
                        statsLine,
                        normalizedRepo,
                    );
                setAgentAdditionalInfo(merged);
            }

            const mediaRaw = Array.isArray(json?.readme_media) ? json.readme_media : [];
            setReadmeMedia(normalizeGithubReadmeMediaList(mediaRaw));

            showMessage(parseApiMessage(json?.message) || 'Đã lấy thông tin repo', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setFetchingGithubReadme(false);
        }
    };

    const normalizeMediaUrlKey = React.useCallback((url: string): string => {
        return String(url || '').trim().toLowerCase().replace(/\?.*$/, '');
    }, []);

    const isReadmeMediaImported = React.useCallback((item: GithubReadmeMediaItem): boolean => {
        const key = normalizeMediaUrlKey(item.resolved_url);
        if (!key) {
            return false;
        }
        return visualCatalog.some((entry) => {
            const originKey = normalizeMediaUrlKey(String(entry.origin_url || ''));
            const urlKey = normalizeMediaUrlKey(String(entry.url || ''));
            return originKey === key || urlKey === key;
        });
    }, [normalizeMediaUrlKey, visualCatalog]);

    const handleImportReadmeMediaItems = React.useCallback(async (items: GithubReadmeMediaItem[]) => {
        const pending = items.filter((item) => !isReadmeMediaImported(item));
        if (pending.length === 0) {
            showMessage('Media đã có trong thư viện — không import lại', 'info');
            return;
        }

        const ids = pending.map((item) => item.id);
        setImportingReadmeMediaIds((prev) => mergeUniqueIds(prev, ids));
        try {
            const res = await importGithubReadmeMedia(shortVideoId, pending);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không import được media README', 'error');
                return;
            }

            let nextCatalog: ImportHtmlVisualCatalogItem[] | null = null;
            if (Array.isArray(res.visual_catalog)) {
                nextCatalog = res.visual_catalog;
            } else {
                const fromAssets = res.import_html && res.import_html.assets
                    ? res.import_html.assets.visual_catalog
                    : undefined;
                if (Array.isArray(fromAssets)) {
                    nextCatalog = fromAssets;
                }
            }
            if (nextCatalog) {
                setVisualCatalog(nextCatalog);
                visualCatalogSavedRef.current = JSON.stringify(nextCatalog);
            }

            showMessage(parseApiMessage(res?.message) || 'Đã import media từ README', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setImportingReadmeMediaIds((prev) => prev.filter((id) => !ids.includes(id)));
        }
    }, [isReadmeMediaImported, shortVideoId, showMessage]);

    const handleImportReadmeMediaItem = React.useCallback(async (item: GithubReadmeMediaItem) => {
        await handleImportReadmeMediaItems([item]);
    }, [handleImportReadmeMediaItems]);

    const handleImportAllReadmeMedia = React.useCallback(async () => {
        setImportingAllReadmeMedia(true);
        try {
            await handleImportReadmeMediaItems(readmeMedia);
        } finally {
            setImportingAllReadmeMedia(false);
        }
    }, [handleImportReadmeMediaItems, readmeMedia]);

    const handleApproveScript = async () => {
        setApprovingScript(true);
        try {
            const json = await approveAudioScript(shortVideoId);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không duyệt được script', 'error');
                return;
            }
            setScriptApproved(true);
            const ttsQueued = Boolean(json?.tts_queued ?? json?.tts_job_id);
            const enqueueError = String(json?.tts_enqueue_error || '').trim();
            if (ttsQueued) {
                setTtsPending(true);
                setTtsFailed(false);
                setNeedsTtsEnqueue(false);
                if (json?.audio_reset || json?.tts_status === 'queued') {
                    setAudioFileUrl('');
                    setAudioDurationSec(null);
                }
                showMessage(parseApiMessage(json?.message) || 'Đã duyệt script — đã queue TTS', 'success');
            } else if (enqueueError) {
                showMessage(enqueueError, 'error');
            } else {
                showMessage(parseApiMessage(json?.message) || 'Đã duyệt script nhưng chưa tạo được queue TTS', 'warning');
            }
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

    const applyOmnivoiceVoiceResponse = React.useCallback((
        res: Awaited<ReturnType<typeof saveAgentOmnivoiceVoice>>,
    ) => {
        if (res?.agent_omnivoice_voice) {
            setOmnivoiceVoice(String(res.agent_omnivoice_voice).trim() || 'minh_quân');
        }
        if (res?.agent_omnivoice_voice_mode === 'design' || res?.agent_omnivoice_voice_mode === 'clone') {
            setOmnivoiceVoiceMode(res.agent_omnivoice_voice_mode);
        }
        if (res?.agent_omnivoice_voice_design) {
            setOmnivoiceVoiceDesign(String(res.agent_omnivoice_voice_design).trim());
        }
        if (Array.isArray(res?.omnivoice_voice_catalog) && res.omnivoice_voice_catalog.length > 0) {
            setOmnivoiceVoiceCatalog(res.omnivoice_voice_catalog);
        }
        if (Array.isArray(res?.omnivoice_voice_design_tokens) && res.omnivoice_voice_design_tokens.length > 0) {
            setOmnivoiceVoiceDesignTokens(res.omnivoice_voice_design_tokens);
        }
    }, []);

    const maybeRegenerateOmnivoiceTts = async (shouldAskRerender: boolean): Promise<void> => {
        if (!shouldAskRerender) {
            return;
        }
        setRegeneratingTts(true);
        try {
            const regen = await regenerateAgentNarrationTts(shortVideoId);
            if (!regen?.success) {
                showMessage(
                    parseApiMessage(regen?.message) || 'Không tạo lại được audio TTS',
                    'error',
                );
            } else {
                setAudioFileUrl('');
                setAudioDurationSec(null);
                setTtsPending(true);
                showMessage(
                    parseApiMessage(regen?.message) || 'Đã queue tạo lại audio TTS',
                    'success',
                );
            }
        } finally {
            setRegeneratingTts(false);
        }
    };

    const handleOmnivoiceVoiceChange = async (payload: SaveOmnivoiceVoicePayload): Promise<boolean> => {
        const mode = payload.mode;
        const voice = String(payload.voice || '').trim();
        const design = String(payload.design || '').trim();

        if (mode === 'clone') {
            if (!voice || (voice === omnivoiceVoice && omnivoiceVoiceMode === 'clone')) {
                return false;
            }
        } else if (!design || (design === omnivoiceVoiceDesign && omnivoiceVoiceMode === 'design')) {
            return false;
        }

        const shouldAskRerender = hasAudio || scriptApproved;
        if (shouldAskRerender) {
            const ok = window.confirm(
                'Đổi giọng OmniVoice? Audio TTS hiện tại sẽ được tạo lại với giọng mới (MP3 cũ bị thay sau khi queue hoàn tất).',
            );
            if (!ok) {
                return false;
            }
        }

        setSavingOmnivoiceVoice(true);
        try {
            const res = await saveAgentOmnivoiceVoice(shortVideoId, payload);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được giọng OmniVoice', 'error');
                return false;
            }
            applyOmnivoiceVoiceResponse(res);
            showMessage(parseApiMessage(res?.message) || 'Đã lưu giọng OmniVoice', 'success');
            await maybeRegenerateOmnivoiceTts(shouldAskRerender);
            loadRow();
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingOmnivoiceVoice(false);
        }
    };

    const handleOmnivoiceVoicePreview = React.useCallback((item: OmnivoiceVoiceCatalogItem) => {
        const url = resolveOmnivoiceVoicePreviewUrl(item);
        if (!url) {
            showMessage('Không có file nghe thử cho giọng này', 'warning');
            return;
        }

        if (playingVoiceUrl === url && voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
            voicePreviewAudioRef.current = null;
            setPlayingVoiceUrl(null);
            return;
        }

        if (voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
        }

        const audio = new Audio(url);
        voicePreviewAudioRef.current = audio;
        audio.onended = () => {
            setPlayingVoiceUrl(null);
            voicePreviewAudioRef.current = null;
        };
        audio.onerror = () => {
            setPlayingVoiceUrl(null);
            voicePreviewAudioRef.current = null;
            showMessage('Không phát được file nghe thử', 'warning');
        };
        void audio.play().then(() => {
            setPlayingVoiceUrl(url);
        }).catch(() => {
            setPlayingVoiceUrl(null);
            voicePreviewAudioRef.current = null;
            showMessage('Trình duyệt chặn phát audio — thử bấm lại', 'warning');
        });
    }, [playingVoiceUrl, showMessage]);

    const handleOmnivoiceVoiceDesignPreview = React.useCallback((design: string) => {
        const trimmed = String(design || '').trim();
        if (!trimmed) {
            showMessage('Nhập voice design trước khi nghe thử', 'warning');
            return;
        }

        const url = resolveOmnivoiceVoiceDesignPreviewUrl(trimmed);
        if (!url) {
            showMessage('Không tạo được URL nghe thử voice design', 'warning');
            return;
        }

        if (playingVoiceUrl === url && voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
            voicePreviewAudioRef.current = null;
            setPlayingVoiceUrl(null);
            setPreviewingVoiceDesign(false);
            return;
        }

        if (voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
        }

        setPreviewingVoiceDesign(true);
        const audio = new Audio(url);
        voicePreviewAudioRef.current = audio;
        audio.onended = () => {
            setPlayingVoiceUrl(null);
            voicePreviewAudioRef.current = null;
            setPreviewingVoiceDesign(false);
        };
        audio.onerror = () => {
            setPlayingVoiceUrl(null);
            voicePreviewAudioRef.current = null;
            setPreviewingVoiceDesign(false);
            showMessage('Không phát được preview voice design', 'warning');
        };
        void audio.play().then(() => {
            setPlayingVoiceUrl(url);
            setPreviewingVoiceDesign(false);
        }).catch(() => {
            setPlayingVoiceUrl(null);
            voicePreviewAudioRef.current = null;
            setPreviewingVoiceDesign(false);
            showMessage('Trình duyệt chặn phát audio — thử bấm lại', 'warning');
        });
    }, [playingVoiceUrl, showMessage]);

    const stopVoicePreview = React.useCallback(() => {
        if (voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
            voicePreviewAudioRef.current = null;
        }
        setPlayingVoiceUrl(null);
        setPreviewingVoiceDesign(false);
    }, []);

    React.useEffect(() => () => {
        if (voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
            voicePreviewAudioRef.current = null;
        }
    }, []);

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

    const beatRenderErrorIds = React.useMemo(
        () => listBeatRenderErrorIds(beatHtml),
        [beatHtml],
    );

    const beatsRenderErrorCount = beatRenderErrorIds.length;

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
        agentAutoFillBeatHtml,
        geminiFillStatus,
        geminiFillProgress,
        geminiDivisionStatus,
        geminiDivisionError,
        geminiScriptStatus,
        geminiScriptMode,
        geminiScriptError,
        fullAutoPipeline,
        githubTopEnrich,
        githubTopRepos,
        startingFullAuto,
        cancellingFullAuto,
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
        omnivoiceVoice,
        omnivoiceVoiceMode,
        omnivoiceVoiceDesign,
        omnivoiceSpeed,
        omnivoiceVoiceCatalog,
        omnivoiceVoiceDesignTokens,
        playingVoiceUrl,
        previewingVoiceDesign,
        stopVoicePreview,
        marketingPostId,
        agentSourceContent,
        setAgentSourceContent,
        savedAgentSourceContent,
        agentAdditionalInfo,
        setAgentAdditionalInfo,
        savedAgentAdditionalInfo,
        agentGithubRepo,
        setAgentGithubRepo,
        savedAgentGithubRepo,
        agentSourceFormat,
        setAgentSourceFormat,
        savedAgentSourceFormat,
        agentSourceFormatCatalog,
        contentPlainText,
        savingSourceContent,
        fetchingGithubReadme,
        appMobileTitle,
        thumbnail,
        postEligible,
        socialPosted,
        renderMode,
        importHtml,
        beatMap,
        beatMapJsonDraft,
        beatHtml,
        missingBeatHtmlCount,
        beatsRenderErrorCount,
        beatRenderErrorIds,
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
        whisperStale,
        whisperError,
        whisperWords,
        whisperScriptAlign,
        ttsPhoneticDict,
        savingPhoneticDict,
        handleSavePhoneticDict,
        compareDrawerOpen,
        setCompareDrawerOpen,
        compareFocusIndex,
        setCompareFocusIndex,
        compareFilter,
        setCompareFilter,
        whisperCompareIssuesOnly,
        setWhisperCompareIssuesOnly,
        captionOverrides,
        hasCaptionOverrideChanges: hasCaptionOverrideChanges(captionOverrides),
        openWhisperCompare,
        handleWhisperChooseToken,
        saveCaptionAlignments,
        savingCaptionAlignments,
        importHtmlReady,
        bgmSegments,
        setBgmSegments,
        sfxBeatTransition,
        setSfxBeatTransition,
        handleSfxBeatTransitionChange,
        sfxHook,
        setSfxHook,
        handleSfxHookChange,
        composition,
        bgmTotalSec,
        bgmCoversVideo,
        launchingAssemble,
        captionMismatchDialogOpen,
        captionMismatchDialogMessage,
        launchingPreview,
        previewStudioUrl,
        launchingScriptRender,
        savingImportAssets,
        searchingBgm,
        bgmSearchQuery,
        setBgmSearchQuery,
        bgmSearchResults,
        visualCatalog,
        setVisualCatalog,
        readmeMedia,
        importingReadmeMediaIds,
        importingAllReadmeMedia,
        isReadmeMediaImported,
        handleImportReadmeMediaItem,
        handleImportAllReadmeMedia,
        githubImageShots,
        pastingGithubShotId,
        handlePasteGithubImageShot,
        handleUnlinkGithubImageShot,
        handleUpdateGithubImageShotDescription,
        marketingPostImages,
        handleAddVisualCatalogItem,
        handleRemoveVisualCatalogItem,
        handleUpdateVisualCatalogItem,
        isVisualCatalogDirty,
        persistVisualCatalogIfDirty,
        persistImportHtmlAssets,
        handleSearchAgentBgm,
        handleAddBgmSegment,
        handleRemoveBgmSegment,
        handleLaunchImportHtmlAssemble,
        handleLaunchImportHtmlAssembleAllowMismatch,
        handleDismissCaptionMismatchDialog,
        handleLaunchImportHtmlPreview,
        handleLaunchImportHtmlRender,
        handleLaunchImportHtmlRenderAllowMismatch,
        uploading,
        savingTtsMode,
        savingAutoFillBeatHtml,
        savingHfTheme,
        savingOmnivoiceVoice,
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
        openingBeatDivisionGemini,
        openingBeatDivisionGeminiHeadless,
        openingCreateScriptGemini,
        openingImproveScriptGemini,
        openingCreateScriptGeminiHeadless,
        openingImproveScriptGeminiHeadless,
        openingMediaSuggestGemini,
        openingGithubImageShotsGemini,
        copyingBeatHtmlPromptBeatId,
        pastingBeatHtmlBeatId,
        deletingBeatHtmlBeatId,
        deletingAllBeatHtml,
        openingBeatGeminiBeatIds,
        openingBeatGeminiHeadlessBeatIds,
        refiningBeatHtmlBeatId,
        openingAllMissingBeatGemini,
        fillingAllMissingBeatGeminiHeadless,
        fillingAllMissingBeatGeminiHeadlessProgress,
        hasScript,
        hasAudio,
        statusChip,
        chainLabel,
        loadRow,
        handleTtsAutoChange,
        handleAutoFillBeatHtmlChange,
        handleStartFullAutoPipeline,
        handleCancelFullAutoPipeline,
        handleOmnivoiceSpeedChange,
        handleHfThemeChange,
        handleOmnivoiceVoiceChange,
        handleOmnivoiceVoicePreview,
        handleOmnivoiceVoiceDesignPreview,
        handlePostEligibleChange,
        handleSocialPostedChange,
        handlePlatformToggle,
        handleCopyScript,
        handleOpenCreateScriptGemini,
        handleOpenImproveScriptGemini,
        handleEnqueueCreateScriptGeminiHeadless,
        handleEnqueueImproveScriptGeminiHeadless,
        handleOpenMediaSuggestGemini,
        handleOpenGithubImageShotsGemini,
        /** @deprecated Alias cho bundle cũ — dùng handleOpenCreateScriptGemini */
        handleCopyCreateScriptPrompt: handleOpenCreateScriptGemini,
        /** @deprecated Alias cho bundle cũ — dùng handleOpenImproveScriptGemini */
        handleCopyImproveScriptPrompt: handleOpenImproveScriptGemini,
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
        commitBeatHtmlChange,
        handleRefineBeatHtmlViaGemini,
        handleOpenBeatDivisionGemini,
        handleEnqueueBeatDivisionGeminiHeadless,
        /** @deprecated Alias cho bundle cũ — dùng handleOpenBeatDivisionGemini */
        handleCopyBeatDivisionPrompt: handleOpenBeatDivisionGemini,
        handleCopyBeatHtmlPrompt,
        handlePasteBeatHtml,
        handleDeleteBeatHtml,
        handleDeleteAllBeatHtml,
        handleOpenBeatGemini,
        handleOpenBeatGeminiHeadless,
        handleOpenAllMissingBeatGemini,
        handleFillAllMissingBeatGeminiHeadless,
        handleImportHtmlChange,
        runWhisperTranscribe,
        /** @deprecated Alias cho bundle cũ — dùng handleOpenBeatDivisionGemini */
        handleCopyChatbotPrompt: handleOpenBeatDivisionGemini,
        handleSaveScript,
        handleSaveSourceContent,
        handleFetchGithubReadme,
        handleApproveScript,
        handleRegenerateTts,
        handleRetryTts,
        handleUploadMp3,
    };
}
