import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Link,
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
import DrawerCustom from 'components/molecules/DrawerCustom';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';

type ManualAudioLangItem = {
    lang_code?: string;
    has_audio?: boolean;
    audio_url?: string;
    whisper_qa_status?: string;
    tts_engine?: string;
    speech_text?: string;
    speech_char_count?: number;
    has_speech_text?: boolean;
    speech_has_intro_outro?: boolean;
};

type ContentResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    marketing_post_id?: number;
    post_title?: string;
    langs?: ManualAudioLangItem[];
};

type UploadResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    target_lang?: string;
    url?: string;
    deleted_omnivoice_jobs?: number;
    deleted_whisper_qa_jobs?: number;
};

type Props = {
    open: boolean;
    postId: number;
    onClose: () => void;
    onUploaded?: () => void;
};

function parseMessage(raw: ContentResponse['message']): string {
    if (typeof raw === 'string') {
        return raw;
    }
    return raw?.content || '';
}

async function uploadManualAudioWav(postId: number, targetLang: string, file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('marketing_post_id', String(postId));
    formData.append('post_id', String(postId));
    formData.append('id', String(postId));
    formData.append('target_lang', targetLang);
    formData.append('audio', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = {
        Accept: 'application/json',
    };
    const token = localStorage.getItem('access_token');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(getAdminApiPrefix(), 'plugin/vn4-e-learning/app-mobile/marketing/tts/upload-manual-audio'),
        {
            method: 'POST',
            headers,
            body: formData,
        }
    );

    const result = await response.json() as UploadResponse;
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload thất bại');
    }

    return result;
}

export default function MarketingManualAudioDrawer({
    open,
    postId,
    onClose,
    onUploaded,
}: Props) {
    const api = useAjax();
    const { showMessage } = useFloatingMessages();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [postTitle, setPostTitle] = React.useState('');
    const [langs, setLangs] = React.useState<ManualAudioLangItem[]>([]);
    const [uploadingLang, setUploadingLang] = React.useState('');
    const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    const loadContent = React.useCallback(() => {
        if (!postId) {
            return;
        }
        setLoading(true);
        setError('');
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/tts/get-manual-audio-content',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                id: postId,
            },
            loading: false,
            success: (res: ContentResponse) => {
                setLoading(false);
                if (!res?.success) {
                    setError(parseMessage(res?.message) || 'Không tải được nội dung audio thủ công');
                    setLangs([]);
                    setPostTitle('');
                    return;
                }
                setLangs(res.langs || []);
                setPostTitle(String(res.post_title || '').trim());
            },
            error: (err: unknown) => {
                setLoading(false);
                setPostTitle('');
                const r = err as { message?: { content?: string } };
                setError(r?.message?.content || 'Không tải được nội dung audio thủ công');
                setLangs([]);
            },
        });
    }, [postId]);

    React.useEffect(() => {
        if (!open || !postId) {
            return;
        }
        loadContent();
    }, [open, postId, loadContent]);

    const handleCopy = async (item: ManualAudioLangItem) => {
        const text = String(item.speech_text || '');
        if (!text.trim()) {
            showMessage('Không có nội dung để copy', 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            showMessage(`Đã copy nội dung ${String(item.lang_code || '').toUpperCase()}`, 'success');
        } catch {
            showMessage('Không copy được — hãy chọn và copy thủ công', 'error');
        }
    };

    const handleUpload = async (item: ManualAudioLangItem, file: File) => {
        const langCode = String(item.lang_code || '').toLowerCase();
        if (!langCode || !postId) {
            return;
        }

        setUploadingLang(langCode);
        try {
            const res = await uploadManualAudioWav(postId, langCode, file);
            const msg = parseMessage(res?.message);
            if (!res?.success) {
                showMessage(msg || 'Upload audio thất bại', 'error');
                return;
            }

            if (msg) {
                showMessage(msg, 'success');
            }

            setLangs((prev) => prev.map((row) => {
                if (String(row.lang_code || '').toLowerCase() !== langCode) {
                    return row;
                }
                return {
                    ...row,
                    has_audio: true,
                    audio_url: String(res.url || row.audio_url || ''),
                    tts_engine: 'aistudio_manual',
                    whisper_qa_status: 'passed',
                };
            }));

            onUploaded?.();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : 'Upload audio thất bại', 'error');
        } finally {
            setUploadingLang('');
            const input = fileInputRefs.current[langCode];
            if (input) {
                input.value = '';
            }
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Audio thủ công"
            width={920}
            restDialogContent={{
                sx: { p: 2 },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: '100%' }}>
                {!loading && postTitle ? (
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Post #{postId}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                            {postTitle}
                        </Typography>
                    </Box>
                ) : null}

                <Alert severity="info">
                    Copy nội dung speech (intro + title + body + outro) vào AI Studio để tạo audio,
                    sau đó upload file WAV tương ứng từng ngôn ngữ (server sẽ convert sang MP3 trước khi lưu).
                </Alert>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                )}

                {!loading && error && (
                    <Alert severity="error">{error}</Alert>
                )}

                {!loading && !error && langs.length === 0 && (
                    <Alert severity="warning">Không có ngôn ngữ enabled cho post này.</Alert>
                )}

                {!loading && !error && langs.map((item) => {
                    const langCode = String(item.lang_code || '').toLowerCase();
                    const hasAudio = Boolean(item.has_audio);
                    const isUploading = uploadingLang === langCode;

                    return (
                        <Box
                            key={langCode}
                            sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: hasAudio ? 'success.main' : 'divider',
                                borderRadius: 1,
                                bgcolor: hasAudio ? 'success.light' : 'background.paper',
                            }}
                        >
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                justifyContent="space-between"
                                sx={{ mb: 1.5 }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {langCode.toUpperCase()}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        color={hasAudio ? 'success' : 'default'}
                                        label={hasAudio ? 'Đã có audio' : 'Chưa có audio'}
                                    />
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`${item.speech_char_count || 0} ký tự`}
                                    />
                                    {item.tts_engine ? (
                                        <Chip size="small" variant="outlined" label={item.tts_engine} />
                                    ) : null}
                                </Stack>

                                {hasAudio && item.audio_url ? (
                                    <Link href={item.audio_url} target="_blank" rel="noopener noreferrer">
                                        Nghe audio hiện tại
                                    </Link>
                                ) : null}
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ContentCopyIcon />}
                                    disabled={!item.has_speech_text}
                                    onClick={() => handleCopy(item)}
                                >
                                    Copy nội dung
                                </Button>

                                <input
                                    ref={(el) => {
                                        fileInputRefs.current[langCode] = el;
                                    }}
                                    type="file"
                                    accept="audio/wav,audio/wave,.wav"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleUpload(item, file);
                                        }
                                    }}
                                />

                                <LoadingButton
                                    variant="contained"
                                    size="small"
                                    startIcon={<UploadFileIcon />}
                                    loading={isUploading}
                                    onClick={() => fileInputRefs.current[langCode]?.click()}
                                >
                                    Upload WAV
                                </LoadingButton>
                            </Stack>

                            {!item.has_speech_text && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Chưa có nội dung speech cho ngôn ngữ này.
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </DrawerCustom>
    );
}
