import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
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

type SaydiSegmentItem = {
    index?: number;
    char_count?: number;
    text_preview?: string;
    status?: 'pending' | 'ready' | string;
    whisper_qa_status?: 'pending' | 'passed' | 'failed' | string;
    whisper_issue?: {
        reason?: string;
        expected_word_count?: number;
        whisper_word_count?: number;
        deviation_percent?: number;
    } | null;
    preview_api_path?: string;
    generated_at?: string;
};

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
    saydi_segments?: SaydiSegmentItem[];
    saydi_segments_ready?: number;
    saydi_segments_total?: number;
    saydi_whisper_segments_passed?: number;
    saydi_whisper_all_passed?: boolean;
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
    whisper_qa_pending?: boolean;
    whisper_qa_passed?: boolean;
};

function segmentWhisperChipProps(status: string): {
    color: 'success' | 'warning' | 'error' | 'default';
    label: string;
} | null {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'pending' || normalized === '') {
        return { color: 'default', label: 'Whisper: chưa kiểm tra' };
    }
    if (normalized === 'passed') {
        return { color: 'success', label: 'Whisper: đạt' };
    }
    if (normalized === 'failed') {
        return { color: 'error', label: 'Whisper: không đạt' };
    }

    return null;
}

function formatSegmentWhisperIssue(issue?: SaydiSegmentItem['whisper_issue']): string {
    if (!issue) {
        return '';
    }
    const reason = String(issue.reason || '');
    if (reason === 'word_count_deviation') {
        return `Lệch số từ: kỳ vọng ${issue.expected_word_count ?? '?'}, Whisper ${issue.whisper_word_count ?? '?'} (${issue.deviation_percent ?? '?'}%)`;
    }

    return reason || 'Whisper không đạt';
}

function whisperQaChipProps(status: string): { color: 'success' | 'warning' | 'default'; label: string } | null {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'pending') {
        return { color: 'warning', label: 'Whisper QA: đang chờ' };
    }
    if (normalized === 'passed') {
        return { color: 'success', label: 'Whisper QA: đạt' };
    }

    return null;
}

type SaydiUploadResponse = UploadResponse & {
    whisper_stage?: 'segment' | 'merged' | 'complete' | string;
    failed_segment_index?: number | null;
    whisper_issue?: SaydiSegmentItem['whisper_issue'];
    saydi_segments?: SaydiSegmentItem[];
    saydi_whisper_segments_passed?: number;
    saydi_segments_total?: number;
    saydi_whisper_all_passed?: boolean;
};

type SaydiGenerateResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    saydi_segments?: SaydiSegmentItem[];
    saydi_segments_ready?: number;
    saydi_segments_total?: number;
    saydi_whisper_segments_passed?: number;
    saydi_whisper_all_passed?: boolean;
    preview_api_path?: string;
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

function formatSaydiUploadErrorMessage(res: SaydiUploadResponse): string {
    const msg = parseMessage(res?.message);
    const stage = String(res.whisper_stage || '').toLowerCase();

    if (stage === 'segment') {
        const failedIndex = res.failed_segment_index;
        const detail = formatSegmentWhisperIssue(res.whisper_issue);
        const hint = failedIndex
            ? ` (đoạn ${failedIndex}${detail ? `: ${detail}` : ''})`
            : '';
        return (msg || 'Whisper không đạt ở một đoạn') + hint;
    }

    if (stage === 'merged') {
        const detail = formatSegmentWhisperIssue(res.whisper_issue);
        return detail
            ? `${msg || 'File sau khi ghép không đạt Whisper'} — ${detail}`
            : (msg || 'File sau khi ghép không đạt Whisper');
    }

    return msg || 'Upload audio Saydi thất bại';
}

function buildSaydiPreviewUrl(previewApiPath: string): string {
    const token = localStorage.getItem('access_token') || '';
    const url = convertToURL(getAdminApiPrefix(), previewApiPath);
    if (!token) {
        return url;
    }
    const separator = url.includes('?') ? '&' : '?';

    return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

function buildSaydiSegmentGeneratingKey(langCode: string, segmentIndex: number): string {
    return `${langCode}:${segmentIndex}`;
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
    const [saydiUploadingLangs, setSaydiUploadingLangs] = React.useState<Set<string>>(() => new Set());
    const saydiUploadingLangsRef = React.useRef<Set<string>>(new Set());
    const [saydiGeneratingKeys, setSaydiGeneratingKeys] = React.useState<Set<string>>(() => new Set());
    const saydiGeneratingKeysRef = React.useRef<Set<string>>(new Set());
    const [saydiGeneratingAllLangs, setSaydiGeneratingAllLangs] = React.useState<Set<string>>(() => new Set());
    const saydiGeneratingAllLangsRef = React.useRef<Set<string>>(new Set());
    const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    const loadContent = React.useCallback((options?: { silent?: boolean }) => {
        if (!postId) {
            return;
        }
        const silent = Boolean(options?.silent);
        if (!silent) {
            setLoading(true);
            setError('');
        }
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
                if (!silent) {
                    setLoading(false);
                }
                if (!res?.success) {
                    if (!silent) {
                        setError(parseMessage(res?.message) || 'Không tải được nội dung audio thủ công');
                        setLangs([]);
                        setPostTitle('');
                    }
                    return;
                }
                setLangs(res.langs || []);
                setPostTitle(String(res.post_title || '').trim());
            },
            error: (err: unknown) => {
                if (!silent) {
                    setLoading(false);
                    setPostTitle('');
                    const r = err as { message?: { content?: string } };
                    setError(r?.message?.content || 'Không tải được nội dung audio thủ công');
                    setLangs([]);
                }
            },
        });
    }, [postId]);

    const hasPendingWhisperQa = langs.some((row) => {
        const engine = String(row.tts_engine || '').toLowerCase();
        if (engine === 'saydi_manual') {
            return false;
        }

        return String(row.whisper_qa_status || '').toLowerCase() === 'pending';
    });

    React.useEffect(() => {
        if (!open || !postId || !hasPendingWhisperQa) {
            return;
        }

        const timer = window.setInterval(() => {
            loadContent({ silent: true });
        }, 9000);

        return () => window.clearInterval(timer);
    }, [open, postId, hasPendingWhisperQa, loadContent]);

    React.useEffect(() => {
        if (!open) {
            saydiGeneratingKeysRef.current = new Set();
            setSaydiGeneratingKeys(new Set());
            saydiGeneratingAllLangsRef.current = new Set();
            setSaydiGeneratingAllLangs(new Set());
            saydiUploadingLangsRef.current = new Set();
            setSaydiUploadingLangs(new Set());
        }
    }, [open]);

    React.useEffect(() => {
        if (!open || !postId) {
            return;
        }
        loadContent();
    }, [open, postId, loadContent]);

    const updateLangSaydiState = (langCode: string, patch: Partial<ManualAudioLangItem>) => {
        setLangs((prev) => prev.map((row) => {
            if (String(row.lang_code || '').toLowerCase() !== langCode) {
                return row;
            }
            return { ...row, ...patch };
        }));
    };

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

    const handleUploadWav = async (item: ManualAudioLangItem, file: File) => {
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
            if (res.whisper_qa_pending) {
                showMessage('Đã upload — đang chờ Whisper QA', 'info');
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
                    whisper_qa_status: res.whisper_qa_pending ? 'pending' : 'passed',
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

    const handleGenerateSaydiSegment = (
        item: ManualAudioLangItem,
        segmentIndex: number,
        options?: {
            onSettled?: (result: 'success' | 'error' | 'skipped') => void;
            silentToast?: boolean;
        }
    ) => {
        const langCode = String(item.lang_code || '').toLowerCase();
        if (!langCode || !postId || segmentIndex <= 0) {
            options?.onSettled?.('skipped');
            return;
        }

        const key = buildSaydiSegmentGeneratingKey(langCode, segmentIndex);
        if (saydiGeneratingKeysRef.current.has(key)) {
            options?.onSettled?.('skipped');
            return;
        }

        saydiGeneratingKeysRef.current.add(key);
        setSaydiGeneratingKeys(new Set(saydiGeneratingKeysRef.current));

        const finishGenerating = (result: 'success' | 'error') => {
            saydiGeneratingKeysRef.current.delete(key);
            setSaydiGeneratingKeys(new Set(saydiGeneratingKeysRef.current));
            options?.onSettled?.(result);
        };

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/tts/generate-saydi-manual-audio-segment',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                id: postId,
                target_lang: langCode,
                segment_index: segmentIndex,
            },
            loading: false,
            success: (res: SaydiGenerateResponse) => {
                const msg = parseMessage(res?.message);
                if (!res?.success) {
                    finishGenerating('error');
                    if (!options?.silentToast) {
                        showMessage(msg || 'Tạo audio Saydi thất bại', 'error');
                    }
                    return;
                }
                finishGenerating('success');
                if (msg && !options?.silentToast) {
                    showMessage(msg, 'success');
                }
                updateLangSaydiState(langCode, {
                    saydi_segments: res.saydi_segments || item.saydi_segments,
                    saydi_segments_ready: res.saydi_segments_ready,
                    saydi_segments_total: res.saydi_segments_total,
                    saydi_whisper_segments_passed: res.saydi_whisper_segments_passed,
                    saydi_whisper_all_passed: res.saydi_whisper_all_passed,
                });
            },
            error: (err: unknown) => {
                finishGenerating('error');
                if (!options?.silentToast) {
                    const r = err as { message?: { content?: string } };
                    showMessage(r?.message?.content || 'Tạo audio Saydi thất bại', 'error');
                }
            },
        });
    };

    const handleGenerateAllSaydiSegments = (item: ManualAudioLangItem) => {
        const langCode = String(item.lang_code || '').toLowerCase();
        if (!langCode || !postId) {
            return;
        }

        if (saydiGeneratingAllLangsRef.current.has(langCode)) {
            return;
        }

        const pendingSegments = (item.saydi_segments || []).filter((segment) => {
            const segmentIndex = Number(segment.index || 0);
            if (segmentIndex <= 0 || segment.status === 'ready') {
                return false;
            }
            const key = buildSaydiSegmentGeneratingKey(langCode, segmentIndex);
            return !saydiGeneratingKeysRef.current.has(key);
        });

        if (pendingSegments.length === 0) {
            showMessage('Tất cả đoạn đã có audio', 'info');
            return;
        }

        saydiGeneratingAllLangsRef.current.add(langCode);
        setSaydiGeneratingAllLangs(new Set(saydiGeneratingAllLangsRef.current));

        let remaining = pendingSegments.length;
        let failedCount = 0;
        let successCount = 0;

        const finishBulk = () => {
            remaining -= 1;
            if (remaining > 0) {
                return;
            }

            saydiGeneratingAllLangsRef.current.delete(langCode);
            setSaydiGeneratingAllLangs(new Set(saydiGeneratingAllLangsRef.current));

            if (failedCount === 0) {
                showMessage(`Đã tạo xong ${successCount} đoạn audio ${langCode.toUpperCase()}`, 'success');
            } else if (successCount > 0) {
                showMessage(
                    `Tạo xong ${successCount}/${pendingSegments.length} đoạn — ${failedCount} đoạn thất bại`,
                    'warning'
                );
            } else {
                showMessage(`Không tạo được audio cho ${langCode.toUpperCase()}`, 'error');
            }
        };

        pendingSegments.forEach((segment) => {
            const segmentIndex = Number(segment.index || 0);
            handleGenerateSaydiSegment(item, segmentIndex, {
                silentToast: true,
                onSettled: (result) => {
                    if (result === 'success') {
                        successCount += 1;
                    } else if (result === 'error') {
                        failedCount += 1;
                    } else {
                        return;
                    }
                    finishBulk();
                },
            });
        });
    };

    const handleUploadSaydiMerged = (item: ManualAudioLangItem) => {
        const langCode = String(item.lang_code || '').toLowerCase();
        if (!langCode || !postId) {
            return;
        }

        if (saydiUploadingLangsRef.current.has(langCode)) {
            return;
        }

        saydiUploadingLangsRef.current.add(langCode);
        setSaydiUploadingLangs(new Set(saydiUploadingLangsRef.current));

        const finishUploading = () => {
            saydiUploadingLangsRef.current.delete(langCode);
            setSaydiUploadingLangs(new Set(saydiUploadingLangsRef.current));
        };

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/tts/upload-saydi-manual-audio-merged',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                id: postId,
                target_lang: langCode,
            },
            loading: false,
            success: (res: SaydiUploadResponse) => {
                finishUploading();
                if (!res?.success) {
                    if (Array.isArray(res.saydi_segments) && res.saydi_segments.length > 0) {
                        updateLangSaydiState(langCode, {
                            saydi_segments: res.saydi_segments,
                            saydi_whisper_segments_passed: res.saydi_whisper_segments_passed,
                            saydi_segments_total: res.saydi_segments_total,
                            saydi_whisper_all_passed: res.saydi_whisper_all_passed,
                        });
                    }
                    showMessage(formatSaydiUploadErrorMessage(res), 'error');
                    return;
                }

                const msg = parseMessage(res?.message);
                if (msg) {
                    showMessage(msg, 'success');
                }
                loadContent({ silent: true });
                onUploaded?.();
            },
            error: (err: unknown) => {
                finishUploading();
                const r = err as SaydiUploadResponse & { message?: { content?: string } };
                if (Array.isArray(r.saydi_segments) && r.saydi_segments.length > 0) {
                    updateLangSaydiState(langCode, {
                        saydi_segments: r.saydi_segments,
                        saydi_whisper_segments_passed: r.saydi_whisper_segments_passed,
                        saydi_segments_total: r.saydi_segments_total,
                        saydi_whisper_all_passed: r.saydi_whisper_all_passed,
                    });
                }
                const msg = typeof r?.message === 'string'
                    ? r.message
                    : r?.message?.content;
                showMessage(msg || formatSaydiUploadErrorMessage(r) || 'Upload audio Saydi thất bại', 'error');
            },
        });
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
                    Saydi.ai: tạo từng đoạn → upload lên store (tự kiểm tra Whisper từng đoạn và file ghép ngay lúc upload).
                    Hoặc copy nội dung sang AI Studio, upload WAV thủ công bên dưới (Whisper chạy nền qua worker).
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
                    const isUploadingWav = uploadingLang === langCode;
                    const isUploadingSaydi = saydiUploadingLangs.has(langCode);
                    const isGeneratingAllSaydi = saydiGeneratingAllLangs.has(langCode);
                    const saydiSegments = item.saydi_segments || [];
                    const saydiReady = item.saydi_segments_ready || 0;
                    const saydiTotal = item.saydi_segments_total || 0;
                    const saydiAllReady = saydiTotal > 0 && saydiReady >= saydiTotal;
                    const whisperChip = whisperQaChipProps(String(item.whisper_qa_status || ''));

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
                                    {saydiTotal > 0 ? (
                                        <Chip
                                            size="small"
                                            color={saydiAllReady ? 'success' : 'warning'}
                                            variant="outlined"
                                            label={`Saydi: ${saydiReady}/${saydiTotal} đoạn`}
                                        />
                                    ) : null}
                                    {item.tts_engine ? (
                                        <Chip size="small" variant="outlined" label={item.tts_engine} />
                                    ) : null}
                                    {whisperChip ? (
                                        <Chip
                                            size="small"
                                            color={whisperChip.color}
                                            variant={whisperChip.color === 'default' ? 'outlined' : 'filled'}
                                            label={whisperChip.label}
                                        />
                                    ) : null}
                                </Stack>

                                {hasAudio && item.audio_url ? (
                                    <Link href={item.audio_url} target="_blank" rel="noopener noreferrer">
                                        Nghe audio hiện tại
                                    </Link>
                                ) : null}
                            </Stack>

                            {saydiTotal > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1}
                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        justifyContent="space-between"
                                        sx={{ mb: 1 }}
                                    >
                                        <Typography variant="subtitle2">
                                            Saydi.ai
                                        </Typography>
                                        <LoadingButton
                                            variant="outlined"
                                            size="small"
                                            loading={isGeneratingAllSaydi}
                                            disabled={saydiAllReady || isGeneratingAllSaydi || isUploadingSaydi}
                                            onClick={() => handleGenerateAllSaydiSegments(item)}
                                        >
                                            Tạo tất cả audio
                                        </LoadingButton>
                                    </Stack>
                                    <Stack spacing={1.5}>
                                        {saydiSegments.map((segment) => {
                                            const segmentIndex = Number(segment.index || 0);
                                            const isReady = segment.status === 'ready';
                                            const generating = saydiGeneratingKeys.has(
                                                buildSaydiSegmentGeneratingKey(langCode, segmentIndex)
                                            );
                                            const segmentWhisperChip = segmentWhisperChipProps(
                                                String(segment.whisper_qa_status || 'pending')
                                            );
                                            const segmentWhisperHint = formatSegmentWhisperIssue(segment.whisper_issue);
                                            const previewUrl = segment.preview_api_path
                                                ? buildSaydiPreviewUrl(segment.preview_api_path)
                                                : '';

                                            return (
                                                <Box
                                                    key={`${langCode}-seg-${segmentIndex}`}
                                                    sx={{
                                                        p: 1.5,
                                                        border: '1px solid',
                                                        borderColor: isReady ? 'success.main' : 'divider',
                                                        borderRadius: 1,
                                                        bgcolor: 'background.paper',
                                                    }}
                                                >
                                                    <Stack
                                                        direction={{ xs: 'column', sm: 'row' }}
                                                        spacing={1}
                                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                        justifyContent="space-between"
                                                        sx={{ mb: 1 }}
                                                    >
                                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                            <Typography variant="body2" fontWeight={600}>
                                                                Đoạn {segmentIndex}
                                                            </Typography>
                                                            <Chip size="small" variant="outlined" label={`${segment.char_count || 0} ký tự`} />
                                                            <Chip
                                                                size="small"
                                                                color={isReady ? 'success' : 'default'}
                                                                label={isReady ? 'Đã tạo' : 'Chưa tạo'}
                                                            />
                                                            {isReady && segmentWhisperChip ? (
                                                                <Chip
                                                                    size="small"
                                                                    color={segmentWhisperChip.color}
                                                                    variant={segmentWhisperChip.color === 'default' ? 'outlined' : 'filled'}
                                                                    label={segmentWhisperChip.label}
                                                                    title={segmentWhisperHint}
                                                                />
                                                            ) : null}
                                                        </Stack>
                                                        <Stack direction="row" spacing={1}>
                                                            <LoadingButton
                                                                variant="outlined"
                                                                size="small"
                                                                loading={generating}
                                                                onClick={() => handleGenerateSaydiSegment(item, segmentIndex)}
                                                            >
                                                                {isReady ? 'Tạo lại' : 'Tạo audio'}
                                                            </LoadingButton>
                                                        </Stack>
                                                    </Stack>

                                                    {segment.text_preview ? (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
                                                        >
                                                            {segment.text_preview}
                                                        </Typography>
                                                    ) : null}

                                                    {isReady && previewUrl ? (
                                                        <Box sx={{ mt: 1 }}>
                                                            <audio controls preload="none" src={previewUrl} style={{ width: '100%' }} />
                                                        </Box>
                                                    ) : null}
                                                </Box>
                                            );
                                        })}
                                    </Stack>

                                    <Box sx={{ mt: 1.5 }}>
                                        <LoadingButton
                                            variant="contained"
                                            color="secondary"
                                            size="small"
                                            loading={isUploadingSaydi}
                                            disabled={!saydiAllReady}
                                            onClick={() => handleUploadSaydiMerged(item)}
                                        >
                                            Upload lên store (Saydi)
                                        </LoadingButton>
                                    </Box>
                                </Box>
                            )}

                            <Divider sx={{ my: 1.5 }} />

                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                AI Studio (thủ công)
                            </Typography>

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
                                            handleUploadWav(item, file);
                                        }
                                    }}
                                />

                                <LoadingButton
                                    variant="contained"
                                    size="small"
                                    startIcon={<UploadFileIcon />}
                                    loading={isUploadingWav}
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
