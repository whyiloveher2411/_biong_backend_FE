import React from 'react';
import {
    Alert,
    Box,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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

function parseMessage(message: UploadResponse['message']): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function workflowChip(
    hasScript: boolean,
    hasAudio: boolean,
): { label: string; color: 'default' | 'warning' | 'success' } {
    if (hasAudio) {
        return { label: 'Sẵn sàng render video (bước 2)', color: 'success' };
    }
    if (hasScript) {
        return { label: 'Chờ admin upload MP3', color: 'warning' };
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
    const [audioScript, setAudioScript] = React.useState('');
    const [audioFileUrl, setAudioFileUrl] = React.useState('');
    const [audioDurationSec, setAudioDurationSec] = React.useState<number | null>(null);
    const [title, setTitle] = React.useState('');

    const loadRow = React.useCallback(() => {
        if (!shortVideoId || !open) {
            return;
        }
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-audio-content',
            method: 'POST',
            data: {
                short_video_id: shortVideoId,
                id: shortVideoId,
            },
            loading: false,
            success: (res: JsonFormat) => {
                if (!res?.success) {
                    return;
                }
                setTitle(String(res?.title || '').trim());
                setAudioScript(String(res?.audio_script || '').trim());
                setAudioFileUrl(String(res?.audio_file || '').trim());
                const dur = Number(res?.audio_file_duration_sec || 0);
                setAudioDurationSec(dur > 0 ? dur : null);
            },
        });
    }, [api, open, shortVideoId]);

    React.useEffect(() => {
        loadRow();
    }, [loadRow]);

    const hasScript = audioScript.length > 0;
    const hasAudio = audioFileUrl.length > 0;
    const statusChip = workflowChip(hasScript, hasAudio);

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

    const handleCopyPrompt = async (phase: '1' | '2') => {
        const result = await copyShortVideoAgentPromptToClipboard(shortVideoId, phase);
        showMessage(result.message, result.ok ? 'success' : 'error');
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
        >
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                    Short video #{shortVideoId}
                    {title ? ` — ${title}` : ''}
                </Typography>

                <Chip label={statusChip.label} color={statusChip.color} size="small" sx={{ alignSelf: 'flex-start' }} />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => { void handleCopyPrompt('1'); }}
                    >
                        Copy prompt bước 1
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={!hasAudio}
                        onClick={() => { void handleCopyPrompt('2'); }}
                    >
                        Copy prompt bước 2
                    </Button>
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
                        <Typography
                            component="pre"
                            variant="body2"
                            sx={{
                                whiteSpace: 'pre-wrap',
                                bgcolor: 'action.hover',
                                p: 2,
                                borderRadius: 1,
                                maxHeight: 240,
                                overflow: 'auto',
                            }}
                        >
                            {audioScript}
                        </Typography>
                    ) : (
                        <Alert severity="info">
                            Chưa có script. Copy prompt bước 1 và chạy agent trong Cursor.
                        </Alert>
                    )}
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Audio file (MP3 admin upload)
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
                        </Stack>
                    ) : (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                            Chưa có MP3. Dùng script ở trên để tạo audio (Saydi/Vbee/studio), nghe thử rồi upload.
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
                        startIcon={<UploadFileIcon />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {hasAudio ? 'Upload lại MP3' : 'Upload MP3'}
                    </LoadingButton>
                </Box>
            </Stack>
        </DrawerCustom>
    );
}
