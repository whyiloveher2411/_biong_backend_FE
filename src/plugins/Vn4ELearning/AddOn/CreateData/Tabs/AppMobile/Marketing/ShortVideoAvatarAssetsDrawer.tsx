import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import MovieCreationOutlinedIcon from '@mui/icons-material/MovieCreationOutlined';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { copyImageUrlToClipboard, getImageUrl } from 'helpers/image';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { copyTextToClipboard } from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/StoreScreenshots/storeScreenshotClipboard';
import {
    SHORT_VIDEO_AVATAR_ASSET_GROUP_LABELS,
    SHORT_VIDEO_AVATAR_ASSET_GROUP_ORDER,
    SHORT_VIDEO_AVATAR_ASSET_STEPS,
    ShortVideoAvatarAssetGroup,
    ShortVideoAvatarAssetStep,
} from './shortVideoAvatarAssetSteps';
import {
    AvatarCompositeHints,
    buildShortVideoAvatarDemo,
    fetchShortVideoAvatarDemoFile,
    fetchShortVideoAvatarPrompt,
    listShortVideoAvatarSprites,
    openShortVideoAvatarGemini,
    parseAvatarCompositeHints,
    resolveAvatarCompositeState,
    seedAvatarCompositeByState,
    uploadShortVideoAvatarAsset,
} from './shortVideoAvatarGeminiWorkflow';
import ShortVideoAvatarSpriteRegionScanner from './ShortVideoAvatarSpriteRegionScanner';
import ShortVideoAvatarCompositeEditor from './ShortVideoAvatarCompositeEditor';

type Props = {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
    onRefreshPost?: () => void;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') {
        return 'Yêu cầu thất bại';
    }
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') {
        return r.message;
    }
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    return 'Yêu cầu thất bại';
}

function fieldPreviewUrl(post: JsonFormat | null | undefined, field: string | null): string {
    if (!post || !field) {
        return '';
    }
    return getImageUrl(post[field] as string | undefined) || '';
}

/** Gắn ?v=... vào URL demo mp4 — tránh browser cache file cũ cùng path. */
function withDemoCacheBust(url: string, version?: string | number | null): string {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }
    const v = version != null && String(version) !== '' ? String(version) : String(Date.now());
    try {
        const abs = raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//');
        const u = abs ? new URL(raw, window.location.origin) : new URL(raw, window.location.origin);
        u.searchParams.set('v', v);
        if (abs) {
            return u.toString();
        }
        return `${u.pathname}${u.search}${u.hash}`;
    } catch {
        const cleaned = raw.replace(/([?&])v=[^&]*/g, '$1').replace(/[?&]$/, '');
        return `${cleaned}${cleaned.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
    }
}

function AssetStepCard({
    step,
    post,
    masterUrl,
    busyKey,
    onOpenGemini,
    onCopyPrompt,
    onCopyMasterImage,
    onUpload,
}: {
    step: ShortVideoAvatarAssetStep;
    post: JsonFormat | null;
    masterUrl: string;
    busyKey: string | null;
    onOpenGemini: (step: ShortVideoAvatarAssetStep) => void;
    onCopyPrompt: (step: ShortVideoAvatarAssetStep) => void;
    onCopyMasterImage: (step: ShortVideoAvatarAssetStep) => void;
    onUpload: (step: ShortVideoAvatarAssetStep, file: File) => void;
}) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const previewUrl = fieldPreviewUrl(post, step.field);
    const isBusy =
        busyKey === `gemini-${step.step}`
        || busyKey === `copy-${step.step}`
        || busyKey === `copy-master-${step.step}`
        || busyKey === `upload-${step.step}`;
    const blockedByMaster = step.needsMaster && !masterUrl;

    const acceptFiles = (files: FileList | null) => {
        const file = files?.[0];
        if (!file || !step.field) {
            return;
        }
        onUpload(step, file);
    };

    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 1.5,
                bgcolor: 'background.paper',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                    size="small"
                    label={step.step}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, minWidth: 40 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {step.title}
                </Typography>
            </Stack>

            {step.storesImage ? (
                <Box
                    sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 1.5,
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        bgcolor: 'background.default',
                        backgroundImage: previewUrl
                            ? 'linear-gradient(45deg, rgba(0,0,0,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.06) 75%)'
                            : 'none',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                        p: 1,
                    }}
                >
                    {previewUrl ? (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt={step.title}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                display: 'block',
                            }}
                        />
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có ảnh
                        </Typography>
                    )}
                </Box>
            ) : (
                <Box
                    sx={{
                        borderRadius: 1.5,
                        bgcolor: 'action.hover',
                        px: 1.5,
                        py: 2,
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Bước tool — không lưu ảnh vào CMS. Chỉ mở Gemini để chạy prompt.
                    </Typography>
                </Box>
            )}

            <Stack
                direction="row"
                spacing={0.75}
                sx={{
                    flexWrap: 'nowrap',
                    alignItems: 'stretch',
                    width: 1,
                    '& > *': { minWidth: 0 },
                }}
            >
                <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={
                        busyKey === `gemini-${step.step}`
                            ? <CircularProgress size={14} color="inherit" />
                            : <AutoAwesomeOutlinedIcon fontSize="small" />
                    }
                    disabled={isBusy || blockedByMaster}
                    onClick={() => onOpenGemini(step)}
                    sx={{
                        textTransform: 'none',
                        flex: '1 1 0',
                        px: 1,
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                    }}
                >
                    Gemini
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={
                        busyKey === `copy-${step.step}`
                            ? <CircularProgress size={14} color="inherit" />
                            : <ContentCopyOutlinedIcon fontSize="small" />
                    }
                    disabled={isBusy}
                    onClick={() => onCopyPrompt(step)}
                    sx={{
                        textTransform: 'none',
                        flex: '1 1 0',
                        px: 1,
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                    }}
                >
                    Prompt
                </Button>
                {step.needsMaster ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={
                            busyKey === `copy-master-${step.step}`
                                ? <CircularProgress size={14} color="inherit" />
                                : <ImageOutlinedIcon fontSize="small" />
                        }
                        disabled={isBusy || !masterUrl}
                        onClick={() => onCopyMasterImage(step)}
                        sx={{
                            textTransform: 'none',
                            flex: '1 1 0',
                            px: 1,
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                        }}
                    >
                        Master
                    </Button>
                ) : null}
            </Stack>

            {blockedByMaster && (
                <Typography variant="caption" color="warning.main">
                    Cần master avatar trước
                </Typography>
            )}

            {step.storesImage && step.field && (
                <Box
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        acceptFiles(e.dataTransfer.files);
                    }}
                    onClick={() => inputRef.current?.click()}
                    sx={{
                        mt: 'auto',
                        border: '1px dashed',
                        borderColor: dragOver ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        px: 1.25,
                        py: 1.5,
                        textAlign: 'center',
                        cursor: isBusy ? 'wait' : 'pointer',
                        bgcolor: dragOver ? 'action.selected' : 'transparent',
                        opacity: isBusy ? 0.7 : 1,
                    }}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        hidden
                        onChange={(e) => {
                            acceptFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    <Stack spacing={0.5} alignItems="center">
                        {busyKey === `upload-${step.step}` ? (
                            <CircularProgress size={18} />
                        ) : (
                            <CloudUploadOutlinedIcon fontSize="small" color="action" />
                        )}
                        <Typography variant="caption" color="text.secondary">
                            Thả ảnh tải về / chọn file
                        </Typography>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}

export default function ShortVideoAvatarAssetsDrawer({
    open,
    onClose,
    data,
    onRefreshPost,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    const { showMessage } = useFloatingMessages();
    const loadDetailSeqRef = React.useRef(0);
    const compositeEditorOpenRef = React.useRef(false);

    const avatarId = Number(data?.post?.id || 0);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [post, setPost] = React.useState<JsonFormat | null>(data?.post || null);
    const [busyKey, setBusyKey] = React.useState<string | null>(null);
    const [sprites, setSprites] = React.useState<Array<{ name: string; size: number }>>([]);
    const [selectedSprite, setSelectedSprite] = React.useState('');
    const [demoUrl, setDemoUrl] = React.useState('');
    const [localToolBusy, setLocalToolBusy] = React.useState<'demo' | 'save' | null>(null);
    const [scannerOpen, setScannerOpen] = React.useState(false);
    const [compositeEditorOpen, setCompositeEditorOpen] = React.useState(false);
    const [compositeHints, setCompositeHints] = React.useState<AvatarCompositeHints>(() =>
        parseAvatarCompositeHints(null),
    );
    const compositeHintsRef = React.useRef(compositeHints);
    compositeHintsRef.current = compositeHints;
    compositeEditorOpenRef.current = compositeEditorOpen;

    const applyHintsFromPost = React.useCallback((nextPost: JsonFormat | null | undefined) => {
        setCompositeHints(parseAvatarCompositeHints(nextPost?.composite_hints));
    }, []);

    const loadDetail = React.useCallback(() => {
        if (!avatarId) {
            setError('Chưa xác định avatar');
            setPost(null);
            return;
        }

        setLoading(true);
        setError(null);
        const reqId = ++loadDetailSeqRef.current;
        apiAjaxRef.current({
            url: `post-type/detail/short_video_avatar/${avatarId}`,
            method: 'POST',
            loading: false,
            success: (result: { post?: JsonFormat }) => {
                if (reqId !== loadDetailSeqRef.current) {
                    return;
                }
                setLoading(false);
                const next = result?.post || null;
                setPost(next);
                // Không ghi đè hints nếu đang mở editor (tránh race mất chỉnh sửa)
                if (!compositeEditorOpenRef.current) {
                    applyHintsFromPost(next);
                }
            },
            error: (err: unknown) => {
                if (reqId !== loadDetailSeqRef.current) {
                    return;
                }
                setLoading(false);
                setError(parseApiMessage(err));
            },
        });
    }, [avatarId, applyHintsFromPost]);

    React.useEffect(() => {
        if (open) {
            setPost(data?.post || null);
            applyHintsFromPost(data?.post || null);
            loadDetail();
            setDemoUrl('');
            listShortVideoAvatarSprites()
                .then((res) => {
                    setSprites(res.sprites);
                    setSelectedSprite((prev) => {
                        if (prev && res.sprites.some((s) => s.name === prev)) {
                            return prev;
                        }
                        return res.sprites[0]?.name || '';
                    });
                })
                .catch(() => {
                    setSprites([]);
                });
            if (avatarId > 0) {
                fetchShortVideoAvatarDemoFile({ avatarId })
                    .then((res) => {
                        if (res.demo_url) {
                            setDemoUrl(withDemoCacheBust(String(res.demo_url), res.demo_version || Date.now()));
                        }
                    })
                    .catch(() => {
                        /* chưa có demo */
                    });
            }
        }
    }, [open, data?.post, loadDetail, avatarId, applyHintsFromPost]);

    const masterUrl = fieldPreviewUrl(post, 'avatar');
    const titleName = String(post?.title || data?.post?.title || 'Avatar');

    const handleOpenScanner = () => {
        if (!avatarId) {
            showMessage('Chưa xác định avatar', 'warning');
            return;
        }
        if (!selectedSprite) {
            showMessage('Chọn sprite trong avatar/images', 'warning');
            return;
        }
        setScannerOpen(true);
    };

    const handleScannerBuilt = (result: {
        post?: JsonFormat;
        composite_hints?: unknown;
        asset_count?: number;
        fields_synced?: string[];
        fields_failed?: Array<{ field: string; error?: string }>;
    }) => {
        if (result.post) {
            setPost(result.post);
            applyHintsFromPost(result.post);
        } else if (result.composite_hints) {
            setCompositeHints(parseAvatarCompositeHints(result.composite_hints));
            loadDetail();
        } else {
            loadDetail();
        }
        onRefreshPost?.();
        const synced = Array.isArray(result.fields_synced) ? result.fields_synced.length : 0;
        const failed = Array.isArray(result.fields_failed) ? result.fields_failed.length : 0;
        showMessage(
            failed > 0
                ? `Đã cắt ${result.asset_count ?? '?'} asset, sync ${synced} field (${failed} lỗi)`
                : `Đã cắt ${result.asset_count ?? '?'} asset và cập nhật ${synced} field CMS`,
            failed > 0 ? 'warning' : 'success',
        );
    };

    const handleBuildDemo = async () => {
        if (!avatarId) {
            showMessage('Chưa xác định avatar', 'warning');
            return;
        }
        setLocalToolBusy('demo');
        try {
            // Không gửi override từ FE — luôn build theo composite_hints trong DB
            // (tránh disk/layout cũ hoặc state FE stale ghi đè DB).
            // Muốn dùng vị trí vừa kéo: bấm «Demo ngay» trong editor (sẽ ghi DB trước).
            const result = await buildShortVideoAvatarDemo({
                avatarId,
            });
            const url = String(result.demo_url || '').trim();
            if (url) {
                setDemoUrl(withDemoCacheBust(url, result.demo_version || Date.now()));
            }
            if (result.post) {
                setPost(result.post);
            }
            if (result.composite_hints) {
                setCompositeHints(parseAvatarCompositeHints(result.composite_hints));
            }
            onRefreshPost?.();
            const closed = result.applied_eyes_closed_blink;
            showMessage(
                `Demo từ DB (${result.hints_source || 'database'}, ${result.combo_count ?? '?'} combo). ` +
                    `eyes_closed ay=${closed?.anchor_y_ratio ?? '?'} oy=${closed?.offset_y_px ?? '?'}`,
                'success',
            );
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Build demo thất bại', 'error');
        } finally {
            setLocalToolBusy(null);
        }
    };

    const handleOpenGemini = async (step: ShortVideoAvatarAssetStep) => {
        if (step.needsMaster && !masterUrl) {
            showMessage('Cần upload master avatar (bước 01) trước', 'warning');
            return;
        }

        setBusyKey(`gemini-${step.step}`);
        try {
            const promptRes = await fetchShortVideoAvatarPrompt(step.step);
            await openShortVideoAvatarGemini({
                avatarId,
                step: step.step,
                field: step.field,
                prompt: String(promptRes.prompt || ''),
                masterImageUrl: step.needsMaster ? masterUrl : undefined,
            });
            showMessage(
                step.field
                    ? `Đã mở Gemini cho bước ${step.step}. Hãy nhấn Gửi, rồi thả ảnh tải về vào dropzone bên phải tab Gemini (hoặc trong drawer CMS).`
                    : `Đã mở Gemini cho bước ${step.step}. Bước tool — không lưu ảnh vào CMS.`,
                'success',
            );
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không mở được Gemini', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const handleCopyPrompt = async (step: ShortVideoAvatarAssetStep) => {
        setBusyKey(`copy-${step.step}`);
        try {
            const promptRes = await fetchShortVideoAvatarPrompt(step.step);
            const prompt = String(promptRes.prompt || '').trim();
            if (!prompt) {
                throw new Error('Prompt trống');
            }
            await copyTextToClipboard(prompt);
            showMessage(`Đã copy prompt bước ${step.step}`, 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không copy được prompt', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const handleCopyMasterImage = async (step: ShortVideoAvatarAssetStep) => {
        if (!masterUrl) {
            showMessage('Chưa có master avatar để copy', 'warning');
            return;
        }
        setBusyKey(`copy-master-${step.step}`);
        try {
            await copyImageUrlToClipboard(masterUrl);
            showMessage(`Đã copy ảnh master (bước ${step.step})`, 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không copy được ảnh master', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const handleUpload = async (step: ShortVideoAvatarAssetStep, file: File) => {
        if (!step.field) {
            return;
        }
        setBusyKey(`upload-${step.step}`);
        try {
            const result = await uploadShortVideoAvatarAsset({
                avatarId,
                field: step.field,
                file,
            });
            if (result.post) {
                setPost(result.post);
            } else {
                loadDetail();
            }
            onRefreshPost?.();
            showMessage(`Đã lưu asset bước ${step.step}`, 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Upload thất bại', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const grouped = React.useMemo(() => {
        const map = new Map<ShortVideoAvatarAssetGroup, ShortVideoAvatarAssetStep[]>();
        SHORT_VIDEO_AVATAR_ASSET_GROUP_ORDER.forEach((group) => map.set(group, []));
        SHORT_VIDEO_AVATAR_ASSET_STEPS.forEach((step) => {
            const list = map.get(step.group) || [];
            list.push(step);
            map.set(step.group, list);
        });
        return map;
    }, []);

    return (
        <>
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={`Quản lý assets — ${titleName}`}
            width={1100}
            activeOnClose
            restDialogContent={{
                sx: {
                    backgroundColor: 'body.background',
                    pt: 2,
                    px: 3,
                    pb: 3,
                },
            }}
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && (
                <Stack spacing={2.5}>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'flex-start',
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: 2,
                                flexShrink: 0,
                                bgcolor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                p: 0.5,
                            }}
                        >
                            {masterUrl ? (
                                <Box
                                    component="img"
                                    src={masterUrl}
                                    alt={titleName}
                                    sx={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                />
                            ) : null}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: '1 1 220px' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {titleName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mỗi bước: mở Gemini → submit thủ công → thả ảnh tải về vào dropzone của đúng bước đó.
                            </Typography>
                            {!masterUrl && (
                                <Alert severity="warning" sx={{ mt: 1.25, py: 0 }}>
                                    Chưa có master avatar. Làm bước 01 trước khi chạy các bước còn lại.
                                </Alert>
                            )}
                        </Box>
                        <Stack
                            spacing={1.25}
                            sx={{ flex: '1 1 280px', minWidth: 240, maxWidth: 420 }}
                        >
                            <FormControl size="small" fullWidth>
                                <InputLabel id="avatar-sprite-label">Sprite (avatar/images)</InputLabel>
                                <Select
                                    labelId="avatar-sprite-label"
                                    label="Sprite (avatar/images)"
                                    value={selectedSprite}
                                    onChange={(e) => setSelectedSprite(String(e.target.value))}
                                    disabled={!!localToolBusy || !sprites.length}
                                >
                                    {!sprites.length && (
                                        <MenuItem value="">
                                            <em>Chưa có file trong avatar/images</em>
                                        </MenuItem>
                                    )}
                                    {sprites.map((s) => (
                                        <MenuItem key={s.name} value={s.name}>
                                            {s.name} ({Math.max(1, Math.round(s.size / 1024))} KB)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<ContentCutOutlinedIcon />}
                                    onClick={handleOpenScanner}
                                    disabled={!!localToolBusy || !selectedSprite || !avatarId}
                                >
                                    Quét vùng / Build asset
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<TuneOutlinedIcon />}
                                    onClick={() => setCompositeEditorOpen(true)}
                                    disabled={!!localToolBusy || !avatarId}
                                >
                                    Quản lý composite
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                    startIcon={
                                        localToolBusy === 'demo' ? (
                                            <CircularProgress size={14} color="inherit" />
                                        ) : (
                                            <MovieCreationOutlinedIcon />
                                        )
                                    }
                                    onClick={handleBuildDemo}
                                    disabled={!!localToolBusy || !avatarId}
                                >
                                    Demo video
                                </Button>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Composite per-state (3 eyes + 8 mouths). Demo video và render cuối dùng bộ đã lưu.
                            </Typography>
                        </Stack>
                    </Box>

                    {SHORT_VIDEO_AVATAR_ASSET_GROUP_ORDER.map((group) => {
                        const steps = grouped.get(group) || [];
                        if (!steps.length) {
                            return null;
                        }
                        const columns = group === 'mouth' ? 3 : group === 'tools' ? 3 : 2;

                        return (
                            <Box key={group}>
                                <Typography
                                    variant="overline"
                                    sx={{
                                        display: 'block',
                                        mb: 1,
                                        color: 'text.secondary',
                                        letterSpacing: 0.6,
                                        fontWeight: 700,
                                    }}
                                >
                                    {SHORT_VIDEO_AVATAR_ASSET_GROUP_LABELS[group]}
                                </Typography>
                                {group === 'master' ? (
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gap: 1.5,
                                            gridTemplateColumns: {
                                                xs: '1fr',
                                                md: 'minmax(0, 1fr) minmax(0, 1fr)',
                                            },
                                            alignItems: 'start',
                                        }}
                                    >
                                        <Stack spacing={1.5}>
                                            {steps.map((step) => (
                                                <AssetStepCard
                                                    key={step.step}
                                                    step={step}
                                                    post={post}
                                                    masterUrl={masterUrl}
                                                    busyKey={busyKey}
                                                    onOpenGemini={handleOpenGemini}
                                                    onCopyPrompt={handleCopyPrompt}
                                                    onCopyMasterImage={handleCopyMasterImage}
                                                    onUpload={handleUpload}
                                                />
                                            ))}
                                        </Stack>
                                        <Box
                                            sx={{
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 2,
                                                p: 1.5,
                                                bgcolor: 'background.paper',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1.25,
                                                minHeight: 0,
                                                position: { md: 'sticky' },
                                                top: { md: 8 },
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    size="small"
                                                    label="Demo"
                                                    color="success"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    Demo video
                                                </Typography>
                                            </Stack>
                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    minHeight: 220,
                                                    borderRadius: 1.5,
                                                    border: '1px dashed',
                                                    borderColor: 'divider',
                                                    bgcolor: '#000',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {demoUrl ? (
                                                    <Box
                                                        key={demoUrl}
                                                        component="video"
                                                        src={demoUrl}
                                                        controls
                                                        playsInline
                                                        preload="metadata"
                                                        sx={{
                                                            width: '100%',
                                                            height: '100%',
                                                            maxHeight: 420,
                                                            objectFit: 'contain',
                                                            display: 'block',
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="grey.500" sx={{ px: 2, textAlign: 'center' }}>
                                                        Chưa có demo — bấm Demo video ở header
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gap: 1.5,
                                            gridTemplateColumns: {
                                                xs: '1fr',
                                                sm: `repeat(${Math.min(columns, 2)}, minmax(0, 1fr))`,
                                                md: `repeat(${columns}, minmax(0, 1fr))`,
                                            },
                                        }}
                                    >
                                        {steps.map((step) => (
                                            <AssetStepCard
                                                key={step.step}
                                                step={step}
                                                post={post}
                                                masterUrl={masterUrl}
                                                busyKey={busyKey}
                                                onOpenGemini={handleOpenGemini}
                                                onCopyPrompt={handleCopyPrompt}
                                                onCopyMasterImage={handleCopyMasterImage}
                                                onUpload={handleUpload}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </DrawerCustom>
        <ShortVideoAvatarSpriteRegionScanner
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            avatarId={avatarId}
            sourceFile={selectedSprite}
            onBuilt={handleScannerBuilt}
            onError={(msg) => showMessage(msg, 'error')}
        />
        <ShortVideoAvatarCompositeEditor
            open={compositeEditorOpen}
            onClose={() => setCompositeEditorOpen(false)}
            avatarId={avatarId}
            post={post}
            initialHints={compositeHints}
            onHintsChange={(next) => {
                setCompositeHints(seedAvatarCompositeByState(next));
            }}
            onSaved={(payload) => {
                if (payload.post) {
                    setPost(payload.post);
                }
                if (payload.composite_hints) {
                    setCompositeHints(parseAvatarCompositeHints(payload.composite_hints));
                }
                onRefreshPost?.();
                showMessage('Đã lưu composite per-state cho avatar này', 'success');
            }}
            onDemoBuilt={(payload) => {
                if (payload.post) {
                    setPost(payload.post);
                }
                if (payload.composite_hints) {
                    setCompositeHints(parseAvatarCompositeHints(payload.composite_hints));
                }
                const url = String(payload.demo_url || '').trim();
                if (url) {
                    setDemoUrl(withDemoCacheBust(url, Date.now()));
                }
                onRefreshPost?.();
                const eyes = resolveAvatarCompositeState(
                    parseAvatarCompositeHints(payload.composite_hints || compositeHintsRef.current),
                    'eyes_closed_blink',
                );
                showMessage(
                    `Demo từ DB (${payload.combo_count ?? '?'} combo). eyes_closed anchor_y=${eyes.anchor_y_ratio}`,
                    'success',
                );
            }}
            onError={(msg) => showMessage(msg, 'error')}
        />
        </>
    );
}
