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
    type DuckAiWorkspaceBeat,
    fetchImportHtmlBeatHtmlPrompt,
    generateBeatHtmlViaGeminiWeb,
    openImportHtmlBeatGeminiFillOnly,
    openImportHtmlBeatGeminiForMissingBeats,
    openImportHtmlBeatAiStudioForMissingBeats,
    openImportHtmlBeatDuckAiFillOnly,
    openImportHtmlBeatDuckAiForMissingBeats,
    openImportHtmlBeatMetaAiFillOnly,
    openImportHtmlBeatMetaAiForMissingBeats,
} from 'helpers/marketingImportHtmlWorkflow';
import {
    approveAudioScript,
    fetchImportHtmlContext,
    normalizePlatforms,
    parseApiMessage,
    regenerateAgentNarrationTts,
    retryAgentNarrationTts,
    saveAdminAudioScript,
    saveAgentVisualStyle,
    saveAgentImportHtml,
    saveAgentOmnivoiceVoice,
    saveAgentSaydiVoice,
    fetchSaydiVoiceSamples,
    DEFAULT_SAYDI_VOICE,
    saveAgentSourceContent,
    saveAgentCaptionAlignments,
    saveTtsPhoneticDict,
    fetchGithubReadme,
    extractVideoScript,
    isTikTokUrl,
    isYouTubeUrl,
    importGithubReadmeMedia,
    searchAgentBgm,
    saveAgentTtsSettings,
    saveAgentAutoFillBeatHtml,
    saveFullAutoStepToggles,
    saveBeatImageFillMode,
    saveAgentGeminiOpenBrowser,
    saveAgentGithubScreenshotHomepage,
    saveAgentIntroduceApp,
    saveAgentScriptStyle,
    saveAgentDesiredScriptDuration,
    saveAgentCapcutConfig,
    addAudioToCapcut,
    uploadAllToCapcut,
    renderWhiteboardAgentBeat,
    getWhiteboardBeatRenders,
    addBeatVideoToCapcut,
    listAudioScriptStyles,
    saveAgentShowKaraoke,
    saveAgentRenderDebug,
    saveAgentClipAspect,
    saveAgentVisualMode,
    saveAgentBeatFrequency,
    saveAgentImageTextLang,
    type AgentImageTextLang,
    normalizeAgentImageTextLang,
    saveAgentWhiteboardConfig,
    saveAgentWhiteboardBeatOverride,
    listVerifiedAvatars,
    saveAgentAvatar,
    type AvatarPipAnchor,
    enqueueGeminiWebBeatFill,
    enqueueGeminiWebBeatDivision,
    enqueueGeminiWebBeatQuickIterate,
    enqueueGeminiWebBeatRefineHtml,
    enqueueGeminiWebThumbnailFill,
    enqueueGeminiWebThumbnailIdea,
    captureAgentThumbnail,
    uploadLocalAgentVideo,
    renderWhiteboardAgentVideo,
    enqueueGeminiWebAudioScript,
    enqueueGeminiWebScriptPhonetic,
    saveAdminAudioScriptTtsReading,
    startFullAutoPipeline,
    cancelFullAutoPipeline,
    markBeatDivisionDone,
    markScriptCreateDone,
    markScriptPhoneticDone,
    requestAgentHeadlessNewChat,
    requestAgentHeadlessNewSection,
    FULL_AUTO_PIPELINE_STEP_LABELS,
    savePublishFlags,
    saveSocialCopy,
    postFacebookReels,
    postTikTok,
    resolveOmnivoiceVoicePreviewUrl,
    resolveOmnivoiceVoiceDesignPreviewUrl,
    resolveSaydiVoicePreviewUrl,
    transcribeAgentAudio,
    uploadAgentAudioMp3,
    uploadAgentBgmMp3,
    fetchBgmPromptSuggestions,
    uploadAgentVisualImage,
    type AgentRenderMode,
    type AgentVisualMode,
    type AgentWhiteboardConfig,
    type AgentWhiteboardBeatOverride,
    type WhiteboardBeatRenderEntry,
    type AudioScriptStyleItem,
    type AgentVideoContentResponse,
    type NarrationSegment,
    type AgentSourceFormatCatalogItem,
    type FullAutoPipelineSummary,
    type FullAutoStepToggleKey,
    type FullAutoStepToggles,
    type BeatImageFillMode,
    normalizeFullAutoStepToggles,
    normalizeBeatImageFillMode,
    normalizeBeatImageFillOnlyMissing,
    DEFAULT_BEAT_IMAGE_FILL_ONLY_MISSING,
    DEFAULT_BEAT_IMAGE_FILL_MODE,
    DEFAULT_FULL_AUTO_STEP_TOGGLES,
    type GithubTopEnrichSummary,
    type TopicResearchBlock,
    type RemixBlock,
    enqueueTopicResearchFetch,
    enqueueTopicResearchSynthesize,
    saveRemixTranscript,
    enqueueRemixSynthesize,
    type VisualStyleCatalogItem,
    type OmnivoiceVoiceCatalogItem,
    type OmnivoiceVoiceMode,
    type OmnivoiceVoiceDesignTokenGroup,
    type SaveOmnivoiceVoicePayload,
    type SaydiVoiceSampleItem,
    type ImportHtmlSummary,
    type ImportHtmlGeminiJobBlock,
    type ImportHtmlThumbnailBlock,
    type ThumbnailQaStatus,
    type ImportHtmlAssets,
    type ImportHtmlBgmSegment,
    type ImportHtmlVisualCatalogItem,
    type ImportHtmlGithubImageShot,
    type ImportHtmlMarketingPostImage,
    type GithubReadmeMediaItem,
    type ImportHtmlComposition,
    type AgentBgmSearchItem,
    type BgmPromptSuggestionItem,
    type WhisperWord,
    type CaptionAlignOverride,
    type TtsPhoneticDictEntry,
    type SocialAccountItem,
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
import { resolveAgentLocalVideoOpenUrl } from 'helpers/shortVideoVisualClips';
import { isCaptionSyncAssembleError } from './agentVideoImportHtmlBlockers';
import {
    beatMapToJson,
    countMissingBeatHtml,
    countMissingBeatImage,
    listMissingBeatImageIds,
    listBeatIdsWithHtml,
    listMissingBeatIds,
    listBeatRenderErrorIds,
    listBeatImageRenderErrorIds,
    isWorkingBeatDirtyVsActive,
    findBeatVersionMatchingWorking,
    parseBeatHtmlEntry,
    parseBeatImageEntry,
    parseBeatMapJson,
    parseBeatVersionsBlock,
    validateBeatMap,
    beatImagePromptToText,
    describeBeatImagePromptErrors,
    validateBeatImagePrompt,
    type BeatMap,
    type BeatHtmlEntry,
    type BeatImageEntry,
    type BeatVersionsByBeatId,
} from './agentVideoBeatMap';
import { isAgentWhiteboardMode, normalizeAgentVisualMode } from './agentVideoVisualMode';
import {
    deriveWhiteboardRenderProgress,
    type WhiteboardRenderProgress,
} from './agentVideoWhiteboardRenderProgress';
import { normalizeClipAspect, type ClipAspect } from './agentVideoClipAspect';
import { normalizeAgentBeatFrequency, type AgentBeatFrequency } from './agentVideoBeatFrequency';
import { normalizeImportHtmlForAudio } from './agentVideoCustomHtmlPreview';
import { formatDurationSec } from './agentVideoHfPromptDuration';
import { beatImageAspectSuffix, beatImageStyleSuffix, imageTextLangSuffixRule, resolveBeatVoiceContent } from './agentVideoBeatDivisionWhiteboard';
import {
    buildBeatHtmlPrompt,
    parseImportHtmlContextMessage,
    type ImportHtmlContextPayload,
} from './agentVideoImportHtmlPrompt';
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

function syncReadmeAltToVisualCatalog(
    readmeMediaItems: GithubReadmeMediaItem[],
    catalog: ImportHtmlVisualCatalogItem[],
    normalizeMediaUrlKey: (url: string) => string,
): ImportHtmlVisualCatalogItem[] {
    const altByUrl = new Map<string, string>();
    readmeMediaItems.forEach((item) => {
        const alt = String(item.alt || '').trim();
        if (!alt) {
            return;
        }
        const key = normalizeMediaUrlKey(item.resolved_url);
        if (key) {
            altByUrl.set(key, alt);
        }
    });
    if (altByUrl.size === 0) {
        return catalog;
    }
    return catalog.map((entry) => {
        const keys = [
            normalizeMediaUrlKey(String(entry.origin_url || '')),
            normalizeMediaUrlKey(String(entry.url || '')),
            normalizeMediaUrlKey(String(entry.preview_url || '')),
        ];
        for (const key of keys) {
            if (key && altByUrl.has(key)) {
                const alt = altByUrl.get(key) || '';
                return { ...entry, title: alt, caption: alt };
            }
        }
        return entry;
    });
}

function normalizeMediaUrlKey(url: string): string {
    return String(url || '').trim().toLowerCase().replace(/\?.*$/, '');
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

type BeatIterateSession = {
    beatId: string;
    note: string;
    kind: 'quick_iterate' | 'edit_html';
    /** HTML lúc bắt đầu iterate — dùng để biết HTML mới đã về chưa. */
    baselineHtml: string;
    baselineVisual: string;
    baselineUpdatedAt: string;
    /** Đã thấy job refine HTML của đúng beat này trong session (tránh tin status completed cũ). */
    seenHtmlJobForBeat: boolean;
};

type BeatIteratePollContext = {
    visualStatusRaw: string;
    htmlStatusRaw: string;
    visualActiveIds: string[];
    htmlActiveIds: string[];
    htmlProgressBeatId: string;
};

/** Pipeline refine xong khi status terminal hoặc stale processing nhưng queue đã hết job. */
function isGeminiRefinePipelineDone(statusRaw: string, activeIds: string[]): boolean {
    if (statusRaw === 'completed' || statusRaw === 'failed') {
        return true;
    }
    return (statusRaw === 'queued' || statusRaw === 'processing') && activeIds.length === 0;
}

function canFinalizeBeatIterateSession(
    session: BeatIterateSession,
    ctx: BeatIteratePollContext,
    currentHtml: string,
    currentVisual: string,
    currentUpdatedAt: string,
): boolean {
    const { visualStatusRaw, htmlStatusRaw, visualActiveIds, htmlActiveIds } = ctx;
    if (visualActiveIds.length > 0 || htmlActiveIds.length > 0) {
        return false;
    }
    // Bắt buộc đã thấy HTML job của session này — không finalize vì gemini_refine_html
    // còn status=completed từ lần chạy trước (race visual xong → html chain chưa enqueue).
    if (!session.seenHtmlJobForBeat) {
        return false;
    }
    if (htmlStatusRaw === 'none') {
        return false;
    }
    const htmlDone = isGeminiRefinePipelineDone(htmlStatusRaw, htmlActiveIds);
    if (!htmlDone) {
        return false;
    }
    if (session.kind === 'quick_iterate') {
        const visualDone = isGeminiRefinePipelineDone(visualStatusRaw, visualActiveIds);
        if (!visualDone) {
            return false;
        }
        // Quick iterate luôn fill HTML mới — chưa đổi HTML so baseline → chưa snapshot
        // (tránh lưu version với visual mới + HTML cũ giữa chain).
        if (String(currentHtml || '').trim() === String(session.baselineHtml || '').trim()) {
            return false;
        }
        return true;
    }
    // edit_html: đợi HTML đổi hoặc updated_at mới (refine có thể giữ nội dung gần giống).
    const htmlChanged = String(currentHtml || '').trim() !== String(session.baselineHtml || '').trim();
    const updatedAt = String(currentUpdatedAt || '').trim();
    const baselineUpdatedAt = String(session.baselineUpdatedAt || '').trim();
    if (htmlChanged) {
        return true;
    }
    if (updatedAt !== '' && baselineUpdatedAt !== '' && updatedAt > baselineUpdatedAt) {
        return true;
    }
    if (updatedAt !== '' && baselineUpdatedAt === '') {
        return true;
    }
    return false;
}

function markBeatIterateHtmlJobSeen(
    sessions: Record<string, BeatIterateSession>,
    htmlActiveIds: string[],
    htmlProgressBeatId: string,
    htmlStatusRaw: string,
): boolean {
    let changed = false;
    const progressId = String(htmlProgressBeatId || '').trim();
    const htmlBusy = htmlStatusRaw === 'queued' || htmlStatusRaw === 'processing';
    Object.keys(sessions).forEach((beatId) => {
        const session = sessions[beatId];
        if (!session || session.seenHtmlJobForBeat) {
            return;
        }
        if (
            htmlActiveIds.includes(beatId)
            || (htmlBusy && progressId === beatId)
        ) {
            session.seenHtmlJobForBeat = true;
            changed = true;
        }
    });
    return changed;
}

import {
    resolveHeadlessBrowserActive,
    isActiveGeminiJobStatus,
} from './agentVideoHeadlessPreview';
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

type GeminiBeatProgress = {
    current: number;
    total: number;
    beatId: string;
    succeeded: number;
    failed: string[];
    error: string;
};

function resolveGeminiBeatProgress(summary: ImportHtmlSummary | null | undefined): GeminiBeatProgress | null {
    if (!summary) {
        return null;
    }
    // Ưu tiên ảnh beat (Meta.ai) — đang chạy riêng với fill HTML.
    const activeBlocks: Array<ImportHtmlGeminiJobBlock | undefined> = [
        summary.gemini_image_fill,
        summary.gemini_refine_html,
        summary.gemini_refine_visual,
        summary.gemini_fill,
    ];
    for (let i = 0; i < activeBlocks.length; i += 1) {
        const block = activeBlocks[i];
        if (!block || !isActiveGeminiJobStatus(block.status)) {
            continue;
        }
        return {
            current: Number(block.progress?.current || 0),
            total: Number(block.progress?.total || 0),
            beatId: String(block.progress?.beat_id || ''),
            succeeded: Number(block.progress?.succeeded || 0),
            failed: toStringIdList(block.progress?.failed),
            error: String(block.error || '').trim(),
        };
    }
    const imageFill = summary.gemini_image_fill;
    if (imageFill?.progress || String(imageFill?.status || 'none') !== 'none') {
        return {
            current: Number(imageFill?.progress?.current || 0),
            total: Number(imageFill?.progress?.total || 0),
            beatId: String(imageFill?.progress?.beat_id || ''),
            succeeded: Number(imageFill?.progress?.succeeded || 0),
            failed: toStringIdList(imageFill?.progress?.failed),
            error: String(imageFill?.error || '').trim(),
        };
    }
    const fill = summary.gemini_fill;
    if (fill?.progress || String(fill?.status || 'none') !== 'none') {
        return {
            current: Number(fill?.progress?.current || 0),
            total: Number(fill?.progress?.total || 0),
            beatId: String(fill?.progress?.beat_id || ''),
            succeeded: Number(fill?.progress?.succeeded || 0),
            failed: toStringIdList(fill?.progress?.failed),
            error: String(fill?.error || '').trim(),
        };
    }
    return null;
}

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
    const [narrationSegments, setNarrationSegments] = React.useState<NarrationSegment[]>([]);
    const [agentTtsAuto, setAgentTtsAuto] = React.useState(true);
    const [agentAutoFillBeatHtml, setAgentAutoFillBeatHtml] = React.useState(false);
    const [savingAutoFillBeatHtml, setSavingAutoFillBeatHtml] = React.useState(false);
    const [fullAutoStepToggles, setFullAutoStepToggles] = React.useState<FullAutoStepToggles>(
        DEFAULT_FULL_AUTO_STEP_TOGGLES,
    );
    const [savingFullAutoStepToggles, setSavingFullAutoStepToggles] = React.useState(false);
    const [beatImageFillMode, setBeatImageFillMode] = React.useState<BeatImageFillMode>(
        DEFAULT_BEAT_IMAGE_FILL_MODE,
    );
    const [savingBeatImageFillMode, setSavingBeatImageFillMode] = React.useState(false);
    const [beatImageFillOnlyMissing, setBeatImageFillOnlyMissing] = React.useState<boolean>(
        DEFAULT_BEAT_IMAGE_FILL_ONLY_MISSING,
    );
    const [agentGeminiOpenBrowser, setAgentGeminiOpenBrowser] = React.useState(false);
    const [savingGeminiOpenBrowser, setSavingGeminiOpenBrowser] = React.useState(false);
    const [agentGithubScreenshotHomepage, setAgentGithubScreenshotHomepage] = React.useState(false);
    const [savingGithubScreenshotHomepage, setSavingGithubScreenshotHomepage] = React.useState(false);
    const [agentIntroduceApp, setAgentIntroduceApp] = React.useState(false);
    const [savingIntroduceApp, setSavingIntroduceApp] = React.useState(false);
    const [agentAudioScriptStyleId, setAgentAudioScriptStyleId] = React.useState(0);
    const [savingAudioScriptStyle, setSavingAudioScriptStyle] = React.useState(false);
    const [audioScriptStyles, setAudioScriptStyles] = React.useState<AudioScriptStyleItem[]>([]);
    const [desiredScriptDurationSec, setDesiredScriptDurationSec] = React.useState<number | null>(null);
    const [desiredScriptDurationInput, setDesiredScriptDurationInput] = React.useState('');
    const [savingDesiredScriptDuration, setSavingDesiredScriptDuration] = React.useState(false);
    const [capcutProjectName, setCapcutProjectName] = React.useState('');
    const [capcutProjectPath, setCapcutProjectPath] = React.useState('');
    const [savingCapcutConfig, setSavingCapcutConfig] = React.useState(false);
    const [addingAudioToCapcut, setAddingAudioToCapcut] = React.useState(false);
    const [uploadingAllToCapcut, setUploadingAllToCapcut] = React.useState(false);
    const [agentAvatarId, setAgentAvatarId] = React.useState(0);
    const [agentShowAvatar, setAgentShowAvatar] = React.useState(false);
    const [agentAvatarAnchor, setAgentAvatarAnchor] = React.useState<AvatarPipAnchor>('bottom_right');
    const [agentAvatarMasterUrl, setAgentAvatarMasterUrl] = React.useState('');
    const [verifiedAvatars, setVerifiedAvatars] = React.useState<Array<{ id: number; title: string; master_url: string }>>([]);
    const [savingAgentAvatar, setSavingAgentAvatar] = React.useState(false);
    const [agentShowKaraoke, setAgentShowKaraoke] = React.useState(true);
    const [savingShowKaraoke, setSavingShowKaraoke] = React.useState(false);
    const [agentRenderDebug, setAgentRenderDebug] = React.useState(false);
    const [savingRenderDebug, setSavingRenderDebug] = React.useState(false);
    const [agentClipAspect, setAgentClipAspect] = React.useState<ClipAspect>('9:16');
    const [savingClipAspect, setSavingClipAspect] = React.useState(false);
    const [agentBeatFrequency, setAgentBeatFrequency] = React.useState<AgentBeatFrequency>('free');
    const [savingBeatFrequency, setSavingBeatFrequency] = React.useState(false);
    const [agentVisualMode, setAgentVisualMode] = React.useState<AgentVisualMode>('hyperframes');
    const [agentImageTextLang, setAgentImageTextLang] = React.useState<AgentImageTextLang>('vi');
    const [savingImageTextLang, setSavingImageTextLang] = React.useState(false);
    const [agentWhiteboardConfig, setAgentWhiteboardConfig] = React.useState<AgentWhiteboardConfig>({});
    const whiteboardImageStyleSuffix = React.useMemo(
        () => beatImageStyleSuffix(
            String(agentWhiteboardConfig?.gen_style || 'hybrid'),
            agentImageTextLang,
        ),
        [agentWhiteboardConfig, agentImageTextLang],
    );
    const whiteboardImageTextLangRule = React.useMemo(
        () => imageTextLangSuffixRule(agentImageTextLang),
        [agentImageTextLang],
    );
    // Tỉ lệ ảnh theo clip aspect user chọn — tự động add vào prompt, không do bước chia beat quyết định.
    const whiteboardImageAspectSuffix = React.useMemo(
        () => beatImageAspectSuffix(agentClipAspect),
        [agentClipAspect],
    );
    const [agentWhiteboardBeatOverrides, setAgentWhiteboardBeatOverrides] = React.useState<
        Record<string, AgentWhiteboardBeatOverride>
    >({});
    const [savingWhiteboardBeatOverride, setSavingWhiteboardBeatOverride] = React.useState(false);
    const [whiteboardBeatRenders, setWhiteboardBeatRenders] = React.useState<
        Record<string, WhiteboardBeatRenderEntry>
    >({});
    const [renderingWhiteboardBeatIds, setRenderingWhiteboardBeatIds] = React.useState<string[]>([]);
    const [uploadingBeatVideoToCapcutIds, setUploadingBeatVideoToCapcutIds] = React.useState<string[]>([]);
    const [savingVisualMode, setSavingVisualMode] = React.useState(false);
    const [savingWhiteboardConfig, setSavingWhiteboardConfig] = React.useState(false);
    const [avatarDrawerOpen, setAvatarDrawerOpen] = React.useState(false);
    const [geminiFillStatus, setGeminiFillStatus] = React.useState('none');
    const [geminiRefineVisualStatus, setGeminiRefineVisualStatus] = React.useState('none');
    const [geminiRefineVisualError, setGeminiRefineVisualError] = React.useState('');
    const [geminiRefineHtmlStatus, setGeminiRefineHtmlStatus] = React.useState('none');
    const [geminiRefineHtmlError, setGeminiRefineHtmlError] = React.useState('');
    type QaIterateQueueItem = {
        beatId: string;
        note: string;
        kind: 'quick_iterate' | 'edit_html';
    };
    const [quickIterateQueue, setQuickIterateQueue] = React.useState<QaIterateQueueItem[]>([]);
    const [quickIterateActiveBeatId, setQuickIterateActiveBeatId] = React.useState<string | null>(null);
    /** Beat đã gọi API enqueue thành công — sống sót qua refresh nhờ job queue backend. */
    const quickIterateQueueRef = React.useRef<QaIterateQueueItem[]>([]);
    const quickIterateActiveBeatIdRef = React.useRef<string | null>(null);
    /** Beat đang gọi API enqueue (tránh double-click trước khi response về). */
    const quickIterateEnqueueingRef = React.useRef<Set<string>>(new Set());
    /** Label version snapshot trước iterate (nếu đã lưu) — dùng toast khi fail. */
    const quickIteratePreSnapshotLabelRef = React.useRef<Record<string, string>>({});
    /** Tránh double-fire khi completion effect xử lý fail. */
    const quickIterateFinishingRef = React.useRef(false);
    /** Session iterate đang chờ lưu version sau khi fill/refine HTML thật sự xong. */
    const beatIterateSessionRef = React.useRef<Record<string, BeatIterateSession>>({});
    /** Context poll mới nhất — finalize đọc sau khi beatHtml đã sync. */
    const beatIteratePollContextRef = React.useRef<BeatIteratePollContext | null>(null);
    const [beatIteratePollTick, setBeatIteratePollTick] = React.useState(0);
    /** Tránh lưu version trùng cho cùng một beat trong cùng session. */
    const postSnapshotInFlightRef = React.useRef<Set<string>>(new Set());
    const [geminiThumbnailFillStatus, setGeminiThumbnailFillStatus] = React.useState('none');
    const [geminiThumbnailIdeaStatus, setGeminiThumbnailIdeaStatus] = React.useState('none');
    const [thumbnailGeminiIdeaError, setThumbnailGeminiIdeaError] = React.useState('');
    const [thumbnailGeminiFillError, setThumbnailGeminiFillError] = React.useState('');
    const [thumbnailBlock, setThumbnailBlock] = React.useState<ImportHtmlThumbnailBlock | null>(null);
    const [thumbnailHtml, setThumbnailHtml] = React.useState('');
    const [thumbnailImageUrl, setThumbnailImageUrl] = React.useState('');
    const [enqueueingThumbnailIdea, setEnqueueingThumbnailIdea] = React.useState(false);
    const [enqueueingThumbnailFill, setEnqueueingThumbnailFill] = React.useState(false);
    const [capturingThumbnail, setCapturingThumbnail] = React.useState(false);
    const [savingThumbnailQa, setSavingThumbnailQa] = React.useState(false);
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
    const [headlessBrowserActive, setHeadlessBrowserActive] = React.useState(false);
    const [geminiScriptStatus, setGeminiScriptStatus] = React.useState('none');
    const [geminiScriptMode, setGeminiScriptMode] = React.useState('');
    const [geminiScriptError, setGeminiScriptError] = React.useState('');
    const [audioScriptTtsReading, setAudioScriptTtsReading] = React.useState('');
    const [geminiScriptPhoneticStatus, setGeminiScriptPhoneticStatus] = React.useState('none');
    const [geminiScriptPhoneticError, setGeminiScriptPhoneticError] = React.useState('');
    const [openingScriptPhoneticHeadless, setOpeningScriptPhoneticHeadless] = React.useState(false);
    const [savingScriptTtsReading, setSavingScriptTtsReading] = React.useState(false);
    const [fullAutoPipeline, setFullAutoPipeline] = React.useState<FullAutoPipelineSummary | null>(null);
    const [githubTopEnrich, setGithubTopEnrich] = React.useState<GithubTopEnrichSummary | null>(null);
    const [topicResearch, setTopicResearch] = React.useState<TopicResearchBlock | null>(null);
    const [topicResearchTopic, setTopicResearchTopic] = React.useState('');
    const [topicResearchUrlsText, setTopicResearchUrlsText] = React.useState('');
    const [savedTopicResearchTopic, setSavedTopicResearchTopic] = React.useState('');
    const [savedTopicResearchUrlsText, setSavedTopicResearchUrlsText] = React.useState('');
    const [fetchingTopicResearch, setFetchingTopicResearch] = React.useState(false);
    const [synthesizingTopicResearch, setSynthesizingTopicResearch] = React.useState(false);
    const [remix, setRemix] = React.useState<RemixBlock | null>(null);
    const [synthesizingRemix, setSynthesizingRemix] = React.useState(false);
    const [githubTopRepos, setGithubTopRepos] = React.useState<NonNullable<ImportHtmlAssets['github_top_repos']> | null>(null);
    const [startingFullAuto, setStartingFullAuto] = React.useState(false);
    const [cancellingFullAuto, setCancellingFullAuto] = React.useState(false);
    const [requestingHeadlessNewChat, setRequestingHeadlessNewChat] = React.useState(false);
    const [requestingHeadlessNewSection, setRequestingHeadlessNewSection] = React.useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>(DEFAULT_TTS_PLATFORMS);
    const [chatgptWebAvailable, setChatgptWebAvailable] = React.useState(true);
    const [ttsPending, setTtsPending] = React.useState(false);
    const [ttsFailed, setTtsFailed] = React.useState(false);
    const [needsTtsEnqueue, setNeedsTtsEnqueue] = React.useState(false);
    const [lastError, setLastError] = React.useState('');
    const [agentVideoStatus, setAgentVideoStatus] = React.useState('none');
    const [agentVideoUrl, setAgentVideoUrl] = React.useState('');
    const [agentVideoRenderedAt, setAgentVideoRenderedAt] = React.useState('');
    const [hasLocalFinalMp4, setHasLocalFinalMp4] = React.useState(false);
    const [localFinalMp4Url, setLocalFinalMp4Url] = React.useState('');
    const [localFinalMp4SizeBytes, setLocalFinalMp4SizeBytes] = React.useState(0);
    const [localFinalMp4ModifiedAt, setLocalFinalMp4ModifiedAt] = React.useState('');
    const [uploadingLocalAgentVideo, setUploadingLocalAgentVideo] = React.useState(false);
    const [agentTtsJobId, setAgentTtsJobId] = React.useState<number | null>(null);
    const [agentTtsStatus, setAgentTtsStatus] = React.useState('');
    const [ttsChain, setTtsChain] = React.useState<string[]>([]);
    const [workflowMode, setWorkflowMode] = React.useState('');
    const [workflowPhase, setWorkflowPhase] = React.useState('');
    const [readyForPhase2, setReadyForPhase2] = React.useState(false);
    const [hasAgentVideo, setHasAgentVideo] = React.useState(false);
    const [agentVideoSummary, setAgentVideoSummary] = React.useState<AgentVideoContentResponse['agent_video_summary']>();
    const [visualStyle, setVisualStyle] = React.useState('auto');
    const [visualStyleResolved, setVisualStyleResolved] = React.useState('');
    const [visualStyleSource, setVisualStyleSource] = React.useState('');
    const [visualStyleCatalog, setVisualStyleCatalog] = React.useState<VisualStyleCatalogItem[]>([]);
    const [omnivoiceVoice, setOmnivoiceVoice] = React.useState('minh_quân');
    const [omnivoiceVoiceMode, setOmnivoiceVoiceMode] = React.useState<OmnivoiceVoiceMode>('clone');
    const [omnivoiceVoiceDesign, setOmnivoiceVoiceDesign] = React.useState('male, middle-aged, very low pitch');
    const [omnivoiceSpeed, setOmnivoiceSpeed] = React.useState(1);
    const [omnivoiceVoiceCatalog, setOmnivoiceVoiceCatalog] = React.useState<OmnivoiceVoiceCatalogItem[]>([]);
    const [omnivoiceVoiceDesignTokens, setOmnivoiceVoiceDesignTokens] = React.useState<OmnivoiceVoiceDesignTokenGroup[]>([]);
    const [savingOmnivoiceVoice, setSavingOmnivoiceVoice] = React.useState(false);
    const [saydiVoice, setSaydiVoice] = React.useState(DEFAULT_SAYDI_VOICE);
    const [saydiSamples, setSaydiSamples] = React.useState<SaydiVoiceSampleItem[]>([]);
    const [saydiGenders, setSaydiGenders] = React.useState<string[]>([]);
    const [saydiLanguages, setSaydiLanguages] = React.useState<string[]>([]);
    const [saydiLoading, setSaydiLoading] = React.useState(false);
    const [saydiError, setSaydiError] = React.useState('');
    const [savingSaydiVoice, setSavingSaydiVoice] = React.useState(false);
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
    const [agentTiktokUrl, setAgentTiktokUrl] = React.useState('');
    const [savedAgentTiktokUrl, setSavedAgentTiktokUrl] = React.useState('');
    const [agentYoutubeUrl, setAgentYoutubeUrl] = React.useState('');
    const [savedAgentYoutubeUrl, setSavedAgentYoutubeUrl] = React.useState('');
    const [agentSourceFormat, setAgentSourceFormat] = React.useState('github_repo_review');
    const [savedAgentSourceFormat, setSavedAgentSourceFormat] = React.useState('github_repo_review');
    const [agentSourceFormatCatalog, setAgentSourceFormatCatalog] = React.useState<AgentSourceFormatCatalogItem[]>([]);
    const [contentPlainText, setContentPlainText] = React.useState('');
    const [savingSourceContent, setSavingSourceContent] = React.useState(false);
    const [fetchingGithubReadme, setFetchingGithubReadme] = React.useState(false);
    const [fetchingTiktokScript, setFetchingTiktokScript] = React.useState(false);
    const [fetchingYoutubeScript, setFetchingYoutubeScript] = React.useState(false);
    const [appMobileTitle, setAppMobileTitle] = React.useState('');
    const [thumbnail, setThumbnail] = React.useState<unknown>(null);
    const [postEligible, setPostEligible] = React.useState(false);
    const [socialPosted, setSocialPosted] = React.useState(false);
    const [socialAccounts, setSocialAccounts] = React.useState<SocialAccountItem[]>([]);
    const [socialDescription, setSocialDescription] = React.useState('');
    const [savedSocialDescription, setSavedSocialDescription] = React.useState('');
    const [socialHashtags, setSocialHashtags] = React.useState('');
    const [savedSocialHashtags, setSavedSocialHashtags] = React.useState('');
    const [thumbnailUrl, setThumbnailUrl] = React.useState('');
    const [savingSocialCopy, setSavingSocialCopy] = React.useState(false);
    const [renderMode, setRenderMode] = React.useState<AgentRenderMode>('import_html');
    const [importHtml, setImportHtml] = React.useState('');
    const [beatMap, setBeatMap] = React.useState<BeatMap | null>(null);
    const resolveBeatVoice = React.useCallback(
        (beatId: string): string => {
            const sections = beatMap && Array.isArray(beatMap.sections) ? beatMap.sections : [];
            return resolveBeatVoiceContent(sections, beatId);
        },
        [beatMap?.sections],
    );
    const [beatMapJsonDraft, setBeatMapJsonDraft] = React.useState('');
    const [beatHtml, setBeatHtml] = React.useState<Record<string, BeatHtmlEntry>>({});
    const [beatImage, setBeatImage] = React.useState<Record<string, BeatImageEntry>>({});
    const [beatVersions, setBeatVersions] = React.useState<BeatVersionsByBeatId>({});
    const [beatActiveVersionId, setBeatActiveVersionId] = React.useState<Record<string, string>>({});
    const beatVersionsRef = React.useRef<BeatVersionsByBeatId>({});
    const beatActiveVersionIdRef = React.useRef<Record<string, string>>({});
    beatVersionsRef.current = beatVersions;
    beatActiveVersionIdRef.current = beatActiveVersionId;
    const [beatMapReady, setBeatMapReady] = React.useState(false);
    const [beatsHtmlTotal, setBeatsHtmlTotal] = React.useState(0);
    const [beatsHtmlCompleted, setBeatsHtmlCompleted] = React.useState(0);
    const [beatsImageTotal, setBeatsImageTotal] = React.useState(0);
    const [beatsImageCompleted, setBeatsImageCompleted] = React.useState(0);
    const [geminiImageFillStatus, setGeminiImageFillStatus] = React.useState('none');
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
    const [whisperStatus, setWhisperStatus] = React.useState('none');
    const [whisperStale, setWhisperStale] = React.useState(false);
    const [importHtmlReady, setImportHtmlReady] = React.useState(false);
    const [bgmSegments, setBgmSegments] = React.useState<ImportHtmlBgmSegment[]>([]);
    const [sfxBeatTransition, setSfxBeatTransition] = React.useState(true);
    const [sfxHook, setSfxHook] = React.useState(false);
    const [composition, setComposition] = React.useState<ImportHtmlComposition | null>(null);
    const [bgmTotalSec, setBgmTotalSec] = React.useState(0);
    const [bgmCoversVideo, setBgmCoversVideo] = React.useState(false);
    const [bgmLoop, setBgmLoop] = React.useState(true);
    const [bgmPromptSuggestions, setBgmPromptSuggestions] = React.useState<BgmPromptSuggestionItem[]>([]);
    const [bgmPromptSuggestionsLoading, setBgmPromptSuggestionsLoading] = React.useState(false);
    const [bgmManualUploading, setBgmManualUploading] = React.useState(false);
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
    const [savingVisualStyle, setSavingVisualStyle] = React.useState(false);
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
    const [regeneratingBeatImageBeatId, setRegeneratingBeatImageBeatId] = React.useState('');
    const [openingAllMissingBeatGemini, setOpeningAllMissingBeatGemini] = React.useState(false);
    const [openingAllMissingBeatMetaAi, setOpeningAllMissingBeatMetaAi] = React.useState(false);
    const [openingAllMissingBeatAiStudio, setOpeningAllMissingBeatAiStudio] = React.useState(false);
    const [fillingAllMissingBeatGeminiHeadless, setFillingAllMissingBeatGeminiHeadless] = React.useState(false);
    const [fillingAllMissingBeatGeminiHeadlessProgress, setFillingAllMissingBeatGeminiHeadlessProgress] = React.useState<{
        current: number;
        total: number;
        beatId: string;
    } | null>(null);

    const savedScriptRef = React.useRef('');
    const savedTtsReadingRef = React.useRef('');
    const savedImportHtmlRef = React.useRef('');
    const savedBeatMapJsonRef = React.useRef('');
    /** Bản đã lưu — dùng để poll/loadRow không đè draft description/hashtags chưa Lưu. */
    const savedSocialDescriptionRef = React.useRef('');
    const savedSocialHashtagsRef = React.useRef('');
    const importHtmlSaveTimerRef = React.useRef<number | null>(null);
    const beatMapSaveTimerRef = React.useRef<number | null>(null);
    const beatHtmlSaveTimerRef = React.useRef<Record<string, number>>({});
    const beatImageSaveTimerRef = React.useRef<Record<string, number>>({});
    const visualCatalogSavedRef = React.useRef<string>('[]');
    const githubImageShotsSavedRef = React.useRef<string>('[]');
    const readmeMediaSavedRef = React.useRef<string>('[]');
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
        if (typeof summary.bgm_loop === 'boolean') {
            setBgmLoop(summary.bgm_loop);
        } else if (summary.assets && typeof summary.assets.bgm_loop === 'boolean') {
            setBgmLoop(summary.assets.bgm_loop);
        }
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
            const loadedReadmeMedia = normalizeGithubReadmeMediaList(readmeMediaRaw);
            setReadmeMedia(loadedReadmeMedia);
            readmeMediaSavedRef.current = JSON.stringify(loadedReadmeMedia);
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
        setCapcutProjectName(String(res?.capcut_project_name || '').trim());
        setCapcutProjectPath(String(res?.capcut_project_path || '').trim());
        const nextSegments = Array.isArray(res?.narration_segments)
            ? res.narration_segments
                .filter((seg): seg is NarrationSegment => Boolean(seg && String(seg.url || '').trim()))
                .map((seg, idx) => ({
                    index: Number(seg.index ?? idx),
                    text: String(seg.text || ''),
                    word_count: Number(seg.word_count || 0),
                    url: String(seg.url || '').trim(),
                    s3_key: String(seg.s3_key || '').trim(),
                    duration_sec: Number(seg.duration_sec || 0),
                    tts_engine: String(seg.tts_engine || '').trim(),
                    status: String(seg.status || 'ready').trim() || 'ready',
                }))
            : [];
        setNarrationSegments(nextSegments);
        setAgentTtsAuto(Boolean(res?.agent_tts_auto));
        setAgentAutoFillBeatHtml(Boolean(res?.agent_auto_fill_beat_html));
        setFullAutoStepToggles(normalizeFullAutoStepToggles(res?.full_auto_step_toggles));
        setBeatImageFillMode(normalizeBeatImageFillMode(res?.beat_image_fill_mode));
        setBeatImageFillOnlyMissing(normalizeBeatImageFillOnlyMissing(res?.beat_image_fill_only_missing));
        setAgentGeminiOpenBrowser(Boolean(res?.agent_gemini_open_browser));
        setAgentGithubScreenshotHomepage(Boolean(res?.agent_github_screenshot_homepage));
        setAgentIntroduceApp(Boolean(res?.agent_introduce_app));
        const styleId = Number(res?.audio_script_style_id ?? 0);
        setAgentAudioScriptStyleId(Number.isFinite(styleId) && styleId > 0 ? styleId : 0);
        const desiredRaw = res?.desired_script_duration_sec;
        const desiredNum = desiredRaw == null
            ? null
            : Number(desiredRaw);
        const desiredResolved = desiredNum != null && Number.isFinite(desiredNum) && desiredNum > 0
            ? Math.round(desiredNum)
            : null;
        setDesiredScriptDurationSec(desiredResolved);
        setDesiredScriptDurationInput(desiredResolved != null ? String(desiredResolved) : '');
        const nextAvatarId = Number(res?.agent_avatar_id || res?.agent_avatar?.avatar_id || 0);
        const resolvedId = Number.isFinite(nextAvatarId) && nextAvatarId > 0 ? nextAvatarId : 0;
        const masterFromApi = String(res?.agent_avatar?.master_url || '').trim();
        const nextAnchorRaw = String(
            res?.agent_avatar_anchor || res?.agent_avatar?.anchor || 'bottom_right',
        ).trim() as AvatarPipAnchor;
        const nextAnchor: AvatarPipAnchor = (
            ['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'] as AvatarPipAnchor[]
        ).includes(nextAnchorRaw)
            ? nextAnchorRaw
            : 'bottom_right';
        setAgentAvatarId(resolvedId);
        setAgentShowAvatar(resolvedId > 0);
        setAgentAvatarAnchor(nextAnchor);
        setAgentShowKaraoke(res?.agent_show_karaoke !== false);
        setAgentRenderDebug(Boolean(res?.agent_render_debug));
        setAgentClipAspect(normalizeClipAspect(res?.agent_clip_aspect));
        setAgentVisualMode(normalizeAgentVisualMode(res?.agent_visual_mode));
        setAgentImageTextLang(normalizeAgentImageTextLang(res?.agent_image_text_lang));
        setAgentBeatFrequency(normalizeAgentBeatFrequency(res?.agent_beat_frequency));
        setAgentWhiteboardConfig(res?.agent_whiteboard_config ?? {});
        setAgentWhiteboardBeatOverrides(
            res?.agent_whiteboard_beat_overrides && typeof res.agent_whiteboard_beat_overrides === 'object'
                ? res.agent_whiteboard_beat_overrides
                : {},
        );
        setWhiteboardBeatRenders(
            res?.whiteboard_beat_renders && typeof res.whiteboard_beat_renders === 'object'
                ? res.whiteboard_beat_renders
                : {},
        );
        if (!(resolvedId > 0)) {
            setAgentAvatarMasterUrl('');
        } else {
            setAgentAvatarMasterUrl((prev) => masterFromApi || prev);
        }
        const geminiFill = res?.import_html?.gemini_fill;
        const nextGeminiStatus = String(geminiFill?.status || 'none');
        setGeminiFillStatus(nextGeminiStatus);
        const geminiImageFill = res?.import_html?.gemini_image_fill;
        setGeminiImageFillStatus(String(geminiImageFill?.status || 'none'));
        const geminiRefineVisual = res?.import_html?.gemini_refine_visual;
        const geminiRefineHtml = res?.import_html?.gemini_refine_html;
        const visualStatusRaw = String(geminiRefineVisual?.status || 'none');
        const htmlStatusRaw = String(geminiRefineHtml?.status || 'none');
        const visualActiveRaw = geminiRefineVisual?.active_beat_ids;
        const visualActiveIds = Array.isArray(visualActiveRaw)
            ? visualActiveRaw
                .map((id: unknown) => String(id || '').trim())
                .filter(Boolean)
            : [];
        const htmlActiveRaw = geminiRefineHtml?.active_beat_ids;
        const htmlActiveIds = Array.isArray(htmlActiveRaw)
            ? htmlActiveRaw
                .map((id: unknown) => String(id || '').trim())
                .filter(Boolean)
            : [];
        // Aggregate status có thể stale processing sau khi job đã completed trên queue.
        // Tin active_beat_ids (job thật) hơn status để tránh kẹt border vàng.
        const visualStatus = (
            (visualStatusRaw === 'queued' || visualStatusRaw === 'processing')
            && visualActiveIds.length === 0
        ) ? 'completed' : visualStatusRaw;
        const htmlStatus = (
            (htmlStatusRaw === 'queued' || htmlStatusRaw === 'processing')
            && htmlActiveIds.length === 0
        ) ? 'completed' : htmlStatusRaw;
        setGeminiRefineVisualStatus(visualStatus);
        setGeminiRefineVisualError(String(geminiRefineVisual?.error || '').trim());
        setGeminiRefineHtmlStatus(htmlStatus);
        setGeminiRefineHtmlError(String(geminiRefineHtml?.error || '').trim());

        const visualBusy = visualStatus === 'queued' || visualStatus === 'processing';
        const htmlBusy = htmlStatus === 'queued' || htmlStatus === 'processing';
        const serverActiveBeatIds = Array.from(new Set([
            ...visualActiveIds,
            ...htmlActiveIds,
        ]));
        const progressBeatId = String(
            (htmlBusy ? geminiRefineHtml?.progress?.beat_id : '')
            || (visualBusy ? geminiRefineVisual?.progress?.beat_id : '')
            || '',
        ).trim();
        const activeProgressBeatId = (
            progressBeatId
            && serverActiveBeatIds.includes(progressBeatId)
        ) ? progressBeatId : '';

        const enqueueingIds = Array.from(quickIterateEnqueueingRef.current);
        const displayIds = Array.from(new Set([
            ...serverActiveBeatIds,
            ...enqueueingIds,
        ]));

        if (displayIds.length > 0) {
            const noteById: Record<string, string> = {};
            const kindById: Record<string, QaIterateQueueItem['kind']> = {};
            quickIterateQueueRef.current.forEach((item) => {
                if (item.beatId) {
                    noteById[item.beatId] = item.note || '';
                    kindById[item.beatId] = item.kind || 'quick_iterate';
                }
            });
            // Beat mới từ server: chỉ HTML busy (không visual) → edit_html; còn lại quick_iterate.
            const defaultKind: QaIterateQueueItem['kind'] = (htmlBusy && !visualBusy)
                ? 'edit_html'
                : 'quick_iterate';
            const nextQueue = displayIds.map((beatId) => ({
                beatId,
                note: noteById[beatId] || '',
                kind: kindById[beatId] || defaultKind,
            }));
            const prevKey = quickIterateQueueRef.current
                .map((item) => `${item.beatId}:${item.kind}`)
                .join('|');
            const nextKey = nextQueue
                .map((item) => `${item.beatId}:${item.kind}`)
                .join('|');
            if (prevKey !== nextKey) {
                quickIterateQueueRef.current = nextQueue;
                setQuickIterateQueue(nextQueue);
            }
            const nextActive = (activeProgressBeatId && displayIds.includes(activeProgressBeatId)
                ? activeProgressBeatId
                : '')
                || serverActiveBeatIds[0]
                || enqueueingIds[0]
                || null;
            if (nextActive !== quickIterateActiveBeatIdRef.current) {
                quickIterateActiveBeatIdRef.current = nextActive;
                setQuickIterateActiveBeatId(nextActive);
            }
        } else if (
            !quickIterateFinishingRef.current
            && (quickIterateQueueRef.current.length > 0 || quickIterateActiveBeatIdRef.current)
        ) {
            // Job xong trên server — tắt UI busy; post-snapshot chạy qua beatIterateSessionRef.
            quickIterateQueueRef.current = [];
            setQuickIterateQueue([]);
            quickIterateActiveBeatIdRef.current = null;
            setQuickIterateActiveBeatId(null);
        }
        const geminiThumbnailFill = res?.import_html?.gemini_thumbnail_fill
            ?? res?.import_html?.thumbnail?.gemini_fill;
        const nextThumbFillStatus = String(geminiThumbnailFill?.status || 'none');
        setGeminiThumbnailFillStatus(nextThumbFillStatus);
        setThumbnailGeminiFillError(String(geminiThumbnailFill?.error || '').trim());
        const geminiThumbnailIdea = res?.import_html?.gemini_thumbnail_idea
            ?? res?.import_html?.thumbnail?.gemini_idea;
        const nextThumbIdeaStatus = String(geminiThumbnailIdea?.status || 'none');
        setGeminiThumbnailIdeaStatus(nextThumbIdeaStatus);
        setThumbnailGeminiIdeaError(String(geminiThumbnailIdea?.error || '').trim());
        const nextThumbBlock = res?.import_html?.thumbnail ?? null;
        setThumbnailBlock(nextThumbBlock);
        setThumbnailHtml(String(nextThumbBlock?.html || ''));
        setThumbnailImageUrl(String(nextThumbBlock?.image_url || ''));
        const beatProgress = resolveGeminiBeatProgress(res?.import_html);
        setGeminiFillProgress(beatProgress);
        const geminiDivision = res?.import_html?.gemini_division;
        setGeminiDivisionStatus(String(geminiDivision?.status || 'none'));
        setGeminiDivisionError(String(geminiDivision?.error || '').trim());
        setGeminiScriptStatus(geminiScriptStatusNext);
        setGeminiScriptMode(String(geminiScript?.mode || '').trim());
        setGeminiScriptError(String(geminiScript?.error || '').trim());
        const serverReading = String(res?.audio_script_tts_reading || '').trim();
        savedTtsReadingRef.current = serverReading;
        const geminiPhonetic = res?.gemini_script_phonetic;
        const phoneticStatusNext = String(geminiPhonetic?.status || 'none');
        setHeadlessBrowserActive(resolveHeadlessBrowserActive(res?.import_html, {
            geminiScriptStatus: geminiScriptStatusNext,
            geminiScriptPhoneticStatus: phoneticStatusNext,
            geminiImageFillStatus: String(geminiImageFill?.status || 'none'),
            pipelineHeadlessActive: Boolean(res?.full_auto_pipeline?.headless_browser_active),
        }));
        setAudioScriptTtsReading(serverReading);
        setGeminiScriptPhoneticStatus(phoneticStatusNext);
        setGeminiScriptPhoneticError(String(geminiPhonetic?.error || '').trim());
        setTtsPending(Boolean(res?.tts_pending ?? res?.agent_workflow?.tts_pending));
        setTtsFailed(Boolean(res?.tts_failed ?? res?.agent_workflow?.tts_failed));
        setNeedsTtsEnqueue(Boolean(res?.needs_tts_enqueue));
        setLastError(String(res?.last_error || '').trim());
        setSelectedPlatforms(normalizePlatforms(res?.agent_tts_platforms));
        setChatgptWebAvailable(Boolean(res?.tts_providers?.chatgpt_web));
        const dur = Number(res?.audio_file_duration_sec || 0);
        setAudioDurationSec(dur > 0 ? dur : null);
        setAgentVideoStatus(String(res?.agent_video_status || 'none'));
        setAgentVideoUrl(String(res?.agent_video_url || '').trim());
        setAgentVideoRenderedAt(String(res?.agent_video_rendered_at || '').trim());
        setHasLocalFinalMp4(Boolean(res?.has_local_final_mp4));
        setLocalFinalMp4Url(String(res?.local_final_mp4_url || '').trim());
        setLocalFinalMp4SizeBytes(Math.max(0, Number(res?.local_final_mp4_size_bytes || 0)));
        setLocalFinalMp4ModifiedAt(String(res?.local_final_mp4_modified_at || '').trim());
        setAgentTtsJobId(res?.agent_tts_job_id ?? null);
        setAgentTtsStatus(String(res?.agent_tts_status || '').trim());
        setTtsChain(Array.isArray(res?.tts_chain) ? res.tts_chain : []);
        setWorkflowMode(String(res?.workflow_mode || '').trim());
        setWorkflowPhase(String(res?.agent_workflow?.phase || '').trim());
        setReadyForPhase2(Boolean(res?.agent_workflow?.ready_for_phase_2));
        setHasAgentVideo(Boolean(res?.agent_workflow?.has_agent_video) || String(res?.agent_video_url || '').trim() !== '');
        setAgentVideoSummary(res?.agent_video_summary);
        setVisualStyle(String(res?.visual_style || res?.hf_theme || 'auto').trim() || 'auto');
        setVisualStyleResolved(String(res?.visual_style_resolved || res?.hf_theme_resolved || '').trim());
        setVisualStyleSource(String(res?.visual_style_source || res?.hf_theme_source || '').trim());
        setVisualStyleCatalog(
            Array.isArray(res?.visual_style_catalog)
                ? res.visual_style_catalog
                : (Array.isArray(res?.hf_theme_catalog) ? res.hf_theme_catalog : []),
        );
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
        setSaydiVoice(String(res?.agent_saydi_voice || DEFAULT_SAYDI_VOICE).trim() || DEFAULT_SAYDI_VOICE);
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
        const nextTiktok = String(res?.agent_tiktok_url || '').trim();
        setAgentTiktokUrl(nextTiktok);
        setSavedAgentTiktokUrl(nextTiktok);
        const nextYoutube = String(res?.agent_youtube_url || '').trim();
        setAgentYoutubeUrl(nextYoutube);
        setSavedAgentYoutubeUrl(nextYoutube);
        const nextFormat = String(res?.agent_source_format || 'github_repo_review').trim() || 'github_repo_review';
        setAgentSourceFormat(nextFormat);
        setSavedAgentSourceFormat(nextFormat);
        // Poll include_catalogs=0 không trả catalog — giữ state cũ, không ghi []
        if (Array.isArray(res?.agent_source_format_catalog) && res.agent_source_format_catalog.length > 0) {
            setAgentSourceFormatCatalog(res.agent_source_format_catalog);
        }
        setContentPlainText(String(res?.content_plain_text || '').trim());
        setAppMobileTitle(String(res?.app_mobile_title || '').trim());
        setThumbnail(res?.thumbnail ?? null);
        setPostEligible(Boolean(res?.post_eligible));
        setSocialPosted(Boolean(res?.social_posted));
        const nextSocialDescription = String(res?.social_description || '');
        const nextSocialHashtags = String(res?.social_hashtags || '');
        // Capture saved cũ trước khi ghi ref — updater setState có thể chạy sau khi ref đổi.
        const prevSavedSocialDescription = savedSocialDescriptionRef.current;
        const prevSavedSocialHashtags = savedSocialHashtagsRef.current;
        savedSocialDescriptionRef.current = nextSocialDescription;
        savedSocialHashtagsRef.current = nextSocialHashtags;
        setSavedSocialDescription(nextSocialDescription);
        setSavedSocialHashtags(nextSocialHashtags);
        // Giữ draft local nếu user đang sửa chưa Lưu (poll 5s / event refresh).
        setSocialDescription((prev) => (
            prev !== prevSavedSocialDescription ? prev : nextSocialDescription
        ));
        setSocialHashtags((prev) => (
            prev !== prevSavedSocialHashtags ? prev : nextSocialHashtags
        ));
        setThumbnailUrl(String(res?.thumbnail_url || '').trim());
        const nextSocialAccounts = Array.isArray(res?.social_accounts)
            ? res.social_accounts.filter((item): item is SocialAccountItem => (
                item != null
                && typeof item === 'object'
                && typeof (item as SocialAccountItem).index === 'number'
            ))
            : [];
        setSocialAccounts(nextSocialAccounts);
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
                // Giữ local chỉ khi debounce save; không ghi đè HTML server khi đang iterate.
                if (beatIterateSessionRef.current[beatId]) {
                    return;
                }
                if (prev[beatId]?.html?.trim()) {
                    nextBeatHtml[beatId] = prev[beatId];
                }
            });
            return nextBeatHtml;
        });
        setBeatImage((prev) => {
            const beatImageRaw = importSummary?.beat_image ?? {};
            const nextBeatImage: Record<string, BeatImageEntry> = {};
            Object.entries(beatImageRaw).forEach(([beatId, entry]) => {
                const parsed = parseBeatImageEntry(entry);
                if (parsed) {
                    nextBeatImage[beatId] = parsed;
                }
            });
            Object.keys(beatImageSaveTimerRef.current).forEach((beatId) => {
                if (prev[beatId]?.image_url?.trim()) {
                    nextBeatImage[beatId] = prev[beatId];
                }
            });
            return nextBeatImage;
        });
        setBeatVersions(parseBeatVersionsBlock(importSummary?.beat_versions));
        setBeatActiveVersionId(
            importSummary?.beat_active_version_id
            && typeof importSummary.beat_active_version_id === 'object'
                ? Object.fromEntries(
                    Object.entries(importSummary.beat_active_version_id)
                        .map(([beatId, versionId]) => [beatId, String(versionId || '').trim()])
                        .filter(([beatId, versionId]) => Boolean(beatId) && Boolean(versionId)),
                )
                : {},
        );
        beatVersionsRef.current = parseBeatVersionsBlock(importSummary?.beat_versions);
        beatActiveVersionIdRef.current = (
            importSummary?.beat_active_version_id
            && typeof importSummary.beat_active_version_id === 'object'
                ? Object.fromEntries(
                    Object.entries(importSummary.beat_active_version_id)
                        .map(([beatId, versionId]) => [beatId, String(versionId || '').trim()])
                        .filter(([beatId, versionId]) => Boolean(beatId) && Boolean(versionId)),
                )
                : {}
        );
        setBeatMapReady(Boolean(importSummary?.beat_map_ready));
        setBeatsHtmlTotal(Number(importSummary?.beats_html_total || 0));
        setBeatsHtmlCompleted(Number(importSummary?.beats_html_completed || 0));
        setBeatsImageTotal(Number(importSummary?.beats_image_total || 0));
        setBeatsImageCompleted(Number(importSummary?.beats_image_completed || 0));
        setActiveBeatId((prev) => prev || nextBeatMap?.sections?.[0]?.id || '');
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
            const loadedReadmeMedia = normalizeGithubReadmeMediaList(res.readme_media);
            setReadmeMedia(loadedReadmeMedia);
            readmeMediaSavedRef.current = JSON.stringify(loadedReadmeMedia);
        }
        setFullAutoPipeline(res?.full_auto_pipeline ?? null);
        setGithubTopEnrich(res?.github_top_enrich ?? null);
        const nextTopicResearch = res?.topic_research ?? null;
        setTopicResearch(nextTopicResearch);
        const nextTopic = String(nextTopicResearch?.topic || '').trim();
        const nextUrlsRaw = nextTopicResearch?.urls;
        const nextUrlsText = Array.isArray(nextUrlsRaw)
            ? nextUrlsRaw.map((u) => String(u || '').trim()).filter(Boolean).join('\n')
            : '';
        setTopicResearchTopic(nextTopic);
        setTopicResearchUrlsText(nextUrlsText);
        setSavedTopicResearchTopic(nextTopic);
        setSavedTopicResearchUrlsText(nextUrlsText);
        setRemix(res?.remix ?? null);

        if (Object.keys(beatIterateSessionRef.current).length > 0) {
            const htmlProgressBeatId = String(geminiRefineHtml?.progress?.beat_id || '').trim();
            markBeatIterateHtmlJobSeen(
                beatIterateSessionRef.current,
                htmlActiveIds,
                htmlProgressBeatId,
                htmlStatusRaw,
            );
            beatIteratePollContextRef.current = {
                visualStatusRaw,
                htmlStatusRaw,
                visualActiveIds,
                htmlActiveIds,
                htmlProgressBeatId,
            };
            setBeatIteratePollTick((tick) => tick + 1);
        }
    }, [applyImportHtmlResources, resolveScriptFromResponse]);

    const handleAudioScriptChange = React.useCallback((value: string) => {
        setAudioScript(value);
        writeAgentVideoScriptDraft(shortVideoId, value);
    }, [shortVideoId]);

    const loadRow = React.useCallback((options?: {
        syncTtsQueue?: boolean;
        syncAggregate?: boolean;
        includeCatalogs?: boolean;
    }) => {
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
                ...(options?.syncAggregate ? { sync_aggregate: 1 } : {}),
                ...(options?.includeCatalogs === false ? { include_catalogs: 0 } : {}),
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
        if (!open) {
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const res = await listVerifiedAvatars();
                if (cancelled || !res?.success) {
                    return;
                }
                const rows = Array.isArray(res.avatars) ? res.avatars : [];
                setVerifiedAvatars(
                    rows
                        .map((row) => ({
                            id: Number(row?.id || 0),
                            title: String(row?.title || '').trim() || `Avatar #${row?.id || ''}`,
                            master_url: String(row?.master_url || '').trim(),
                        }))
                        .filter((row) => row.id > 0),
                );
            } catch {
                // ignore — select vẫn dùng được với id đã lưu
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open]);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        void listAudioScriptStyles().then((res) => {
            if (!cancelled) {
                setAudioScriptStyles(res?.styles ?? []);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [open]);

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
        || geminiRefineVisualStatus === 'queued'
        || geminiRefineVisualStatus === 'processing'
        || geminiRefineHtmlStatus === 'queued'
        || geminiRefineHtmlStatus === 'processing'
        || geminiThumbnailFillStatus === 'queued'
        || geminiThumbnailFillStatus === 'processing'
        || geminiThumbnailIdeaStatus === 'queued'
        || geminiThumbnailIdeaStatus === 'processing'
        || geminiDivisionStatus === 'queued'
        || geminiDivisionStatus === 'processing'
        || geminiScriptStatus === 'queued'
        || geminiScriptStatus === 'processing'
        || geminiScriptPhoneticStatus === 'queued'
        || geminiScriptPhoneticStatus === 'processing'
        || geminiImageFillStatus === 'queued'
        || geminiImageFillStatus === 'processing'
        || headlessBrowserActive
        || fullAutoPipeline?.status === 'running'
        || Object.values(whiteboardBeatRenders).some((entry) => {
            const status = String(entry?.status || '').trim().toLowerCase();
            return status === 'queued' || status === 'processing';
        })
        || renderingWhiteboardBeatIds.length > 0
        || githubTopEnrich?.status === 'preparing'
        || topicResearch?.fetch?.status === 'preparing'
        || topicResearch?.synthesize?.status === 'preparing'
        || remix?.synthesize?.status === 'preparing';
    // Beat whiteboard đang render (queued/processing)? Mirror qua ref để poll nặng
    // (shouldPoll) đọc giá trị MỚI NHẤT không bị stale closure.
    const anyWhiteboardBeatRenderBusy = Object.values(whiteboardBeatRenders).some((entry) => {
        const status = String(entry?.status || '').trim().toLowerCase();
        return status === 'queued' || status === 'processing';
    });
    const anyWhiteboardBeatRenderBusyRef = React.useRef(false);
    anyWhiteboardBeatRenderBusyRef.current = anyWhiteboardBeatRenderBusy;

    React.useEffect(() => {
        if (!open || !shortVideoId || !shouldPoll) {
            return undefined;
        }
        const timer = window.setInterval(() => {
            // Beat whiteboard đang render → lightweight poll đảm nhiệm; bỏ qua loadRow
            // kẻo response CŨ (bắt đầu trước khi render xong, status queued) ghi đè
            // update mới của lightweight poll → UI kẹt "đang render" mãi.
            if (anyWhiteboardBeatRenderBusyRef.current) {
                return;
            }
            loadRow({ syncAggregate: true, includeCatalogs: false });
        }, 5000);
        return () => window.clearInterval(timer);
    }, [loadRow, open, shortVideoId, shouldPoll]);

    // Poll RIÊNG cho whiteboard beat render — endpoint nhẹ get-whiteboard-beat-renders,
    // set state trực tiếp (không qua applyResponse/payload nặng) → status + video beat
    // tự cập nhật ngay khi worker xong, không cần refresh trang.
    const whiteboardBeatRendersRef = React.useRef(whiteboardBeatRenders);
    whiteboardBeatRendersRef.current = whiteboardBeatRenders;
    React.useEffect(() => {
        if (!open || !shortVideoId || !anyWhiteboardBeatRenderBusy) {
            return undefined;
        }
        let cancelled = false;
        let active = false;
        let refreshedOnce = false;
        const tick = async () => {
            if (cancelled || active) {
                return;
            }
            active = true;
            try {
                const res = await getWhiteboardBeatRenders(shortVideoId);
                if (!cancelled && res?.success && res.whiteboard_beat_renders) {
                    const busyBefore = Object.values(whiteboardBeatRendersRef.current).some((entry) => {
                        const status = String(entry?.status || '').trim().toLowerCase();
                        return status === 'queued' || status === 'processing';
                    });
                    const busyAfter = Object.values(res.whiteboard_beat_renders).some((entry) => {
                        const status = String(entry?.status || '').trim().toLowerCase();
                        return status === 'queued' || status === 'processing';
                    });
                    setWhiteboardBeatRenders(res.whiteboard_beat_renders);
                    // Render xong → refresh toàn bộ row 1 lần (tương đương nút Refresh
                    // trên giao diện) để mọi phần khác (progress, video...) đồng bộ.
                    if (busyBefore && !busyAfter && !refreshedOnce) {
                        refreshedOnce = true;
                        loadRow();
                    }
                }
            } catch {
                // bỏ qua — lần poll sau sẽ thử lại
            } finally {
                active = false;
            }
        };
        const timer = window.setInterval(() => {
            void tick();
        }, 3000);
        void tick();
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [loadRow, open, shortVideoId, anyWhiteboardBeatRenderBusy]);

    const quickIterateBeatStages = React.useMemo(() => {
        const stages: Record<string, 'queued' | 'visual' | 'html'> = {};
        const visualBusy = geminiRefineVisualStatus === 'queued'
            || geminiRefineVisualStatus === 'processing';
        const htmlBusy = geminiRefineHtmlStatus === 'queued'
            || geminiRefineHtmlStatus === 'processing';
        quickIterateQueue.forEach((item) => {
            if (item.beatId) {
                stages[item.beatId] = 'queued';
            }
        });
        if (quickIterateActiveBeatId && (visualBusy || htmlBusy)) {
            if (htmlBusy) {
                stages[quickIterateActiveBeatId] = 'html';
            } else if (visualBusy) {
                stages[quickIterateActiveBeatId] = 'visual';
            }
        }
        return stages;
    }, [
        geminiRefineHtmlStatus,
        geminiRefineVisualStatus,
        quickIterateActiveBeatId,
        quickIterateQueue,
    ]);

    const hasScript = audioScript.length > 0;
    const scriptDirty = hasScript && audioScript !== savedScriptRef.current;
    const ttsReadingDirty = audioScriptTtsReading !== savedTtsReadingRef.current;
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
        const normalized: BeatMap = {
            ...nextBeatMap,
            sections: nextBeatMap.sections.map((section) => ({
                ...section,
                background: String(section.background || '').trim(),
                visual_description: String(section.visual_description || '').trim(),
            })),
        };
        const json = beatMapToJson(normalized);
        const validIds = new Set(normalized.sections.map((section) => section.id));

        setBeatMap(normalized);
        setBeatMapJsonDraft(json);
        setBeatMapReady(normalized.sections.length > 0);
        setBeatsHtmlTotal(normalized.sections.length);
        setBeatHtml((prev) => Object.fromEntries(
            Object.entries(prev).filter(([beatId]) => validIds.has(beatId)),
        ));
        setBeatsHtmlCompleted(normalized.sections.filter(
            (section) => String(beatHtml[section.id]?.html || '').trim() !== '',
        ).length);
        setActiveBeatId((prev) => (prev && validIds.has(prev) ? prev : normalized.sections[0]?.id || ''));
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
                introduceApp: agentIntroduceApp,
                sourceFormat: agentSourceFormat,
                agentBeatFrequency,
                isWhiteboard: isWhiteboardMode,
                desiredScriptDurationSec,
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

    const handleEnqueueScriptPhoneticHeadless = async () => {
        if (!shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
            return;
        }
        if (!hasScript || !audioScript.trim()) {
            showMessage('Chưa có audio script', 'warning');
            return;
        }
        if (
            openingScriptPhoneticHeadless
            || geminiScriptPhoneticStatus === 'queued'
            || geminiScriptPhoneticStatus === 'processing'
        ) {
            return;
        }
        setOpeningScriptPhoneticHeadless(true);
        try {
            const res = await enqueueGeminiWebScriptPhonetic(shortVideoId, true);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Enqueue chuẩn hóa giọng đọc thất bại',
                    'error',
                );
                return;
            }
            if (res.gemini_script_phonetic) {
                setGeminiScriptPhoneticStatus(String(res.gemini_script_phonetic.status || 'queued'));
                setGeminiScriptPhoneticError(String(res.gemini_script_phonetic.error || '').trim());
            } else {
                setGeminiScriptPhoneticStatus('queued');
                setGeminiScriptPhoneticError('');
            }
            showMessage(
                parseApiMessage(res?.message)
                    || 'Đã đưa chuẩn hóa giọng đọc vào queue Gemini',
                'success',
            );
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningScriptPhoneticHeadless(false);
        }
    };

    const handleSaveScriptTtsReading = async () => {
        setSavingScriptTtsReading(true);
        try {
            const json = await saveAdminAudioScriptTtsReading(shortVideoId, audioScriptTtsReading);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không lưu được bản đọc TTS', 'error');
                return;
            }
            savedTtsReadingRef.current = audioScriptTtsReading.trim();
            if (json?.audio_reset) {
                setAudioFileUrl('');
                setAudioDurationSec(null);
                setNarrationSegments([]);
                setTtsPending(false);
                setTtsFailed(false);
                setScriptApproved(false);
            }
            showMessage(parseApiMessage(json?.message) || 'Đã lưu bản đọc TTS', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingScriptTtsReading(false);
        }
    };

    const handleManualScriptPhoneticSave = React.useCallback(async (text: string): Promise<boolean> => {
        const trimmed = String(text || '').trim();
        if (!trimmed) {
            showMessage('Bản đọc TTS trống', 'warning');
            return false;
        }
        const json = await saveAdminAudioScriptTtsReading(shortVideoId, trimmed);
        if (!json?.success) {
            showMessage(parseApiMessage(json?.message) || 'Không lưu được bản đọc TTS', 'error');
            return false;
        }
        savedTtsReadingRef.current = trimmed;
        setAudioScriptTtsReading(trimmed);
        if (json?.audio_reset) {
            setAudioFileUrl('');
            setAudioDurationSec(null);
            setNarrationSegments([]);
            setTtsPending(false);
            setTtsFailed(false);
            setScriptApproved(false);
        }
        try {
            const done = await markScriptPhoneticDone(shortVideoId);
            if (done?.full_auto_pipeline) {
                setFullAutoPipeline(done.full_auto_pipeline);
            }
        } catch {
            // Không chặn lưu nếu mark step thất bại — bản đọc TTS đã lưu xong.
        }
        loadRow();
        showMessage(parseApiMessage(json?.message) || 'Đã lưu bản đọc TTS', 'success');
        return true;
    }, [shortVideoId, showMessage, loadRow]);

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
        setHeadlessBrowserActive(resolveHeadlessBrowserActive(summary, {
            geminiScriptStatus: geminiScriptStatus,
            geminiScriptPhoneticStatus: geminiScriptPhoneticStatus,
            geminiImageFillStatus: String(summary.gemini_image_fill?.status || 'none'),
        }));
        if (summary.gemini_fill) {
            const fill = summary.gemini_fill;
            const nextGeminiStatus = String(fill.status || 'none');
            setGeminiFillStatus(nextGeminiStatus);
        }
        if (summary.gemini_image_fill) {
            setGeminiImageFillStatus(String(summary.gemini_image_fill.status || 'none'));
        }
        if (summary.gemini_refine_visual) {
            const block = summary.gemini_refine_visual;
            const raw = String(block.status || 'none');
            const activeIds = Array.isArray(block.active_beat_ids)
                ? block.active_beat_ids.map((id) => String(id || '').trim()).filter(Boolean)
                : [];
            const next = (
                (raw === 'queued' || raw === 'processing') && activeIds.length === 0
            ) ? 'completed' : raw;
            setGeminiRefineVisualStatus(next);
            setGeminiRefineVisualError(String(block.error || '').trim());
        }
        if (summary.gemini_refine_html) {
            const block = summary.gemini_refine_html;
            const raw = String(block.status || 'none');
            const activeIds = Array.isArray(block.active_beat_ids)
                ? block.active_beat_ids.map((id) => String(id || '').trim()).filter(Boolean)
                : [];
            const next = (
                (raw === 'queued' || raw === 'processing') && activeIds.length === 0
            ) ? 'completed' : raw;
            setGeminiRefineHtmlStatus(next);
            setGeminiRefineHtmlError(String(block.error || '').trim());
        }
        const thumbFill = summary.gemini_thumbnail_fill ?? summary.thumbnail?.gemini_fill;
        if (thumbFill) {
            setGeminiThumbnailFillStatus(String(thumbFill.status || 'none'));
            setThumbnailGeminiFillError(String(thumbFill.error || '').trim());
        }
        const thumbIdeaJob = summary.gemini_thumbnail_idea ?? summary.thumbnail?.gemini_idea;
        if (thumbIdeaJob) {
            setGeminiThumbnailIdeaStatus(String(thumbIdeaJob.status || 'none'));
            setThumbnailGeminiIdeaError(String(thumbIdeaJob.error || '').trim());
        }
        if (summary.thumbnail) {
            setThumbnailBlock(summary.thumbnail);
            setThumbnailHtml(String(summary.thumbnail.html || ''));
            setThumbnailImageUrl(String(summary.thumbnail.image_url || ''));
        }
        setGeminiFillProgress(resolveGeminiBeatProgress(summary));
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
                    // Giữ local chỉ khi debounce save; không ghi đè HTML server khi đang iterate.
                    if (beatIterateSessionRef.current[beatId]) {
                        return;
                    }
                    if (prev[beatId]?.html?.trim()) {
                        nextBeatHtml[beatId] = prev[beatId];
                    }
                });
                return nextBeatHtml;
            });
        }
        if (summary.beat_image) {
            setBeatImage((prev) => {
                const nextBeatImage: Record<string, BeatImageEntry> = {};
                Object.entries(summary.beat_image ?? {}).forEach(([beatId, entry]) => {
                    const parsed = parseBeatImageEntry(entry);
                    if (parsed) {
                        nextBeatImage[beatId] = parsed;
                    }
                });
                Object.keys(beatImageSaveTimerRef.current).forEach((beatId) => {
                    if (prev[beatId]?.image_url?.trim()) {
                        nextBeatImage[beatId] = prev[beatId];
                    }
                });
                return nextBeatImage;
            });
        }
        if (summary.beat_versions !== undefined) {
            setBeatVersions(parseBeatVersionsBlock(summary.beat_versions));
        }
        if (summary.beat_active_version_id !== undefined) {
            setBeatActiveVersionId(
                summary.beat_active_version_id
                && typeof summary.beat_active_version_id === 'object'
                    ? Object.fromEntries(
                        Object.entries(summary.beat_active_version_id)
                            .map(([beatId, versionId]) => [beatId, String(versionId || '').trim()])
                            .filter(([beatId, versionId]) => Boolean(beatId) && Boolean(versionId)),
                    )
                    : {},
            );
        }
        setBeatsHtmlTotal(Number(summary.beats_html_total || summary.beat_map?.sections?.length || 0));
        setBeatsHtmlCompleted(Number(summary.beats_html_completed || 0));
        setBeatsImageTotal(Number(summary.beats_image_total || summary.beat_map?.sections?.length || 0));
        setBeatsImageCompleted(Number(summary.beats_image_completed || 0));
        applyImportHtmlResources(summary);
    }, [applyBeatMapDraft, applyImportHtmlResources]);

    const persistImportHtml = React.useCallback(async (payload: {
        renderMode?: AgentRenderMode;
        html?: string;
        beatMap?: BeatMap;
        beatId?: string;
        beatHtml?: string;
        beatImageUrl?: string;
        beatImagePrompt?: string;
        creativePrompt?: string;
        qaStatus?: import('./agentVideoBeatMap').BeatQaStatus;
        qaRefineNote?: string;
        thumbnailHtml?: string;
        thumbnailQaStatus?: ThumbnailQaStatus;
        thumbnailQaNote?: string;
        thumbnailApproved?: boolean;
    }) => {
        setSavingImportHtml(true);
        try {
            const res = await saveAgentImportHtml(shortVideoId, {
                renderMode: payload.renderMode,
                html: payload.html,
                beatMap: payload.beatMap,
                beatId: payload.beatId,
                beatHtml: payload.beatHtml,
                beatImageUrl: payload.beatImageUrl,
                beatImagePrompt: payload.beatImagePrompt,
                creativePrompt: payload.creativePrompt,
                qaStatus: payload.qaStatus,
                qaRefineNote: payload.qaRefineNote,
                thumbnailHtml: payload.thumbnailHtml,
                thumbnailQaStatus: payload.thumbnailQaStatus,
                thumbnailQaNote: payload.thumbnailQaNote,
                thumbnailApproved: payload.thumbnailApproved,
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
                const pendingHtmlTimer = beatHtmlSaveTimerRef.current[payload.beatId];
                if (pendingHtmlTimer != null) {
                    window.clearTimeout(pendingHtmlTimer);
                    delete beatHtmlSaveTimerRef.current[payload.beatId];
                }
                const pendingImageTimer = beatImageSaveTimerRef.current[payload.beatId];
                if (pendingImageTimer != null) {
                    window.clearTimeout(pendingImageTimer);
                    delete beatImageSaveTimerRef.current[payload.beatId];
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
        bgmLoop?: boolean;
        sfxBeatTransition?: boolean;
        sfxHook?: boolean;
        visualCatalog?: ImportHtmlVisualCatalogItem[];
        githubImageShots?: ImportHtmlGithubImageShot[];
        readmeMedia?: GithubReadmeMediaItem[];
        silent?: boolean;
    }) => {
        const nextBgm = options?.bgmSegments ?? bgmSegments;
        const nextBgmLoop = options?.bgmLoop ?? bgmLoop;
        const nextSfxBeat = options?.sfxBeatTransition ?? sfxBeatTransition;
        const nextSfxHook = options?.sfxHook ?? sfxHook;
        const nextVisual = options?.visualCatalog ?? visualCatalog;
        const nextGithubShots = options?.githubImageShots ?? githubImageShots;
        const nextReadmeMedia = options?.readmeMedia ?? readmeMedia;
        const silent = Boolean(options?.silent);

        setSavingImportAssets(true);
        try {
            const res = await saveAgentImportHtml(shortVideoId, {
                bgmSegments: nextBgm,
                bgmLoop: nextBgmLoop,
                sfxBeatTransition: nextSfxBeat,
                sfxHook: nextSfxHook,
                visualCatalog: nextVisual,
                githubImageShots: nextGithubShots,
                readmeMedia: nextReadmeMedia,
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
            const savedReadmeRaw = res.import_html?.assets?.readme_media;
            const savedReadmeMedia = Array.isArray(savedReadmeRaw)
                ? normalizeGithubReadmeMediaList(savedReadmeRaw)
                : nextReadmeMedia;
            setReadmeMedia(savedReadmeMedia);
            readmeMediaSavedRef.current = JSON.stringify(savedReadmeMedia);
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
    }, [applyImportHtmlSummary, bgmSegments, bgmLoop, githubImageShots, readmeMedia, sfxBeatTransition, sfxHook, visualCatalog, shortVideoId, showMessage]);

    const handleReadmeMediaAltChange = React.useCallback((itemId: string, alt: string) => {
        setReadmeMedia((prev) => prev.map((item) => (
            item.id === itemId ? { ...item, alt } : item
        )));
    }, []);

    const handleReadmeMediaAltBlur = React.useCallback(async (itemId: string, alt: string) => {
        const trimmedAlt = alt.trim();
        const nextReadmeMedia = readmeMedia.map((entry) => (
            entry.id === itemId ? { ...entry, alt: trimmedAlt } : entry
        ));
        setReadmeMedia(nextReadmeMedia);
        const isReadmeMediaDirty = JSON.stringify(nextReadmeMedia) !== readmeMediaSavedRef.current;
        const syncedCatalog = syncReadmeAltToVisualCatalog(
            nextReadmeMedia,
            visualCatalog,
            normalizeMediaUrlKey,
        );
        const isCatalogDirtyFromAlt = JSON.stringify(syncedCatalog) !== JSON.stringify(visualCatalog);
        if (!isReadmeMediaDirty && !isCatalogDirtyFromAlt) {
            return;
        }
        if (isCatalogDirtyFromAlt) {
            setVisualCatalog(syncedCatalog);
        }
        const ok = await persistImportHtmlAssets({
            readmeMedia: nextReadmeMedia,
            visualCatalog: syncedCatalog,
            silent: true,
        });
        if (!ok) {
            return;
        }
        setReadmeMedia(nextReadmeMedia);
    }, [persistImportHtmlAssets, readmeMedia, visualCatalog]);

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

    /** Đổi volume riêng của 1 bài BGM (state local — persist khi thả slider). */
    const handleUpdateBgmSegmentVolume = React.useCallback((index: number, volume: number) => {
        const clamped = Math.min(1.5, Math.max(0.05, Number(volume) || 0.6));
        setBgmSegments((prev) => prev.map((seg, i) => (
            i === index ? { ...seg, volume: clamped } : seg
        )));
    }, []);

    /** Kéo-thả sắp xếp lại thứ tự phát BGM. */
    const handleReorderBgmSegments = React.useCallback(async (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
            return;
        }
        let nextSegments: ImportHtmlBgmSegment[] | null = null;
        setBgmSegments((prev) => {
            if (fromIndex >= prev.length || toIndex >= prev.length) {
                return prev;
            }
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            if (!moved) {
                return prev;
            }
            next.splice(toIndex, 0, moved);
            nextSegments = next;
            return next;
        });
        if (nextSegments) {
            await persistImportHtmlAssets({ bgmSegments: nextSegments, silent: true });
        }
    }, [persistImportHtmlAssets]);

    const handleFetchBgmPromptSuggestions = React.useCallback(async () => {
        if (!shortVideoId) {
            return;
        }
        setBgmPromptSuggestionsLoading(true);
        try {
            const res = await fetchBgmPromptSuggestions(shortVideoId);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không tạo được gợi ý prompt BGM', 'error');
                setBgmPromptSuggestions([]);
                return;
            }
            const items = Array.isArray(res.suggestions) ? res.suggestions : [];
            setBgmPromptSuggestions(items.filter((item) => item?.prompt && item?.id));
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            setBgmPromptSuggestions([]);
        } finally {
            setBgmPromptSuggestionsLoading(false);
        }
    }, [shortVideoId, showMessage]);

    const handleUploadBgmMp3 = React.useCallback(async (files: File[]) => {
        if (!shortVideoId || !Array.isArray(files) || files.length === 0) {
            return;
        }
        const mp3Files = files.filter((file) => /\.mp3$/i.test(String(file.name || '')));
        if (mp3Files.length === 0) {
            showMessage('Chỉ chấp nhận file MP3', 'warning');
            return;
        }

        setBgmManualUploading(true);
        try {
            const uploaded: ImportHtmlBgmSegment[] = [];
            for (const file of mp3Files) {
                const res = await uploadAgentBgmMp3(shortVideoId, file);
                if (!res?.success || !res.url) {
                    showMessage(
                        parseApiMessage(res?.message) || `Upload ${file.name} thất bại`,
                        'error',
                    );
                    continue;
                }
                uploaded.push({
                    id: String(res.s3_key || `bgm-upload-${Date.now()}-${uploaded.length + 1}`),
                    title: String(res.title || file.name || 'BGM'),
                    download_url: String(res.url),
                    preview_url: String(res.url),
                    duration_sec: Number(res.duration_sec || 0),
                    provider: 'user_upload',
                });
            }

            if (uploaded.length === 0) {
                return;
            }

            const merged = [...bgmSegments, ...uploaded];
            setBgmSegments(merged);
            const saved = await persistImportHtmlAssets({ bgmSegments: merged, silent: true });
            if (saved) {
                showMessage(`Đã thêm ${uploaded.length} file audio nền`, 'success');
            }
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setBgmManualUploading(false);
        }
    }, [bgmSegments, persistImportHtmlAssets, shortVideoId, showMessage]);

    const handleBgmLoopChange = React.useCallback(async (checked: boolean) => {
        setBgmLoop(checked);
        await persistImportHtmlAssets({ bgmLoop: checked, silent: true });
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
            if (isAgentWhiteboardMode(agentVisualMode)) {
                const res = await renderWhiteboardAgentVideo(shortVideoId, true);
                if (!res?.success) {
                    showMessage(parseApiMessage(res?.message) || 'Render ảnh beat thất bại', 'error');
                    loadRow();
                    return;
                }
                if (res.queued) {
                    showMessage(parseApiMessage(res?.message) || 'Đã enqueue render ảnh beat — chờ job xong rồi bấm Render lại', 'info');
                    if (res.full_auto_pipeline) {
                        setFullAutoPipeline(res.full_auto_pipeline);
                    }
                    loadRow();
                    return;
                }
                showMessage(parseApiMessage(res?.message) || 'Đã ghép video ảnh beat + audio thành final.mp4', 'success');
                if (res.has_local_final_mp4 !== undefined) {
                    setHasLocalFinalMp4(Boolean(res.has_local_final_mp4));
                }
                if (res.local_final_mp4_url) {
                    setLocalFinalMp4Url(String(res.local_final_mp4_url).trim());
                }
                if (res.full_auto_pipeline) {
                    setFullAutoPipeline(res.full_auto_pipeline);
                }
                loadRow();
                return;
            }
            const result = await launchImportHtmlRender(shortVideoId, {
                limitBeats: agentRenderDebug ? 3 : 0,
            });
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
                limitBeats: agentRenderDebug ? 3 : 0,
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

    const localFinalMp4OpenUrl = React.useMemo(() => {
        if (!hasLocalFinalMp4) {
            return '';
        }
        const resolved = resolveAgentLocalVideoOpenUrl(localFinalMp4Url);
        if (!resolved) {
            return '';
        }
        // Cache-bust: mtime của final.mp4 → URL đổi khi render lại → <video> re-fetch.
        const stamp = String(localFinalMp4ModifiedAt || '').trim()
            || String(agentVideoRenderedAt || '').trim();
        if (!stamp) {
            return resolved;
        }
        const sep = resolved.includes('?') ? '&' : '?';
        return `${resolved}${sep}v=${encodeURIComponent(stamp)}`;
    }, [hasLocalFinalMp4, localFinalMp4Url, localFinalMp4ModifiedAt, agentVideoRenderedAt]);

    const handleUploadLocalAgentVideo = async () => {
        if (!hasLocalFinalMp4) {
            showMessage('Chưa có file final.mp4 local', 'error');
            return;
        }
        setUploadingLocalAgentVideo(true);
        try {
            const res = await uploadLocalAgentVideo(shortVideoId);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Upload video local thất bại', 'error');
                return;
            }
            showMessage(parseApiMessage(res?.message) || 'Đã upload video lên store', 'success');
            if (res.agent_video_url) {
                setAgentVideoUrl(String(res.agent_video_url).trim());
            }
            if (res.agent_video_status) {
                setAgentVideoStatus(String(res.agent_video_status));
            }
            if (res.agent_video_rendered_at) {
                setAgentVideoRenderedAt(String(res.agent_video_rendered_at).trim());
            }
            if (res.has_local_final_mp4 !== undefined) {
                setHasLocalFinalMp4(Boolean(res.has_local_final_mp4));
            }
            if (res.local_final_mp4_url) {
                setLocalFinalMp4Url(String(res.local_final_mp4_url).trim());
            }
            if (res.local_final_mp4_size_bytes !== undefined) {
                setLocalFinalMp4SizeBytes(Math.max(0, Number(res.local_final_mp4_size_bytes || 0)));
            }
            if (res.local_final_mp4_modified_at) {
                setLocalFinalMp4ModifiedAt(String(res.local_final_mp4_modified_at).trim());
            }
            if (res.full_auto_pipeline) {
                setFullAutoPipeline(res.full_auto_pipeline);
            }
            setHasAgentVideo(Boolean(res.agent_video_url) || agentVideoUrl.trim() !== '');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setUploadingLocalAgentVideo(false);
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

    const handleBeatMapJsonChange = (value: string) => {
        setBeatMapJsonDraft(value);
        if (beatMapSaveTimerRef.current != null) {
            window.clearTimeout(beatMapSaveTimerRef.current);
        }

        const parsed = parseBeatMapJson(value);
        if (parsed.map) {
            const relaxDurationBounds = ['github_top', 'github_top_daily', 'github_top_weekly', 'github_top_monthly'].includes(
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
                const relaxDurationBounds = ['github_top', 'github_top_daily', 'github_top_weekly', 'github_top_monthly'].includes(
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

    const handleManualBeatDivisionSave = React.useCallback(async (
        map: BeatMap,
        options?: { limitBeats?: number },
    ): Promise<boolean> => {
        const limitBeats = Math.max(0, Number(options?.limitBeats) || 0);
        setRenderMode('import_html');
        if (limitBeats > 0) {
            // Chế độ test: chỉ cập nhật N beat đầu của beat map hiện tại, giữ nguyên các beat còn lại.
            const currentSections = beatMap && Array.isArray(beatMap.sections) ? beatMap.sections : [];
            const newSections = Array.isArray(map.sections) ? map.sections : [];
            const take = Math.min(limitBeats, newSections.length);
            if (currentSections.length === 0) {
                showMessage(
                    'Chưa có beat map hiện tại để cập nhật test — hãy chia đầy đủ lần đầu (Tất cả beat) trước.',
                    'warning',
                );
                return false;
            }
            const newHead = newSections.slice(0, take).map((section, index) => ({
                ...section,
                id: currentSections[index]?.id || section.id || `beat_${index + 1}`,
                beat_id: currentSections[index]?.beat_id || section.beat_id || section.id || `beat_${index + 1}`,
            }));
            const oldTail = currentSections.slice(take);
            const oldHeadEnd = currentSections.length > take
                ? Number(currentSections[take - 1]?.endSec || 0)
                : 0;
            const newHeadEnd = Number(newHead[newHead.length - 1]?.endSec || 0);
            // Dịch chuyển các beat còn lại để liên tục ngay sau beat mới (giữ duration cũ).
            const delta = oldHeadEnd - newHeadEnd;
            const shiftedTail = oldTail.map((section) => ({
                ...section,
                startSec: Math.round((Number(section.startSec || 0) - delta) * 100) / 100,
                endSec: Math.round((Number(section.endSec || 0) - delta) * 100) / 100,
                durationSec: Number(section.durationSec || (
                    Number(section.endSec || 0) - Number(section.startSec || 0)
                )),
            }));
            const merged: BeatMap = {
                ...beatMap,
                schema_version: 2,
                totalVideoSec: Number(beatMap?.totalVideoSec ?? map.totalVideoSec ?? 0),
                sections: [
                    ...newHead,
                    ...shiftedTail,
                ],
            };
            applyBeatMapDraft(merged);
            const saved = await persistImportHtml({ renderMode: 'import_html', beatMap: merged });
            if (saved) {
                showMessage(
                    `Đã cập nhật ${take} beat đầu (test) — các beat còn lại giữ nguyên nội dung, được dịch thời gian cho liên tục. Không đánh dấu bước chia xong.`,
                    'success',
                );
            }
            return saved;
        }
        applyBeatMapDraft(map);
        const saved = await persistImportHtml({ renderMode: 'import_html', beatMap: map });
        if (saved) {
            try {
                const res = await markBeatDivisionDone(shortVideoId);
                if (res.full_auto_pipeline) {
                    setFullAutoPipeline(res.full_auto_pipeline);
                }
            } catch {
                // Không chặn lưu nếu mark step thất bại — beat map đã lưu xong.
            }
        }
        return saved;
    }, [applyBeatMapDraft, beatMap, persistImportHtml, shortVideoId, showMessage]);

    const handleManualScriptCreateSave = React.useCallback(async (text: string): Promise<boolean> => {
        const trimmed = String(text || '').trim();
        if (!trimmed) {
            showMessage('Script trống', 'warning');
            return false;
        }
        const json = await saveAdminAudioScript(shortVideoId, trimmed);
        if (!json?.success) {
            showMessage(parseApiMessage(json?.message) || 'Không lưu được script', 'error');
            return false;
        }
        setScriptApproved(Boolean(json?.audio_script_approved) === true);
        savedScriptRef.current = trimmed;
        setAudioScript(trimmed);
        clearAgentVideoScriptDraft(shortVideoId);
        if (json?.audio_reset) {
            setAudioFileUrl('');
            setAudioDurationSec(null);
            setNarrationSegments([]);
            setTtsPending(false);
            setTtsFailed(false);
        }
        try {
            const res = await markScriptCreateDone(shortVideoId);
            if (res?.full_auto_pipeline) {
                setFullAutoPipeline(res.full_auto_pipeline);
            }
        } catch {
            // Không chặn lưu nếu mark step thất bại — script đã lưu xong.
        }
        loadRow();
        showMessage(parseApiMessage(json?.message) || 'Đã lưu script', 'success');
        return true;
    }, [
        clearAgentVideoScriptDraft,
        loadRow,
        setAudioDurationSec,
        setAudioFileUrl,
        setAudioScript,
        setFullAutoPipeline,
        setNarrationSegments,
        setScriptApproved,
        setTtsFailed,
        setTtsPending,
        shortVideoId,
        showMessage,
    ]);

    const handleBeatVisualDescriptionChange = React.useCallback(async (
        beatId: string,
        visualDescription: string,
        background?: string,
    ): Promise<boolean> => {
        if (!beatMap) {
            return false;
        }
        const nextMap: BeatMap = {
            ...beatMap,
            sections: beatMap.sections.map((section) => (
                section.id === beatId
                    ? {
                        ...section,
                        visual_description: visualDescription.trim(),
                        background: background !== undefined
                            ? background.trim()
                            : String(section.background || '').trim(),
                    }
                    : section
            )),
        };
        const parsed = parseBeatMapJson(beatMapToJson(nextMap), {
            requireImagePrompt: isAgentWhiteboardMode(agentVisualMode),
        });
        if (!parsed.map) {
            showMessage(parsed.errors.join('; '), 'warning');
            return false;
        }
        const saved = await persistImportHtml({ beatMap: parsed.map });
        if (saved) {
            applyBeatMapDraft(parsed.map);
        }
        return saved;
    }, [applyBeatMapDraft, beatMap, persistImportHtml, showMessage]);

    const handleBeatImagePromptChange = React.useCallback(async (
        beatId: string,
        imagePrompt: string,
        visualDescription?: string,
        background?: string,
    ): Promise<boolean> => {
        if (!beatMap) {
            return false;
        }
        const trimmedPrompt = imagePrompt.trim();
        if (!validateBeatImagePrompt(trimmedPrompt)) {
            showMessage(`image_prompt không hợp lệ — ${describeBeatImagePromptErrors(trimmedPrompt).join('; ') || 'phải là JSON đủ 6 field (subject, action, scene, text_overlay, composition, must_avoid)'}`, 'warning');
            return false;
        }
        const nextMap: BeatMap = {
            ...beatMap,
            sections: beatMap.sections.map((section) => (
                section.id === beatId
                    ? {
                        ...section,
                        image_prompt: trimmedPrompt,
                        visual_description: visualDescription !== undefined
                            ? visualDescription.trim()
                            : section.visual_description,
                        background: background !== undefined
                            ? background.trim()
                            : String(section.background || '').trim(),
                    }
                    : section
            )),
        };
        const parsed = parseBeatMapJson(beatMapToJson(nextMap), { requireImagePrompt: true });
        if (!parsed.map) {
            showMessage(parsed.errors.join('; '), 'warning');
            return false;
        }
        const saved = await persistImportHtml({
            beatMap: parsed.map,
            beatId,
            beatImagePrompt: trimmedPrompt,
        });
        if (saved) {
            applyBeatMapDraft(parsed.map);
        }
        return saved;
    }, [applyBeatMapDraft, beatMap, persistImportHtml, showMessage]);

    const commitBeatImageChange = React.useCallback(async (
        beatId: string,
        payload: {
            imagePrompt: string;
            creativePrompt?: string;
            imageUrl?: string;
        },
        options?: { immediate?: boolean },
    ): Promise<boolean> => {
        const imagePrompt = payload.imagePrompt.trim();
        const creativePrompt = payload.creativePrompt;
        const draftUpdatedAt = new Date().toISOString();
        setBeatImage((prev) => ({
            ...prev,
            [beatId]: {
                ...prev[beatId],
                image_url: payload.imageUrl ?? prev[beatId]?.image_url ?? '',
                image_prompt: imagePrompt,
                updated_at: draftUpdatedAt,
                ...(creativePrompt !== undefined ? { creative_prompt: creativePrompt } : {}),
            },
        }));

        const existingTimer = beatImageSaveTimerRef.current[beatId];
        if (existingTimer != null) {
            window.clearTimeout(existingTimer);
            delete beatImageSaveTimerRef.current[beatId];
        }

        const persistPayload = {
            beatId,
            beatImagePrompt: imagePrompt,
            ...(creativePrompt !== undefined ? { creativePrompt } : {}),
            ...(payload.imageUrl !== undefined ? { beatImageUrl: payload.imageUrl } : {}),
        };

        if (options?.immediate) {
            return persistImportHtml(persistPayload);
        }

        beatImageSaveTimerRef.current[beatId] = window.setTimeout(() => {
            delete beatImageSaveTimerRef.current[beatId];
            void persistImportHtml(persistPayload);
        }, 1000);
        return true;
    }, [persistImportHtml]);

    const handleOpenBeatImageDuckAiManual = React.useCallback(async (
        beatId: string,
        imagePrompt: string,
    ): Promise<string | null> => {
        const prompt = String(imagePrompt || '').trim();
        if (!validateBeatImagePrompt(prompt)) {
            showMessage(`image_prompt không hợp lệ — ${describeBeatImagePromptErrors(prompt).join('; ') || 'phải là JSON đủ 6 field (subject, action, scene, text_overlay, composition, must_avoid)'}`, 'warning');
            return null;
        }
        setRegeneratingBeatImageBeatId(beatId);
        try {
            const mapSaved = await handleBeatImagePromptChange(beatId, prompt);
            if (!mapSaved) {
                return null;
            }
            const workspaceBeats = (beatMap?.sections || []).reduce<DuckAiWorkspaceBeat[]>((acc, section, index) => {
                    const id = String(section?.id || '').trim();
                    const promptValue = String(
                        (id === beatId ? prompt : '')
                        || beatImage[id]?.image_prompt
                        || section?.image_prompt
                        || '',
                    ).trim();
                    if (!id || !promptValue) {
                        return acc;
                    }
                    acc.push({
                        beatId: id,
                        beatIndex: index + 1,
                        imagePrompt: promptValue,
                        imageUrl: String(beatImage[id]?.image_url || '').trim(),
                        missingImage: !String(beatImage[id]?.image_url || '').trim(),
                        imageVoiceContent: resolveBeatVoice(id),
                    });
                    return acc;
                }, []);
            if (workspaceBeats.length > 0) {
                await openImportHtmlBeatDuckAiFillOnly({
                    shortVideoId,
                    beatId,
                    beatIndex: workspaceBeats.find((b) => b.beatId === beatId)?.beatIndex || 0,
                    imagePrompt: prompt,
                    imageUrl: String(beatImage[beatId]?.image_url || '').trim(),
                    title,
                    autoSubmit: true,
                    imageStyleSuffix: whiteboardImageStyleSuffix,
                    imageAspectSuffix: whiteboardImageAspectSuffix,
                    imageTextLangRule: whiteboardImageTextLangRule,
                    imageVoiceContent: resolveBeatVoice(beatId),
                });
            } else {
                await openImportHtmlBeatDuckAiFillOnly({
                    shortVideoId,
                    beatId,
                    imagePrompt: prompt,
                    autoSubmit: true,
                    imageStyleSuffix: whiteboardImageStyleSuffix,
                    imageAspectSuffix: whiteboardImageAspectSuffix,
                    imageTextLangRule: whiteboardImageTextLangRule,
                    imageVoiceContent: resolveBeatVoice(beatId),
                });
            }
            setActiveBeatId(beatId);
            setBeatEditorFocusRequest({ beatId, nonce: Date.now() });
            showMessage(
                `Đã mở tab Duck.ai cho ${beatId}. Prompt sẽ tự điền + submit — upload ảnh vào beat này khi xong.`,
                'success',
            );
            return beatImage[beatId]?.image_url || null;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return null;
        } finally {
            setRegeneratingBeatImageBeatId('');
        }
    }, [
        beatImage,
        beatMap?.sections,
        handleBeatImagePromptChange,
        openImportHtmlBeatDuckAiFillOnly,
        shortVideoId,
        showMessage,
        title,
        whiteboardImageStyleSuffix,
    ]);

    const handleOpenBeatImageMetaAiManual = React.useCallback(async (
        beatId: string,
        imagePrompt: string,
    ): Promise<string | null> => {
        const prompt = String(imagePrompt || '').trim();
        if (!validateBeatImagePrompt(prompt)) {
            showMessage(`image_prompt không hợp lệ — ${describeBeatImagePromptErrors(prompt).join('; ') || 'phải là JSON đủ 6 field (subject, action, scene, text_overlay, composition, must_avoid)'}`, 'warning');
            return null;
        }
        setRegeneratingBeatImageBeatId(beatId);
        try {
            const mapSaved = await handleBeatImagePromptChange(beatId, prompt);
            if (!mapSaved) {
                return null;
            }
            const workspaceBeats = (beatMap?.sections || []).reduce<DuckAiWorkspaceBeat[]>((acc, section, index) => {
                    const id = String(section?.id || '').trim();
                    const promptValue = String(
                        (id === beatId ? prompt : '')
                        || beatImage[id]?.image_prompt
                        || section?.image_prompt
                        || '',
                    ).trim();
                    if (!id || !promptValue) {
                        return acc;
                    }
                    acc.push({
                        beatId: id,
                        beatIndex: index + 1,
                        imagePrompt: promptValue,
                        imageUrl: String(beatImage[id]?.image_url || '').trim(),
                        missingImage: !String(beatImage[id]?.image_url || '').trim(),
                        imageVoiceContent: resolveBeatVoice(id),
                    });
                    return acc;
                }, []);
            if (workspaceBeats.length > 0) {
                await openImportHtmlBeatMetaAiFillOnly({
                    shortVideoId,
                    beatId,
                    beatIndex: workspaceBeats.find((b) => b.beatId === beatId)?.beatIndex || 0,
                    imagePrompt: prompt,
                    imageUrl: String(beatImage[beatId]?.image_url || '').trim(),
                    title,
                    autoSubmit: true,
                    imageStyleSuffix: whiteboardImageStyleSuffix,
                    imageAspectSuffix: whiteboardImageAspectSuffix,
                    imageTextLangRule: whiteboardImageTextLangRule,
                    imageVoiceContent: resolveBeatVoice(beatId),
                });
            } else {
                await openImportHtmlBeatMetaAiFillOnly({
                    shortVideoId,
                    beatId,
                    imagePrompt: prompt,
                    autoSubmit: true,
                    imageStyleSuffix: whiteboardImageStyleSuffix,
                    imageAspectSuffix: whiteboardImageAspectSuffix,
                    imageTextLangRule: whiteboardImageTextLangRule,
                    imageVoiceContent: resolveBeatVoice(beatId),
                });
            }
            setActiveBeatId(beatId);
            setBeatEditorFocusRequest({ beatId, nonce: Date.now() });
            showMessage(
                `Đã mở tab Meta.ai cho ${beatId}. Prompt sẽ tự điền + submit — download ảnh trên Meta.ai → tự lưu beat.`,
                'success',
            );
            return beatImage[beatId]?.image_url || null;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return null;
        } finally {
            setRegeneratingBeatImageBeatId('');
        }
    }, [
        beatImage,
        beatMap?.sections,
        handleBeatImagePromptChange,
        openImportHtmlBeatMetaAiFillOnly,
        shortVideoId,
        showMessage,
        title,
        whiteboardImageStyleSuffix,
    ]);

    const handleUploadBeatImageFromFile = React.useCallback(async (
        beatId: string,
        file: File,
    ): Promise<string | null> => {
        const normalizedBeatId = String(beatId || '').trim();
        if (!normalizedBeatId) {
            showMessage('Thiếu beat_id để upload ảnh', 'error');
            return null;
        }
        if (!(file instanceof File)) {
            showMessage('File ảnh không hợp lệ', 'error');
            return null;
        }

        setSavingImportHtml(true);
        try {
            const uploaded = await uploadAgentVisualImage(shortVideoId, file);
            if (!uploaded?.success) {
                showMessage(parseApiMessage(uploaded?.message) || 'Upload ảnh thất bại', 'error');
                return null;
            }
            const imageUrl = String(uploaded.url || uploaded.preview_url || '').trim();
            if (!imageUrl) {
                showMessage('Upload xong nhưng không có URL ảnh', 'error');
                return null;
            }
            const currentPrompt = String(
                beatImage[normalizedBeatId]?.image_prompt
                || beatMap?.sections?.find((section) => section.id === normalizedBeatId)?.image_prompt
                || '',
            ).trim();
            const saved = await commitBeatImageChange(
                normalizedBeatId,
                {
                    imagePrompt: currentPrompt,
                    imageUrl,
                },
                { immediate: true },
            );
            if (!saved) {
                showMessage('Không lưu được ảnh vào beat hiện tại', 'error');
                return null;
            }
            showMessage(`Đã gắn ảnh vào ${normalizedBeatId}`, 'success');
            return imageUrl;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return null;
        } finally {
            setSavingImportHtml(false);
        }
    }, [beatImage, beatMap, commitBeatImageChange, shortVideoId, showMessage]);

    const handleSaveBeatQa = React.useCallback(async (
        beatId: string,
        qaStatus: import('./agentVideoBeatMap').BeatQaStatus,
        qaRefineNote?: string,
    ): Promise<boolean> => {
        const normalizedStatus = qaStatus || '';
        const normalizedNote = String(qaRefineNote || '').trim();
        if (
            (normalizedStatus === 'needs_html_refill' || normalizedStatus === 'needs_visual_tweak')
            && normalizedNote === ''
        ) {
            showMessage('Nên nhập ghi chú refine dưới clip preview', 'warning');
        }
        const saved = await persistImportHtml({
            beatId,
            qaStatus: normalizedStatus,
            qaRefineNote: normalizedNote,
        });
        if (saved) {
            if (isAgentWhiteboardMode(agentVisualMode)) {
                setBeatImage((prev) => ({
                    ...prev,
                    [beatId]: {
                        ...prev[beatId],
                        image_url: prev[beatId]?.image_url || '',
                        qa_status: normalizedStatus || undefined,
                        qa_refine_note: normalizedNote || undefined,
                    },
                }));
            } else {
                setBeatHtml((prev) => ({
                    ...prev,
                    [beatId]: {
                        ...prev[beatId],
                        html: prev[beatId]?.html || '',
                        qa_status: normalizedStatus || undefined,
                        qa_refine_note: normalizedNote || undefined,
                    },
                }));
            }
        }
        return saved;
    }, [agentVisualMode, persistImportHtml, showMessage]);

    const handleSaveBeatVersion = React.useCallback(async (
        beatId: string,
        draft?: {
            qaStatus?: import('./agentVideoBeatMap').BeatQaStatus;
            qaRefineNote?: string;
        },
        options?: { quiet?: boolean; trustServer?: boolean },
    ): Promise<string | null> => {
        const normalizedId = String(beatId || '').trim();
        if (!normalizedId) {
            return null;
        }
        if (
            !options?.trustServer
            && isAgentWhiteboardMode(agentVisualMode)
            && !String(beatImage[normalizedId]?.image_url || '').trim()
        ) {
            if (!options?.quiet) {
                showMessage('Chỉ lưu version khi beat đã có ảnh', 'warning');
            }
            return null;
        }
        if (
            !options?.trustServer
            && !isAgentWhiteboardMode(agentVisualMode)
            && !String(beatHtml[normalizedId]?.html || '').trim()
        ) {
            if (!options?.quiet) {
                showMessage('Chỉ lưu version khi beat đã có HTML', 'warning');
            }
            return null;
        }
        setSavingImportHtml(true);
        try {
            const res = await saveAgentImportHtml(shortVideoId, {
                beatId: normalizedId,
                saveBeatVersion: true,
                qaStatus: draft?.qaStatus ?? '',
                qaRefineNote: String(draft?.qaRefineNote || '').trim(),
            });
            if (!res?.success) {
                if (!options?.quiet) {
                    showMessage(parseApiMessage(res?.message) || 'Không lưu được version beat', 'error');
                }
                return null;
            }
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
                if (res.import_html.beat_versions !== undefined) {
                    const nextVersions = parseBeatVersionsBlock(res.import_html.beat_versions);
                    beatVersionsRef.current = nextVersions;
                }
                if (res.import_html.beat_active_version_id !== undefined) {
                    const rawActive = res.import_html.beat_active_version_id;
                    beatActiveVersionIdRef.current = (
                        rawActive && typeof rawActive === 'object'
                            ? Object.fromEntries(
                                Object.entries(rawActive)
                                    .map(([id, versionId]) => [id, String(versionId || '').trim()])
                                    .filter(([id, versionId]) => Boolean(id) && Boolean(versionId)),
                            )
                            : {}
                    );
                }
            }
            const label = String(res.beat_version?.version_label || '').trim();
            return label || null;
        } catch (e) {
            if (!options?.quiet) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            }
            return null;
        } finally {
            setSavingImportHtml(false);
        }
    }, [agentVisualMode, applyImportHtmlSummary, beatHtml, beatImage, shortVideoId, showMessage]);

    const handleQuickIterateBeatFromQa = React.useCallback(async (
        beatId: string,
        qaRefineNote: string,
    ): Promise<boolean> => {
        const normalizedId = String(beatId || '').trim();
        const note = String(qaRefineNote || '').trim();
        if (!normalizedId) {
            return false;
        }
        if (!String(beatHtml[normalizedId]?.html || '').trim()) {
            showMessage('Cần có HTML beat trước khi tạo visual + fill', 'warning');
            return false;
        }
        if (
            quickIterateEnqueueingRef.current.has(normalizedId)
            || quickIterateQueueRef.current.some((item) => item.beatId === normalizedId)
        ) {
            showMessage(`${normalizedId} đã có trong hàng đợi tạo visual + fill`, 'info');
            return false;
        }

        quickIterateEnqueueingRef.current.add(normalizedId);
        setBeatHtml((prev) => ({
            ...prev,
            [normalizedId]: {
                ...prev[normalizedId],
                html: prev[normalizedId]?.html || '',
                qa_status: 'needs_visual_tweak',
                qa_refine_note: note || undefined,
            },
        }));

        const workingSection = beatMap?.sections.find(
            (s) => String(s.beat_id || s.id || '').trim() === normalizedId,
        );
        const workingVisual = String(workingSection?.visual_description || '');
        const workingHtml = String(beatHtml[normalizedId]?.html || '');
        const versions = beatVersionsRef.current[normalizedId] || beatVersions[normalizedId] || [];
        const activeVersionId = String(
            beatActiveVersionIdRef.current[normalizedId]
            || beatActiveVersionId[normalizedId]
            || '',
        ).trim();
        const activeVersion = activeVersionId
            ? (versions.find((v) => v.version_id === activeVersionId) || null)
            : null;
        // Ưu tiên khớp bất kỳ version đã lưu (thường là latest) — tránh pre-snapshot trùng
        // khi active FE còn trỏ version cũ nhưng working đã = Vn mới.
        const matchingVersion = findBeatVersionMatchingWorking(
            versions,
            workingVisual,
            workingHtml,
        );

        if (matchingVersion) {
            delete quickIteratePreSnapshotLabelRef.current[normalizedId];
            if (matchingVersion.version_id !== activeVersionId) {
                // Sync active về bản đã khớp (backend dedupe, không tạo version mới).
                await handleSaveBeatVersion(normalizedId, {
                    qaStatus: beatHtml[normalizedId]?.qa_status || '',
                    qaRefineNote: beatHtml[normalizedId]?.qa_refine_note || note,
                }, { quiet: true, trustServer: true });
            }
        } else if (isWorkingBeatDirtyVsActive(workingVisual, workingHtml, activeVersion)) {
            const preLabel = await handleSaveBeatVersion(normalizedId, {
                qaStatus: beatHtml[normalizedId]?.qa_status || '',
                qaRefineNote: beatHtml[normalizedId]?.qa_refine_note || note,
            });
            if (!preLabel) {
                quickIterateEnqueueingRef.current.delete(normalizedId);
                showMessage(
                    `Không lưu được version trước khi iterate ${normalizedId} — đã bỏ qua beat này`,
                    'error',
                );
                return false;
            }
            quickIteratePreSnapshotLabelRef.current[normalizedId] = preLabel;
        } else {
            delete quickIteratePreSnapshotLabelRef.current[normalizedId];
        }

        try {
            // Click = tạo job queue ngay trên backend (không xếp hàng memory FE).
            const res = await enqueueGeminiWebBeatQuickIterate(
                shortVideoId,
                normalizedId,
                note,
            );
            const queuedCount = Number(res?.queued || 0);
            const skippedActive = Number(res?.skipped_active || 0);
            if (!res?.success || (queuedCount <= 0 && skippedActive <= 0)) {
                const preLabel = quickIteratePreSnapshotLabelRef.current[normalizedId];
                const base = parseApiMessage(res?.message)
                    || `Enqueue tạo visual + fill thất bại (${normalizedId})`;
                showMessage(
                    preLabel
                        ? `${base}. Bản trước đã được lưu ${preLabel}`
                        : `${base}. Working có thể đã lệch — kiểm tra tab Version`,
                    'error',
                );
                delete quickIteratePreSnapshotLabelRef.current[normalizedId];
                return false;
            }

            quickIterateQueueRef.current = [
                ...quickIterateQueueRef.current.filter((item) => item.beatId !== normalizedId),
                { beatId: normalizedId, note, kind: 'quick_iterate' },
            ];
            setQuickIterateQueue(quickIterateQueueRef.current);
            beatIterateSessionRef.current[normalizedId] = {
                beatId: normalizedId,
                note,
                kind: 'quick_iterate',
                baselineHtml: workingHtml,
                baselineVisual: workingVisual,
                baselineUpdatedAt: String(beatHtml[normalizedId]?.updated_at || ''),
                seenHtmlJobForBeat: false,
            };
            postSnapshotInFlightRef.current.delete(normalizedId);
            quickIterateActiveBeatIdRef.current = normalizedId;
            setQuickIterateActiveBeatId(normalizedId);
            if (res.gemini_refine_visual) {
                setGeminiRefineVisualStatus(String(res.gemini_refine_visual.status || 'queued'));
                setGeminiRefineVisualError(String(res.gemini_refine_visual.error || '').trim());
            } else {
                setGeminiRefineVisualStatus('queued');
                setGeminiRefineVisualError('');
            }
            // Chờ HTML chain — đừng giữ status completed từ lần trước.
            setGeminiRefineHtmlStatus('none');
            setGeminiRefineHtmlError('');
            showMessage(
                parseApiMessage(res?.message) || `Đã đưa ${normalizedId} vào queue tạo visual + fill`,
                'success',
            );
            await loadRow({ syncAggregate: true, includeCatalogs: false });
            return true;
        } catch (e) {
            const preLabel = quickIteratePreSnapshotLabelRef.current[normalizedId];
            const base = e instanceof Error ? e.message : String(e);
            showMessage(
                preLabel
                    ? `${base}. Bản trước đã được lưu ${preLabel}`
                    : `${base}. Working có thể đã lệch — kiểm tra tab Version`,
                'error',
            );
            delete quickIteratePreSnapshotLabelRef.current[normalizedId];
            return false;
        } finally {
            quickIterateEnqueueingRef.current.delete(normalizedId);
        }
    }, [
        beatActiveVersionId,
        beatHtml,
        beatMap,
        beatVersions,
        handleSaveBeatVersion,
        loadRow,
        shortVideoId,
        showMessage,
    ]);

    // Fail quick iterate / edit HTML — dọn session + toast.
    React.useEffect(() => {
        if (quickIterateQueue.length === 0) {
            return;
        }
        const visualActive = geminiRefineVisualStatus === 'queued'
            || geminiRefineVisualStatus === 'processing';
        const htmlActive = geminiRefineHtmlStatus === 'queued'
            || geminiRefineHtmlStatus === 'processing';
        if (visualActive || htmlActive) {
            return;
        }

        const visualFailed = geminiRefineVisualStatus === 'failed';
        const htmlFailed = geminiRefineHtmlStatus === 'failed';
        if (!visualFailed && !htmlFailed) {
            return;
        }
        if (quickIterateFinishingRef.current) {
            return;
        }
        quickIterateFinishingRef.current = true;
        const beatId = quickIterateActiveBeatId
            || quickIterateQueue[quickIterateQueue.length - 1]?.beatId
            || '';
        const failedItem = quickIterateQueue.find((item) => item.beatId === beatId)
            || quickIterateQueue[quickIterateQueue.length - 1];
        const preLabel = beatId ? quickIteratePreSnapshotLabelRef.current[beatId] : undefined;
        const defaultErr = failedItem?.kind === 'edit_html'
            ? 'Sửa HTML thất bại'
            : 'Tạo visual + fill thất bại';
        const err = (visualFailed ? geminiRefineVisualError : '')
            || (htmlFailed ? geminiRefineHtmlError : '')
            || defaultErr;
        if (failedItem?.kind === 'edit_html') {
            showMessage(err, 'error');
        } else {
            showMessage(
                preLabel
                    ? `${err}. Bản trước đã được lưu ${preLabel}`
                    : `${err}. Working có thể đã lệch — kiểm tra tab Version`,
                'error',
            );
        }
        quickIterateQueue.forEach((item) => {
            delete quickIteratePreSnapshotLabelRef.current[item.beatId];
            delete beatIterateSessionRef.current[item.beatId];
            postSnapshotInFlightRef.current.delete(item.beatId);
        });
        quickIterateQueueRef.current = [];
        setQuickIterateQueue([]);
        quickIterateActiveBeatIdRef.current = null;
        setQuickIterateActiveBeatId(null);
        quickIterateFinishingRef.current = false;
    }, [
        geminiRefineHtmlError,
        geminiRefineHtmlStatus,
        geminiRefineVisualError,
        geminiRefineVisualStatus,
        quickIterateActiveBeatId,
        quickIterateQueue,
        showMessage,
    ]);

    // Post-snapshot: chỉ khi pipeline HTML thật sự xong (tránh snapshot sớm giữa visual→html chain).
    React.useEffect(() => {
        const ctx = beatIteratePollContextRef.current;
        const sessions = Object.values(beatIterateSessionRef.current);
        if (!ctx || sessions.length === 0) {
            return;
        }

        void (async () => {
            for (const session of sessions) {
                const beatId = session.beatId;
                if (postSnapshotInFlightRef.current.has(beatId)) {
                    continue;
                }
                const currentHtml = String(beatHtml[beatId]?.html || '');
                const currentVisual = String(
                    beatMap?.sections.find(
                        (s) => String(s.beat_id || s.id || '').trim() === beatId,
                    )?.visual_description || '',
                );
                const currentUpdatedAt = String(beatHtml[beatId]?.updated_at || '');
                if (!canFinalizeBeatIterateSession(
                    session,
                    ctx,
                    currentHtml,
                    currentVisual,
                    currentUpdatedAt,
                )) {
                    continue;
                }

                postSnapshotInFlightRef.current.add(beatId);
                // Backend dedupe nếu html+visual trùng latest — luôn gọi để sync active + lấy label.
                const postLabel = await handleSaveBeatVersion(beatId, {
                    qaStatus: beatHtml[beatId]?.qa_status || '',
                    qaRefineNote: beatHtml[beatId]?.qa_refine_note || session.note || '',
                }, { quiet: true, trustServer: true });
                delete quickIteratePreSnapshotLabelRef.current[beatId];
                postSnapshotInFlightRef.current.delete(beatId);

                if (!postLabel) {
                    continue;
                }

                // Nếu vẫn trùng baseline (dedupe / race) thì giữ session để poll lại.
                // trustServer đã sync beatVersionsRef — version mới nhất phải khác baseline HTML.
                const latestVersion = (beatVersionsRef.current[beatId] || []).slice(-1)[0];
                const latestHtml = String(latestVersion?.html || '').trim();
                const baselineHtml = String(session.baselineHtml || '').trim();
                if (
                    session.kind === 'quick_iterate'
                    && latestHtml !== ''
                    && latestHtml === baselineHtml
                ) {
                    continue;
                }

                delete beatIterateSessionRef.current[beatId];

                if (session.kind === 'edit_html') {
                    showMessage(`Đã sửa HTML xong ${beatId} · đã lưu ${postLabel}`, 'success');
                    continue;
                }
                showMessage(
                    `Đã tạo visual + fill xong ${beatId} · đã lưu ${postLabel}`,
                    'success',
                );
            }
        })();
    }, [
        beatHtml,
        beatMap,
        beatIteratePollTick,
        handleSaveBeatVersion,
        showMessage,
    ]);

    const handleEditHtmlBeatFromQa = React.useCallback(async (
        beatId: string,
        qaRefineNote: string,
    ): Promise<boolean> => {
        const normalizedId = String(beatId || '').trim();
        const note = String(qaRefineNote || '').trim();
        if (!normalizedId) {
            return false;
        }
        if (!note) {
            showMessage('Cần nhập ghi chú refine trước khi sửa HTML', 'warning');
            return false;
        }
        if (!String(beatHtml[normalizedId]?.html || '').trim()) {
            showMessage('Cần có HTML beat trước khi sửa HTML', 'warning');
            return false;
        }
        if (
            quickIterateEnqueueingRef.current.has(normalizedId)
            || quickIterateQueueRef.current.some((item) => item.beatId === normalizedId)
        ) {
            showMessage(`${normalizedId} đang trong hàng đợi sửa HTML / visual + fill`, 'info');
            return false;
        }

        quickIterateEnqueueingRef.current.add(normalizedId);
        setBeatHtml((prev) => ({
            ...prev,
            [normalizedId]: {
                ...prev[normalizedId],
                html: prev[normalizedId]?.html || '',
                qa_status: 'needs_html_refill',
                qa_refine_note: note || undefined,
            },
        }));

        try {
            const saved = await persistImportHtml({
                beatId: normalizedId,
                qaStatus: 'needs_html_refill',
                qaRefineNote: note,
            });
            if (!saved) {
                showMessage(`Không lưu được QA trước khi sửa HTML (${normalizedId})`, 'error');
                return false;
            }

            const res = await enqueueGeminiWebBeatRefineHtml(shortVideoId, [normalizedId]);
            const queuedCount = Number(res?.queued || 0);
            const skippedActive = Number(res?.skipped_active || 0);
            if (!res?.success || (queuedCount <= 0 && skippedActive <= 0)) {
                showMessage(
                    parseApiMessage(res?.message)
                        || `Enqueue sửa HTML thất bại (${normalizedId})`,
                    'error',
                );
                return false;
            }

            quickIterateQueueRef.current = [
                ...quickIterateQueueRef.current.filter((item) => item.beatId !== normalizedId),
                { beatId: normalizedId, note, kind: 'edit_html' },
            ];
            setQuickIterateQueue(quickIterateQueueRef.current);
            beatIterateSessionRef.current[normalizedId] = {
                beatId: normalizedId,
                note,
                kind: 'edit_html',
                baselineHtml: String(beatHtml[normalizedId]?.html || ''),
                baselineVisual: String(
                    beatMap?.sections.find(
                        (s) => String(s.beat_id || s.id || '').trim() === normalizedId,
                    )?.visual_description || '',
                ),
                baselineUpdatedAt: String(beatHtml[normalizedId]?.updated_at || ''),
                // Chỉ coi là đã thấy job nếu server báo beat đang active (tránh tin completed cũ).
                seenHtmlJobForBeat: skippedActive > 0,
            };
            postSnapshotInFlightRef.current.delete(normalizedId);
            quickIterateActiveBeatIdRef.current = normalizedId;
            setQuickIterateActiveBeatId(normalizedId);
            if (res.gemini_refine_html) {
                setGeminiRefineHtmlStatus(String(res.gemini_refine_html.status || 'queued'));
                setGeminiRefineHtmlError(String(res.gemini_refine_html.error || '').trim());
            } else {
                setGeminiRefineHtmlStatus('queued');
                setGeminiRefineHtmlError('');
            }
            showMessage(
                parseApiMessage(res?.message) || `Đã đưa ${normalizedId} vào queue sửa HTML`,
                'success',
            );
            await loadRow({ syncAggregate: true, includeCatalogs: false });
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            quickIterateEnqueueingRef.current.delete(normalizedId);
        }
    }, [
        beatHtml,
        beatMap,
        loadRow,
        persistImportHtml,
        shortVideoId,
        showMessage,
    ]);

    const handleRestoreBeatVersion = React.useCallback(async (
        beatId: string,
        versionId: string,
    ): Promise<string | null> => {
        const normalizedId = String(beatId || '').trim();
        const normalizedVersionId = String(versionId || '').trim();
        if (!normalizedId || !normalizedVersionId) {
            return null;
        }
        setSavingImportHtml(true);
        try {
            const res = await saveAgentImportHtml(shortVideoId, {
                beatId: normalizedId,
                restoreBeatVersion: true,
                versionId: normalizedVersionId,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không restore được version', 'error');
                return null;
            }
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
            }
            const label = String(res.beat_version?.version_label || '').trim();
            return label || null;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return null;
        } finally {
            setSavingImportHtml(false);
        }
    }, [applyImportHtmlSummary, shortVideoId, showMessage]);

    const handleSaveThumbnailQa = React.useCallback(async (
        qaStatus: ThumbnailQaStatus,
        qaNote: string,
    ): Promise<boolean> => {
        setSavingThumbnailQa(true);
        try {
            const approved = qaStatus === 'approved';
            const saved = await persistImportHtml({
                thumbnailQaStatus: qaStatus,
                thumbnailQaNote: qaNote,
                thumbnailApproved: approved,
            });
            if (saved) {
                setThumbnailBlock((prev) => ({
                    ...(prev || {}),
                    qa_status: qaStatus || undefined,
                    qa_note: qaNote || undefined,
                    approved,
                    approved_at: approved ? new Date().toISOString() : '',
                }));
            }
            return saved;
        } finally {
            setSavingThumbnailQa(false);
        }
    }, [persistImportHtml]);

    const handleEnqueueThumbnailIdea = React.useCallback(async (force = true): Promise<void> => {
        setEnqueueingThumbnailIdea(true);
        try {
            const res = await enqueueGeminiWebThumbnailIdea(shortVideoId, force);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Enqueue sinh idea thumbnail thất bại', 'error');
                return;
            }
            if (res.gemini_thumbnail_idea) {
                setGeminiThumbnailIdeaStatus(String(res.gemini_thumbnail_idea.status || 'queued'));
                setThumbnailGeminiIdeaError(String(res.gemini_thumbnail_idea.error || '').trim());
            }
            showMessage(parseApiMessage(res?.message) || 'Đã enqueue sinh idea thumbnail', 'success');
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setEnqueueingThumbnailIdea(false);
        }
    }, [loadRow, shortVideoId, showMessage]);

    const handleEnqueueThumbnailFill = React.useCallback(async (
        force = true,
        options?: { mode?: 'create' | 'refine'; userPrompt?: string; silentSuccess?: boolean },
    ) => {
        setEnqueueingThumbnailFill(true);
        try {
            const res = await enqueueGeminiWebThumbnailFill(shortVideoId, force, {
                mode: options?.mode,
                userPrompt: options?.userPrompt,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Enqueue fill thumbnail thất bại', 'error');
                return false;
            }
            if (res.gemini_thumbnail_fill) {
                setGeminiThumbnailFillStatus(String(res.gemini_thumbnail_fill.status || 'queued'));
                setThumbnailGeminiFillError(String(res.gemini_thumbnail_fill.error || '').trim());
            }
            if (!options?.silentSuccess) {
                showMessage(parseApiMessage(res?.message) || 'Đã enqueue fill thumbnail', 'success');
            }
            await loadRow();
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setEnqueueingThumbnailFill(false);
        }
    }, [loadRow, shortVideoId, showMessage]);

    const handleRegenerateThumbnailFromQa = React.useCallback(async (qaNote: string): Promise<boolean> => {
        const note = String(qaNote || '').trim();
        if (!note) {
            showMessage('Thiếu ghi chú yêu cầu làm lại', 'warning');
            return false;
        }
        if (!String(thumbnailHtml || '').trim()) {
            showMessage('Cần có HTML thumbnail trước khi re-generate', 'warning');
            return false;
        }
        return handleEnqueueThumbnailFill(true, {
            mode: 'refine',
            userPrompt: note,
            silentSuccess: true,
        });
    }, [handleEnqueueThumbnailFill, showMessage, thumbnailHtml]);

    const handleCaptureThumbnail = React.useCallback(async (force = false) => {
        setCapturingThumbnail(true);
        try {
            const res = await captureAgentThumbnail(shortVideoId, force);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Chụp thumbnail thất bại', 'error');
                return false;
            }
            if (res.thumbnail) {
                setThumbnailBlock(res.thumbnail);
                setThumbnailHtml(String(res.thumbnail.html || ''));
                setThumbnailImageUrl(String(res.thumbnail.image_url || res.image_url || ''));
            } else if (res.image_url) {
                setThumbnailImageUrl(String(res.image_url));
            }
            // Cùng field gemini_fill với Fill HTML — hết loading orphan
            setGeminiThumbnailFillStatus('completed');
            setThumbnailGeminiFillError('');
            if (res.import_html) {
                applyImportHtmlSummary(res.import_html);
            }
            showMessage(parseApiMessage(res?.message) || 'Đã chụp thumbnail', 'success');
            await loadRow();
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setCapturingThumbnail(false);
        }
    }, [applyImportHtmlSummary, loadRow, shortVideoId, showMessage]);

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

    // Seek playback đến 1 thời điểm (dùng cho nút Prev/Next beat — timeline
    // lắng nghe beatPlaybackSeekRequest và tự seek + cập nhật con trỏ).
    const handleSeekBeatPlayback = React.useCallback((beatId: string, startSec: number) => {
        setBeatPlaybackSeekRequest({
            beatId,
            startSec,
            nonce: Date.now(),
        });
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

        if (isAgentWhiteboardMode(agentVisualMode)) {
            void handleOpenBeatImageDuckAiManual(
                beatId,
                beatImagePromptToText(beat.image_prompt || beatImage[beatId]?.image_prompt || '').trim(),
            );
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

    const handleOpenBeatMetaAi = (beatId: string) => {
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
        if (!isAgentWhiteboardMode(agentVisualMode)) {
            showMessage('Meta.ai chỉ dùng cho ảnh beat (mode Image)', 'info');
            return;
        }
        void handleOpenBeatImageMetaAiManual(
            beatId,
            beatImagePromptToText(beat.image_prompt || beatImage[beatId]?.image_prompt || '').trim(),
        );
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
        const isWhiteboard = isAgentWhiteboardMode(agentVisualMode);
        const missingBeatIds = isWhiteboard
            ? listMissingBeatImageIds(beatMap, beatImage)
            : listMissingBeatIds(beatMap, beatHtml);
        if (!missingBeatIds.length) {
            showMessage(
                isWhiteboard ? 'Không có beat thiếu ảnh' : 'Không có beat thiếu HTML',
                'info',
            );
            return;
        }
        if (openingAllMissingBeatGemini || openingAllMissingBeatMetaAi || openingAllMissingBeatAiStudio || fillingAllMissingBeatGeminiHeadless) {
            return;
        }
        // Mỗi lần click chỉ mở tối đa 10 beat thiếu ảnh để browser không bị ngốn RAM.
        const batchIds = isWhiteboard ? missingBeatIds.slice(0, 10) : missingBeatIds;

        setOpeningAllMissingBeatGemini(true);
        setOpeningBeatGeminiBeatIds((prev) => Array.from(new Set([...prev, ...batchIds])));
        void (async () => {
            try {
                const workspaceBeats: DuckAiWorkspaceBeat[] = isWhiteboard
                    ? beatMap.sections.map((section, index) => {
                        const id = String(section?.id || '').trim();
                        const prompt = String(
                            beatImage[id]?.image_prompt
                            || section?.image_prompt
                            || '',
                        ).trim();
                        return {
                            beatId: id,
                            beatIndex: index + 1,
                            imagePrompt: prompt,
                            imageUrl: String(beatImage[id]?.image_url || '').trim(),
                            missingImage: !String(beatImage[id]?.image_url || '').trim(),
                            imageVoiceContent: resolveBeatVoice(id),
                        };
                    }).filter((item) => item.beatId && item.imagePrompt && batchIds.includes(item.beatId))
                    : [];
                const result = isWhiteboard
                    ? await openImportHtmlBeatDuckAiForMissingBeats({
                        shortVideoId,
                        title,
                        beats: workspaceBeats,
                        activeBeatId: batchIds[0] || '',
                        autoSubmit: true,
                    })
                    : await openImportHtmlBeatGeminiForMissingBeats({
                        shortVideoId,
                        beatIds: batchIds,
                        autoSubmit: true,
                    });
                const failNote = result.failed.length
                    ? ` (${result.failed.length} beat lỗi: ${result.failed.join(', ')})`
                    : '';
                const remaining = isWhiteboard ? Math.max(0, missingBeatIds.length - batchIds.length) : 0;
                showMessage(
                    isWhiteboard
                        ? `Đã mở ${result.opened} tab Duck.ai (mỗi beat 1 tab) — còn ${remaining} beat thiếu ảnh${failNote}`
                        : `Đã mở ${result.opened} tab Gemini — kiểm tra từng tab, copy HTML rồi bấm Lưu HTML vào CMS${failNote}`,
                    result.failed.length ? 'warning' : 'success',
                );
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setOpeningAllMissingBeatGemini(false);
                setOpeningBeatGeminiBeatIds((prev) => prev.filter((id) => !batchIds.includes(id)));
            }
        })();
    };

    const handleOpenAllMissingBeatMetaAi = () => {
        if (!beatMapReady || !beatMap) {
            showMessage('Cần beat-map hợp lệ trước', 'warning');
            return;
        }
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        const isWhiteboard = isAgentWhiteboardMode(agentVisualMode);
        if (!isWhiteboard) {
            showMessage('Meta.ai chỉ dùng cho ảnh beat (mode Image)', 'info');
            return;
        }
        const missingBeatIds = listMissingBeatImageIds(beatMap, beatImage);
        if (!missingBeatIds.length) {
            showMessage('Không có beat thiếu ảnh', 'info');
            return;
        }
        if (
            openingAllMissingBeatGemini
            || openingAllMissingBeatMetaAi
            || openingAllMissingBeatAiStudio
            || fillingAllMissingBeatGeminiHeadless
        ) {
            return;
        }
        // Mỗi lần click chỉ mở tối đa 10 beat thiếu ảnh để browser không bị ngốn RAM.
        const batchIds = missingBeatIds.slice(0, 10);

        setOpeningAllMissingBeatMetaAi(true);
        setOpeningBeatGeminiBeatIds((prev) => Array.from(new Set([...prev, ...batchIds])));
        void (async () => {
            try {
                const workspaceBeats: DuckAiWorkspaceBeat[] = beatMap.sections.map((section, index) => {
                    const id = String(section?.id || '').trim();
                    const prompt = String(
                        beatImage[id]?.image_prompt
                        || section?.image_prompt
                        || '',
                    ).trim();
                    return {
                        beatId: id,
                        beatIndex: index + 1,
                        imagePrompt: prompt,
                        imageUrl: String(beatImage[id]?.image_url || '').trim(),
                        missingImage: !String(beatImage[id]?.image_url || '').trim(),
                        imageVoiceContent: resolveBeatVoice(id),
                    };
                }).filter((item) => item.beatId && item.imagePrompt && batchIds.includes(item.beatId));
                const result = await openImportHtmlBeatMetaAiForMissingBeats({
                    shortVideoId,
                    title,
                    beats: workspaceBeats,
                    activeBeatId: batchIds[0] || '',
                    autoSubmit: true,
                    imageStyleSuffix: whiteboardImageStyleSuffix,
                    imageAspectSuffix: whiteboardImageAspectSuffix,
                    imageTextLangRule: whiteboardImageTextLangRule,
                });
                const failNote = result.failed.length
                    ? ` (${result.failed.length} beat lỗi: ${result.failed.join(', ')})`
                    : '';
                const remaining = Math.max(0, missingBeatIds.length - batchIds.length);
                showMessage(
                    `Đã mở ${result.opened} tab Meta.ai (mỗi beat 1 tab) — còn ${remaining} beat thiếu ảnh; download ảnh trên Meta.ai → tự lưu beat${failNote}`,
                    result.failed.length ? 'warning' : 'success',
                );
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setOpeningAllMissingBeatMetaAi(false);
                setOpeningBeatGeminiBeatIds((prev) => prev.filter((id) => !batchIds.includes(id)));
            }
        })();
    };

    const handleOpenAllMissingBeatAiStudio = () => {
        if (!beatMapReady || !beatMap) {
            showMessage('Cần beat-map hợp lệ trước', 'warning');
            return;
        }
        if (whisperStatus !== 'completed') {
            showMessage('Whisper chưa hoàn tất', 'warning');
            return;
        }
        const isWhiteboard = isAgentWhiteboardMode(agentVisualMode);
        const missingBeatIds = isWhiteboard
            ? listMissingBeatImageIds(beatMap, beatImage)
            : listMissingBeatIds(beatMap, beatHtml);
        if (!missingBeatIds.length) {
            showMessage(
                isWhiteboard ? 'Không có beat thiếu ảnh' : 'Không có beat thiếu HTML',
                'info',
            );
            return;
        }
        if (openingAllMissingBeatGemini || openingAllMissingBeatMetaAi || openingAllMissingBeatAiStudio || fillingAllMissingBeatGeminiHeadless) {
            return;
        }

        setOpeningAllMissingBeatAiStudio(true);
        setOpeningBeatGeminiBeatIds((prev) => Array.from(new Set([...prev, ...missingBeatIds])));
        void (async () => {
            try {
                const workspaceBeats: DuckAiWorkspaceBeat[] = isWhiteboard
                    ? beatMap.sections.map((section, index) => {
                        const id = String(section?.id || '').trim();
                        const prompt = String(
                            beatImage[id]?.image_prompt
                            || section?.image_prompt
                            || '',
                        ).trim();
                        return {
                            beatId: id,
                            beatIndex: index + 1,
                            imagePrompt: prompt,
                            imageUrl: String(beatImage[id]?.image_url || '').trim(),
                            missingImage: !String(beatImage[id]?.image_url || '').trim(),
                        };
                    }).filter((item) => item.beatId && item.imagePrompt)
                    : [];
                const result = isWhiteboard
                    ? await openImportHtmlBeatDuckAiForMissingBeats({
                        shortVideoId,
                        title,
                        beats: workspaceBeats,
                        activeBeatId: missingBeatIds[0] || '',
                        autoSubmit: true,
                        imageStyleSuffix: whiteboardImageStyleSuffix,
                    imageAspectSuffix: whiteboardImageAspectSuffix,
                    imageTextLangRule: whiteboardImageTextLangRule,
                    })
                    : await openImportHtmlBeatAiStudioForMissingBeats({
                        shortVideoId,
                        beatIds: missingBeatIds,
                        autoSubmit: true,
                    });
                const failNote = result.failed.length
                    ? ` (${result.failed.length} beat lỗi: ${result.failed.join(', ')})`
                    : '';
                showMessage(
                    isWhiteboard
                        ? `Đã mở ${result.opened} tab Duck.ai (mỗi beat 1 tab) — đã auto điền + submit; upload ảnh khi xong${failNote}`
                        : `Đã mở ${result.opened} tab AI Studio — chờ Run xong rồi bấm Lưu HTML vào CMS (extract từ response)${failNote}`,
                    result.failed.length ? 'warning' : 'success',
                );
            } catch (e) {
                showMessage(e instanceof Error ? e.message : String(e), 'error');
            } finally {
                setOpeningAllMissingBeatAiStudio(false);
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
        if (isAgentWhiteboardMode(agentVisualMode)) {
            void handleOpenAllMissingBeatAiStudio();
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
            || openingAllMissingBeatMetaAi
            || openingAllMissingBeatAiStudio
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

    const handleFullAutoStepToggleChange = async (
        toggleKey: FullAutoStepToggleKey,
        checked: boolean,
    ) => {
        if (savingFullAutoStepToggles) {
            return;
        }
        const prev = fullAutoStepToggles;
        const next = { ...prev, [toggleKey]: checked };
        setFullAutoStepToggles(next);
        setSavingFullAutoStepToggles(true);
        try {
            const res = await saveFullAutoStepToggles(shortVideoId, { [toggleKey]: checked });
            if (!res?.success) {
                setFullAutoStepToggles(prev);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được tùy chọn bước pipeline',
                    'error',
                );
                return;
            }
            if (res.full_auto_step_toggles) {
                setFullAutoStepToggles(normalizeFullAutoStepToggles(res.full_auto_step_toggles));
            }
        } catch (e) {
            setFullAutoStepToggles(prev);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingFullAutoStepToggles(false);
        }
    };

    const handleBeatImageFillModeChange = async (mode: BeatImageFillMode) => {
        if (savingBeatImageFillMode || mode === beatImageFillMode) {
            return;
        }
        const prev = beatImageFillMode;
        setBeatImageFillMode(mode);
        setSavingBeatImageFillMode(true);
        try {
            const res = await saveBeatImageFillMode(shortVideoId, mode);
            if (!res?.success) {
                setBeatImageFillMode(prev);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được chế độ Ảnh beat',
                    'error',
                );
                return;
            }
            if (res.beat_image_fill_mode) {
                setBeatImageFillMode(normalizeBeatImageFillMode(res.beat_image_fill_mode));
            }
            if (res.beat_image_fill_only_missing !== undefined) {
                setBeatImageFillOnlyMissing(normalizeBeatImageFillOnlyMissing(res.beat_image_fill_only_missing));
            }
        } catch (e) {
            setBeatImageFillMode(prev);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingBeatImageFillMode(false);
        }
    };

    const handleBeatImageFillOnlyMissingChange = async (onlyMissing: boolean) => {
        if (savingBeatImageFillMode || onlyMissing === beatImageFillOnlyMissing) {
            return;
        }
        const prev = beatImageFillOnlyMissing;
        setBeatImageFillOnlyMissing(onlyMissing);
        setSavingBeatImageFillMode(true);
        try {
            const res = await saveBeatImageFillMode(shortVideoId, beatImageFillMode, onlyMissing);
            if (!res?.success) {
                setBeatImageFillOnlyMissing(prev);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cài đặt Ảnh beat',
                    'error',
                );
                return;
            }
            if (res.beat_image_fill_only_missing !== undefined) {
                setBeatImageFillOnlyMissing(normalizeBeatImageFillOnlyMissing(res.beat_image_fill_only_missing));
            }
        } catch (e) {
            setBeatImageFillOnlyMissing(prev);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingBeatImageFillMode(false);
        }
    };

    const handleGeminiOpenBrowserChange = async (checked: boolean) => {
        if (savingGeminiOpenBrowser) {
            return;
        }
        setSavingGeminiOpenBrowser(true);
        try {
            const res = await saveAgentGeminiOpenBrowser(shortVideoId, checked);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình hiển thị browser debug',
                    'error',
                );
                return;
            }
            setAgentGeminiOpenBrowser(checked);
            showMessage(
                parseApiMessage(res?.message)
                    || (checked
                        ? 'Đã bật hiển thị browser debug cho mọi bước headless'
                        : 'Đã tắt hiển thị browser debug'),
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingGeminiOpenBrowser(false);
        }
    };

    const handleGithubScreenshotHomepageChange = async (checked: boolean) => {
        if (savingGithubScreenshotHomepage) {
            return;
        }
        const prev = agentGithubScreenshotHomepage;
        setAgentGithubScreenshotHomepage(checked);
        setSavingGithubScreenshotHomepage(true);
        try {
            const res = await saveAgentGithubScreenshotHomepage(shortVideoId, checked);
            if (!res?.success) {
                setAgentGithubScreenshotHomepage(prev);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình screenshot GitHub',
                    'error',
                );
                return;
            }
            setAgentGithubScreenshotHomepage(
                res.agent_github_screenshot_homepage !== undefined
                    ? Boolean(res.agent_github_screenshot_homepage)
                    : checked,
            );
            if (checked && Array.isArray(res?.readme_media)) {
                const loadedReadmeMedia = normalizeGithubReadmeMediaList(res.readme_media);
                setReadmeMedia(loadedReadmeMedia);
                readmeMediaSavedRef.current = JSON.stringify(loadedReadmeMedia);
            }
            const status = String(res?.screenshot_status || '');
            const isWarning = status === 'failed' || status === 'skipped_no_repo';
            const mediaCount = Array.isArray(res?.readme_media) ? res.readme_media.length : 0;
            let fallbackMsg = checked
                ? 'Đã bật — sẽ chụp trang chủ nếu chưa có screenshot'
                : 'Đã tắt chụp màn hình trang chủ';
            if (status === 'skipped_has_image' && mediaCount > 0) {
                fallbackMsg = `Đã bật — đã có screenshot trang chủ (Media README: ${mediaCount} mục)`;
            }
            showMessage(
                parseApiMessage(res?.message) || fallbackMsg,
                isWarning ? 'warning' : 'success',
            );
        } catch (e) {
            setAgentGithubScreenshotHomepage(prev);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingGithubScreenshotHomepage(false);
        }
    };

    const handleIntroduceAppChange = async (checked: boolean) => {
        if (savingIntroduceApp) {
            return;
        }
        setSavingIntroduceApp(true);
        try {
            const res = await saveAgentIntroduceApp(shortVideoId, checked);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình giới thiệu app',
                    'error',
                );
                return;
            }
            setAgentIntroduceApp(checked);
            showMessage(
                parseApiMessage(res?.message)
                    || (checked
                        ? 'Đã bật giới thiệu app trong CTA cuối script'
                        : 'Đã tắt giới thiệu app — CTA chỉ engagement'),
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingIntroduceApp(false);
        }
    };

    const handleAgentAudioScriptStyleChange = async (styleId: number) => {
        if (savingAudioScriptStyle) {
            return;
        }
        setSavingAudioScriptStyle(true);
        try {
            const res = await saveAgentScriptStyle(shortVideoId, styleId > 0 ? styleId : null);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được phong cách script',
                    'error',
                );
                return;
            }
            setAgentAudioScriptStyleId(styleId > 0 ? styleId : 0);
            showMessage(
                parseApiMessage(res?.message)
                    || (styleId > 0 ? 'Đã gắn phong cách script' : 'Đã dùng phong cách mặc định'),
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingAudioScriptStyle(false);
        }
    };

    const commitDesiredScriptDuration = async (rawInput: string) => {
        if (savingDesiredScriptDuration) {
            return;
        }
        const trimmed = String(rawInput || '').trim();
        let next: number | null = null;
        if (trimmed !== '') {
            const parsed = Number(trimmed);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                showMessage('Thời lượng mong muốn phải là số giây dương (15–3600)', 'error');
                setDesiredScriptDurationInput(
                    desiredScriptDurationSec != null ? String(desiredScriptDurationSec) : '',
                );
                return;
            }
            next = Math.round(parsed);
            if (next < 15 || next > 3600) {
                showMessage('Thời lượng mong muốn phải từ 15–3600 giây', 'error');
                setDesiredScriptDurationInput(
                    desiredScriptDurationSec != null ? String(desiredScriptDurationSec) : '',
                );
                return;
            }
        }
        if (next === desiredScriptDurationSec) {
            setDesiredScriptDurationInput(next != null ? String(next) : '');
            return;
        }
        setSavingDesiredScriptDuration(true);
        try {
            const res = await saveAgentDesiredScriptDuration(shortVideoId, next);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được thời lượng script mong muốn',
                    'error',
                );
                setDesiredScriptDurationInput(
                    desiredScriptDurationSec != null ? String(desiredScriptDurationSec) : '',
                );
                return;
            }
            const savedRaw = res?.desired_script_duration_sec;
            const savedNum = savedRaw == null
                ? null
                : Number(savedRaw);
            const saved = savedNum != null && Number.isFinite(savedNum) && savedNum > 0
                ? Math.round(savedNum)
                : null;
            setDesiredScriptDurationSec(saved);
            setDesiredScriptDurationInput(saved != null ? String(saved) : '');
            showMessage(
                parseApiMessage(res?.message)
                    || (saved != null
                        ? `Đã đặt thời lượng script mong muốn: ${saved}s`
                        : 'Đã bỏ thời lượng script mong muốn'),
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            setDesiredScriptDurationInput(
                desiredScriptDurationSec != null ? String(desiredScriptDurationSec) : '',
            );
        } finally {
            setSavingDesiredScriptDuration(false);
        }
    };

    const handleSaveCapcutConfig = async () => {
        if (savingCapcutConfig) {
            return;
        }
        const normalizedName = String(capcutProjectName || '').trim();
        const normalizedPath = String(capcutProjectPath || '').trim();
        if (normalizedName === '' && normalizedPath === '') {
            showMessage('Nhập tên project hoặc project path CapCut trước khi lưu', 'warning');
            return;
        }
        setSavingCapcutConfig(true);
        try {
            const res = await saveAgentCapcutConfig(shortVideoId, {
                projectName: normalizedName,
                projectPath: normalizedPath,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được config CapCut', 'error');
                return;
            }
            setCapcutProjectName(String(res?.project_name || normalizedName).trim());
            setCapcutProjectPath(String(res?.project_path || normalizedPath).trim());
            showMessage(parseApiMessage(res?.message) || 'Đã lưu config CapCut', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingCapcutConfig(false);
        }
    };

    const handleAddAudioToCapcut = async () => {
        if (addingAudioToCapcut) {
            return;
        }
        if (!hasAudio) {
            showMessage('Chưa có MP3 để add vào CapCut', 'warning');
            return;
        }
        setAddingAudioToCapcut(true);
        try {
            const res = await addAudioToCapcut(shortVideoId);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Add audio vào CapCut thất bại', 'error');
                return;
            }
            if (res?.project_name) {
                setCapcutProjectName(String(res.project_name).trim());
            }
            if (res?.project_path) {
                setCapcutProjectPath(String(res.project_path).trim());
            }
            showMessage(parseApiMessage(res?.message) || 'Đã add audio vào CapCut', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setAddingAudioToCapcut(false);
        }
    };

    const handleUploadAllToCapcut = async () => {
        if (uploadingAllToCapcut || addingAudioToCapcut || uploadingBeatVideoToCapcutIds.length > 0) {
            showMessage('Đang có thao tác CapCut khác — chờ xong rồi thử lại', 'warning');
            return;
        }
        if (!hasAudio) {
            showMessage('Chưa có MP3 để upload vào CapCut', 'warning');
            return;
        }
        if (!isAgentWhiteboardMode(agentVisualMode)) {
            showMessage('Chỉ upload CapCut ở chế độ whiteboard', 'warning');
            return;
        }
        setUploadingAllToCapcut(true);
        try {
            const res = await uploadAllToCapcut(shortVideoId);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Upload CapCut thất bại', 'error');
                return;
            }
            if (res?.project_name) {
                setCapcutProjectName(String(res.project_name).trim());
            }
            if (res?.project_path) {
                setCapcutProjectPath(String(res.project_path).trim());
            }
            const failedBeats = Array.isArray(res.failed_beats) ? res.failed_beats : [];
            const failedCount = failedBeats.length;
            const failedNote = failedCount > 0
                ? ` — ${failedCount} beat lỗi: ${failedBeats
                    .slice(0, 5)
                    .map((b) => `${b?.beat_id || '?'} (${b?.reason || '?'})`)
                    .join(', ')}${failedCount > 5 ? '…' : ''}`
                : '';
            const addedNote = Array.isArray(res.added_beats) && res.added_beats.length > 0
                ? ` + ${res.added_beats.length} beat (${res.assets_mode ? 'ảnh' : 'video'})`
                : '';
            showMessage(
                parseApiMessage(res?.message)
                    || `Đã upload audio${addedNote} vào CapCut${failedNote}`,
                failedCount > 0 ? 'warning' : 'success',
            );
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setUploadingAllToCapcut(false);
        }
    };

    const handleRenderWhiteboardBeat = async (beatId: string) => {
        const id = String(beatId || '').trim();
        if (!id || renderingWhiteboardBeatIds.includes(id)) {
            return;
        }
        if (!isAgentWhiteboardMode(agentVisualMode)) {
            showMessage('Chỉ render video beat ở chế độ whiteboard', 'warning');
            return;
        }
        setRenderingWhiteboardBeatIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        try {
            const res = await renderWhiteboardAgentBeat(shortVideoId, id);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Render video beat thất bại', 'error');
                return;
            }
            if (res.whiteboard_beat_renders && typeof res.whiteboard_beat_renders === 'object') {
                setWhiteboardBeatRenders(res.whiteboard_beat_renders);
            } else {
                setWhiteboardBeatRenders((prev) => ({
                    ...prev,
                    [id]: {
                        ...(prev[id] || {}),
                        status: 'queued',
                        job_id: Number(res.job_id || 0) || undefined,
                        error: '',
                    },
                }));
            }
            showMessage(parseApiMessage(res?.message) || 'Đã bắt đầu render video beat', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setRenderingWhiteboardBeatIds((prev) => prev.filter((x) => x !== id));
        }
    };

    const handleAddBeatVideoToCapcut = async (beatId: string) => {
        const id = String(beatId || '').trim();
        if (!id || uploadingBeatVideoToCapcutIds.includes(id)) {
            return;
        }
        if (!isAgentWhiteboardMode(agentVisualMode)) {
            showMessage('Chỉ upload video beat ở chế độ whiteboard', 'warning');
            return;
        }
        const entry = whiteboardBeatRenders[id];
        const status = String(entry?.status || '').trim();
        if (status !== 'completed') {
            showMessage('Chưa có video beat — hãy Render video beat trước', 'warning');
            return;
        }
        setUploadingBeatVideoToCapcutIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        try {
            const res = await addBeatVideoToCapcut(shortVideoId, id);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Upload video beat vào CapCut thất bại', 'error');
                return;
            }
            if (res?.project_name) {
                setCapcutProjectName(String(res.project_name).trim());
            }
            if (res?.project_path) {
                setCapcutProjectPath(String(res.project_path).trim());
            }
            showMessage(parseApiMessage(res?.message) || 'Đã thêm video beat vào CapCut', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setUploadingBeatVideoToCapcutIds((prev) => prev.filter((x) => x !== id));
        }
    };

    const applyAvatarSaveResult = (res: {
        agent_avatar_id?: number;
        agent_show_avatar?: boolean;
        agent_avatar_anchor?: AvatarPipAnchor;
        agent_avatar?: {
            show?: boolean;
            avatar_id?: number;
            title?: string;
            master_url?: string;
            anchor?: AvatarPipAnchor;
        };
    }) => {
        const nextId = Number(res?.agent_avatar_id ?? res?.agent_avatar?.avatar_id ?? 0);
        const resolvedId = Number.isFinite(nextId) && nextId > 0 ? nextId : 0;
        setAgentAvatarId(resolvedId);
        setAgentShowAvatar(resolvedId > 0);
        const nextAnchorRaw = String(
            res?.agent_avatar_anchor || res?.agent_avatar?.anchor || agentAvatarAnchor,
        ).trim() as AvatarPipAnchor;
        if (
            (['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'] as AvatarPipAnchor[])
                .includes(nextAnchorRaw)
        ) {
            setAgentAvatarAnchor(nextAnchorRaw);
        }
        let master = String(res?.agent_avatar?.master_url || '').trim();
        if (!master && resolvedId > 0) {
            const found = verifiedAvatars.find((item) => item.id === resolvedId);
            master = String(found?.master_url || '').trim();
        }
        setAgentAvatarMasterUrl(master);
    };

    const handleAgentAvatarApply = async (nextId: number, anchor: AvatarPipAnchor) => {
        if (savingAgentAvatar) {
            return;
        }
        setSavingAgentAvatar(true);
        try {
            const res = await saveAgentAvatar(shortVideoId, nextId, anchor);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được avatar',
                    'error',
                );
                return;
            }
            applyAvatarSaveResult(res);
            if (nextId > 0) {
                const found = verifiedAvatars.find((item) => item.id === nextId);
                const master = String(found?.master_url || res?.agent_avatar?.master_url || '').trim();
                if (master) {
                    setAgentAvatarMasterUrl(master);
                }
                setAgentShowAvatar(true);
                setAgentAvatarId(nextId);
                setAgentAvatarAnchor(anchor);
            }
            setAvatarDrawerOpen(false);
            showMessage(
                parseApiMessage(res?.message)
                    || (nextId > 0 ? 'Đã chọn avatar lip-sync' : 'Đã bỏ avatar'),
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingAgentAvatar(false);
        }
    };

    const handleAgentShowKaraokeChange = async (checked: boolean) => {
        if (savingShowKaraoke) {
            return;
        }
        setAgentShowKaraoke(checked);
        setSavingShowKaraoke(true);
        try {
            const res = await saveAgentShowKaraoke(shortVideoId, checked);
            if (!res?.success) {
                setAgentShowKaraoke(!checked);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình karaoke',
                    'error',
                );
                return;
            }
            setAgentShowKaraoke(res?.agent_show_karaoke !== false ? checked : false);
            showMessage(
                parseApiMessage(res?.message)
                    || (checked ? 'Đã bật text karaoke' : 'Đã tắt text karaoke'),
                'success',
            );
        } catch (e) {
            setAgentShowKaraoke(!checked);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingShowKaraoke(false);
        }
    };

    const handleAgentRenderDebugChange = async (checked: boolean) => {
        if (savingRenderDebug) {
            return;
        }
        setAgentRenderDebug(checked);
        setSavingRenderDebug(true);
        try {
            const res = await saveAgentRenderDebug(shortVideoId, checked);
            if (!res?.success) {
                setAgentRenderDebug(!checked);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình debug render',
                    'error',
                );
                return;
            }
            setAgentRenderDebug(Boolean(res?.agent_render_debug));
            showMessage(
                parseApiMessage(res?.message)
                    || (checked ? 'Đã bật debug render (3 beat đầu)' : 'Đã tắt debug render'),
                'success',
            );
        } catch (e) {
            setAgentRenderDebug(!checked);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingRenderDebug(false);
        }
    };

    const handleAgentClipAspectChange = async (nextAspect: ClipAspect) => {
        if (savingClipAspect || nextAspect === agentClipAspect) {
            return;
        }
        const hasBeatHtml = beatsHtmlCompleted > 0
            || Object.values(beatHtml).some((entry) => Boolean(String(entry?.html || '').trim()));
        const hasThumbnailHtml = Boolean(String(thumbnailHtml || '').trim());
        if (hasBeatHtml || hasThumbnailHtml) {
            const confirmed = window.confirm(
                'Đã có HTML beat hoặc thumbnail theo tỉ lệ hiện tại. '
                + 'Đổi tỉ lệ clip không tự xóa HTML cũ — bạn cần fill/render lại sau khi lưu. Tiếp tục?',
            );
            if (!confirmed) {
                return;
            }
        }
        const previousAspect = agentClipAspect;
        setAgentClipAspect(nextAspect);
        setSavingClipAspect(true);
        try {
            const res = await saveAgentClipAspect(shortVideoId, nextAspect);
            if (!res?.success) {
                setAgentClipAspect(previousAspect);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được tỉ lệ clip',
                    'error',
                );
                return;
            }
            setAgentClipAspect(normalizeClipAspect(res?.agent_clip_aspect || nextAspect));
            showMessage(parseApiMessage(res?.message) || 'Đã lưu tỉ lệ clip', 'success');
        } catch (e) {
            setAgentClipAspect(previousAspect);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingClipAspect(false);
        }
    };

    const handleAgentBeatFrequencyChange = async (nextFrequency: AgentBeatFrequency) => {
        if (savingBeatFrequency || nextFrequency === agentBeatFrequency) {
            return;
        }
        if (beatMapReady) {
            const confirmed = window.confirm(
                'Clip đã có beat-map. Đổi tần suất beat không tự chia lại — '
                + 'bạn cần chia lại beat để áp dụng pacing mới. Tiếp tục?',
            );
            if (!confirmed) {
                return;
            }
        }
        const previousFrequency = agentBeatFrequency;
        setAgentBeatFrequency(nextFrequency);
        setSavingBeatFrequency(true);
        try {
            const res = await saveAgentBeatFrequency(shortVideoId, nextFrequency);
            if (!res?.success) {
                setAgentBeatFrequency(previousFrequency);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được tần suất beat',
                    'error',
                );
                return;
            }
            setAgentBeatFrequency(normalizeAgentBeatFrequency(res?.agent_beat_frequency || nextFrequency));
            showMessage(parseApiMessage(res?.message) || 'Đã lưu tần suất beat', 'success');
        } catch (e) {
            setAgentBeatFrequency(previousFrequency);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingBeatFrequency(false);
        }
    };

    const handleAgentVisualModeChange = async (nextMode: AgentVisualMode) => {
        if (savingVisualMode || nextMode === agentVisualMode) {
            return;
        }
        const hasBeatHtml = beatsHtmlCompleted > 0
            || Object.values(beatHtml).some((entry) => Boolean(String(entry?.html || '').trim()));
        const hasBeatImage = beatsImageCompleted > 0
            || Object.values(beatImage).some((entry) => Boolean(String(entry?.image_url || '').trim()));
        if (hasBeatHtml || hasBeatImage) {
            const confirmed = window.confirm(
                'Clip đã có beat HTML hoặc beat image. '
                + 'Đổi chế độ visual không xóa dữ liệu cũ — beat có thể không khớp pipeline mới. Tiếp tục?',
            );
            if (!confirmed) {
                return;
            }
        }
        const previousMode = agentVisualMode;
        setAgentVisualMode(nextMode);
        setSavingVisualMode(true);
        try {
            const res = await saveAgentVisualMode(shortVideoId, nextMode);
            if (!res?.success) {
                setAgentVisualMode(previousMode);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được chế độ visual',
                    'error',
                );
                return;
            }
            setAgentVisualMode(normalizeAgentVisualMode(res?.agent_visual_mode || nextMode));
            showMessage(
                parseApiMessage(res?.message)
                    || (nextMode === 'whiteboard'
                        ? 'Đã chọn clip whiteboard'
                        : 'Đã chọn clip motion HTML'),
                'success',
            );
            loadRow();
        } catch (e) {
            setAgentVisualMode(previousMode);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingVisualMode(false);
        }
    };

    const handleAgentImageTextLangChange = async (nextLang: AgentImageTextLang) => {
        if (savingImageTextLang || nextLang === agentImageTextLang) {
            return;
        }
        const hasBeatImage = beatsImageCompleted > 0
            || Object.values(beatImage).some((entry) => Boolean(String(entry?.image_url || '').trim()));
        if (hasBeatImage) {
            const confirmed = window.confirm(
                'Clip đã có ảnh beat được sinh. '
                + 'Đổi ngôn ngữ chữ trên ảnh KHÔNG xóa ảnh cũ — chỉ các ảnh sinh ra sau mới theo ngôn ngữ mới. Tiếp tục?',
            );
            if (!confirmed) {
                return;
            }
        }
        const previousLang = agentImageTextLang;
        setAgentImageTextLang(nextLang);
        setSavingImageTextLang(true);
        try {
            const res = await saveAgentImageTextLang(shortVideoId, nextLang);
            if (!res?.success) {
                setAgentImageTextLang(previousLang);
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được ngôn ngữ chữ trên ảnh',
                    'error',
                );
                return;
            }
            setAgentImageTextLang(normalizeAgentImageTextLang(res?.agent_image_text_lang || nextLang));
            showMessage(
                parseApiMessage(res?.message)
                    || (nextLang === 'en'
                        ? 'Chữ trên ảnh beat sẽ dùng tiếng Anh'
                        : 'Chữ trên ảnh beat sẽ dùng tiếng Việt'),
                'success',
            );
        } catch (e) {
            setAgentImageTextLang(previousLang);
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingImageTextLang(false);
        }
    };

    const handleAgentWhiteboardConfigChange = async (patch: Partial<AgentWhiteboardConfig>) => {
        if (savingWhiteboardConfig) {
            return;
        }
        const nextConfig = { ...agentWhiteboardConfig, ...patch };
        setSavingWhiteboardConfig(true);
        try {
            const res = await saveAgentWhiteboardConfig(shortVideoId, nextConfig);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình whiteboard',
                    'error',
                );
                return false;
            }
            setAgentWhiteboardConfig(res.agent_whiteboard_config ?? nextConfig);
            showMessage(parseApiMessage(res?.message) || 'Đã lưu cấu hình whiteboard', 'success');
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingWhiteboardConfig(false);
        }
    };

    const handleSaveWhiteboardBeatOverride = async (
        beatId: string,
        override: Partial<AgentWhiteboardBeatOverride>,
    ) => {
        const id = String(beatId || '').trim();
        if (!id || savingWhiteboardBeatOverride) {
            return false;
        }
        setSavingWhiteboardBeatOverride(true);
        try {
            const res = await saveAgentWhiteboardBeatOverride(shortVideoId, id, override);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không lưu được cấu hình whiteboard beat',
                    'error',
                );
                return false;
            }
            if (res.agent_whiteboard_beat_overrides
                && typeof res.agent_whiteboard_beat_overrides === 'object') {
                setAgentWhiteboardBeatOverrides(res.agent_whiteboard_beat_overrides);
            } else if (res.override) {
                setAgentWhiteboardBeatOverrides((prev) => ({
                    ...prev,
                    [id]: res.override as AgentWhiteboardBeatOverride,
                }));
            }
            showMessage(parseApiMessage(res?.message) || 'Đã lưu cấu hình whiteboard beat', 'success');
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingWhiteboardBeatOverride(false);
        }
    };

    const handleStartFullAutoPipeline = async (
        mode: 'resume' | 'restart' = 'resume',
        fromStep?: string,
        untilStep?: string,
        opts?: { singleStep?: boolean },
    ) => {
        if (startingFullAuto) {
            return;
        }
        if (mode === 'restart' && fromStep) {
            const confirmStepLabel = fromStep
                && (FULL_AUTO_PIPELINE_STEP_LABELS as Record<string, string>)[fromStep]
                ? (FULL_AUTO_PIPELINE_STEP_LABELS as Record<string, string>)[fromStep]
                : fromStep;
            const confirmMessage = opts?.singleStep
                ? `Chỉ chạy bước «${confirmStepLabel}»? Bước này sẽ được tạo lại và các bước sau sẽ bị coi là hết hạn (phải chạy lại).`
                : (untilStep === 'upload'
                    ? `Chạy lại render + upload? Render beat / video hiện tại sẽ bị thay thế bởi bản mới.`
                    : `Chạy lại pipeline từ bước «${confirmStepLabel}»? Dữ liệu các bước từ đây trở đi sẽ bị tạo lại / ghi đè.`);
            if (!window.confirm(confirmMessage)) {
                return;
            }
        }
        setStartingFullAuto(true);
        try {
            const res = await startFullAutoPipeline(
                shortVideoId,
                mode,
                fromStep,
                untilStep,
                opts,
            );
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
            const untilLabel = untilStep
                && (FULL_AUTO_PIPELINE_STEP_LABELS as Record<string, string>)[untilStep]
                ? (FULL_AUTO_PIPELINE_STEP_LABELS as Record<string, string>)[untilStep]
                : untilStep;
            showMessage(
                parseApiMessage(res?.message)
                    || (mode === 'restart'
                        ? (opts?.singleStep
                            ? `Đã chạy lại chỉ bước «${stepLabel}»`
                            : (untilStep
                                ? `Đã chạy lại từ «${stepLabel}» đến «${untilLabel}»`
                                : (fromStep && fromStep !== 'script_create'
                                    ? `Đã chạy lại từ bước «${stepLabel}»`
                                    : 'Đã chạy lại pipeline A→Z từ đầu')))
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

    const handleRunSinglePipelineStep = async (stepKey: string) => {
        if (
            startingFullAuto
            || String(fullAutoPipeline?.status || '').trim().toLowerCase() === 'running'
        ) {
            return;
        }
        await handleStartFullAutoPipeline('restart', stepKey, undefined, { singleStep: true });
    };

    const handleRerunRenderUpload = async () => {
        if (
            startingFullAuto
            || String(fullAutoPipeline?.status || '').trim().toLowerCase() === 'running'
        ) {
            return;
        }
        await handleStartFullAutoPipeline('restart', 'render', 'upload');
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
                    parseApiMessage(res?.message) || 'Không dừng được pipeline',
                    'error',
                );
                return;
            }
            if (res.full_auto_pipeline) {
                setFullAutoPipeline(res.full_auto_pipeline);
            }
            showMessage(parseApiMessage(res?.message) || 'Đã dừng pipeline A→Z', 'success');
            await loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setCancellingFullAuto(false);
        }
    };

    const handleHeadlessNewChat = async (sessionId?: string) => {
        if (requestingHeadlessNewChat) {
            return;
        }
        setRequestingHeadlessNewChat(true);
        try {
            const res = await requestAgentHeadlessNewChat(shortVideoId, sessionId);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không tạo được chat Gemini mới',
                    'error',
                );
                return;
            }
            showMessage(
                parseApiMessage(res?.message) || 'Đã bỏ lần hiện tại và chuyển sang New chat',
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setRequestingHeadlessNewChat(false);
        }
    };

    const handleHeadlessNewSection = async (sessionId?: string) => {
        if (requestingHeadlessNewSection) {
            return;
        }
        setRequestingHeadlessNewSection(true);
        try {
            const res = await requestAgentHeadlessNewSection(shortVideoId, sessionId);
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message) || 'Không mở được browser mới',
                    'error',
                );
                return;
            }
            showMessage(
                parseApiMessage(res?.message) || 'Đã bỏ lần thử hiện tại và mở browser mới',
                'success',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setRequestingHeadlessNewSection(false);
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
                setNarrationSegments([]);
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
            && agentTiktokUrl === savedAgentTiktokUrl
            && agentYoutubeUrl === savedAgentYoutubeUrl
            && agentSourceFormat === savedAgentSourceFormat
            && additionalToSave === savedAgentAdditionalInfo
            && (
                agentSourceFormat !== 'topic_research'
                || (
                    topicResearchTopic === savedTopicResearchTopic
                    && topicResearchUrlsText === savedTopicResearchUrlsText
                )
            )
        ) {
            return;
        }

        setSavingSourceContent(true);
        try {
            const topicMeta = !linked && agentSourceFormat === 'topic_research'
                ? {
                    topic: topicResearchTopic.trim(),
                    urls: topicResearchUrlsText,
                }
                : undefined;
            const json = await saveAgentSourceContent(
                shortVideoId,
                linked ? '' : contentToSave,
                linked ? undefined : agentGithubRepo.trim(),
                linked ? undefined : agentSourceFormat,
                additionalToSave,
                linked ? undefined : agentTiktokUrl.trim(),
                topicMeta,
                linked ? undefined : agentYoutubeUrl.trim(),
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
                const nextTiktok = String(json?.agent_tiktok_url ?? agentTiktokUrl).trim();
                const nextYoutube = String(json?.agent_youtube_url ?? agentYoutubeUrl).trim();
                const nextFormat = String(json?.agent_source_format ?? agentSourceFormat).trim() || 'github_repo_review';
                setAgentSourceContent(nextSource);
                setSavedAgentSourceContent(nextSource);
                setAgentGithubRepo(nextGithub);
                setSavedAgentGithubRepo(nextGithub);
                setAgentTiktokUrl(nextTiktok);
                setSavedAgentTiktokUrl(nextTiktok);
                setAgentYoutubeUrl(nextYoutube);
                setSavedAgentYoutubeUrl(nextYoutube);
                setAgentSourceFormat(nextFormat);
                setSavedAgentSourceFormat(nextFormat);
                setContentPlainText(String(json?.content_plain_text ?? nextSource).trim());
                if (Array.isArray(json?.readme_media)) {
                    const loadedReadmeMedia = normalizeGithubReadmeMediaList(json.readme_media);
                    setReadmeMedia(loadedReadmeMedia);
                    readmeMediaSavedRef.current = JSON.stringify(loadedReadmeMedia);
                }
                if (json?.topic_research) {
                    setTopicResearch(json.topic_research);
                    const nextTopic = String(json.topic_research.topic || '').trim();
                    const nextUrlsText = Array.isArray(json.topic_research.urls)
                        ? json.topic_research.urls.map((u) => String(u || '').trim()).filter(Boolean).join('\n')
                        : topicResearchUrlsText;
                    setTopicResearchTopic(nextTopic);
                    setTopicResearchUrlsText(nextUrlsText);
                    setSavedTopicResearchTopic(nextTopic);
                    setSavedTopicResearchUrlsText(nextUrlsText);
                } else if (agentSourceFormat === 'topic_research') {
                    setSavedTopicResearchTopic(topicResearchTopic.trim());
                    setSavedTopicResearchUrlsText(topicResearchUrlsText);
                }
            }

            showMessage(parseApiMessage(json?.message) || (linked ? 'Đã lưu thông tin thêm' : 'Đã lưu nội dung nguồn'), 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingSourceContent(false);
        }
    };

    const handleFetchTopicResearch = async () => {
        if (marketingPostId > 0) {
            showMessage('Đã liên kết marketing post — không dùng nghiên cứu chủ đề', 'warning');
            return;
        }
        const urls = topicResearchUrlsText.trim();
        if (!urls) {
            showMessage('Nhập ít nhất 1 URL nguồn', 'warning');
            return;
        }
        setFetchingTopicResearch(true);
        try {
            if (agentSourceFormat !== 'topic_research') {
                setAgentSourceFormat('topic_research');
            }
            const json = await enqueueTopicResearchFetch(shortVideoId, {
                topic: topicResearchTopic.trim(),
                urls: topicResearchUrlsText,
            });
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không xếp hàng lấy nội dung', 'error');
                return;
            }
            if (json.topic_research) {
                setTopicResearch(json.topic_research);
            }
            showMessage(parseApiMessage(json?.message) || 'Đã xếp hàng lấy nội dung', 'success');
            loadRow({ syncAggregate: true, includeCatalogs: false });
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setFetchingTopicResearch(false);
        }
    };

    const handleSynthesizeTopicResearch = async () => {
        if (marketingPostId > 0) {
            showMessage('Đã liên kết marketing post — không dùng nghiên cứu chủ đề', 'warning');
            return;
        }
        const readyCount = (topicResearch?.sources || []).filter((s) => s.status === 'ready').length;
        if (readyCount <= 0) {
            showMessage('Chưa có nguồn ready — chạy Lấy nội dung trước', 'warning');
            return;
        }
        setSynthesizingTopicResearch(true);
        try {
            const json = await enqueueTopicResearchSynthesize(shortVideoId);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không xếp hàng tổng hợp', 'error');
                return;
            }
            if (json.topic_research) {
                setTopicResearch(json.topic_research);
            }
            showMessage(parseApiMessage(json?.message) || 'Đã xếp hàng tổng hợp nội dung', 'success');
            loadRow({ syncAggregate: true, includeCatalogs: false });
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSynthesizingTopicResearch(false);
        }
    };

    const handleSynthesizeRemix = async () => {
        if (marketingPostId > 0) {
            showMessage('Đã liên kết marketing post — không dùng remix', 'warning');
            return;
        }
        const raw = String(remix?.raw_transcript || '').trim();
        if (!raw) {
            showMessage('Chưa có transcript gốc — chạy Lấy thông tin trước', 'warning');
            return;
        }
        setSynthesizingRemix(true);
        try {
            const json = await enqueueRemixSynthesize(shortVideoId);
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không xếp hàng tổng hợp', 'error');
                return;
            }
            if (json.remix) {
                setRemix(json.remix);
            }
            showMessage(parseApiMessage(json?.message) || 'Đã xếp hàng tổng hợp nội dung', 'success');
            loadRow({ syncAggregate: true, includeCatalogs: false });
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSynthesizingRemix(false);
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
            const loadedReadmeMedia = normalizeGithubReadmeMediaList(mediaRaw);
            setReadmeMedia(loadedReadmeMedia);
            readmeMediaSavedRef.current = JSON.stringify(loadedReadmeMedia);

            showMessage(parseApiMessage(json?.message) || 'Đã lấy thông tin repo', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setFetchingGithubReadme(false);
        }
    };

    const handleFetchTiktokScript = async () => {
        if (marketingPostId > 0) {
            showMessage('Đã liên kết marketing post — không lấy script TikTok', 'warning');
            return;
        }
        const url = agentTiktokUrl.trim();
        if (!url) {
            showMessage('Nhập link TikTok trước', 'warning');
            return;
        }
        if (!isTikTokUrl(url)) {
            showMessage('URL không phải link TikTok hợp lệ', 'warning');
            return;
        }
        setFetchingTiktokScript(true);
        try {
            const json = await extractVideoScript(url, 'tiktok');
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không lấy được script TikTok', 'error');
                return;
            }

            const cleaned = String(json?.cleaned_script || '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .trim();
            if (!cleaned) {
                showMessage('Không lấy được caption / transcript từ video', 'warning');
                return;
            }

            const title = String(json?.meta?.title || '').trim();
            const uploader = String(json?.meta?.uploader || '').trim();
            const durationSec = json?.meta?.duration_sec;
            const saveRes = await saveRemixTranscript(shortVideoId, {
                platform: 'tiktok',
                rawTranscript: cleaned,
                meta: {
                    title,
                    uploader,
                    duration_sec: typeof durationSec === 'number' ? durationSec : null,
                },
            });
            if (!saveRes?.success) {
                showMessage(parseApiMessage(saveRes?.message) || 'Không lưu được transcript gốc', 'error');
                return;
            }
            if (saveRes.remix) {
                setRemix(saveRes.remix);
            }

            const metaLines: string[] = [];
            if (uploader) {
                metaLines.push(`TikTok @${uploader.replace(/^@/, '')}`);
            }
            if (title) {
                metaLines.push(`Tiêu đề: ${title}`);
            }
            if (metaLines.length > 0) {
                setAgentAdditionalInfo((prev) => {
                    const base = prev.trim();
                    const addition = metaLines.join('\n');
                    if (!base) {
                        return addition;
                    }
                    const missing = metaLines.filter((line) => !base.includes(line));
                    if (missing.length === 0) {
                        return base;
                    }
                    return `${base}\n${missing.join('\n')}`;
                });
            }

            showMessage(parseApiMessage(json?.message) || 'Đã lấy transcript TikTok — bấm Tổng hợp nội dung', 'success');
            loadRow({ syncAggregate: true, includeCatalogs: false });
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setFetchingTiktokScript(false);
        }
    };

    const handleFetchYoutubeScript = async () => {
        if (marketingPostId > 0) {
            showMessage('Đã liên kết marketing post — không lấy script YouTube', 'warning');
            return;
        }
        const url = agentYoutubeUrl.trim();
        if (!url) {
            showMessage('Nhập link YouTube trước', 'warning');
            return;
        }
        if (!isYouTubeUrl(url)) {
            showMessage('URL không phải link YouTube hợp lệ', 'warning');
            return;
        }
        setFetchingYoutubeScript(true);
        try {
            const json = await extractVideoScript(url, 'youtube');
            if (!json?.success) {
                showMessage(parseApiMessage(json?.message) || 'Không lấy được script YouTube', 'error');
                return;
            }

            const cleaned = String(json?.cleaned_script || '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .trim();
            if (!cleaned) {
                showMessage('Không thấy script', 'warning');
                return;
            }

            const title = String(json?.meta?.title || '').trim();
            const uploader = String(json?.meta?.uploader || '').trim();
            const durationSec = json?.meta?.duration_sec;
            const saveRes = await saveRemixTranscript(shortVideoId, {
                platform: 'youtube',
                rawTranscript: cleaned,
                meta: {
                    title,
                    uploader,
                    duration_sec: typeof durationSec === 'number' ? durationSec : null,
                },
            });
            if (!saveRes?.success) {
                showMessage(parseApiMessage(saveRes?.message) || 'Không lưu được transcript gốc', 'error');
                return;
            }
            if (saveRes.remix) {
                setRemix(saveRes.remix);
            }

            const metaLines: string[] = [];
            if (uploader) {
                metaLines.push(`YouTube ${uploader}`);
            }
            if (title) {
                metaLines.push(`Tiêu đề: ${title}`);
            }
            if (metaLines.length > 0) {
                setAgentAdditionalInfo((prev) => {
                    const base = prev.trim();
                    const addition = metaLines.join('\n');
                    if (!base) {
                        return addition;
                    }
                    const missing = metaLines.filter((line) => !base.includes(line));
                    if (missing.length === 0) {
                        return base;
                    }
                    return `${base}\n${missing.join('\n')}`;
                });
            }

            showMessage(parseApiMessage(json?.message) || 'Đã lấy transcript YouTube — bấm Tổng hợp nội dung', 'success');
            loadRow({ syncAggregate: true, includeCatalogs: false });
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setFetchingYoutubeScript(false);
        }
    };

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
    }, [visualCatalog]);

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
                    setNarrationSegments([]);
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

    const handleVisualStyleChange = async (nextStyle: string) => {
        setSavingVisualStyle(true);
        try {
            const res = await saveAgentVisualStyle(shortVideoId, nextStyle);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được visual style', 'error');
                return;
            }
            setVisualStyle(String(res?.visual_style || res?.hf_theme || nextStyle));
            setVisualStyleResolved(String(res?.visual_style_resolved || res?.hf_theme_resolved || '').trim());
            setVisualStyleSource(String(res?.visual_style_source || res?.hf_theme_source || '').trim());
            showMessage(parseApiMessage(res?.message) || 'Đã lưu visual style', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingVisualStyle(false);
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
                setNarrationSegments([]);
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

    const loadSaydiVoiceSamples = React.useCallback(async (forceRefresh = false) => {
        setSaydiLoading(true);
        setSaydiError('');
        try {
            const res = await fetchSaydiVoiceSamples(shortVideoId, { forceRefresh });
            if (!res?.success) {
                setSaydiError(parseApiMessage(res?.message) || 'Không tải được danh sách giọng Saydi');
                setSaydiSamples([]);
                return;
            }
            setSaydiSamples(Array.isArray(res.samples) ? res.samples : []);
            setSaydiGenders(Array.isArray(res.genders) ? res.genders : []);
            setSaydiLanguages(Array.isArray(res.languages) ? res.languages : []);
            if (res.agent_saydi_voice) {
                setSaydiVoice(String(res.agent_saydi_voice).trim() || DEFAULT_SAYDI_VOICE);
            }
        } catch (e) {
            setSaydiError(e instanceof Error ? e.message : String(e));
            setSaydiSamples([]);
        } finally {
            setSaydiLoading(false);
        }
    }, [shortVideoId]);

    const handleSaydiVoiceChange = async (voiceName: string): Promise<boolean> => {
        const voice = String(voiceName || '').trim();
        if (!voice || voice === saydiVoice) {
            return false;
        }

        const shouldAskRerender = hasAudio || scriptApproved;
        if (shouldAskRerender) {
            const ok = window.confirm(
                'Đổi giọng Saydi? Audio TTS hiện tại sẽ được tạo lại với giọng mới (MP3 cũ bị thay sau khi queue hoàn tất).',
            );
            if (!ok) {
                return false;
            }
        }

        setSavingSaydiVoice(true);
        try {
            const res = await saveAgentSaydiVoice(shortVideoId, voice);
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được giọng Saydi', 'error');
                return false;
            }
            setSaydiVoice(String(res.agent_saydi_voice || voice).trim() || DEFAULT_SAYDI_VOICE);
            showMessage(parseApiMessage(res?.message) || 'Đã lưu giọng Saydi', 'success');
            await maybeRegenerateOmnivoiceTts(shouldAskRerender);
            loadRow();
            return true;
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
            return false;
        } finally {
            setSavingSaydiVoice(false);
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

    const handleSaydiVoicePreview = React.useCallback((item: SaydiVoiceSampleItem) => {
        const url = resolveSaydiVoicePreviewUrl(item);
        if (!url) {
            showMessage('Không có file nghe thử cho giọng Saydi này', 'warning');
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
            showMessage('Không phát được file nghe thử Saydi', 'warning');
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

    const handleSaveSocialCopy = async () => {
        if (!shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
            return;
        }
        setSavingSocialCopy(true);
        try {
            const res = await saveSocialCopy(shortVideoId, {
                socialDescription,
                socialHashtags,
            });
            if (!res?.success) {
                showMessage(parseApiMessage(res?.message) || 'Không lưu được description/hashtags', 'error');
                return;
            }
            const nextDesc = String(res.social_description ?? socialDescription);
            const nextTags = String(res.social_hashtags ?? socialHashtags);
            setSocialDescription(nextDesc);
            setSavedSocialDescription(nextDesc);
            setSocialHashtags(nextTags);
            setSavedSocialHashtags(nextTags);
            savedSocialDescriptionRef.current = nextDesc;
            savedSocialHashtagsRef.current = nextTags;
            showMessage(parseApiMessage(res?.message) || 'Đã lưu description / hashtags', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingSocialCopy(false);
        }
    };

    const handlePostSocial = async (socialIndex: number) => {
        const account = socialAccounts.find((item) => item.index === socialIndex);
        if (!account) {
            showMessage('Không tìm thấy tài khoản social', 'error');
            return;
        }
        const socialType = String(account.social_type || '').toLowerCase();
        const isFacebook = socialType === 'facebook';
        const isTikTok = socialType === 'tiktok';
        if (!isFacebook && !isTikTok) {
            showMessage(`Chưa hỗ trợ đăng ${socialType || 'social'}`, 'warning');
            return;
        }
        if (isFacebook && !account.has_facebook_session) {
            showMessage('Tài khoản chưa có cookie Facebook hợp lệ (c_user + xs)', 'warning');
            return;
        }
        if (isTikTok && !account.has_tiktok_session) {
            showMessage('Tài khoản chưa có cookie TikTok hợp lệ (sessionid)', 'warning');
            return;
        }
        if (!postEligible) {
            showMessage('Bật "Đủ điều kiện post" trước khi đăng social', 'warning');
            return;
        }
        if (!agentVideoUrl) {
            showMessage('Chưa có agent_video_url — render video trước', 'warning');
            return;
        }
        const confirmLabel = isFacebook
            ? `Đăng Reels lên Facebook "${account.title || `#${account.index}`}"?`
            : `Đăng lên TikTok "${account.title || `#${account.index}`}"?`;
        if (!window.confirm(
            `${confirmLabel}\n`
            + 'Trình duyệt sẽ mở (headed). Kiểm tra tài khoản rồi xác nhận Publish nếu cần.',
        )) {
            return;
        }
        try {
            const res = isFacebook
                ? await postFacebookReels(shortVideoId, {
                    socialIndex: account.index,
                    accountTitle: account.title,
                    autoPublish: false,
                    openBrowser: true,
                    caption: socialDescription.trim(),
                    hashtags: socialHashtags.trim(),
                })
                : await postTikTok(shortVideoId, {
                    socialIndex: account.index,
                    accountTitle: account.title,
                    autoPublish: false,
                    openBrowser: true,
                    caption: socialDescription.trim(),
                    hashtags: socialHashtags.trim(),
                });
            if (!res?.success) {
                showMessage(
                    parseApiMessage(res?.message)
                        || (isFacebook ? 'Đăng Reels thất bại' : 'Đăng TikTok thất bại'),
                    'error',
                );
                return;
            }
            if (typeof res.social_posted === 'boolean') {
                setSocialPosted(res.social_posted);
            }
            showMessage(
                parseApiMessage(res?.message)
                    || (isFacebook ? 'Đã xử lý đăng Reels' : 'Đã xử lý đăng TikTok'),
                'success',
            );
            loadRow();
            onUploaded?.();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        }
    };

    /** @deprecated dùng handlePostSocial */
    const handlePostFacebookReels = handlePostSocial;

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
            setNarrationSegments([]);
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

    const missingBeatImageCount = React.useMemo(
        () => countMissingBeatImage(beatMap, beatImage),
        [beatMap, beatImage],
    );

    const beatRenderErrorIds = React.useMemo(
        () => listBeatRenderErrorIds(beatHtml),
        [beatHtml],
    );

    const beatImageRenderErrorIds = React.useMemo(
        () => listBeatImageRenderErrorIds(beatImage),
        [beatImage],
    );

    const beatsRenderErrorCount = beatRenderErrorIds.length;
    const isWhiteboardMode = isAgentWhiteboardMode(agentVisualMode);

    const whiteboardRenderProgress = React.useMemo((): WhiteboardRenderProgress => {
        if (!isWhiteboardMode) {
            return deriveWhiteboardRenderProgress({});
        }
        return deriveWhiteboardRenderProgress({
            sections: beatMap?.sections,
            renders: whiteboardBeatRenders,
            pipelineStep: fullAutoPipeline?.current_step,
            pipelineStatus: fullAutoPipeline?.status,
        });
    }, [
        isWhiteboardMode,
        beatMap?.sections,
        whiteboardBeatRenders,
        fullAutoPipeline?.current_step,
        fullAutoPipeline?.status,
    ]);

    return {
        title,
        shortVideoId,
        audioScript,
        setAudioScript: handleAudioScriptChange,
        scriptDirty,
        scriptApproved,
        audioFileUrl,
        audioDurationSec,
        narrationSegments,
        agentTtsAuto,
        agentAutoFillBeatHtml,
        savingAutoFillBeatHtml,
        fullAutoStepToggles,
        savingFullAutoStepToggles,
        handleFullAutoStepToggleChange,
        beatImageFillMode,
        savingBeatImageFillMode,
        handleBeatImageFillModeChange,
        beatImageFillOnlyMissing,
        handleBeatImageFillOnlyMissingChange,
        agentGeminiOpenBrowser,
        savingGeminiOpenBrowser,
        agentGithubScreenshotHomepage,
        savingGithubScreenshotHomepage,
        agentIntroduceApp,
        savingIntroduceApp,
        handleIntroduceAppChange,
        agentAudioScriptStyleId,
        savingAudioScriptStyle,
        audioScriptStyles,
        handleAgentAudioScriptStyleChange,
        desiredScriptDurationSec,
        desiredScriptDurationInput,
        setDesiredScriptDurationInput,
        savingDesiredScriptDuration,
        commitDesiredScriptDuration,
        capcutProjectName,
        setCapcutProjectName,
        capcutProjectPath,
        setCapcutProjectPath,
        savingCapcutConfig,
        addingAudioToCapcut,
        uploadingAllToCapcut,
        handleSaveCapcutConfig,
        handleAddAudioToCapcut,
        handleUploadAllToCapcut,
        whiteboardBeatRenders,
        whiteboardRenderProgress,
        renderingWhiteboardBeatIds,
        uploadingBeatVideoToCapcutIds,
        handleRenderWhiteboardBeat,
        handleAddBeatVideoToCapcut,
        agentAvatarId,
        agentShowAvatar,
        agentAvatarAnchor,
        agentAvatarMasterUrl,
        verifiedAvatars,
        savingAgentAvatar,
        agentShowKaraoke,
        savingShowKaraoke,
        handleAgentShowKaraokeChange,
        agentRenderDebug,
        savingRenderDebug,
        handleAgentRenderDebugChange,
        agentClipAspect,
        savingClipAspect,
        handleAgentClipAspectChange,
        agentBeatFrequency,
        savingBeatFrequency,
        handleAgentBeatFrequencyChange,
        agentVisualMode,
        agentWhiteboardConfig,
        agentWhiteboardBeatOverrides,
        savingVisualMode,
        savingWhiteboardConfig,
        savingWhiteboardBeatOverride,
        isWhiteboardMode,
        agentImageTextLang,
        savingImageTextLang,
        whiteboardImageTextLangRule,
        handleAgentVisualModeChange,
        handleAgentImageTextLangChange,
        handleAgentWhiteboardConfigChange,
        handleSaveWhiteboardBeatOverride,
        avatarDrawerOpen,
        setAvatarDrawerOpen,
        geminiFillStatus,
        geminiFillProgress,
        geminiRefineVisualStatus,
        geminiRefineVisualError,
        geminiRefineHtmlStatus,
        geminiRefineHtmlError,
        quickIterateQueue,
        quickIterateActiveBeatId,
        quickIterateBeatStages,
        geminiThumbnailFillStatus,
        geminiThumbnailIdeaStatus,
        thumbnailGeminiFillError,
        thumbnailGeminiIdeaError,
        thumbnailBlock,
        thumbnailHtml,
        thumbnailImageUrl,
        enqueueingThumbnailIdea,
        enqueueingThumbnailFill,
        capturingThumbnail,
        savingThumbnailQa,
        handleSaveThumbnailQa,
        handleEnqueueThumbnailIdea,
        handleEnqueueThumbnailFill,
        handleRegenerateThumbnailFromQa,
        handleCaptureThumbnail,
        geminiDivisionStatus,
        geminiDivisionError,
        headlessBrowserActive,
        geminiScriptStatus,
        geminiScriptMode,
        geminiScriptError,
        audioScriptTtsReading,
        setAudioScriptTtsReading,
        ttsReadingDirty,
        geminiScriptPhoneticStatus,
        geminiScriptPhoneticError,
        openingScriptPhoneticHeadless,
        savingScriptTtsReading,
        handleEnqueueScriptPhoneticHeadless,
        handleSaveScriptTtsReading,
        handleManualScriptPhoneticSave,
        fullAutoPipeline,
        githubTopEnrich,
        topicResearch,
        topicResearchTopic,
        setTopicResearchTopic,
        topicResearchUrlsText,
        setTopicResearchUrlsText,
        savedTopicResearchTopic,
        savedTopicResearchUrlsText,
        fetchingTopicResearch,
        synthesizingTopicResearch,
        handleFetchTopicResearch,
        handleSynthesizeTopicResearch,
        remix,
        synthesizingRemix,
        handleSynthesizeRemix,
        githubTopRepos,
        startingFullAuto,
        cancellingFullAuto,
        requestingHeadlessNewChat,
        requestingHeadlessNewSection,
        selectedPlatforms,
        chatgptWebAvailable,
        ttsPending,
        ttsFailed,
        needsTtsEnqueue,
        lastError,
        agentVideoStatus,
        agentVideoUrl,
        agentVideoRenderedAt,
        hasLocalFinalMp4,
        localFinalMp4Url,
        localFinalMp4OpenUrl,
        localFinalMp4SizeBytes,
        localFinalMp4ModifiedAt,
        uploadingLocalAgentVideo,
        handleUploadLocalAgentVideo,
        agentTtsJobId,
        agentTtsStatus,
        ttsChain,
        workflowMode,
        workflowPhase,
        readyForPhase2,
        hasAgentVideo,
        agentVideoSummary,
        visualStyle,
        visualStyleResolved,
        visualStyleSource,
        visualStyleCatalog,
        omnivoiceVoice,
        omnivoiceVoiceMode,
        omnivoiceVoiceDesign,
        omnivoiceSpeed,
        omnivoiceVoiceCatalog,
        omnivoiceVoiceDesignTokens,
        saydiVoice,
        saydiSamples,
        saydiGenders,
        saydiLanguages,
        saydiLoading,
        saydiError,
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
        agentTiktokUrl,
        setAgentTiktokUrl,
        savedAgentTiktokUrl,
        agentYoutubeUrl,
        setAgentYoutubeUrl,
        savedAgentYoutubeUrl,
        agentSourceFormat,
        setAgentSourceFormat,
        savedAgentSourceFormat,
        agentSourceFormatCatalog,
        contentPlainText,
        savingSourceContent,
        fetchingGithubReadme,
        fetchingTiktokScript,
        fetchingYoutubeScript,
        appMobileTitle,
        thumbnail,
        postEligible,
        socialPosted,
        socialAccounts,
        socialDescription,
        setSocialDescription,
        savedSocialDescription,
        socialHashtags,
        setSocialHashtags,
        savedSocialHashtags,
        thumbnailUrl,
        savingSocialCopy,
        handleSaveSocialCopy,
        renderMode,
        importHtml,
        beatMap,
        beatMapJsonDraft,
        beatHtml,
        beatImage,
        beatVersions,
        beatActiveVersionId,
        missingBeatHtmlCount,
        missingBeatImageCount,
        beatsImageTotal,
        beatsImageCompleted,
        geminiImageFillStatus,
        beatsRenderErrorCount,
        beatRenderErrorIds,
        beatImageRenderErrorIds,
        beatMapReady,
        beatsHtmlTotal,
        beatsHtmlCompleted,
        activeBeatId,
        setActiveBeatId,
        beatEditorFocusRequest,
        beatPlaybackSeekRequest,
        focusBeatEditor,
        handleSeekBeatPlayback,
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
        bgmLoop,
        handleBgmLoopChange,
        bgmPromptSuggestions,
        bgmPromptSuggestionsLoading,
        handleFetchBgmPromptSuggestions,
        bgmManualUploading,
        handleUploadBgmMp3,
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
        handleReadmeMediaAltChange,
        handleReadmeMediaAltBlur,
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
        handleUpdateBgmSegmentVolume,
        handleReorderBgmSegments,
        handleLaunchImportHtmlAssemble,
        handleLaunchImportHtmlAssembleAllowMismatch,
        handleDismissCaptionMismatchDialog,
        handleLaunchImportHtmlPreview,
        handleLaunchImportHtmlRender,
        handleLaunchImportHtmlRenderAllowMismatch,
        uploading,
        savingTtsMode,
        savingVisualStyle,
        savingOmnivoiceVoice,
        savingSaydiVoice,
        handleSaydiVoiceChange,
        loadSaydiVoiceSamples,
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
        regeneratingBeatImageBeatId,
        openingAllMissingBeatGemini,
        openingAllMissingBeatMetaAi,
        openingAllMissingBeatAiStudio,
        fillingAllMissingBeatGeminiHeadless,
        fillingAllMissingBeatGeminiHeadlessProgress,
        hasScript,
        hasAudio,
        statusChip,
        chainLabel,
        loadRow,
        handleTtsAutoChange,
        handleAutoFillBeatHtmlChange,
        handleGeminiOpenBrowserChange,
        handleGithubScreenshotHomepageChange,
        handleAgentAvatarApply,
        handleStartFullAutoPipeline,
        handleRunSinglePipelineStep,
        handleRerunRenderUpload,
        handleCancelFullAutoPipeline,
        handleHeadlessNewChat,
        handleHeadlessNewSection,
        handleOmnivoiceSpeedChange,
        handleVisualStyleChange,
        handleOmnivoiceVoiceChange,
        handleOmnivoiceVoicePreview,
        handleSaydiVoicePreview,
        handleOmnivoiceVoiceDesignPreview,
        handlePostEligibleChange,
        handleSocialPostedChange,
        handlePostSocial,
        handlePostFacebookReels,
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
        handleBeatMapJsonChange,
        handleManualBeatDivisionSave,
        handleManualScriptCreateSave,
        handleBeatVisualDescriptionChange,
        handleSaveBeatQa,
        handleQuickIterateBeatFromQa,
        handleEditHtmlBeatFromQa,
        handleSaveBeatVersion,
        handleRestoreBeatVersion,
        handleBeatHtmlChange,
        commitBeatHtmlChange,
        commitBeatImageChange,
        handleBeatImagePromptChange,
        handleOpenBeatImageDuckAiManual,
        handleOpenBeatImageMetaAiManual,
        handleUploadBeatImageFromFile,
        /** @deprecated Alias tương thích cũ */
        handleRegenerateBeatImageZImage: handleOpenBeatImageDuckAiManual,
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
        handleOpenBeatMetaAi,
        handleOpenBeatGeminiHeadless,
        handleOpenAllMissingBeatGemini,
        handleOpenAllMissingBeatMetaAi,
        handleOpenAllMissingBeatAiStudio,
        handleFillAllMissingBeatGeminiHeadless,
        handleImportHtmlChange,
        runWhisperTranscribe,
        /** @deprecated Alias cho bundle cũ — dùng handleOpenBeatDivisionGemini */
        handleCopyChatbotPrompt: handleOpenBeatDivisionGemini,
        handleSaveScript,
        handleSaveSourceContent,
        handleFetchGithubReadme,
        handleFetchTiktokScript,
        handleFetchYoutubeScript,
        handleApproveScript,
        handleRegenerateTts,
        handleRetryTts,
        handleUploadMp3,
        showMessage,
    };
}
