import SceneAssetsPanel from './AgentVideo/SceneAssetsPanel';
import ShortVideoAgentSaydiCastSettings from './AgentVideo/ShortVideoAgentSaydiCastSettings';
import React from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import LandscapeOutlinedIcon from '@mui/icons-material/LandscapeOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';
import {
    importManualBeatPromptFile,
    storyV2Request,
} from './AgentVideo/agentVideoApi';
import {
    buildWorkflowBreakdownPlan,
    copyWorkflowPromptToClipboard,
    fetchWorkflowOutputs,
    fetchWorkflowPromptContent,
    fetchWorkflowPromptText,
    fetchSfxPromptContext,
    formatWorkflowBeatScript,
    getWorkflowContrastTextColor,
    MANUAL_BEAT_PROMPTS_SAVED_EVENT,
    parseWorkflowPromptChoiceValues,
    resolveWorkflowPromptChoiceFile,
    saveWorkflowOutput,
    splitWorkflowBeatBlocks,
    splitWorkflowBeats,
    splitWorkflowStepTitle,
    WORKFLOW_AUDIO_SCRIPT_BEATS_KEY,
    WORKFLOW_AUDIO_SCRIPT_KEY,
    WORKFLOW_INPUT_PROMPT_KEY,
    WORKFLOW_PROMPT_CHOICE_KEY,
    type WorkflowBreakdownChunk,
    type WorkflowDefinition,
    type WorkflowOutputsMap,
    type WorkflowPromptContext,
} from 'helpers/marketingWorkflowPrompts';
import {
    fetchDeepseekVideoImageSessionStatus,
    openDeepseekVideoImageSession,
} from 'helpers/marketingDeepseekVideoImage';
import { AGENT_AUDIO_SCRIPT_SAVED_EVENT } from 'helpers/marketingAgentAudioScriptGeminiWorkflow';
import MarketingWorkflowBreakdown from './MarketingWorkflowBreakdown';
import {
    parseWorkflowAssetRegister,
    resolveWorkflowResourceKind,
} from 'helpers/marketingWorkflowResourceImport';
import {
    importShortVideoResources,
    parseShortVideoResourceApiMessage,
} from 'helpers/marketingShortVideoResourceApi';

function assertWorkflowSfxPromptContext(file: string, context: WorkflowPromptContext): void {
    if (file.split('/').pop() !== 'generate-sfx.md') return;
    const missing = ['PROJECT_INFO', 'FULL_BEATS'].filter((key) => !String(context[key] || '').trim() || String(context[key]).trim() === `[${key}]`);
    if (missing.length) throw new Error(`Chưa tải được dữ liệu SFX (${missing.join(', ')}). Kiểm tra kịch bản đã lưu và thử lại; chưa mở DeepSeek để tránh gửi prompt thiếu dữ liệu.`);
}

/** 1 mục cấu hình (Kênh / Phong cách script / Phong cách hình ảnh) — luôn hiện kèm nút "Cấu hình". */
export type WorkflowConfigItem = {
    /** 'channel' | 'script-style' | 'image-style' — dùng để mở đúng drawer cấu hình. */
    key: string;
    /** Nhãn hiển thị (VD "Kênh", "Phong cách script", "Phong cách hình ảnh"). */
    label: string;
    /** Màu alert khi CHƯA cấu hình — khớp màu button cấu hình ở video timeline. */
    severity: 'info' | 'warning' | 'error' | 'success';
    /** Đã cấu hình: alert chuyển success + nút cấu hình thêm icon check. */
    configured: boolean;
};

type Props = {
    open: boolean;
    onClose: () => void;
    workflow: WorkflowDefinition | null;
    /** Toàn bộ workflow — render thành tab trong drawer (1 workflow = 1 tab). */
    workflows?: WorkflowDefinition[];
    /** Đổi tab workflow. */
    onSelectWorkflow?: (key: string) => void;
    /** Giá trị thay các key [key] trong prompt khi copy. VD: { topic: title } */
    promptContext?: WorkflowPromptContext;
    /** ID short video hiện tại — load/lưu workflow outputs (key/value theo updateField). */
    shortVideoId?: number;
    /** Audio script hiện tại — thay key [AUDIO-SCRIPT] khi copy prompt. */
    audioScript?: string;
    /**
     * Danh sách cấu hình Kênh / Phong cách script / Phong cách hình ảnh — LUÔN hiển thị đủ,
     * mỗi mục 1 alert kèm nút "Cấu hình". Khi còn mục chưa cấu hình: chặn mở phiên DeepSeek/ChatGPT.
     */
    configItems?: WorkflowConfigItem[];
    /** Mở drawer cấu hình tương ứng khi user bấm "Cấu hình" trên alert. */
    onConfigureConfig?: (key: string) => void;
};

type UpdateDialogState = {
    itemKey: string;
    label: string;
    fieldKey: string;
    /** Loại nút update asset nhanh (buttonUpdate trong index.md): characterUpdate | spaceUpdate. */
    buttonUpdate: string;
};

/** Trạng thái phiên DeepSeek của 1 bước (sessionKey = workflow#step). */
type DeepseekStepState = {
    sessionAlive: boolean;
    chatUrl: string;
    hasOriginalAudio: boolean;
    beatCount: number;
    translationCount: number;
    message: string;
};

const EMPTY_DEEPSEEK_STATE: DeepseekStepState = {
    sessionAlive: false,
    chatUrl: '',
    hasOriginalAudio: false,
    beatCount: 0,
    translationCount: 0,
    message: '',
};

/**
 * Nhịp poll trạng thái phiên DeepSeek khi đang mở drawer. User thao tác trên browser
 * DeepSeek (lưu beat/dịch/audio/URL chat) → CMS tự cập nhật gần realtime.
 * Khi tab bị ẩn thì giãn nhịp để đỡ tốn request.
 */
const DEEPSEEK_POLL_INTERVAL_MS = 4000;
const DEEPSEEK_POLL_HIDDEN_INTERVAL_MS = 8000;

/**
 * TẠM THỜI ẨN nút "Mở ChatGPT" (đặt false để bật lại). Khi false: không render box phiên
 * ChatGPT và không poll trạng thái phiên ChatGPT; DeepSeek giữ nguyên.
 */
const ENABLE_CHATGPT_SESSION = false;

/**
 * Keyword cần thay trong prompt:
 * - ready   → có định nghĩa + có data (xanh)
 * - empty   → có định nghĩa nhưng chưa có data (đỏ)
 * - unknown → không có định nghĩa, không xuất hiện trong data (xám)
 */
export type PromptKeywordState = 'ready' | 'empty' | 'unknown';

/**
 * Các key đặc biệt do FE tự inject khi copy prompt (không khai báo trong index.md) — CHỈ gồm
 * các key thực sự là placeholder thay được trong prompt. Dùng để nhận biết keyword "có định nghĩa".
 */
const SPECIAL_PROMPT_KEYS = [
    'topic',
    'script-style',
    'IMAGE-STYLE',
    'STYLE_REFERENCE',
    'THUMBNAIL_FORMAT',
    WORKFLOW_AUDIO_SCRIPT_KEY,
    'PASTE ORIGINAL AUDIO HERE',
    'PASTE CHARACTER SHEET DESCRIPTION HERE',
    'PROJECT_INFO',
    'FULL_BEATS',
    'TARGET_RANGE',
    'PREVIOUS_CUES',
];

/** Tách các keyword dạng [key] trong nội dung prompt (giữ thứ tự, bỏ trùng). */
function extractPromptKeywords(content: string): string[] {
    const text = String(content || '');
    const regex = /\[([^[\]\n]{1,60})\]/g;
    const seen = new Set<string>();
    const out: string[] = [];
    let match: RegExpExecArray | null = regex.exec(text);
    while (match) {
        const token = match[1].trim();
        const norm = token.toLowerCase();
        if (token && !seen.has(norm)) {
            seen.add(norm);
            out.push(token);
        }
        match = regex.exec(text);
    }
    return out;
}

/**
 * Danh sách keyword của prompt: xanh = có data (sẽ được thay), đỏ = có định nghĩa nhưng chưa
 * có data, vàng = không có định nghĩa (chỉ là text trong prompt).
 */
function PromptKeywordChips({
    keywords,
    getState,
}: {
    keywords: string[];
    getState: (keyword: string) => PromptKeywordState;
}) {
    if (keywords.length === 0) {
        return null;
    }
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 0.25 }}>
            {keywords.map((keyword) => {
                const state = getState(keyword);
                const color = state === 'ready' ? 'success' : state === 'empty' ? 'error' : 'default';
                const title = state === 'ready'
                    ? 'Có định nghĩa + có data — sẽ được thay khi copy'
                    : state === 'empty'
                        ? 'Có định nghĩa nhưng chưa có data'
                        : 'Không có định nghĩa — không xuất hiện trong data, giữ nguyên trong prompt';
                return (
                    <Tooltip key={keyword} title={title} placement="top">
                        <Chip
                            size="small"
                            variant="filled"
                            color={color}
                            label={`[${keyword}]`}
                            sx={{ height: 20, fontSize: 10.5, '& .MuiChip-label': { px: 0.75 } }}
                        />
                    </Tooltip>
                );
            })}
        </Box>
    );
}

export default function MarketingWorkflowDrawer({
    open,
    onClose,
    workflow,
    workflows = [],
    onSelectWorkflow,
    promptContext,
    shortVideoId,
    audioScript,
    configItems = [],
    onConfigureConfig,
}: Props) {
    const api = useAjax();
    const effectiveConfigItems = React.useMemo(() => configItems.map((item) => (
        item.key === 'image-style' && workflow?.workflowImageStylePrompt !== undefined
            ? { ...item, configured: Boolean(workflow.workflowImageStylePrompt.trim()) }
            : item
    )), [configItems, workflow?.workflowImageStylePrompt]);
    /** Các mục còn thiếu — dùng để chặn mở phiên DeepSeek/ChatGPT. */
    const unconfiguredConfigs = React.useMemo(
        () => effectiveConfigItems.filter((item) => !item.configured),
        [effectiveConfigItems],
    );
    const configBlocked = unconfiguredConfigs.length > 0;
    const [copyingStep, setCopyingStep] = React.useState('');
    const [copiedStep, setCopiedStep] = React.useState('');
    const [outputs, setOutputs] = React.useState<WorkflowOutputsMap>({});
    /** Keyword [key] tách từ từng file prompt — key cache: `${workflow}::${file}`. */
    const [promptKeywordMap, setPromptKeywordMap] = React.useState<Record<string, string[]>>({});
    const promptKeywordCacheRef = React.useRef<Record<string, string[]>>({});
    /** Context SFX (PROJECT_INFO / FULL_BEATS / TARGET_RANGE / PREVIOUS_CUES) — thay placeholder generate-sfx.md. */
    const [sfxContext, setSfxContext] = React.useState<Record<string, string>>({});
    const [updatingItem, setUpdatingItem] = React.useState<UpdateDialogState | null>(null);
    const [updateValue, setUpdateValue] = React.useState('');
    const [savingUpdate, setSavingUpdate] = React.useState(false);
    const [importingAsset, setImportingAsset] = React.useState(false);
    const [importingBeatPrompts, setImportingBeatPrompts] = React.useState(false);
    const [beatPromptErrors, setBeatPromptErrors] = React.useState<string[]>([]);
    // Trạng thái phiên DeepSeek theo TỪNG BƯỚC (sessionKey = workflow#step) — tránh lẫn giữa các bước.
    const [deepseekAction, setDeepseekAction] = React.useState('');
    const [deepseekStates, setDeepseekStates] = React.useState<Record<string, DeepseekStepState>>({});
    const patchDeepseekState = React.useCallback((key: string, patch: Partial<DeepseekStepState>) => {
        setDeepseekStates((prev) => {
            const current = prev[key] || EMPTY_DEEPSEEK_STATE;
            const next = { ...current, ...patch };
            // Không đổi gì (poll về cùng dữ liệu) → giữ nguyên reference, tránh re-render thừa.
            const unchanged = (Object.keys(next) as (keyof DeepseekStepState)[])
                .every((field) => current[field] === next[field]);
            if (unchanged) {
                return prev;
            }
            return { ...prev, [key]: next };
        });
    }, []);
    const [masterPromptUrl, setMasterPromptUrl] = React.useState('');
    const [loadingMasterPrompt, setLoadingMasterPrompt] = React.useState(false);
    const masterPromptObjectUrlRef = React.useRef('');

    /** buttonUpdate = imagePromptBeatUpdate → update image prompt cho các beat. */
    const isBeatPromptUpdate = Boolean(
        updatingItem
        && String(updatingItem.buttonUpdate || '').trim().toLowerCase() === 'imagepromptbeatupdate',
    );
    const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const outputsLoadedRef = React.useRef<number>(-1);
    /** Chữ ký trạng thái phiên DeepSeek lần poll trước — để chỉ reload khi có dữ liệu mới. */
    const lastDeepseekSyncRef = React.useRef('');

    React.useEffect(() => {
        if (!open) {
            setCopyingStep('');
            setCopiedStep('');
            setUpdatingItem(null);
            setUpdateValue('');
            setSavingUpdate(false);
            setImportingAsset(false);
            setMasterPromptUrl('');
            setLoadingMasterPrompt(false);
            setDeepseekAction('');
            setDeepseekStates({});
            setOutputs({});
            outputsLoadedRef.current = -1;
            lastDeepseekSyncRef.current = '';
            setSfxContext({});
            return;
        }

        const sid = Number(shortVideoId || 0);
        if (!sid || outputsLoadedRef.current === sid) {
            return;
        }
        outputsLoadedRef.current = sid;
        // Đổi short video → xoá trạng thái phiên DeepSeek cũ trước khi nạp lại.
        setDeepseekStates({});
        lastDeepseekSyncRef.current = '';
        fetchWorkflowOutputs(sid).then((map) => setOutputs(map || {}));
        // Audio script có thể vừa được cập nhật ở bước trước (chia beat) → báo video nạp lại
        // để breakdown hiện đủ phần ngay khi mở drawer, không cần refresh trang.
        document.dispatchEvent(new CustomEvent(AGENT_AUDIO_SCRIPT_SAVED_EVENT, {
            detail: { shortVideoId: sid },
        }));
    }, [open, shortVideoId]);

    // Đổi tab workflow → reset trạng thái tạm của workflow trước (outputs giữ nguyên, đã load theo short video).
    React.useEffect(() => {
        setCopyingStep('');
        setCopiedStep('');
        setUpdatingItem(null);
        setUpdateValue('');
    }, [workflow?.key]);

    // Nạp context SFX (PROJECT_INFO / FULL_BEATS / TARGET_RANGE / PREVIOUS_CUES) để thay
    // placeholder [PROJECT_INFO]... trong generate-sfx.md khi copy/gửi prompt.
    // Beat có thể được tạo SAU khi mở drawer (bước chia beat) → phải nạp lại mỗi lần copy/mở
    // phiên, không chỉ 1 lần lúc mở drawer (nếu không FULL_BEATS sẽ cũ).
    const loadSfxContext = React.useCallback(async (): Promise<Record<string, string>> => {
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            setSfxContext({});
            return {};
        }
        const context = await fetchSfxPromptContext(sid);
        setSfxContext(context);
        return context;
    }, [shortVideoId]);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }
        void loadSfxContext();
        return undefined;
    }, [open, loadSfxContext]);



    /**
     * Prefetch file master prompt (documentFile) → blob URL để nút "Xem master prompt" là 1 anchor
     * target=_blank mở ngay, không bị chặn popup. Blob URL được thu hồi khi đổi tab / đóng drawer.
     */
    React.useEffect(() => {
        if (!open || !workflow?.documentFile || !workflow.documentFileExists) {
            setMasterPromptUrl('');
            setLoadingMasterPrompt(false);
            return;
        }

        let cancelled = false;
        setLoadingMasterPrompt(true);
        setMasterPromptUrl('');

        fetchWorkflowPromptContent(workflow.key, workflow.documentFile, Number(shortVideoId || 0))
            .then((result) => {
                if (cancelled) {
                    return;
                }
                setLoadingMasterPrompt(false);
                if (!result.ok) {
                    setMasterPromptUrl('');
                    return;
                }
                const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                masterPromptObjectUrlRef.current = url;
                setMasterPromptUrl(url);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadingMasterPrompt(false);
                    setMasterPromptUrl('');
                }
            });

        return () => {
            cancelled = true;
            if (masterPromptObjectUrlRef.current) {
                URL.revokeObjectURL(masterPromptObjectUrlRef.current);
                masterPromptObjectUrlRef.current = '';
            }
        };
    }, [open, shortVideoId, workflow?.key, workflow?.documentFile, workflow?.documentFileExists]);

    React.useEffect(() => {
        return () => {
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
        };
    }, []);

    const latestStoryScriptRef = React.useRef<{id: number; script: string} | null>(null);
    const workflowOutputs = (workflow && outputs[workflow.key]) || {};

    /** Giá trị biến inputPrompt đã lưu: {name: value}. */
    const inputValues = React.useMemo<Record<string, string>>(() => {
        const stored = workflowOutputs[WORKFLOW_INPUT_PROMPT_KEY];
        if (!stored) {
            return {};
        }
        try {
            const parsed = JSON.parse(stored);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? (parsed as Record<string, string>)
                : {};
        } catch {
            return {};
        }
    }, [workflowOutputs]);

    const [draftInputs, setDraftInputs] = React.useState<Record<string, string>>({});
    const [savingInputs, setSavingInputs] = React.useState(false);
    const inputSavePromiseRef = React.useRef<Promise<boolean> | null>(null);
    React.useEffect(() => { inputSavePromiseRef.current = null; }, [workflow?.key, shortVideoId]);
    const storedInputsJson = workflowOutputs[WORKFLOW_INPUT_PROMPT_KEY] || '';

    // Nạp giá trị input vào draft khi đổi tab workflow hoặc khi giá trị đã lưu thay đổi.
    React.useEffect(() => {
        setDraftInputs(inputValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow?.key, storedInputsJson]);

    const handleSaveInputs = React.useCallback(async () => {
        if (!workflow || savingInputs) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không lưu được biến', 'warning');
            return;
        }
        setSavingInputs(true);
        const result = await saveWorkflowOutput(
            sid,
            workflow.key,
            WORKFLOW_INPUT_PROMPT_KEY,
            JSON.stringify(draftInputs),
        );
        setSavingInputs(false);
        if (!result.ok) {
            api.showMessage(result.message || 'Không lưu được biến', 'error');
            return;
        }
        if (result.outputs) {
            setOutputs(result.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [workflow.key]: {
                    ...(prev[workflow.key] || {}),
                    [WORKFLOW_INPUT_PROMPT_KEY]: JSON.stringify(draftInputs),
                },
            }));
        }
        api.showMessage('Đã lưu biến — copy prompt sẽ thay đúng giá trị', 'success');
    }, [workflow, savingInputs, shortVideoId, draftInputs, api]);

    const handleDurationChange = (name: string, value: string) => {
        if (!workflow || savingInputs || deepseekAction) return;
        const next = {...draftInputs, [name]: value};
        setDraftInputs(next);
        const sid = Number(shortVideoId || 0);
        if (!sid) { api.showMessage('Thiếu video — chưa lưu được thời lượng', 'error'); return; }
        const key = workflow.key;
        setSavingInputs(true);
        inputSavePromiseRef.current = (async () => {
            try {
                const result = await saveWorkflowOutput(sid, key, WORKFLOW_INPUT_PROMPT_KEY, JSON.stringify(next));
                if (!result.ok) throw new Error(result.message || 'Không lưu được thời lượng');
                setOutputs((prev) => ({...prev, [key]: {...(prev[key] || {}), [WORKFLOW_INPUT_PROMPT_KEY]: JSON.stringify(next)}}));
                api.showMessage('Đã lưu thời lượng video', 'success');
                return true;
            } catch (error) {
                api.showMessage(error instanceof Error ? error.message : 'Không lưu được thời lượng', 'error');
                setDraftInputs(inputValues);
                return false;
            } finally { setSavingInputs(false); }
        })();
    };

    /** Lựa chọn nhóm prompt đã lưu: {choiceName: label} — từ workflow outputs. */
    const storedChoicesJson = workflowOutputs[WORKFLOW_PROMPT_CHOICE_KEY] || '';
    const savedChoiceValues = React.useMemo<Record<string, string>>(
        () => parseWorkflowPromptChoiceValues(storedChoicesJson),
        [storedChoicesJson],
    );
    const [draftChoiceValues, setDraftChoiceValues] = React.useState<Record<string, string>>({});
    const [savingChoice, setSavingChoice] = React.useState('');

    // Nạp lựa chọn đã lưu vào draft khi đổi workflow hoặc giá trị đã lưu thay đổi.
    React.useEffect(() => {
        setDraftChoiceValues(savedChoiceValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow?.key, storedChoicesJson]);

    /** Giá trị lựa chọn hiệu lực: đã lưu, ghi đè bởi draft đang chọn (chưa lưu xong). */
    const effectiveChoiceValues = React.useMemo<Record<string, string>>(
        () => ({ ...savedChoiceValues, ...draftChoiceValues }),
        [savedChoiceValues, draftChoiceValues],
    );

    /** Chọn nhóm prompt (Business/History…) → lưu vào workflow outputs, refresh vẫn giữ. */
    const handleSelectChoice = React.useCallback(async (choiceName: string, label: string) => {
        if (!workflow || !choiceName || savingChoice) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không lưu được lựa chọn', 'warning');
            return;
        }
        const previous = draftChoiceValues;
        const next = { ...savedChoiceValues, [choiceName]: label };
        setDraftChoiceValues(next);
        setSavingChoice(choiceName);
        const result = await saveWorkflowOutput(
            sid,
            workflow.key,
            WORKFLOW_PROMPT_CHOICE_KEY,
            JSON.stringify(next),
        );
        setSavingChoice('');
        if (!result.ok) {
            setDraftChoiceValues(previous);
            api.showMessage(result.message || 'Không lưu được lựa chọn', 'error');
            return;
        }
        if (result.outputs) {
            setOutputs(result.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [workflow.key]: {
                    ...(prev[workflow.key] || {}),
                    [WORKFLOW_PROMPT_CHOICE_KEY]: JSON.stringify(next),
                },
            }));
        }
    }, [workflow, savingChoice, shortVideoId, draftChoiceValues, savedChoiceValues, api]);

    /**
     * Context thay key khi copy prompt = outputs đã lưu + biến inputPrompt + promptContext (topic...)
     * + audio script hiện tại. Nhận outputs map qua tham số để caller có thể dùng bản fresh
     * vừa fetch (overlay DeepSeek lưu character sheet / audio gốc trực tiếp vào DB, không qua
     * state của drawer nên bản state có thể cũ).
     */
    const buildBaseContext = React.useCallback((
        allOutputs: WorkflowOutputsMap,
        sfxContextOverride?: Record<string, string>,
    ): WorkflowPromptContext => {
        const currentBucket = (workflow && allOutputs[workflow.key]) || {};
        const audioScriptText = workflow?.key === 'video-html-2d' && latestStoryScriptRef.current?.id === Number(shortVideoId)
            ? latestStoryScriptRef.current.script : String(audioScript || '');
        // Bản có cấu trúc "BEAT 01: ..." để prompt biết chính xác ranh giới beat
        // (beat nhiều dòng không bị chatbot chia lại theo newline).
        const audioBeats = splitWorkflowBeats(audioScriptText);
        const audioBeatsText = audioBeats.length > 0
            ? formatWorkflowBeatScript(audioBeats, 1)
            : '';
        // Biến input: default của định nghĩa, ghi đè bởi giá trị đã lưu (hoặc draft đang sửa).
        const variableValues: Record<string, string> = {};
        (workflow?.steps || []).forEach((step) => {
            (step.inputPrompt || []).forEach((def) => {
                variableValues[def.name] = String(draftInputs[def.name] ?? inputValues[def.name] ?? def.default);
            });
        });
        // Audio gốc đã lưu (chưa chia beat) → thay [PASTE ORIGINAL AUDIO HERE] trong prompt.
        // Ưu tiên bucket của workflow hiện tại; fallback tìm ở mọi workflow (audio có thể
        // được lưu từ phiên trước khi workflow_key được truyền).
        let originalAudio = String(currentBucket['deepseek_original_audio'] || '').trim();
        if (!originalAudio) {
            Object.values(allOutputs).forEach((bucket) => {
                if (originalAudio) {
                    return;
                }
                const candidate = String((bucket || {})['deepseek_original_audio'] || '').trim();
                if (candidate) {
                    originalAudio = candidate;
                }
            });
        }
        // CHARACTER SHEET DESCRIPTION (workflow stickman, overlay DeepSeek lưu):
        // thay [PASTE CHARACTER SHEET DESCRIPTION HERE] trong buoc-3-merged.md.
        // Ưu tiên bucket workflow hiện tại, fallback mọi workflow (kể cả step key #index).
        let characterSheet = String(currentBucket['character_sheet_description'] || '').trim();
        if (!characterSheet) {
            const stickmanBucket = (allOutputs as Record<string, Record<string, string>>)['stickman'];
            const stickmanCandidate = String((stickmanBucket || {})['character_sheet_description'] || '').trim();
            if (stickmanCandidate) {
                characterSheet = stickmanCandidate;
            }
        }
        if (!characterSheet) {
            Object.values(allOutputs).forEach((bucket) => {
                if (characterSheet) {
                    return;
                }
                const candidate = String((bucket || {})['character_sheet_description'] || '').trim();
                if (candidate) {
                    characterSheet = candidate;
                }
            });
        }
        return {
            'SHORT-VIDEO-ID': String(shortVideoId || ''),
            ...(sfxContextOverride ?? sfxContext),
            ...currentBucket,
            ...variableValues,
            ...(promptContext || {}),
            ...(workflow?.workflowImageStylePrompt !== undefined ? {
                'IMAGE-STYLE': workflow.workflowImageStylePrompt,
                STYLE_REFERENCE: workflow.workflowImageStylePrompt,
            } : {}),
            ...(audioScriptText.trim()
                ? { [WORKFLOW_AUDIO_SCRIPT_KEY]: audioScriptText }
                : {}),
            ...(audioBeatsText
                ? { [WORKFLOW_AUDIO_SCRIPT_BEATS_KEY]: audioBeatsText }
                : {}),
            ...(originalAudio
                ? { 'PASTE ORIGINAL AUDIO HERE': originalAudio }
                : {}),
            ...(characterSheet
                ? { 'PASTE CHARACTER SHEET DESCRIPTION HERE': characterSheet }
                : {}),
        };
    }, [workflow, workflow?.steps, shortVideoId, draftInputs, inputValues, promptContext, audioScript, sfxContext]);

    const mergedPromptContext = React.useMemo<WorkflowPromptContext>(
        () => buildBaseContext(outputs),
        [buildBaseContext, outputs],
    );

    /**
     * Nạp nội dung các file prompt của workflow đang mở để tách danh sách keyword [key].
     * Cache theo `${workflow}::${file}` — không fetch lại khi mở lại drawer / đổi lựa chọn.
     */
    React.useEffect(() => {
        if (!open || !workflow) {
            return;
        }
        let cancelled = false;
        const files = new Set<string>();
        (workflow.steps || []).forEach((step) => {
            if (step.prompt) {
                files.add(step.prompt);
            }
            (step.prompts || []).forEach((item) => {
                const info = resolveWorkflowPromptChoiceFile(item, effectiveChoiceValues);
                if (info.file) {
                    files.add(info.file);
                }
                (item.choiceOptions || []).forEach((option) => {
                    if (option.file) {
                        files.add(option.file);
                    }
                });
            });
        });

        const pending = Array.from(files).filter((file) => !(promptKeywordCacheRef.current[`${workflow.key}::${file}`]));
        if (pending.length === 0) {
            setPromptKeywordMap({ ...promptKeywordCacheRef.current });
            return undefined;
        }

        Promise.all(pending.map(async (file) => {
            try {
                const res = await fetchWorkflowPromptContent(workflow.key, file, Number(shortVideoId || 0));
                if (res.ok) {
                    promptKeywordCacheRef.current[`${workflow.key}::${file}`] = extractPromptKeywords(res.content);
                }
            } catch {
                // Bỏ qua — file lỗi thì không hiện keyword.
            }
        })).then(() => {
            if (!cancelled) {
                setPromptKeywordMap({ ...promptKeywordCacheRef.current });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [open, workflow, effectiveChoiceValues]);

    /**
     * Tập key "có định nghĩa": biến inputPrompt + updateField của workflow + các key đặc biệt
     * (FE tự inject). Dùng để phân loại keyword trong prompt (xanh/đỏ thay vì xám).
     * KHÔNG gồm các key context tự sinh (output nội bộ, *_saved_at, chunk…) để tránh nhiễu.
     */
    const promptDefinedKeys = React.useMemo(() => {
        const set = new Set<string>();
        const add = (raw?: string) => {
            const key = String(raw || '').trim().toLowerCase();
            if (key) {
                set.add(key);
            }
        };
        (workflow?.steps || []).forEach((step) => {
            (step.inputPrompt || []).forEach((def) => add(def.name));
            (step.prompts || []).forEach((item) => add(item.updateField));
        });
        SPECIAL_PROMPT_KEYS.forEach(add);
        return set;
    }, [workflow]);

    /**
     * Tập "định nghĩa keyword" thực sự được phép thay trong prompt (biến inputPrompt + key đặc
     * biệt). KHÔNG gồm updateField vì đó là output nội bộ, không phải placeholder prompt.
     */
    const promptKeywordDefinitions = React.useMemo(() => {
        const set = new Set<string>();
        const add = (raw?: string) => {
            const key = String(raw || '').trim().toLowerCase();
            if (key) {
                set.add(key);
            }
        };
        (workflow?.steps || []).forEach((step) => {
            (step.inputPrompt || []).forEach((def) => add(def.name));
        });
        SPECIAL_PROMPT_KEYS.forEach(add);
        return set;
    }, [workflow]);

    /** Tập keyword (lowercase) thực sự xuất hiện trong BẤT KỲ prompt nào của workflow. */
    const usedPromptKeywords = React.useMemo(() => {
        const set = new Set<string>();
        if (!workflow) {
            return set;
        }
        const prefix = `${workflow.key}::`;
        Object.entries(promptKeywordMap).forEach(([mapKey, keywords]) => {
            if (mapKey.startsWith(prefix)) {
                keywords.forEach((keyword) => {
                    const key = keyword.trim().toLowerCase();
                    if (key) {
                        set.add(key);
                    }
                });
            }
        });
        return set;
    }, [promptKeywordMap, workflow]);

    /**
     * Key có định nghĩa keyword (biến inputPrompt + key đặc biệt) nhưng KHÔNG xuất hiện trong
     * prompt nào của workflow → keyword dư, không được dùng.
     */
    const unusedDefinedKeys = React.useMemo(() => (
        Array.from(promptKeywordDefinitions)
            .filter((key) => !usedPromptKeywords.has(key))
            .sort()
    ), [promptKeywordDefinitions, usedPromptKeywords]);

    /** Trạng thái keyword: ready (có data) / empty (có định nghĩa, chưa data) / unknown. */
    const promptKeywordGetState = React.useCallback((keyword: string): PromptKeywordState => {
        const key = String(keyword || '').trim().toLowerCase();
        if (!key) {
            return 'unknown';
        }
        const entry = Object.entries(mergedPromptContext).find(
            ([contextKey]) => contextKey.trim().toLowerCase() === key,
        );
        if (entry && String(entry[1] ?? '').trim().length > 0) {
            return 'ready';
        }
        return (promptDefinedKeys.has(key) || Boolean(entry)) ? 'empty' : 'unknown';
    }, [mergedPromptContext, promptDefinedKeys]);

    /** Danh sách keyword của 1 file prompt (rỗng nếu chưa nạp xong / không có file). */
    const keywordsForFile = React.useCallback((file: string): string[] => {
        if (!file || !workflow) {
            return [];
        }
        return promptKeywordMap[`${workflow.key}::${file}`] || [];
    }, [workflow, promptKeywordMap]);

    /**
     * Tải lại workflow outputs + context SFX từ server (overlay DeepSeek có thể đã lưu
     * character sheet / audio gốc / beat sau lần tải trước). Trả về bản mới nhất của CẢ HAI,
     * đồng thời cập nhật state — nhờ vậy FULL_BEATS của generate-sfx.md luôn khớp beat mới nhất
     * mà không cần refresh trang.
     */
    const refreshWorkflowOutputs = React.useCallback(async (): Promise<{
        outputs: WorkflowOutputsMap;
        sfxContext: Record<string, string>;
    }> => {
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            return { outputs, sfxContext };
        }
        let nextOutputs = outputs;
        try {
            const fresh = await fetchWorkflowOutputs(sid);
            if (fresh && typeof fresh === 'object' && Object.keys(fresh).length > 0) {
                nextOutputs = fresh;
                setOutputs(fresh);
            }
        } catch {
            // Lỗi mạng → dùng bản state hiện tại.
        }
        if (workflow?.key === 'video-html-2d') {
            const current = await storyV2Request(sid, 'get');
            if (!current.success) throw new Error('Không tải được kịch bản mới nhất từ CMS');
            latestStoryScriptRef.current = {id: sid, script: current.story_v2 ? JSON.stringify(current.story_v2, null, 2) : ''};
        }
        let nextSfxContext = sfxContext;
        try {
            const freshSfx = await fetchSfxPromptContext(sid);
            if (freshSfx && Object.keys(freshSfx).length > 0) {
                nextSfxContext = freshSfx;
                setSfxContext(freshSfx);
            } else { nextSfxContext = {}; setSfxContext({}); }
        } catch {
            nextSfxContext = {}; setSfxContext({});
        }
        return { outputs: nextOutputs, sfxContext: nextSfxContext };
    }, [shortVideoId, workflow?.key, outputs, sfxContext]);

    /**
     * Context tươi cho 1 phần breakdown (mirror buildWorkflowBreakdownPlan): base mới nhất +
     * audio script của phần + output block BEAT cắt theo dải beat của phần.
     */
    const getFreshChunkContext = React.useCallback(async (
        chunk: Pick<WorkflowBreakdownChunk, 'beatStart' | 'beatEnd' | 'beats' | 'audioScript'>,
        totalBeats: number,
    ): Promise<WorkflowPromptContext> => {
        const fresh = await refreshWorkflowOutputs();
        const base = buildBaseContext(fresh.outputs, fresh.sfxContext);
        const chunkBeats = Array.isArray(chunk.beats) && chunk.beats.length > 0
            ? chunk.beats
            : splitWorkflowBeats(chunk.audioScript);
        const context: WorkflowPromptContext = {
            ...base,
            [WORKFLOW_AUDIO_SCRIPT_KEY]: chunk.audioScript,
            [WORKFLOW_AUDIO_SCRIPT_BEATS_KEY]: formatWorkflowBeatScript(chunkBeats, 1),
        };
        Object.entries(base).forEach(([key, value]) => {
            if (key === WORKFLOW_AUDIO_SCRIPT_KEY || key === WORKFLOW_AUDIO_SCRIPT_BEATS_KEY) {
                return;
            }
            const blocks = splitWorkflowBeatBlocks(value);
            if (totalBeats > 0 && blocks.length === totalBeats) {
                context[key] = blocks.slice(chunk.beatStart - 1, chunk.beatEnd).join('\n\n');
            }
        });
        return context;
    }, [refreshWorkflowOutputs, buildBaseContext]);

    const handleCopy = React.useCallback(async (stepKey: string, file: string) => {
        if (!workflow || !file || copyingStep) {
            return;
        }
        setCopyingStep(stepKey);
        let result: { ok: boolean; message: string };
        try {
            // Tải lại outputs trước khi copy — character sheet / audio gốc có thể vừa
            // được lưu từ overlay DeepSeek sau lần tải trước của drawer.
            const fresh = await refreshWorkflowOutputs();
            const context = buildBaseContext(fresh.outputs, fresh.sfxContext);
            assertWorkflowSfxPromptContext(file, context);
            result = await copyWorkflowPromptToClipboard(workflow.key, file, context);
        } catch (error) {
            result = { ok: false, message: error instanceof Error ? error.message : 'Không copy được prompt' };
        }
        setCopyingStep('');
        if (result.ok) {
            setCopiedStep(stepKey);
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
            copiedTimerRef.current = setTimeout(() => setCopiedStep(''), 2000);
        }
        api.showMessage(result.message, result.ok ? 'success' : 'error');
    }, [workflow, copyingStep, refreshWorkflowOutputs, buildBaseContext, api]);

    /** Đọc trạng thái phiên DeepSeek của 1 bước (sessionKey = workflow#step). */
    const refreshDeepseekSession = React.useCallback(async (sessionKey: string) => {
        const sid = Number(shortVideoId || 0);
        if (!sid || !sessionKey) {
            return;
        }
        const st = await fetchDeepseekVideoImageSessionStatus(sid, sessionKey).catch(() => null);
        if (!st?.success) {
            return;
        }
        patchDeepseekState(sessionKey, {
            sessionAlive: Boolean(st.session_alive),
            chatUrl: String(st.chat_url || ''),
            hasOriginalAudio: Boolean(st.has_original_audio),
            beatCount: Number(st.beat_count || 0),
            translationCount: Number(st.translation_count || 0),
            message: parseShortVideoResourceApiMessage(st, ''),
        });
    }, [shortVideoId, patchDeepseekState]);

    // POLL trạng thái phiên cho MỌI bước có deepseekSession khi drawer mở → CMS tự cập nhật
    // gần realtime khi user thao tác trên browser DeepSeek (lưu beat / dịch / audio / URL chat).
    // Không overlap request; tab ẩn thì giãn nhịp; quay lại tab thì refresh ngay.
    React.useEffect(() => {
        if (!open || !workflow || !shortVideoId) {
            return;
        }
        const sessionKeys = workflow.steps
            .flatMap((step, index) => {
                const keys: string[] = [];
                if (step.prompts.some((p) => Boolean(p.deepseekSession))) {
                    keys.push(`${workflow.key}#${workflow.key === 'video-html-2d' ? 'handoff-v2-' : (workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' ? 'free-' : '')}${index}`);
                }
                if (ENABLE_CHATGPT_SESSION && step.prompts.some((p) => Boolean(p.chatgptSession))) {
                    keys.push(`${workflow.key}#${workflow.key === 'video-html-2d' ? 'handoff-v2-' : (workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' ? 'free-' : '')}${index}::chatgpt`);
                }
                return keys;
            });
        if (sessionKeys.length === 0) {
            return;
        }

        let cancelled = false;
        let inFlight = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const schedule = () => {
            const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
            timer = setTimeout(
                () => { void tick(); },
                hidden ? DEEPSEEK_POLL_HIDDEN_INTERVAL_MS : DEEPSEEK_POLL_INTERVAL_MS,
            );
        };

        const tick = async () => {
            if (cancelled || inFlight) {
                return;
            }
            inFlight = true;
            try {
                await Promise.all(sessionKeys.map((key) => refreshDeepseekSession(key)));
            } finally {
                inFlight = false;
            }
            if (cancelled) {
                return;
            }
            schedule();
        };

        // Quay lại tab → refresh ngay (không chờ hết nhịp giãn khi tab ẩn).
        const onVisibilityChange = () => {
            if (cancelled || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
                return;
            }
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            void tick();
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
        }

        void tick();

        return () => {
            cancelled = true;
            if (timer) {
                clearTimeout(timer);
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, workflow?.key, shortVideoId, refreshDeepseekSession, effectiveChoiceValues['asset-mode']]);

    /**
     * Đồng bộ REALTIME: khi user thao tác trên browser DeepSeek (lưu beat / dịch / audio gốc / URL chat),
     * poll trạng thái phiên phát hiện dữ liệu mới → tự tải lại workflow outputs + báo video nạp lại
     * audio script. Nhờ vậy "danh sách các phần" (breakdown) và nút Mở DeepSeek của từng phần hiện ra
     * ngay, không cần refresh/tải lại video.
     */
    React.useEffect(() => {
        if (!open || !workflow || !shortVideoId) {
            return;
        }
        const signature = Object.entries(deepseekStates)
            .map(([key, s]) => (
                `${key}:${s.sessionAlive ? 1 : 0}:${s.hasOriginalAudio ? 1 : 0}:`
                + `${s.beatCount}:${s.translationCount}:${s.chatUrl}`
            ))
            .join('|');
        if (!signature || lastDeepseekSyncRef.current === signature) {
            return;
        }
        const previous = lastDeepseekSyncRef.current;
        lastDeepseekSyncRef.current = signature;
        // Lần poll đầu tiên chỉ ghi nhận trạng thái hiện có (tránh reload thừa khi vừa mở drawer).
        if (!previous) {
            return;
        }
        void refreshWorkflowOutputs().catch(() => { /* Do nothing */ });
        
        // Báo useAgentVideoContent nạp lại audio_script (breakdown cần audio script theo beat).
        document.dispatchEvent(new CustomEvent(AGENT_AUDIO_SCRIPT_SAVED_EVENT, {
            detail: { shortVideoId: Number(shortVideoId) },
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, workflow?.key, shortVideoId, deepseekStates]);

    /**
     * Bước có cấu hình deepseekSession trong index.md — mở browser DeepSeek (GUI) và tự dán
     * prompt generate + Enter. Các nút chia beat / dịch / lưu clipboard / kết thúc nằm NGAY
     * TRÊN OVERLAY của browser DeepSeek, user điều khiển tại đó.
     *
     * @param prompts { generate?, beat?, translate? } — file prompt theo vai trò.
     * @param sessionKey workflow#step — mỗi bước 1 phiên/luồng chat riêng.
     */
    const runOpenDeepseekSession = React.useCallback(async (
        prompts: {
            generate?: string;
            beat?: string;
            translate?: string;
        },
        sessionKey: string,
        resume = false,
        provider: 'deepseek' | 'chatgpt' = 'deepseek',
        updateBox: string[] = [],
    ) => {
        const providerLabel = provider === 'chatgpt' ? 'ChatGPT' : 'DeepSeek';
        if (!workflow || deepseekAction) {
            return;
        }
        if (!resume && workflow.key === 'video-html-2d') {
            if (inputSavePromiseRef.current && !(await inputSavePromiseRef.current)) return;
            if (!(draftInputs['VIDEO-DURATION-SEC'] || inputValues['VIDEO-DURATION-SEC'])) {
                api.showMessage('Hãy chọn thời lượng video trước khi mở ' + providerLabel, 'warning');
                return;
            }
        }
        if (configBlocked) {
            api.showMessage(
                `Cần cấu hình ${unconfiguredConfigs.map((item) => item.label).join(', ')} trước khi mở ${providerLabel}`,
                'warning',
            );
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short video — không mở được ' + providerLabel, 'warning');
            return;
        }
        if (!resume && !prompts.generate) {
            api.showMessage('Thiếu file prompt generate (gắn deepseekSession/chatgptSession: true cho prompt mở phiên)', 'error');
            return;
        }

        setDeepseekAction(sessionKey);
        patchDeepseekState(sessionKey, {
            message: resume ? 'Đang mở lại luồng chat cũ…' : 'Đang mở browser ' + providerLabel + '…',
        });
        try {
            const fresh = await refreshWorkflowOutputs();
            const freshContext = buildBaseContext(fresh.outputs, fresh.sfxContext);
            if (!resume && workflow.key === 'video-html-2d' && ['create-whatif-story.md', 'update-whatif-story.md'].includes(prompts.generate || '')) {
                if (!String(freshContext['WHATIF-TOPIC'] || '').trim()) {
                    throw new Error('Chưa lưu chủ đề. Ở browser Bước 1, dán bản chủ đề đã chốt vào ô Chủ đề What-if đã chọn rồi bấm Lưu chủ đề đã chọn.');
                }
                if (prompts.generate === 'update-whatif-story.md' && !String(freshContext[WORKFLOW_AUDIO_SCRIPT_KEY] || '').trim()) {
                    throw new Error('Chưa lưu kịch bản. Hoàn thành và lưu JSON ở Bước 2 trước.');
                }
            }
            [prompts.generate, prompts.beat, prompts.translate].forEach((file) => { if (file) assertWorkflowSfxPromptContext(file, freshContext); });
            const load = (file?: string) => (
                file
                    ? fetchWorkflowPromptText(workflow.key, file, freshContext)
                    : Promise.resolve({ ok: true, text: '', message: '' })
            );
            const [g, b, t] = await Promise.all([
                load(prompts.generate),
                load(prompts.beat),
                load(prompts.translate),
            ]);
            if (!g.ok || !b.ok || !t.ok) {
                api.showMessage(g.message || b.message || t.message || 'Không tải được prompt', 'error');
                patchDeepseekState(sessionKey, { message: '' });
                return;
            }
            const res = await openDeepseekVideoImageSession({
                shortVideoId: sid,
                promptGenerate: g.text,
                promptBeat: b.text,
                promptTranslate: t.text,
                resume,
                workflowKey: sessionKey,
                provider,
                updateBox,
            });
            if (!res?.success) {
                api.showMessage(parseShortVideoResourceApiMessage(res, 'Không mở được phiên ' + providerLabel), 'error');
                patchDeepseekState(sessionKey, { message: '' });
                return;
            }
            const responseMessage = parseShortVideoResourceApiMessage(
                res,
                resume ? 'Đã mở lại luồng chat cũ' : 'Đã mở browser — điều khiển bằng các nút trên browser',
            );
            const hasWarning = Array.isArray(res.warnings) && res.warnings.length > 0;
            patchDeepseekState(sessionKey, {
                sessionAlive: true,
                ...(res.chat_url ? { chatUrl: String(res.chat_url) } : {}),
                message: responseMessage,
            });
            api.showMessage(responseMessage, hasWarning ? 'warning' : 'success');
        } catch (err) {
            api.showMessage(err instanceof Error ? err.message : 'Không mở được phiên ' + providerLabel, 'error');
            patchDeepseekState(sessionKey, { message: '' });
        } finally {
            setDeepseekAction('');
        }
    }, [workflow, deepseekAction, shortVideoId, draftInputs, inputValues, configBlocked, unconfiguredConfigs, refreshWorkflowOutputs, buildBaseContext, api, patchDeepseekState]);

    const openUpdateDialog = React.useCallback((
        itemKey: string,
        label: string,
        fieldKey: string,
        buttonUpdate = '',
        initialValue = '',
    ) => {
        setUpdateValue(initialValue);
        setBeatPromptErrors([]);
        setUpdatingItem({ itemKey, label, fieldKey, buttonUpdate });
    }, []);

    const handleCopyOldValue = React.useCallback(async () => {
        if (!updatingItem) {
            return;
        }
        const text = workflowOutputs[updatingItem.fieldKey] || '';
        if (!text.trim()) {
            return;
        }
        const copied = await writePromptTextToClipboard(text);
        api.showMessage(
            copied ? 'Đã copy giá trị cũ' : 'Không copy được — hãy copy thủ công',
            copied ? 'success' : 'error',
        );
    }, [updatingItem, workflowOutputs, api]);

    const handleSaveUpdate = React.useCallback(async () => {
        if (!workflow || !updatingItem || savingUpdate) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không lưu được output', 'warning');
            return;
        }
        setSavingUpdate(true);
        const result = await saveWorkflowOutput(sid, workflow.key, updatingItem.fieldKey, updateValue);
        setSavingUpdate(false);
        if (!result.ok) {
            api.showMessage(result.message || 'Không lưu được output', 'error');
            return;
        }
        if (result.outputs) {
            setOutputs(result.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [workflow.key]: {
                    ...(prev[workflow.key] || {}),
                    [updatingItem.fieldKey]: updateValue,
                },
            }));
        }
        setUpdatingItem(null);
        api.showMessage(`Đã lưu output [${updatingItem.fieldKey}] — copy prompt sẽ tự thay key`, 'success');
    }, [workflow, updatingItem, savingUpdate, shortVideoId, updateValue, api]);

    /**
     * Import nhanh asset từ dữ liệu output register (CHARACTER/SPACE ASSET REGISTER)
     * vào resource của short video — upsert theo mã định danh, không xóa resource cũ.
     * Ưu tiên parse "Giá trị mới" (textarea), trống thì fallback giá trị đã lưu.
     */
    const handleImportAsset = React.useCallback(async () => {
        if (!updatingItem || importingAsset) {
            return;
        }
        const kind = resolveWorkflowResourceKind(updatingItem.buttonUpdate);
        if (!kind) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không import được resource', 'warning');
            return;
        }

        const savedValue = workflowOutputs[updatingItem.fieldKey] || '';
        const source = updateValue.trim() ? updateValue : savedValue;
        if (!source.trim()) {
            api.showMessage('Chưa có dữ liệu register để import resource', 'warning');
            return;
        }

        const parsed = parseWorkflowAssetRegister(kind, source);
        if (parsed.length === 0) {
            api.showMessage(
                'Không tìm thấy asset nào — dữ liệu cần đúng cấu trúc CHARACTER/SPACE ASSET REGISTER',
                'warning',
            );
            return;
        }

        setImportingAsset(true);
        let result: { success?: boolean; created?: number; updated?: number } | null = null;
        try {
            result = await importShortVideoResources(sid, parsed);
        } catch {
            result = null;
        }
        setImportingAsset(false);

        if (!result?.success) {
            api.showMessage('Import resource thất bại', 'error');
            return;
        }

        const createdCount = Number(result.created || 0);
        const updatedCount = Number(result.updated || 0);
        api.showMessage(
            `Đã import ${createdCount + updatedCount} resource (${createdCount} mới, ${updatedCount} cập nhật) — không xóa resource cũ`,
            'success',
        );
    }, [updatingItem, importingAsset, shortVideoId, updateValue, workflowOutputs, api]);

    /**
     * buttonUpdate: imagePromptBeatUpdate — parse output "BEAT IMAGE PROMPTS"
     * (BEAT BN + SCRIPT SENTENCE / IMAGE PROMPT / NEGATIVE PROMPT…) và import
     * vào đúng vị trí beat của clip (all-or-nothing, validate phía BE).
     * Ưu tiên "Giá trị mới" (textarea), trống thì fallback giá trị đã lưu.
     */
    const handleImportBeatPrompts = React.useCallback(async () => {
        if (!updatingItem || !isBeatPromptUpdate || importingBeatPrompts) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không update được image prompt', 'warning');
            return;
        }
        const savedValue = workflowOutputs[updatingItem.fieldKey] || '';
        const source = updateValue.trim() ? updateValue : savedValue;
        if (!source.trim()) {
            api.showMessage('Chưa có dữ liệu prompt để update', 'warning');
            return;
        }

        setImportingBeatPrompts(true);
        setBeatPromptErrors([]);
        try {
            const result = await importManualBeatPromptFile(sid, source);
            if (result?.success === false) {
                const errors = Array.isArray(result?.errors) ? result.errors : [];
                if (errors.length) {
                    setBeatPromptErrors(errors);
                    api.showMessage(
                        `Dữ liệu có ${errors.length} lỗi — CHƯA update beat nào (xem chi tiết bên dưới)`,
                        'error',
                    );
                } else {
                    api.showMessage(
                        parseShortVideoResourceApiMessage(result, 'Không update được image prompt'),
                        'error',
                    );
                }
                return;
            }
            const updatedCount = Array.isArray(result?.updated_orders) ? result.updated_orders.length : 0;
            api.showMessage(`Đã update image prompt cho ${updatedCount} beat đúng vị trí`, 'success');
            // Workspace Agent Video reload manual beat marks — "Mở Meta.ai" đọc prompt mới nhất.
            document.dispatchEvent(new CustomEvent(MANUAL_BEAT_PROMPTS_SAVED_EVENT, {
                detail: { shortVideoId: sid },
            }));
            setUpdatingItem(null);
        } catch (err) {
            api.showMessage(err instanceof Error ? err.message : 'Không update được image prompt', 'error');
        } finally {
            setImportingBeatPrompts(false);
        }
    }, [updatingItem, isBeatPromptUpdate, importingBeatPrompts, shortVideoId, updateValue, workflowOutputs, api]);

    const accent = workflow?.background || '';
    const accentText = accent ? getWorkflowContrastTextColor(accent) : '#ffffff';
    const activeWorkflowKey = workflow?.key || '';
    const oldValue = updatingItem ? (workflowOutputs[updatingItem.fieldKey] || '') : '';

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            width={560}
            title="Prompt"
        >
            {!workflow ? null : (
                <Box sx={{ pb: 2 }}>
                    {workflows.length > 1 && (
                        <Tabs
                            value={workflow.key}
                            onChange={(_event, key) => onSelectWorkflow?.(String(key))}
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                            sx={{
                                mt: 1.5,
                                mb: 1.5,
                                minHeight: 36,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    minHeight: 36,
                                    minWidth: 'auto',
                                    px: 1.5,
                                    fontSize: 13,
                                    fontWeight: 600,
                                },
                            }}
                        >
                            {workflows.map((item) => (
                                <Tab
                                    key={item.key}
                                    value={item.key}
                                    label={item.title}
                                />
                            ))}
                        </Tabs>
                    )}

                    {accent && (
                        <Box
                            sx={{
                                px: 1.5,
                                py: 1.25,
                                mt: 1.5,
                                borderRadius: 2,
                                bgcolor: accent,
                                color: accentText,
                                mb: 1.5,
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, color: accentText, fontSize: 15 }}>
                                {workflow.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: accentText, opacity: 0.85, display: 'block', mt: 0.25 }}>
                                {workflow.steps.length} bước · Copy prompt tự thay [topic], [AUDIO-SCRIPT], [AUDIO-SCRIPT-BEATS] và các key output đã lưu
                            </Typography>
                        </Box>
                    )}

                    {workflow.key === 'video-html' && (
                        <Box sx={{mb: 1.5}}>
                            <Typography variant="subtitle2" sx={{mb: 0.75}}>Chế độ asset</Typography>
                            <Stack direction="row" spacing={1}>
                                {([{value: 'shared', label: 'Quản lý asset chung'}, {value: 'free', label: 'Asset tự do'}]).map((mode) => (
                                    <Button key={mode.value} size="small"
                                        variant={(effectiveChoiceValues['asset-mode'] || 'shared') === mode.value ? 'contained' : 'outlined'}
                                        disabled={Boolean(savingChoice)}
                                        onClick={() => { void handleSelectChoice('asset-mode', mode.value); }}>
                                        {mode.label}
                                    </Button>
                                ))}
                            </Stack>
                            <Typography variant="caption" sx={{display: 'block', mt: 0.75, color: 'text.secondary'}}>
                                {effectiveChoiceValues['asset-mode'] === 'free'
                                    ? 'HTML beat tự thiết kế nhân vật, bối cảnh và đạo cụ; dùng prompt tự do với vật liệu chi tiết, màu đậm và bão hòa như trước. Hãy tạo lại visual/HTML để áp dụng chế độ mới.'
                                    : 'Dùng hồ sơ nhân vật, bối cảnh và asset chung xuyên suốt clip.'}
                            </Typography>
                        </Box>
                    )}

                    {workflow.documentFile ? (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                            <Tooltip
                                title={
                                    !workflow.documentFileExists
                                        ? `File master prompt chưa tồn tại: ${workflow.documentFile}`
                                        : (masterPromptUrl
                                            ? (workflow.documentFilePath || workflow.documentFile)
                                            : 'Đang tải master prompt…')
                                }
                                placement="top"
                            >
                                <span>
                                    <Button
                                        component="a"
                                        href={masterPromptUrl || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="small"
                                        variant="outlined"
                                        disabled={!masterPromptUrl}
                                        startIcon={
                                            loadingMasterPrompt
                                                ? <CircularProgress size={12} color="inherit" />
                                                : <OpenInNewOutlinedIcon fontSize="small" />
                                        }
                                        sx={{
                                            textTransform: 'none',
                                            '&.Mui-disabled': { pointerEvents: 'none' },
                                        }}
                                    >
                                        Xem master prompt
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>
                    ) : null}

                    {effectiveConfigItems.map((item) => (
                        <Alert
                            key={item.key}
                            severity={item.configured ? 'success' : item.severity}
                            sx={{ mb: 1.5 }}
                            action={onConfigureConfig ? (
                                <Button
                                    color="inherit"
                                    size="small"
                                    variant="outlined"
                                    startIcon={item.configured ? <CheckIcon fontSize="small" /> : undefined}
                                    onClick={() => onConfigureConfig(item.key)}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                >
                                    Cấu hình
                                </Button>
                            ) : undefined}
                        >
                            {item.configured ? 'Đã cấu hình' : 'Chưa cấu hình'} {item.label}
                        </Alert>
                    ))}

                    {unusedDefinedKeys.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                            >
                                Keyword có định nghĩa trong code nhưng không xuất hiện trong prompt nào (dư):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {unusedDefinedKeys.map((key) => (
                                    <Tooltip
                                        key={key}
                                        title="Có định nghĩa nhưng không dùng trong prompt nào"
                                        placement="top"
                                    >
                                        <Chip
                                            size="small"
                                            variant="filled"
                                            label={`[${key}]`}
                                            sx={{
                                                height: 20,
                                                fontSize: 10.5,
                                                bgcolor: '#7b1fa2',
                                                color: '#fff',
                                                '& .MuiChip-label': { px: 0.75 },
                                            }}
                                        />
                                    </Tooltip>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {workflow.steps.length === 0 && (
                        <Alert severity="info">Workflow chưa có bước nào — thêm bước vào index.md của thư mục workflow.</Alert>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {workflow.steps.map((step, index) => {
                            if (workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' && index === 1) return null;
                            const { number, label } = splitWorkflowStepTitle(step.title, index + 1);
                            const stepKey = String(index);
                            const isCopying = copyingStep === stepKey;
                            const isCopied = copiedStep === stepKey;
                            // Bước có deepseekSession/chatgptSession trong index.md → hiện nút mở
                            // browser tương ứng (DeepSeek và/hoặc ChatGPT), mỗi provider 1 phiên riêng.
                            const chatSessionProviders = ([
                                {
                                    provider: 'deepseek' as const,
                                    label: 'DeepSeek',
                                    keySuffix: '',
                                    prompts: step.prompts.filter((p) => Boolean(p.deepseekSession)),
                                },
                                ...(ENABLE_CHATGPT_SESSION ? [{
                                    provider: 'chatgpt' as const,
                                    label: 'ChatGPT',
                                    keySuffix: '::chatgpt',
                                    prompts: step.prompts.filter((p) => Boolean(p.chatgptSession)),
                                }] : []),
                            ]).filter((entry) => entry.prompts.length > 0);

                            return (
                                <Box
                                    key={stepKey}
                                    sx={{
                                        display: 'flex',
                                        gap: 1.25,
                                        p: 1.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            flexShrink: 0,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: accent || 'primary.main',
                                            color: accentText,
                                            fontWeight: 700,
                                            fontSize: 13,
                                        }}
                                    >
                                        {number}
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                                            {workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' && index === 3 ? 'Thiết kế hình ảnh và hành động từng beat tự do' : (label || step.title)}
                                        </Typography>
                                        {workflow.key === 'video-html' && index === 0 && Number(shortVideoId) > 0 && <ShortVideoAgentSaydiCastSettings shortVideoId={Number(shortVideoId)} revision={String(audioScript || '')} />}
                                        {workflow.key === 'video-html' && index === 1 && Number(shortVideoId) > 0 && <SceneAssetsPanel shortVideoId={Number(shortVideoId)}/>}

                                        {step.description.length > 0 && (
                                            <Box component="ul" sx={{ m: 0, mt: 0.75, p: 0, listStyle: 'none' }}>
                                                {(workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' && index === 3
                                                    ? ['Tự do thiết kế bối cảnh, nhân vật, đạo cụ, camera và hành động theo lời kể; không cần gán hồ sơ asset. Giữ vật liệu có chi tiết, sắc tố đậm, màu bão hòa và tương phản rõ.']
                                                    : step.description).map((item, itemIndex) => (
                                                    <Box
                                                        component="li"
                                                        key={itemIndex}
                                                        sx={{ display: 'flex', gap: 0.75, mb: 0.5, alignItems: 'flex-start' }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 5,
                                                                height: 5,
                                                                flexShrink: 0,
                                                                borderRadius: '50%',
                                                                bgcolor: 'text.disabled',
                                                                mt: '7px',
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            component="div"
                                                            color="text.secondary"
                                                            sx={{
                                                                lineHeight: 1.5,
                                                                '& a': { color: 'link' },
                                                                '& b, & strong': { fontWeight: 600 },
                                                                '& code': {
                                                                    px: 0.5,
                                                                    borderRadius: 0.5,
                                                                    bgcolor: 'action.hover',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.9em',
                                                                },
                                                                '& img': { maxWidth: '100%' },
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: item }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}

                                        {step.result && (
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                alignItems="center"
                                                sx={{ mt: 0.75 }}
                                            >
                                                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                                                    Kết quả: {step.result}
                                                </Typography>
                                            </Stack>
                                        )}

                                        

                                        {step.inputPrompt.length > 0 && (
                                            <Box
                                                sx={{
                                                    mt: 1.25,
                                                    p: 1.25,
                                                    border: '1px dashed',
                                                    borderColor: 'divider',
                                                    borderRadius: 1.5,
                                                    bgcolor: 'action.hover',
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                    Biến prompt (copy sẽ tự thay)
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        mt: 0.75,
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        gap: 1,
                                                    }}
                                                >
                                                    {step.inputPrompt.map((def) => (
                                                        <TextField
                                                            key={def.name}
                                                            select={def.type === 'duration'}
                                                            disabled={def.type === 'duration' && (savingInputs || Boolean(deepseekAction))}
                                                            label={def.description || def.name}
                                                            placeholder={def.default}
                                                            size="small"
                                                            fullWidth
                                                            value={draftInputs[def.name] ?? inputValues[def.name] ?? def.default}
                                                            onChange={(event) => def.type === 'duration'
                                                                ? handleDurationChange(def.name, event.target.value)
                                                                : setDraftInputs((prev) => ({...prev, [def.name]: event.target.value}))}
                                                            helperText={def.type === 'duration' ? (savingInputs ? 'Đang tự lưu…' : 'Tự lưu khi chọn. Sau đó mở DeepSeek để tìm chủ đề.') : undefined}
                                                            InputProps={{
                                                                sx: { fontSize: 13 },
                                                            }}
                                                            sx={{ '& .MuiInputLabel-root': { fontSize: 12 } }}
                                                        >
                                                            {def.type === 'duration' ? [
                                                                <MenuItem key="empty" value="" disabled>Chọn thời lượng</MenuItem>,
                                                                ...[10, 15, 30, 60, 90, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600].map((seconds) => <MenuItem key={seconds} value={String(seconds)}>{seconds < 60 ? `${seconds} giây` : `${seconds / 60} phút`}</MenuItem>),
                                                            ] : undefined}
                                                        </TextField>
                                                    ))}
                                                </Box>
                                                {step.inputPrompt.some((def) => def.type !== 'duration') ? <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disabled={savingInputs}
                                                        startIcon={
                                                            savingInputs
                                                                ? <CircularProgress size={12} color="inherit" />
                                                                : <SaveOutlinedIcon fontSize="small" />
                                                        }
                                                        onClick={() => { void handleSaveInputs(); }}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        Lưu biến
                                                    </Button>
                                                </Box> : null}
                                            </Box>
                                        )}

                                        {(step.prompts.length > 0 || step.prompt) && (
                                            <Box
                                                sx={{
                                                    mt: 1.25,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    gap: 0.75,
                                                }}
                                            >
                                                {step.prompts.map((promptItem, promptIndex) => {
                                                    const itemKey = `${stepKey}:p${promptIndex}`;
                                                    const itemCopying = copyingStep === itemKey;
                                                    const itemCopied = copiedStep === itemKey;
                                                    // Item có nhóm lựa chọn (choice) → dùng file của option đang chọn.
                                                    const choiceInfo = resolveWorkflowPromptChoiceFile(promptItem, effectiveChoiceValues);
                                                    const hasChoice = Boolean(promptItem.choice) && promptItem.choiceOptions.length > 0;
                                                    const selectedChoiceLabel = hasChoice
                                                        ? String(effectiveChoiceValues[promptItem.choice] || '').trim()
                                                        : '';
                                                    // Chưa chọn chủ đề → ẩn prompt, buộc user chọn trước khi mở DeepSeek.
                                                    const choicePending = hasChoice && !selectedChoiceLabel;

                                                    const choiceNode = hasChoice ? (
                                                        <Box sx={{ mb: 0.5, width: '100%' }}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}
                                                            >
                                                                {promptItem.choiceLabel || 'Chọn loại'}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <ButtonGroup size="small" variant="outlined" disabled={Boolean(savingChoice)}>
                                                                    {promptItem.choiceOptions.map((option) => (
                                                                        <Button
                                                                            key={option.label}
                                                                            variant={option.label === selectedChoiceLabel ? 'contained' : 'outlined'}
                                                                            disabled={!option.exists}
                                                                            onClick={() => { void handleSelectChoice(promptItem.choice, option.label); }}
                                                                            sx={{ textTransform: 'none' }}
                                                                        >
                                                                            {option.label}
                                                                        </Button>
                                                                    ))}
                                                                </ButtonGroup>
                                                                {savingChoice === promptItem.choice ? (
                                                                    <CircularProgress size={12} />
                                                                ) : null}
                                                            </Box>
                                                        </Box>
                                                    ) : null;

                                                    if (choicePending) {
                                                        return (
                                                            <Box key={itemKey} sx={{ minWidth: 0 }}>
                                                                {choiceNode}
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{ display: 'block', mt: 0.25, color: 'warning.main' }}
                                                                >
                                                                    Chọn {promptItem.choiceLabel || 'chủ đề'} để hiện prompt.
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    }

                                                    const button = (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            disabled={Boolean(copyingStep) || !choiceInfo.exists}
                                                            startIcon={
                                                                itemCopying
                                                                    ? <CircularProgress size={12} color="inherit" />
                                                                    : itemCopied
                                                                        ? <CheckIcon fontSize="small" />
                                                                        : <ContentCopyIcon fontSize="small" />
                                                            }
                                                            onClick={() => handleCopy(itemKey, choiceInfo.file)}
                                                            sx={{ textTransform: 'none' }}
                                                        >
                                                            {itemCopied ? 'Đã copy' : (workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' && promptItem.file === 'create-beat-visual.md' ? 'Thiết kế visual tự do từng beat' : promptItem.label)}
                                                        </Button>
                                                    );

                                                    const hasSavedOutput = Boolean(
                                                        (workflowOutputs[promptItem.updateField] || '').trim(),
                                                    );
                                                    const updateButton = promptItem.updateField ? (
                                                        <Tooltip
                                                            title={
                                                                hasSavedOutput
                                                                    ? `Đã có output [${promptItem.updateField}] — bấm để xem/cập nhật`
                                                                    : `Cập nhật output [${promptItem.updateField}] — lưu vào short video, tự thay key khi copy prompt`
                                                            }
                                                            placement="top"
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                color={hasSavedOutput ? 'success' : 'default'}
                                                                onClick={() => openUpdateDialog(itemKey, promptItem.label, promptItem.updateField, promptItem.buttonUpdate)}
                                                            >
                                                                <CloudUploadOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : null;

                                                    const noteNode = promptItem.note ? (
                                                        <Typography
                                                            variant="caption"
                                                            component="div"
                                                            color="text.secondary"
                                                            sx={{
                                                                mt: 0.25,
                                                                ml: 0.25,
                                                                lineHeight: 1.4,
                                                                '& a': { color: 'link' },
                                                                '& b, & strong': { fontWeight: 600 },
                                                                '& code': {
                                                                    px: 0.5,
                                                                    borderRadius: 0.5,
                                                                    bgcolor: 'action.hover',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.9em',
                                                                },
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: promptItem.note }}
                                                        />
                                                    ) : null;

                                                    const breakdownPlan = promptItem.scriptBreakdown > 0 && audioScript
                                                        ? buildWorkflowBreakdownPlan(
                                                            audioScript,
                                                            promptItem.scriptBreakdown,
                                                            mergedPromptContext,
                                                        )
                                                        : null;

                                                    if (breakdownPlan) {
                                                        return (
                                                            <Box key={itemKey} sx={{ minWidth: 0, width: '100%', mb: 0.5 }}>
                                                                {choiceNode}
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                                    {updateButton}
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                        {promptItem.label}
                                                                    </Typography>
                                                                </Box>
                                                                <PromptKeywordChips
                                                                    keywords={keywordsForFile(choiceInfo.file)}
                                                                    getState={promptKeywordGetState}
                                                                />
                                                                <MarketingWorkflowBreakdown
                                                                    workflowKey={activeWorkflowKey}
                                                                    item={promptItem}
                                                                    plan={breakdownPlan}
                                                                    savedValue={workflowOutputs[promptItem.updateField] || ''}
                                                                    shortVideoId={shortVideoId}
                                                                    showMessage={api.showMessage}
                                                                    getFreshContext={getFreshChunkContext}
                                                                />
                                                                {noteNode}
                                                            </Box>
                                                        );
                                                    }

                                                    const row = choiceInfo.exists
                                                        ? button
                                                        : (
                                                            <Tooltip
                                                                title={choiceInfo.file ? `File prompt chưa tồn tại: ${choiceInfo.file}` : 'Prompt này không có file'}
                                                                placement="top"
                                                            >
                                                                <span>{button}</span>
                                                            </Tooltip>
                                                        );

                                                    return (
                                                        <Box key={itemKey} sx={{ minWidth: 0 }}>
                                                            {choiceNode}
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                                                {row}
                                                                {updateButton}
                                                            </Box>
                                                            <PromptKeywordChips
                                                                keywords={keywordsForFile(choiceInfo.file)}
                                                                getState={promptKeywordGetState}
                                                            />
                                                            {noteNode}
                                                        </Box>
                                                    );
                                                })}

                                                {step.prompt && (
                                                    (() => {
                                                        const button = (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                disabled={Boolean(copyingStep) || !step.promptExists}
                                                                startIcon={
                                                                    isCopying
                                                                        ? <CircularProgress size={12} color="inherit" />
                                                                        : isCopied
                                                                            ? <CheckIcon fontSize="small" />
                                                                            : <ContentCopyIcon fontSize="small" />
                                                                }
                                                                onClick={() => handleCopy(stepKey, step.prompt)}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                {isCopied ? 'Đã copy' : 'Copy prompt'}
                                                            </Button>
                                                        );

                                                        if (step.promptExists) {
                                                            return (
                                                                <Box sx={{ minWidth: 0 }}>
                                                                    {button}
                                                                    <PromptKeywordChips
                                                                        keywords={keywordsForFile(step.prompt)}
                                                                        getState={promptKeywordGetState}
                                                                    />
                                                                </Box>
                                                            );
                                                        }

                                                        return (
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Tooltip title={`File prompt chưa tồn tại: ${step.prompt}`} placement="top">
                                                                    <span>{button}</span>
                                                                </Tooltip>
                                                                <PromptKeywordChips
                                                                    keywords={keywordsForFile(step.prompt)}
                                                                    getState={promptKeywordGetState}
                                                                />
                                                            </Box>
                                                        );
                                                    })()
                                                )}
                                            </Box>
                                        )}


                                        {chatSessionProviders.map(({ provider, label, keySuffix, prompts: providerPrompts }) => {
                                            // Khớp ĐÚNG vai trò — không fallback sang prompt khác
                                            // (tránh gửi nhầm prompt beat/translate thành generate).
                                            const sessionKey = `${workflow.key}#${workflow.key === 'video-html-2d' ? 'handoff-v2-' : (workflow.key === 'video-html' && effectiveChoiceValues['asset-mode'] === 'free' ? 'free-' : '')}${index}${keySuffix}`;
                                            const dsState = deepseekStates[sessionKey] || EMPTY_DEEPSEEK_STATE;
                                            const findPrompt = (role: '' | 'generate' | 'beat' | 'translate') => (
                                                providerPrompts.find((p) => (
                                                    (provider === 'chatgpt' ? p.chatgptSession : p.deepseekSession) === role
                                                ))
                                            );
                                            const generatePrompt = findPrompt('generate');
                                            const beatPrompt = findPrompt('beat');
                                            const translatePrompt = findPrompt('translate');
                                            const busy = Boolean(deepseekAction);
                                            // Item generate có thể có nhóm lựa chọn (choice) → dùng file của option đang chọn.
                                            const generateInfo = generatePrompt
                                                ? resolveWorkflowPromptChoiceFile(generatePrompt, effectiveChoiceValues)
                                                : null;
                                            const beatInfo = beatPrompt
                                                ? resolveWorkflowPromptChoiceFile(beatPrompt, effectiveChoiceValues)
                                                : null;
                                            const translateInfo = translatePrompt
                                                ? resolveWorkflowPromptChoiceFile(translatePrompt, effectiveChoiceValues)
                                                : null;
                                            const generateExists = Boolean(generateInfo?.exists);
                                            const cb = {
                                                generate: generateInfo?.file,
                                                beat: beatInfo?.file,
                                                translate: translateInfo?.file,
                                            };

                                            return (
                                                <Box
                                                    key={provider}
                                                    sx={{
                                                        mt: 1.25,
                                                        p: 1.25,
                                                        border: '1px solid',
                                                        borderColor: dsState.sessionAlive ? 'success.light' : 'divider',
                                                        borderRadius: 2,
                                                        bgcolor: 'action.hover',
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                        <SmartToyOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                            {label} (browser)
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            color={dsState.sessionAlive ? 'success' : 'default'}
                                                            variant={dsState.sessionAlive ? 'filled' : 'outlined'}
                                                            label={dsState.sessionAlive ? 'Browser đang mở' : 'Chưa mở browser'}
                                                            sx={{ height: 20, fontSize: 11 }}
                                                        />
                                                        {dsState.beatCount > 0 ? (
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                color="info"
                                                                label={`${dsState.beatCount} beat`}
                                                                sx={{ height: 20, fontSize: 11 }}
                                                            />
                                                        ) : null}
                                                        {dsState.translationCount > 0 ? (
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                color="info"
                                                                label={`Dịch ${dsState.translationCount}`}
                                                                sx={{ height: 20, fontSize: 11 }}
                                                            />
                                                        ) : null}
                                                        {dsState.hasOriginalAudio ? (
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                color="warning"
                                                                label="Có audio gốc"
                                                                sx={{ height: 20, fontSize: 11 }}
                                                            />
                                                        ) : null}
                                                    </Box>

                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color={provider === 'chatgpt' ? 'success' : 'primary'}
                                                            disabled={busy || !generateExists || configBlocked}
                                                            startIcon={
                                                                deepseekAction === sessionKey
                                                                    ? <CircularProgress size={12} color="inherit" />
                                                                    : <SmartToyOutlinedIcon fontSize="small" />
                                                            }
                                                            onClick={() => { void runOpenDeepseekSession(cb, sessionKey, false, provider, step.updateBox); }}
                                                            sx={{ textTransform: 'none' }}
                                                        >
                                                            {deepseekAction === sessionKey ? 'Đang mở browser…' : `Mở ${label}`}
                                                        </Button>
                                                        {dsState.chatUrl ? (
                                                            <Tooltip title={dsState.chatUrl} placement="top">
                                                                <span>
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color={provider === 'chatgpt' ? 'success' : 'secondary'}
                                                                        disabled={busy || configBlocked}
                                                                        startIcon={<OpenInNewOutlinedIcon fontSize="small" />}
                                                                        onClick={() => { void runOpenDeepseekSession(cb, sessionKey, true, provider, step.updateBox); }}
                                                                        sx={{ textTransform: 'none' }}
                                                                    >
                                                                        Mở lại luồng chat cũ
                                                                    </Button>
                                                                </span>
                                                            </Tooltip>
                                                        ) : null}
                                                        {dsState.message ? (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {dsState.message}
                                                            </Typography>
                                                        ) : null}
                                                    </Stack>

                                                    {dsState.chatUrl ? (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ display: 'block', mt: 0.5, wordBreak: 'break-all' }}
                                                            color="text.secondary"
                                                        >
                                                            Luồng chat đã lưu:{' '}
                                                            <a href={dsState.chatUrl} target="_blank" rel="noopener noreferrer">
                                                                {dsState.chatUrl}
                                                            </a>
                                                        </Typography>
                                                    ) : null}
                                                </Box>
                                            );
                                        })}

{step.note && (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 0.75,
                                                    alignItems: 'flex-start',
                                                    mt: 1,
                                                    px: 1,
                                                    py: 0.75,
                                                    borderRadius: 1,
                                                    bgcolor: 'rgba(255, 152, 0, 0.1)',
                                                }}
                                            >
                                                <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 15, color: 'warning.dark', mt: '2px' }} />
                                                <Typography
                                                    variant="body2"
                                                    component="div"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        lineHeight: 1.5,
                                                        '& a': { color: 'link' },
                                                        '& b, & strong': { fontWeight: 600 },
                                                        '& code': {
                                                            px: 0.5,
                                                            borderRadius: 0.5,
                                                            bgcolor: 'action.hover',
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9em',
                                                        },
                                                        '& img': { maxWidth: '100%' },
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: step.note }}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            <Dialog
                open={Boolean(updatingItem)}
                onClose={() => {
                    if (!savingUpdate) {
                        setUpdatingItem(null);
                    }
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontSize: 16 }}>
                    {updatingItem ? `Cập nhật output: ${updatingItem.label}` : 'Cập nhật output'}
                </DialogTitle>
                <DialogContent>
                    {updatingItem && (
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Giá trị lưu theo key <code>[{updatingItem.fieldKey}]</code> vào short video — copy prompt sau đó tự thay key này bằng giá trị đã lưu.
                            </Typography>

                            {Boolean(oldValue.trim()) && (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                        bgcolor: 'action.hover',
                                        position: 'relative',
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Giá trị đã lưu
                                    </Typography>
                                    <IconButton size="small" onClick={handleCopyOldValue} sx={{ position: 'absolute', top: 4, right: 4 }}>
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            mt: 0.5,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontSize: 12,
                                            lineHeight: 1.5,
                                            maxHeight: 180,
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {oldValue}
                                    </Box>
                                </Box>
                            )}

                            <TextField
                                label="Giá trị mới (paste từ chat AI)"
                                size="small"
                                multiline
                                minRows={5}
                                fullWidth
                                value={updateValue}
                                onChange={(event) => setUpdateValue(event.target.value)}
                            />

                            {updatingItem && resolveWorkflowResourceKind(updatingItem.buttonUpdate)
                                && Boolean((updateValue.trim() || oldValue).trim()) ? (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={
                                            importingAsset ? (
                                                <CircularProgress size={12} color="inherit" />
                                            ) : resolveWorkflowResourceKind(updatingItem.buttonUpdate) === 'character' ? (
                                                <PersonAddAltOutlinedIcon fontSize="small" />
                                            ) : (
                                                <LandscapeOutlinedIcon fontSize="small" />
                                            )
                                        }
                                        onClick={handleImportAsset}
                                        disabled={importingAsset || savingUpdate}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {resolveWorkflowResourceKind(updatingItem.buttonUpdate) === 'character'
                                            ? 'Update resource nhân vật'
                                            : 'Update resource không gian'}
                                    </Button>
                                     <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 180 }}>
                                        Import nhanh asset từ dữ liệu trên vào resource của short video
                                        (trùng mã định danh → cập nhật, không xóa resource cũ).
                                    </Typography>
                                </Box>
                            ) : null}

                            {isBeatPromptUpdate && Boolean((updateValue.trim() || oldValue).trim()) ? (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={
                                            importingBeatPrompts
                                                ? <CircularProgress size={12} color="inherit" />
                                                : <ImageOutlinedIcon fontSize="small" />
                                        }
                                        onClick={handleImportBeatPrompts}
                                        disabled={importingBeatPrompts || savingUpdate}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Update image prompt cho beat
                                    </Button>
                                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 180 }}>
                                        Import prompt vào đúng vị trí beat của clip (beat N trong file → beat N của clip,
                                        all-or-nothing — có lỗi thì không beat nào được update).
                                    </Typography>
                                    {beatPromptErrors.length > 0 && (
                                        <Box
                                            sx={{
                                                width: '100%',
                                                maxHeight: 180,
                                                overflowY: 'auto',
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'error.light',
                                                bgcolor: 'error.lighter',
                                                p: 1,
                                            }}
                                        >
                                            {beatPromptErrors.map((errorItem, errorIndex) => (
                                                <Typography
                                                    key={errorIndex}
                                                    variant="caption"
                                                    color="error.dark"
                                                    sx={{ display: 'block', lineHeight: 1.5 }}
                                                >
                                                    • {errorItem}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            ) : null}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setUpdatingItem(null)} disabled={savingUpdate} sx={{ textTransform: 'none' }}>
                        Hủy
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveUpdate}
                        disabled={savingUpdate}
                        startIcon={savingUpdate ? <CircularProgress size={12} color="inherit" /> : undefined}
                        sx={{ textTransform: 'none' }}
                    >
                        Lưu output
                    </Button>
                </DialogActions>
            </Dialog>
        </DrawerCustom>
    );
}
