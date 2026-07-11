import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GitHubIcon from '@mui/icons-material/GitHub';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { LoadingButton } from '@mui/lab';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import type { useAgentVideoContent } from './useAgentVideoContent';
import { bgmPreviewUrl, formatBgmDuration } from './agentBgmPreview';
import type { AgentBgmSearchItem, ImportHtmlBgmSegment } from './agentVideoApi';
import ShortVideoAgentBgmSearchDrawer from './ShortVideoAgentBgmSearchDrawer';
import ShortVideoAgentVisualCatalogDrawer from './ShortVideoAgentVisualCatalogDrawer';
import {
    buildImportHtmlRenderBlockers,
    humanizeImportHtmlAssembleError,
    isCaptionSyncAssembleError,
} from './agentVideoImportHtmlBlockers';

function resolveGithubRepoUrl(repoRaw: string): string {
    const repo = String(repoRaw || '').trim();
    if (!repo) {
        return '';
    }
    if (/^https?:\/\//i.test(repo)) {
        return repo;
    }
    const cleaned = repo
        .replace(/^github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/^\/+/, '');
    if (!cleaned) {
        return '';
    }
    return `https://github.com/${cleaned}`;
}

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    /** Nhúng trong tab Render — bỏ scroll/title/gate trùng với parent. */
    embedded?: boolean;
};

const ACCENT_RESOURCES = '#5e35b1';
const ACCENT_RENDER = '#e65100';
const ACCENT_BGM = '#00838f';
const ACCENT_IMAGES = '#1565c0';
const ACCENT_SFX = '#7b1fa2';

function StepCard({
    step,
    title,
    accent,
    done,
    status,
    children,
}: {
    step: number;
    title: string;
    accent: string;
    done?: boolean;
    status?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: done ? accent : 'divider',
                bgcolor: (t) => (
                    t.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.03)'
                        : done
                            ? `${accent}10`
                            : 'background.paper'
                ),
                overflow: 'hidden',
                mb: 1.5,
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{
                    px: 1.25,
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (t) => (
                        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : `${accent}14`
                    ),
                }}
            >
                <Avatar
                    sx={{
                        width: 22,
                        height: 22,
                        fontSize: 12,
                        fontWeight: 700,
                        bgcolor: accent,
                        color: '#fff',
                        flexShrink: 0,
                    }}
                >
                    {step}
                </Avatar>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                    {title}
                </Typography>
                {status}
            </Stack>
            <Box sx={{ p: 1.25 }}>
                {children}
            </Box>
        </Box>
    );
}

function InnerCard({
    accent,
    children,
}: {
    accent: string;
    children: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                mb: 1.25,
                p: 1.25,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: `3px solid ${accent}`,
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#fff'),
            }}
        >
            {children}
        </Box>
    );
}

export default function ShortVideoAgentResourcesPanel({ state, embedded = false }: Props) {
    const { showMessage } = useFloatingMessages();
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [playingUrl, setPlayingUrl] = React.useState<string | null>(null);
    const [bgmDrawerOpen, setBgmDrawerOpen] = React.useState(false);
    const [visualDrawerOpen, setVisualDrawerOpen] = React.useState(false);

    React.useEffect(() => () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    const targetSec = Number(state.beatMap?.totalVideoSec || state.audioDurationSec || 0);
    const selectedBgmTotal = state.bgmSegments.reduce(
        (sum, seg) => sum + Number(seg.duration_sec || 0),
        0,
    );
    const assembleOk = state.composition?.assemble_status === 'ok';
    const bgmInsufficient = targetSec > 0 && selectedBgmTotal > 0 && selectedBgmTotal + 0.01 < targetSec;
    const bgmShortfallSec = bgmInsufficient ? Math.max(0, targetSec - selectedBgmTotal) : 0;
    const hasBgm = state.bgmSegments.length > 0;
    const resourcesReady = hasBgm && !bgmInsufficient;

    const pipelineInput = {
        scriptApproved: state.scriptApproved,
        hasAudio: state.hasAudio,
        importHtmlReady: state.importHtmlReady,
        whisperStatus: state.whisperStatus,
        bgmSegmentCount: state.bgmSegments.length,
        bgmInsufficient,
        bgmShortfallSec,
        assembleOk,
        assembleStatus: state.composition?.assemble_status,
        assembleError: state.composition?.assemble_error,
    };
    const renderBlockers = buildImportHtmlRenderBlockers(pipelineInput, {
        requireAssembleOk: false,
    });
    const canRender = renderBlockers.length === 0;
    const assembleErrorHuman = humanizeImportHtmlAssembleError(state.composition?.assemble_error || '');
    const compositionRenderError = String(state.composition?.render_error || '').trim();
    const beatErrorsAreCaptionStale = state.beatsRenderErrorCount > 0
        && isCaptionSyncAssembleError(compositionRenderError);

    const handlePlayPreview = React.useCallback((item: AgentBgmSearchItem | ImportHtmlBgmSegment) => {
        const url = bgmPreviewUrl(item);
        if (!url) {
            showMessage('Không có file audio trực tiếp — thử tìm lại hoặc bật Pixabay Audio API trên server', 'warning');
            return;
        }

        if (playingUrl === url && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPlayingUrl(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
            setPlayingUrl(null);
            audioRef.current = null;
        };
        audio.onerror = () => {
            setPlayingUrl(null);
            audioRef.current = null;
            showMessage('Không phát được preview — URL có thể hết hạn', 'warning');
        };
        void audio.play().then(() => {
            setPlayingUrl(url);
        }).catch(() => {
            setPlayingUrl(null);
            audioRef.current = null;
            showMessage('Trình duyệt chặn phát audio — thử bấm lại', 'warning');
        });
    }, [playingUrl, showMessage]);

    const handleCloseVisualDrawer = React.useCallback(async () => {
        const ok = await state.persistVisualCatalogIfDirty();
        if (!ok) {
            return;
        }
        setVisualDrawerOpen(false);
    }, [state.persistVisualCatalogIfDirty]);

    if (!embedded && state.renderMode !== 'import_html') {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="info">
                    Tab Render chỉ dùng khi luồng render là HTML chatbot.
                </Alert>
            </Box>
        );
    }

    const resourcesBody = (
        <>
            <InnerCard accent={bgmInsufficient ? '#ed6c02' : ACCENT_BGM}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <MusicNoteIcon fontSize="small" sx={{ mt: 0.25, color: ACCENT_BGM }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700}>
                            Nhạc nền (BGM)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            {state.bgmSegments.length > 0
                                ? `${state.bgmSegments.length} bài · ${selectedBgmTotal > 0 ? `${selectedBgmTotal.toFixed(1)}s` : 'đang đo thời lượng'} / ${targetSec > 0 ? `${targetSec.toFixed(1)}s` : '?'}`
                                : 'Chưa chọn nhạc nền'}
                        </Typography>
                        {state.bgmSegments.length > 0 ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    display: 'block',
                                    mt: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {state.bgmSegments.map((seg) => seg.title || seg.id).join(' · ')}
                            </Typography>
                        ) : null}
                    </Box>
                    <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ChevronRightIcon />}
                        onClick={() => setBgmDrawerOpen(true)}
                        sx={{ flexShrink: 0, textTransform: 'none' }}
                    >
                        {state.bgmSegments.length > 0 ? 'Sửa' : 'Chọn'}
                    </Button>
                </Box>

                {bgmInsufficient ? (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.25 }}>
                        BGM chưa đủ dài video.
                    </Alert>
                ) : null}
                {state.bgmSegments.length > 0 && selectedBgmTotal <= 0 ? (
                    <Alert severity="info" sx={{ mt: 1, py: 0.25 }}>
                        Mở chọn nhạc nền và bấm play để đo thời lượng nếu vẫn hiện 0s.
                    </Alert>
                ) : null}

                {state.bgmSegments.length > 0 && state.bgmSegments.length <= 2 ? (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {state.bgmSegments.map((seg, index) => {
                            const previewUrl = bgmPreviewUrl(seg);
                            const isPlaying = Boolean(previewUrl && playingUrl === previewUrl);
                            return (
                                <Box
                                    key={`${seg.download_url}-${index}`}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        py: 0.25,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap>
                                        {seg.title || seg.id}
                                        {' '}
                                        ·
                                        {' '}
                                        {formatBgmDuration(Number(seg.duration_sec || 0))}
                                    </Typography>
                                    <Tooltip title={isPlaying ? 'Dừng' : 'Nghe thử'}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={!previewUrl}
                                                onClick={() => handlePlayPreview(seg)}
                                            >
                                                {isPlaying ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <IconButton
                                        size="small"
                                        onClick={() => state.handleRemoveBgmSegment(index)}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Box>
                ) : null}
            </InnerCard>

            <ShortVideoAgentBgmSearchDrawer
                open={bgmDrawerOpen}
                onClose={() => setBgmDrawerOpen(false)}
                searchQuery={state.bgmSearchQuery}
                onSearchQueryChange={state.setBgmSearchQuery}
                searchResults={state.bgmSearchResults}
                searchingBgm={state.searchingBgm}
                onSearch={() => state.handleSearchAgentBgm()}
                segments={state.bgmSegments}
                onAddSegment={(item) => state.handleAddBgmSegment(item)}
                onRemoveSegment={state.handleRemoveBgmSegment}
                targetSec={targetSec}
                onPlayPreview={handlePlayPreview}
                playingUrl={playingUrl}
            />

            <InnerCard accent={ACCENT_IMAGES}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <PermMediaIcon fontSize="small" sx={{ mt: 0.25, color: ACCENT_IMAGES }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700}>
                            Hình ảnh
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            {state.marketingPostImages.length}
                            {' '}
                            ảnh marketing ·
                            {' '}
                            {state.visualCatalog.filter((item) => item.source === 'user_upload').length}
                            {' '}
                            upload ·
                            {' '}
                            {state.visualCatalog.filter((item) => item.source !== 'user_upload').length}
                            {' '}
                            stock
                        </Typography>
                        {state.visualCatalog.length > 0 ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    display: 'block',
                                    mt: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {state.visualCatalog.map((item) => item.title || item.id).join(' · ')}
                            </Typography>
                        ) : null}
                    </Box>
                    <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ChevronRightIcon />}
                        onClick={() => setVisualDrawerOpen(true)}
                        sx={{ flexShrink: 0, textTransform: 'none' }}
                    >
                        {state.visualCatalog.length > 0 || state.marketingPostImages.length > 0
                            || state.githubImageShots.length > 0
                            ? 'Quản lý'
                            : 'Chọn'}
                    </Button>
                </Box>
                {state.marketingPostId > 0 ? (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoAwesomeIcon fontSize="small" />}
                        onClick={() => { void state.handleOpenMediaSuggestGemini(); }}
                        disabled={state.openingMediaSuggestGemini}
                        sx={{ mt: 1.25, textTransform: 'none' }}
                    >
                        {state.openingMediaSuggestGemini ? 'Đang mở Gemini...' : 'Gợi ý media (Gemini Web)'}
                    </Button>
                ) : (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<AutoAwesomeIcon fontSize="small" />}
                            onClick={() => { void state.handleOpenGithubImageShotsGemini(); }}
                            disabled={state.openingGithubImageShotsGemini}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {state.openingGithubImageShotsGemini ? 'Đang mở Gemini...' : 'Gợi ý image GitHub'}
                        </Button>
                        {state.agentSourceFormat === 'github_repo_review' && resolveGithubRepoUrl(state.agentGithubRepo) ? (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<GitHubIcon fontSize="small" />}
                                endIcon={<OpenInNewIcon fontSize="small" />}
                                href={resolveGithubRepoUrl(state.agentGithubRepo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ textTransform: 'none' }}
                            >
                                Mở GitHub repo
                            </Button>
                        ) : null}
                    </Stack>
                )}
                {state.marketingPostId <= 0 && state.githubImageShots.length > 0 ? (
                    <Box sx={{ mt: 1.25 }}>
                        <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 1, fontWeight: 600 }}>
                            {state.githubImageShots.length}
                            {' '}
                            mô tả ·
                            {' '}
                            {state.githubImageShots.filter((shot) => Boolean(shot.visual_catalog_id)).length}
                            {' '}
                            đã có ảnh
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {state.githubImageShots.map((shot, index) => {
                                const linkedItem = shot.visual_catalog_id
                                    ? state.visualCatalog.find((item) => item.id === shot.visual_catalog_id)
                                    : undefined;
                                const imageUrl = String(linkedItem?.url || '').trim();
                                const previewUrl = String(linkedItem?.preview_url || imageUrl).trim();
                                const linked = Boolean(imageUrl);
                                const pasting = state.pastingGithubShotId === shot.id;
                                return (
                                    <Box
                                        key={shot.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.25,
                                            p: 1.25,
                                            borderRadius: 1.5,
                                            border: 1,
                                            borderColor: linked ? 'success.light' : 'divider',
                                            bgcolor: linked ? 'rgba(46, 125, 50, 0.06)' : 'grey.50',
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={700}
                                            color={linked ? 'success.main' : 'text.secondary'}
                                            sx={{ flexShrink: 0, minWidth: 22, lineHeight: 1.5 }}
                                        >
                                            {index + 1}.
                                        </Typography>
                                        {linked ? (
                                            <Box
                                                component="a"
                                                href={imageUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Mở ảnh trong tab mới"
                                                sx={{
                                                    flexShrink: 0,
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    border: 1,
                                                    borderColor: 'divider',
                                                    bgcolor: 'common.white',
                                                    display: 'block',
                                                    cursor: 'pointer',
                                                    '&:hover': { opacity: 0.9 },
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={previewUrl || imageUrl}
                                                    alt={shot.description}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        display: 'block',
                                                    }}
                                                />
                                            </Box>
                                        ) : null}
                                        <Typography
                                            variant="body2"
                                            color="text.primary"
                                            sx={{
                                                flex: 1,
                                                minWidth: 0,
                                                whiteSpace: 'normal',
                                                wordBreak: 'break-word',
                                                lineHeight: 1.55,
                                            }}
                                        >
                                            {shot.description}
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            disabled={pasting || state.savingImportAssets}
                                            onClick={() => { void state.handlePasteGithubImageShot(shot.id); }}
                                            sx={{ flexShrink: 0, textTransform: 'none', mt: 0.15 }}
                                        >
                                            {pasting ? 'Đang dán...' : 'Paste'}
                                        </Button>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ) : null}
            </InnerCard>

            <ShortVideoAgentVisualCatalogDrawer
                open={visualDrawerOpen}
                onClose={() => { void handleCloseVisualDrawer(); }}
                shortVideoId={state.shortVideoId}
                marketingPostImages={state.marketingPostImages}
                visualCatalog={state.visualCatalog}
                githubImageShots={state.githubImageShots}
                pastingGithubShotId={state.pastingGithubShotId}
                onPasteGithubShot={(shotId: string) => { void state.handlePasteGithubImageShot(shotId); }}
                onUnlinkGithubShot={(shotId: string) => { void state.handleUnlinkGithubImageShot(shotId); }}
                onUpdateGithubShotDescription={state.handleUpdateGithubImageShotDescription}
                onAddItem={state.handleAddVisualCatalogItem}
                onUpdateItem={state.handleUpdateVisualCatalogItem}
                onRemoveItem={state.handleRemoveVisualCatalogItem}
                onSave={async () => { await state.persistImportHtmlAssets({ silent: true }); }}
                saving={state.savingImportAssets}
                dirty={state.isVisualCatalogDirty}
            />

            <InnerCard accent={ACCENT_SFX}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75, color: ACCENT_SFX }}>
                    SFX
                </Typography>
                <FormControlLabel
                    control={(
                        <Switch
                            size="small"
                            checked={state.sfxBeatTransition}
                            onChange={(e) => { void state.handleSfxBeatTransitionChange(e.target.checked); }}
                            disabled={state.savingImportAssets}
                        />
                    )}
                    label="SFX chuyển beat"
                />
                <FormControlLabel
                    control={(
                        <Switch
                            size="small"
                            checked={state.sfxHook}
                            onChange={(e) => { void state.handleSfxHookChange(e.target.checked); }}
                            disabled={state.savingImportAssets}
                        />
                    )}
                    label="SFX hook (đầu video)"
                    sx={{ display: 'block', mb: 0.5 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Phát hiệu ứng hook ngay giây 0 của video, không phải thời lượng 0 giây
                </Typography>
            </InnerCard>
        </>
    );

    const renderBody = (
        <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                    size="small"
                    label={state.importHtmlReady ? 'Đủ beat HTML' : 'Thiếu beat HTML'}
                    color={state.importHtmlReady ? 'success' : 'default'}
                    sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                />
                <Chip
                    size="small"
                    label={state.whisperStatus === 'completed' ? 'Whisper OK' : `Whisper: ${state.whisperStatus}`}
                    color={state.whisperStatus === 'completed' ? 'success' : 'warning'}
                    sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                />
                <Chip
                    size="small"
                    label={assembleOk ? 'Đã ghép' : 'Chưa ghép'}
                    color={assembleOk ? 'success' : 'default'}
                    sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                />
            </Box>
            {state.composition?.assembled_at ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Ghép lúc:
                    {' '}
                    {state.composition.assembled_at}
                </Typography>
            ) : null}
            {state.composition?.assemble_status === 'failed' && assembleErrorHuman ? (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Ghép / render thất bại
                    </Typography>
                    <Typography variant="body2">
                        {assembleErrorHuman}
                    </Typography>
                </Alert>
            ) : null}

            <Dialog
                open={state.captionMismatchDialogOpen}
                onClose={() => {
                    if (!state.launchingScriptRender && !state.launchingAssemble) {
                        state.handleDismissCaptionMismatchDialog();
                    }
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Caption lệch Whisper</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        {state.captionMismatchDialogMessage
                            || assembleErrorHuman
                            || 'Script và timing Whisper chưa khớp đủ.'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Karaoke text vẫn theo audio script; timing có thể lệch. Bạn có muốn tiếp tục render không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => state.handleDismissCaptionMismatchDialog()}
                        disabled={state.launchingScriptRender}
                        sx={{ textTransform: 'none' }}
                    >
                        Bỏ qua
                    </Button>
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        loading={state.launchingScriptRender}
                        disabled={!canRender}
                        onClick={() => {
                            void state.handleLaunchImportHtmlRenderAllowMismatch();
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Vẫn tiếp tục render
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            {state.beatsRenderErrorCount > 0 && !beatErrorsAreCaptionStale ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Beat lỗi render/assemble
                    </Typography>
                    <Typography variant="body2">
                        {state.beatRenderErrorIds.join(', ')}
                        {' '}
                        — hover tab beat hoặc segment timeline để xem chi tiết.
                    </Typography>
                    {compositionRenderError ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {compositionRenderError}
                        </Typography>
                    ) : null}
                </Alert>
            ) : null}

            {beatErrorsAreCaptionStale ? (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                    <Typography variant="body2">
                        Karaoke có thể lệch timing Whisper — bấm Render video; nếu lệch sẽ hỏi xác nhận tiếp tục.
                    </Typography>
                </Alert>
            ) : null}

            {state.composition?.render_status === 'failed'
                && state.beatsRenderErrorCount === 0
                && compositionRenderError
                && !isCaptionSyncAssembleError(compositionRenderError) ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Render thất bại
                    </Typography>
                    <Typography variant="body2">
                        {compositionRenderError}
                    </Typography>
                </Alert>
            ) : null}

            <LoadingButton
                size="small"
                variant="contained"
                fullWidth
                loading={state.launchingScriptRender}
                disabled={!canRender}
                startIcon={<PlayArrowIcon />}
                onClick={() => { void state.handleLaunchImportHtmlRender(); }}
                sx={{
                    textTransform: 'none',
                    bgcolor: ACCENT_RENDER,
                    '&:hover': { bgcolor: '#bf360c' },
                }}
            >
                Render video
            </LoadingButton>

            {!canRender ? (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                        Chưa thể render vì thiếu dữ liệu:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                        {renderBlockers.map((item) => (
                            <Box component="li" key={item.id} sx={{ mb: 0.5 }}>
                                <Typography variant="body2">
                                    {item.message}
                                </Typography>
                                {item.hint ? (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        →
                                        {' '}
                                        {item.hint}
                                    </Typography>
                                ) : null}
                            </Box>
                        ))}
                    </Box>
                </Alert>
            ) : (
                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1 }}>
                    Đủ điều kiện — bấm Render video để tự ghép composition rồi render.
                </Typography>
            )}
        </>
    );

    return (
        <Box sx={embedded ? undefined : { p: 2, height: '100%', overflow: 'auto' }}>
            {!embedded ? (
                <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Tài nguyên ghép video
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Chọn nhạc nền, hình ảnh cho Gemini, lưu tài nguyên, rồi bấm Render video (tự ghép + render trên máy local).
                    </Typography>
                </>
            ) : null}

            <StepCard
                step={3}
                title="Tài nguyên"
                accent={ACCENT_RESOURCES}
                done={resourcesReady}
                status={(
                    <Chip
                        size="small"
                        label={
                            state.savingImportAssets
                                ? 'Đang lưu…'
                                : hasBgm
                                    ? `${state.bgmSegments.length} BGM`
                                    : 'Chưa có BGM'
                        }
                        color={state.savingImportAssets ? 'default' : (resourcesReady ? 'success' : 'default')}
                        variant={resourcesReady && !state.savingImportAssets ? 'filled' : 'outlined'}
                        sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                    />
                )}
            >
                {resourcesBody}
            </StepCard>

            <StepCard
                step={4}
                title="Render video"
                accent={ACCENT_RENDER}
                done={canRender}
                status={(
                    <Chip
                        size="small"
                        label={canRender ? 'Sẵn sàng' : 'Chưa đủ'}
                        color={canRender ? 'success' : 'default'}
                        variant={canRender ? 'filled' : 'outlined'}
                        sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                    />
                )}
            >
                {renderBody}
            </StepCard>
        </Box>
    );
}
