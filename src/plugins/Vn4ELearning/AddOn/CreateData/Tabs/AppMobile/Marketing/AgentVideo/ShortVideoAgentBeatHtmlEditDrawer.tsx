import SceneAssetBeatSummary from './SceneAssetBeatSummary';
import React from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import SaveIcon from '@mui/icons-material/Save';
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { formatDurationSec } from './agentVideoHfPromptDuration';

type Props = {
    sceneAssetsVideoId?: number;
    open: boolean;
    onClose: () => void;
    beatId: string;
    beatIndex?: number | null;
    durationSec?: number | null;
    initialVisualDescription: string;
    initialBackground?: string;
    initialHtml: string;
    initialCreativePrompt?: string;
    saving?: boolean;
    refining?: boolean;
    onSave: (payload: {
        html: string;
        creativePrompt: string;
        visualDescription: string;
        background: string;
    }) => Promise<boolean>;
    onGenerateDeepseekApi?: () => Promise<string | null>;
    onCopyPrompt?: () => Promise<void> | void;
    onCopySkillPrompt?: () => Promise<void> | void;
    copyingPrompt?: boolean;
    onAiRefine: (payload: { prompt: string; html: string }) => Promise<string | null>;
};

export default function ShortVideoAgentBeatHtmlEditDrawer({
    sceneAssetsVideoId = 0,
    open,
    onClose,
    beatId,
    beatIndex = null,
    durationSec = null,
    initialVisualDescription,
    initialBackground = '',
    initialHtml,
    initialCreativePrompt = '',
    saving = false,
    refining = false,
    onSave,
    onAiRefine,
    onGenerateDeepseekApi,
    onCopyPrompt,
    onCopySkillPrompt,
    copyingPrompt = false,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [draftHtml, setDraftHtml] = React.useState(initialHtml);
    const [creativePrompt, setCreativePrompt] = React.useState(initialCreativePrompt);
    const [visualDescription, setVisualDescription] = React.useState(initialVisualDescription);
    const [background, setBackground] = React.useState(initialBackground);
    const [aiLoading, setAiLoading] = React.useState(false);
    const syncedOpenKeyRef = React.useRef('');

    // Chỉ sync từ CMS khi mở drawer / đổi beat — tránh AI vừa đổ draft lại bị reset bởi prop cha.
    React.useEffect(() => {
        if (!open) {
            syncedOpenKeyRef.current = '';
            return;
        }
        const openKey = `${beatId}::open`;
        if (syncedOpenKeyRef.current === openKey) {
            return;
        }
        syncedOpenKeyRef.current = openKey;
        setDraftHtml(initialHtml);
        setCreativePrompt(initialCreativePrompt);
        setVisualDescription(initialVisualDescription);
        setBackground(initialBackground);
        setAiLoading(false);
    }, [beatId, initialBackground, initialCreativePrompt, initialHtml, initialVisualDescription, open]);

    const titleLabel = beatIndex != null && beatIndex > 0
        ? `Sửa HTML · beat ${beatIndex}`
        : `Sửa HTML · ${beatId || 'beat'}`;

    const dirty = draftHtml !== initialHtml
        || creativePrompt !== initialCreativePrompt
        || visualDescription !== initialVisualDescription
        || background !== initialBackground;
    const busy = saving || refining || aiLoading;
    const canSave = dirty && !busy;
    const canAi = Boolean(creativePrompt.trim()) && Boolean(draftHtml.trim()) && !busy;

    const handleSave = async () => {
        if (!canSave) {
            return;
        }
        const saved = await onSave({
            html: draftHtml,
            creativePrompt,
            visualDescription,
            background,
        });
        if (saved) {
            onClose();
        }
    };

    const handleGenerateDeepseekApi = async () => {
        if (!onGenerateDeepseekApi || busy) return;
        setAiLoading(true);
        try {
            const html = await onGenerateDeepseekApi();
            if (html !== null) setDraftHtml(html);
        } catch (error) {
            showMessage(error instanceof Error ? error.message : String(error), 'error');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAiRefine = async () => {
        const prompt = creativePrompt.trim();
        if (!prompt) {
            showMessage('Nhập prompt trước khi gọi AI', 'warning');
            return;
        }
        if (!draftHtml.trim()) {
            showMessage('Chưa có HTML beat để refine', 'warning');
            return;
        }

        setAiLoading(true);
        try {
            const nextHtml = await onAiRefine({
                prompt,
                html: draftHtml,
            });
            if (nextHtml != null) {
                setDraftHtml(nextHtml);
            }
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={(
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon fontSize="small" />
                    <span>{titleLabel}</span>
                </Box>
            )}
            width={720}
            sx={{ zIndex: 1600 }}
            ModalProps={{
                sx: { zIndex: 1600 },
                style: { zIndex: 1600 },
            }}
            restDialogContent={{
                sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflowY: 'auto',
                    pb: 1,
                },
            }}
            action={(
                <LoadingButton
                    variant="contained"
                    color="primary"
                    loading={saving}
                    disabled={!canSave}
                    startIcon={<SaveIcon />}
                    onClick={() => { void handleSave(); }}
                >
                    Lưu HTML beat
                </LoadingButton>
            )}
        >
            <Stack spacing={1.5} sx={{ minHeight: '100%', pb: 1, '& > *': { flexShrink: 0 } }}>

                <Alert severity="info" sx={{ py: 0.5, flexShrink: 0 }}>
                    Dán hoặc sửa code trong ô HTML beat bên dưới, rồi bấm “Lưu HTML beat”. Bạn cũng có thể dùng prompt refine ở phía dưới.
                </Alert>

                {onCopyPrompt && (
                    <Box>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {onCopySkillPrompt && (
                                <LoadingButton size="small" variant="outlined" loading={copyingPrompt}
                                    disabled={busy || copyingPrompt} startIcon={<ContentCopyIcon/>}
                                    onClick={() => { void onCopySkillPrompt(); }}>
                                    Copy prompt nạp skill
                                </LoadingButton>
                            )}
                            <LoadingButton size="small" variant="contained" loading={copyingPrompt}
                                disabled={busy || copyingPrompt} startIcon={<ContentCopyIcon/>}
                                onClick={() => { void onCopyPrompt(); }}>
                                Copy prompt sinh HTML beat
                            </LoadingButton>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 0.75}}>
                            {onCopySkillPrompt
                                ? 'Gửi prompt nạp skill trước, chờ AI xác nhận rồi gửi prompt sinh HTML trong cùng chat. Dán HTML trả về vào ô bên dưới để lưu.'
                                : 'Dán prompt vào AI, sau đó dán HTML trả về vào ô bên dưới để lưu.'}
                        </Typography>
                    </Box>
                )}

                {onGenerateDeepseekApi && (
                    <Box>
                        <LoadingButton size="small" variant="contained" loading={aiLoading}
                            disabled={busy || copyingPrompt} startIcon={<AutoAwesomeIcon />}
                            onClick={() => { void handleGenerateDeepseekApi(); }}>
                            Sinh và lưu HTML · DeepSeek API (DeepThink)
                        </LoadingButton>
                        <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 0.75}}>
                            Gửi 1 prompt sinh HTML của beat đã lưu trên CMS. Tự cập nhật HTML sau khi kiểm tra thành công.
                        </Typography>
                    </Box>
                )}

                <TextField
                    label="HTML beat — nhập / sửa code thủ công"
                    value={draftHtml}
                    onChange={(event) => setDraftHtml(event.target.value)}
                    multiline
                    fullWidth
                    minRows={12}
                    maxRows={24}
                    size="small"
                    disabled={busy}
                    placeholder="<!doctype html>…</html>"
                    helperText="Dán toàn bộ tài liệu HTML của beat, sau đó bấm Lưu HTML beat để cập nhật."
                    inputProps={{ spellCheck: false }}
                    InputProps={{
                        sx: {
                            alignItems: 'flex-start',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: 12,
                            lineHeight: 1.45,
                        },
                    }}
                />

                {open && sceneAssetsVideoId > 0 && <SceneAssetBeatSummary shortVideoId={sceneAssetsVideoId} beatId={beatId}/>}

                <TextField
                    label="Visual description"
                    value={visualDescription}
                    onChange={(event) => setVisualDescription(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={5}
                    helperText="Tiếng Anh, semantic concept rõ chủ thể-hành động-hệ quả; không đổi palette/font hệ thống"
                    disabled={busy}
                />

                <TextField
                    label="Background"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={4}
                    helperText="Tiếng Anh, 3–60 từ: mood + texture + ràng buộc ngắn"
                    disabled={busy}
                />

                <TextField
                    label="Prompt sáng tạo / refine"
                    value={creativePrompt}
                    onChange={(event) => setCreativePrompt(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="Vd. thêm particle glow phía sau title, giữ layout hiện tại…"
                    disabled={busy}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                                <Tooltip title={canAi ? 'Gọi Gemini Headless refine' : 'Cần prompt + HTML beat'}>
                                    <span>
                                        <IconButton
                                            color="primary"
                                            edge="end"
                                            disabled={!canAi}
                                            onClick={() => { void handleAiRefine(); }}
                                            aria-label="AI refine HTML beat"
                                        >
                                            {(aiLoading || refining) ? (
                                                <CircularProgress size={18} />
                                            ) : (
                                                <AutoAwesomeIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </InputAdornment>
                        ),
                    }}
                />

                {(aiLoading || refining) ? (
                    <Typography variant="caption" color="info.main" sx={{ flexShrink: 0 }}>
                        Đang gọi Gemini Headless refine…
                    </Typography>
                ) : null}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                        ID: {beatId || '—'}
                    </Typography>
                    {durationSec != null && durationSec > 0 ? (
                        <Typography variant="caption" color="text.secondary">
                            Duration: {formatDurationSec(durationSec)}s
                        </Typography>
                    ) : null}
                    {dirty ? (
                        <Typography variant="caption" color="warning.main" fontWeight={600}>
                            Chưa lưu
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="success.main">
                            Khớp bản đã lưu
                        </Typography>
                    )}
                </Stack>


            </Stack>
        </DrawerCustom>
    );
}
