import React from 'react';
import {
    Alert,
    Box,
    Checkbox,
    Chip,
    FormControlLabel,
    FormGroup,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import ReplayIcon from '@mui/icons-material/Replay';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { copyShortVideoAgentPromptToClipboard } from 'helpers/marketingShortVideoAgentPrompt';

type Props = {
    open: boolean;
    shortVideoId: number;
    onClose: () => void;
    onUploaded?: () => void;
};

type UploadResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    url?: string;
    duration_sec?: number;
};

const TTS_PLATFORM_OPTIONS = [
    { key: 'omnivoice_local', label: 'OmniVoice (local)' },
    { key: 'vieneu', label: 'VieNeu (local)' },
    { key: 'saydi', label: 'Saydi (API)' },
    { key: 'vbee', label: 'Vbee (API)' },
] as const;

const DEFAULT_TTS_PLATFORMS = TTS_PLATFORM_OPTIONS.map((item) => item.key);

type AgentAudioContentResponse = {
    success?: boolean;
    title?: string;
    audio_script?: string;
    audio_script_approved?: boolean;
    audio_script_approved_at?: string;
    audio_file?: string;
    audio_file_duration_sec?: number;
    agent_tts_auto?: boolean;
    agent_tts_platforms?: string[];
    agent_video_status?: string;
    agent_tts_job_id?: number | null;
    agent_tts_status?: string;
    last_error?: string | null;
    tts_pending?: boolean;
    tts_failed?: boolean;
    needs_tts_enqueue?: boolean;
    tts_chain?: string[];
    workflow_mode?: string;
    agent_workflow?: {
        ready_for_video?: boolean;
        ready_for_continue?: boolean;
        ready_for_phase_2?: boolean;
        script_approved?: boolean;
        has_script?: boolean;
        tts_pending?: boolean;
        tts_failed?: boolean;
        phase?: string;
    };
};

function parseMessage(message: UploadResponse['message']): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function platformLabel(key: string): string {
    return TTS_PLATFORM_OPTIONS.find((item) => item.key === key)?.label ?? key;
}

function formatTtsChain(chain: string[]): string {
    if (chain.length === 0) {
        return 'Chưa chọn nền tảng';
    }
    return chain.map(platformLabel).join(' → ');
}

function workflowChip(
    hasScript: boolean,
    scriptApproved: boolean,
    hasAudio: boolean,
    ttsPending: boolean,
    ttsFailed: boolean,
): { label: string; color: 'default' | 'warning' | 'success' | 'info' | 'error' } {
    if (hasAudio) {
        return {
            label: 'Audio TTS sẵn sàng — render video',
            color: 'success',
        };
    }
    if (ttsFailed) {
        return { label: 'Sinh TTS thất bại — thử lại hoặc upload MP3', color: 'error' };
    }
    if (ttsPending) {
        return { label: 'Đang sinh audio TTS…', color: 'info' };
    }
    if (hasScript && scriptApproved) {
        return { label: 'Script đã duyệt — chờ TTS hoặc upload MP3', color: 'warning' };
    }
    if (hasScript) {
        return { label: 'Chờ admin duyệt script', color: 'warning' };
    }
    return { label: 'Chưa có script — chạy agent bước 1', color: 'default' };
}

async function uploadAgentAudioMp3(shortVideoId: number, file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('audio', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = {
        Accept: 'application/json',
    };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-agent-audio',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as UploadResponse;
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload thất bại');
    }

    return result;
}

type SaveTtsSettingsArgs = {
    shortVideoId: number;
    enabled?: boolean;
    platforms?: string[];
};

async function saveAgentTtsSettings({
    shortVideoId,
    enabled,
    platforms,
}: SaveTtsSettingsArgs): Promise<JsonFormat> {
    const token = getAccessToken() ?? '';
    const body: Record<string, unknown> = {
        short_video_id: shortVideoId,
        id: shortVideoId,
        access_token: token,
    };
    if (enabled !== undefined) {
        body.agent_tts_auto = enabled ? '1' : '0';
    }
    if (platforms !== undefined) {
        body.agent_tts_platforms = platforms;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-tts-mode',
        ),
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        },
    );

    return response.json() as Promise<JsonFormat>;
}

export default function ShortVideoAgentAudioDrawer({
    open,
    shortVideoId,
    onClose,
    onUploaded,
}: Props) {
    const api = useAjax();
    const { showMessage } = useFloatingMessages();
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [uploading, setUploading] = React.useState(false);
    const [savingTtsMode, setSavingTtsMode] = React.useState(false);
    const [agentTtsAuto, setAgentTtsAuto] = React.useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>(DEFAULT_TTS_PLATFORMS);
    const [audioScript, setAudioScript] = React.useState('');
    const [scriptApproved, setScriptApproved] = React.useState(false);
    const [savingScript, setSavingScript] = React.useState(false);
    const [approvingScript, setApprovingScript] = React.useState(false);
    const [audioFileUrl, setAudioFileUrl] = React.useState('');
    const [audioDurationSec, setAudioDurationSec] = React.useState<number | null>(null);
    const [title, setTitle] = React.useState('');
    const [ttsPending, setTtsPending] = React.useState(false);
    const [ttsFailed, setTtsFailed] = React.useState(false);
    const [lastError, setLastError] = React.useState('');
    const [retryingTts, setRetryingTts] = React.useState(false);
    const [regeneratingTts, setRegeneratingTts] = React.useState(false);
    const [needsTtsEnqueue, setNeedsTtsEnqueue] = React.useState(false);
    const apiRef = React.useRef(api);
    apiRef.current = api;

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
            success: (res: AgentAudioContentResponse) => {
                if (!res?.success) {
                    return;
                }
                setTitle(String(res?.title || '').trim());
                setAudioScript(String(res?.audio_script || '').trim());
                setScriptApproved(Boolean(res?.audio_script_approved ?? res?.agent_workflow?.script_approved));
                setAudioFileUrl(String(res?.audio_file || '').trim());
                setAgentTtsAuto(Boolean(res?.agent_tts_auto));
                setTtsPending(Boolean(res?.tts_pending ?? res?.agent_workflow?.tts_pending));
                setTtsFailed(Boolean(res?.tts_failed ?? res?.agent_workflow?.tts_failed));
                setNeedsTtsEnqueue(Boolean(res?.needs_tts_enqueue));
                setLastError(String(res?.last_error || '').trim());
                const platforms = Array.isArray(res?.agent_tts_platforms) && res.agent_tts_platforms.length > 0
                    ? res.agent_tts_platforms
                    : DEFAULT_TTS_PLATFORMS;
                setSelectedPlatforms(platforms);
                const dur = Number(res?.audio_file_duration_sec || 0);
                setAudioDurationSec(dur > 0 ? dur : null);
            },
        });
    }, [open, shortVideoId]);

    React.useEffect(() => {
        if (!open || !shortVideoId) {
            return;
        }
        loadRow({ syncTtsQueue: true });
    }, [loadRow, open, shortVideoId]);

    React.useEffect(() => {
        if (!open || !shortVideoId || !ttsPending) {
            return undefined;
        }
        const timer = window.setInterval(() => {
            loadRow();
        }, 5000);
        return () => window.clearInterval(timer);
    }, [loadRow, open, shortVideoId, ttsPending]);

    const hasScript = audioScript.length > 0;
    const hasAudio = audioFileUrl.length > 0;
    const statusChip = workflowChip(hasScript, scriptApproved, hasAudio, ttsPending, ttsFailed);
    const chainLabel = formatTtsChain(selectedPlatforms);

    const persistTtsSettings = async (
        nextAuto: boolean,
        nextPlatforms: string[],
        successMessage: string,
    ) => {
        setSavingTtsMode(true);
        try {
            const res = await saveAgentTtsSettings({
                shortVideoId,
                enabled: nextAuto,
                platforms: nextPlatforms,
            });
            if (!res?.success) {
                showMessage(parseMessage(res?.message as UploadResponse['message']) || 'Không lưu được cấu hình TTS', 'error');
                return;
            }
            setAgentTtsAuto(nextAuto);
            setSelectedPlatforms(nextPlatforms);
            showMessage(successMessage, 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setSavingTtsMode(false);
        }
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

    const handleCopyPrompt = async (phase: '1' | '2' | 'continue') => {
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
            const token = getAccessToken() ?? '';
            const res = await fetch(
                convertToURL(
                    getAdminApiPrefix(),
                    'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-admin-audio-script',
                ),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        short_video_id: shortVideoId,
                        id: shortVideoId,
                        audio_script: audioScript,
                    }),
                },
            );
            const json = await res.json() as UploadResponse;
            if (!json?.success) {
                showMessage(parseMessage(json?.message) || 'Không lưu được script', 'error');
                return;
            }
            setScriptApproved(false);
            showMessage(parseMessage(json?.message) || 'Đã lưu script', 'success');
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
            const token = getAccessToken() ?? '';
            const res = await fetch(
                convertToURL(
                    getAdminApiPrefix(),
                    'plugin/vn4-e-learning/app-mobile/marketing/short-video/approve-audio-script',
                ),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        short_video_id: shortVideoId,
                        id: shortVideoId,
                    }),
                },
            );
            const json = await res.json() as UploadResponse;
            if (!json?.success) {
                showMessage(parseMessage(json?.message) || 'Không duyệt được script', 'error');
                return;
            }
            setScriptApproved(true);
            showMessage(parseMessage(json?.message) || 'Đã duyệt script', 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setApprovingScript(false);
        }
    };

    const handleTtsAutoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.target.checked;
        const platforms = next && selectedPlatforms.length === 0
            ? DEFAULT_TTS_PLATFORMS
            : selectedPlatforms;
        await persistTtsSettings(
            next,
            platforms,
            next ? 'Đã bật TTS tự động agent' : 'Đã tắt TTS tự động — workflow 2 bước',
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
        await persistTtsSettings(agentTtsAuto, ordered, 'Đã cập nhật nền tảng TTS');
    };

    const handleRegenerateTts = async () => {
        if (!window.confirm('Tạo lại audio TTS? MP3 hiện tại sẽ bị thay thế sau khi queue hoàn tất.')) {
            return;
        }
        setRegeneratingTts(true);
        try {
            const token = getAccessToken() ?? '';
            const res = await fetch(
                convertToURL(
                    getAdminApiPrefix(),
                    'plugin/vn4-e-learning/app-mobile/marketing/short-video/regenerate-agent-narration-tts',
                ),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        short_video_id: shortVideoId,
                        id: shortVideoId,
                    }),
                },
            );
            const json = await res.json() as UploadResponse;
            if (!json?.success) {
                showMessage(parseMessage(json?.message) || 'Không tạo lại được audio TTS', 'error');
                return;
            }
            setAudioFileUrl('');
            setAudioDurationSec(null);
            setTtsPending(true);
            setTtsFailed(false);
            setNeedsTtsEnqueue(false);
            showMessage(parseMessage(json?.message) || 'Đã reset audio và queue TTS mới', 'success');
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
            const token = getAccessToken() ?? '';
            const res = await fetch(
                convertToURL(
                    getAdminApiPrefix(),
                    'plugin/vn4-e-learning/app-mobile/marketing/short-video/retry-agent-narration-tts',
                ),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        short_video_id: shortVideoId,
                        id: shortVideoId,
                    }),
                },
            );
            const json = await res.json() as UploadResponse;
            if (!json?.success) {
                showMessage(parseMessage(json?.message) || 'Không thử lại được TTS', 'error');
                return;
            }
            showMessage(parseMessage(json?.message) || successMessage, 'success');
            loadRow();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setRetryingTts(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !shortVideoId) {
            return;
        }
        if (!/\.mp3$/i.test(file.name)) {
            showMessage('Chỉ chấp nhận file MP3', 'error');
            return;
        }

        setUploading(true);
        try {
            const res = await uploadAgentAudioMp3(shortVideoId, file);
            if (!res?.success) {
                showMessage(parseMessage(res?.message) || 'Upload thất bại', 'error');
                return;
            }
            showMessage(parseMessage(res?.message) || 'Đã upload MP3', 'success');
            loadRow();
            onUploaded?.();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Agent audio (script + MP3)"
            restDialogContent={{ sx: { pb: 0 } }}
            action={
                (hasAudio && scriptApproved && !ttsPending)
                || (needsTtsEnqueue && scriptApproved && !hasAudio)
                    ? (
                        <Box sx={{ width: '100%', px: 2, py: 2.5 }}>
                            {hasAudio && scriptApproved ? (
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={() => { void handleCopyPrompt('2'); }}
                                >
                                    Copy prompt render video (bước 2)
                                </Button>
                            ) : (
                                <LoadingButton
                                    fullWidth
                                    variant="contained"
                                    color="warning"
                                    loading={retryingTts}
                                    onClick={() => { void handleRetryTts('Đã queue TTS narration'); }}
                                >
                                    Sinh TTS (queue)
                                </LoadingButton>
                            )}
                        </Box>
                    )
                    : undefined
            }
        >
            <Stack spacing={2} sx={{ pb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    Short video #{shortVideoId}
                    {title ? ` — ${title}` : ''}
                </Typography>

                <FormControlLabel
                    control={(
                        <Switch
                            checked={agentTtsAuto}
                            disabled={savingTtsMode}
                            onChange={(e) => { void handleTtsAutoChange(e); }}
                        />
                    )}
                    label="TTS tự động agent"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                    Sau duyệt script, CMS tự queue TTS. Khi có MP3 mới copy prompt render bước 2.
                </Typography>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Nền tảng TTS
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Thứ tự ưu tiên: OmniVoice → VieNeu → Saydi → Vbee
                    </Typography>
                    <FormGroup>
                        {TTS_PLATFORM_OPTIONS.map((option) => (
                            <FormControlLabel
                                key={option.key}
                                control={(
                                    <Checkbox
                                        checked={selectedPlatforms.includes(option.key)}
                                        disabled={!agentTtsAuto || savingTtsMode}
                                        onChange={() => { void handlePlatformToggle(option.key); }}
                                    />
                                )}
                                label={option.label}
                            />
                        ))}
                    </FormGroup>
                    {agentTtsAuto && (
                        <Chip
                            label={`Chain: ${chainLabel}`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                        />
                    )}
                </Box>

                <Chip label={statusChip.label} color={statusChip.color} size="small" sx={{ alignSelf: 'flex-start' }} />

                {ttsFailed && lastError && (
                    <Alert severity="error">
                        {lastError}
                    </Alert>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {!scriptApproved && (
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<ContentCopyIcon />}
                            onClick={() => { void handleCopyPrompt('1'); }}
                        >
                            Copy prompt sinh audio script
                        </Button>
                    )}
                    {ttsFailed && scriptApproved && !hasAudio && (
                        <LoadingButton
                            size="small"
                            variant="outlined"
                            color="warning"
                            loading={retryingTts}
                            onClick={() => { void handleRetryTts(); }}
                        >
                            Thử lại TTS
                        </LoadingButton>
                    )}
                    {needsTtsEnqueue && scriptApproved && !hasAudio && !ttsFailed && (
                        <LoadingButton
                            size="small"
                            variant="outlined"
                            color="primary"
                            loading={retryingTts}
                            onClick={() => { void handleRetryTts('Đã queue TTS narration'); }}
                        >
                            Sinh TTS (queue)
                        </LoadingButton>
                    )}
                </Stack>

                <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">Audio script (agent)</Typography>
                        <Button
                            size="small"
                            startIcon={<ContentCopyIcon />}
                            disabled={!hasScript}
                            onClick={() => { void handleCopyScript(); }}
                        >
                            Copy script
                        </Button>
                    </Stack>
                    {hasScript ? (
                        <>
                            <TextField
                                multiline
                                minRows={8}
                                maxRows={16}
                                fullWidth
                                value={audioScript}
                                onChange={(e) => setAudioScript(e.target.value)}
                                sx={{ mb: 1 }}
                            />
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <LoadingButton
                                    size="small"
                                    loading={savingScript}
                                    variant="outlined"
                                    startIcon={<SaveIcon />}
                                    onClick={() => { void handleSaveScript(); }}
                                >
                                    Lưu script
                                </LoadingButton>
                                <LoadingButton
                                    size="small"
                                    loading={approvingScript}
                                    variant="contained"
                                    color="success"
                                    disabled={scriptApproved}
                                    startIcon={<CheckCircleOutlineIcon />}
                                    onClick={() => { void handleApproveScript(); }}
                                >
                                    {scriptApproved ? 'Đã duyệt' : 'Duyệt script'}
                                </LoadingButton>
                            </Stack>
                        </>
                    ) : (
                        <Alert severity="info">
                            Chưa có script. Copy prompt bước 1 và chạy agent trong Cursor.
                        </Alert>
                    )}
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Audio file (MP3 — TTS hoặc upload thủ công)
                    </Typography>
                    {hasAudio ? (
                        <Stack spacing={1}>
                            <audio controls src={audioFileUrl} style={{ width: '100%' }}>
                                <track kind="captions" />
                            </audio>
                            {audioDurationSec != null && (
                                <Typography variant="caption" color="text.secondary">
                                    Thời lượng: {audioDurationSec.toFixed(1)}s
                                </Typography>
                            )}
                            {scriptApproved && !ttsPending && (
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    loading={regeneratingTts}
                                    startIcon={<ReplayIcon />}
                                    onClick={() => { void handleRegenerateTts(); }}
                                >
                                    Tạo lại audio TTS (queue)
                                </LoadingButton>
                            )}
                        </Stack>
                    ) : (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                            {ttsPending
                                ? 'CMS đang sinh MP3 qua TTS — vui lòng chờ vài phút.'
                                : scriptApproved
                                    ? 'Chưa có MP3. CMS queue TTS sau duyệt, hoặc upload MP3 thủ công.'
                                    : 'Chưa có MP3. Duyệt script trước — CMS sẽ queue TTS tự động.'}
                        </Alert>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/mpeg,.mp3"
                        hidden
                        onChange={(e) => { void handleFileChange(e); }}
                    />
                    <LoadingButton
                        loading={uploading}
                        variant="contained"
                        disabled={hasScript && !scriptApproved && !hasAudio}
                        startIcon={<UploadFileIcon />}
                        sx={{ mt: 1, mb: 1 }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {hasAudio ? 'Upload lại MP3' : 'Upload MP3'}
                    </LoadingButton>
                </Box>
            </Stack>
        </DrawerCustom>
    );
}
