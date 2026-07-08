import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControlLabel,
    IconButton,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { LoadingButton } from '@mui/lab';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { openExternalTabViaExtension } from 'helpers/openExternalTabViaExtension';
import type { useAgentVideoContent } from './useAgentVideoContent';
import { bgmPreviewUrl, formatBgmDuration } from './agentBgmPreview';
import type { AgentBgmSearchItem, ImportHtmlBgmSegment } from './agentVideoApi';
import ShortVideoAgentBgmSearchDrawer from './ShortVideoAgentBgmSearchDrawer';
import ShortVideoAgentVisualCatalogDrawer from './ShortVideoAgentVisualCatalogDrawer';
import {
    buildImportHtmlAssembleBlockers,
    buildImportHtmlRenderBlockers,
    humanizeImportHtmlAssembleError,
} from './agentVideoImportHtmlBlockers';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentResourcesPanel({ state }: Props) {
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
    const canAssemble = state.importHtmlReady && state.hasAudio && state.scriptApproved;
    const assembleOk = state.composition?.assemble_status === 'ok';
    const bgmInsufficient = targetSec > 0 && selectedBgmTotal > 0 && selectedBgmTotal + 0.01 < targetSec;

    const pipelineInput = {
        scriptApproved: state.scriptApproved,
        hasAudio: state.hasAudio,
        importHtmlReady: state.importHtmlReady,
        whisperStatus: state.whisperStatus,
        bgmSegmentCount: state.bgmSegments.length,
        bgmInsufficient,
        assembleOk,
        assembleStatus: state.composition?.assemble_status,
        assembleError: state.composition?.assemble_error,
    };
    const assembleBlockers = buildImportHtmlAssembleBlockers(pipelineInput);
    const renderBlockers = buildImportHtmlRenderBlockers(pipelineInput);
    const canRender = renderBlockers.length === 0;
    const assembleErrorHuman = humanizeImportHtmlAssembleError(state.composition?.assemble_error || '');

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

    if (state.renderMode !== 'import_html') {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="info">
                    Tab tài nguyên chỉ dùng khi luồng render là HTML chatbot.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tài nguyên ghép video
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Chọn nhạc nền, hình ảnh cho Gemini, lưu tài nguyên, rồi render hoặc preview trên máy local.
            </Typography>

            <Box
                sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: bgmInsufficient ? 'warning.main' : 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <MusicNoteIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
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
                                    <Tooltip title={previewUrl ? (isPlaying ? 'Dừng' : 'Nghe thử') : 'Chưa có URL audio'}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={!previewUrl}
                                                onClick={() => handlePlayPreview(seg)}
                                            >
                                                {isPlaying ? <StopIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <IconButton size="small" onClick={() => state.handleRemoveBgmSegment(index)}>
                                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Box>
                ) : null}
            </Box>

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

            <Box
                sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <PermMediaIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Hình ảnh
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            {state.marketingPostImages.length}
                            {' '}
                            ảnh marketing ·
                            {' '}
                            {state.visualCatalog.length}
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
                            ? 'Quản lý'
                            : 'Chọn'}
                    </Button>
                </Box>
                <Button
                    size="small"
                    variant="text"
                    onClick={() => { void state.handleOpenMediaSuggestGemini(); }}
                    disabled={state.openingMediaSuggestGemini}
                    sx={{ mt: 1, textTransform: 'none', px: 0 }}
                >
                    {state.openingMediaSuggestGemini ? 'Đang mở Gemini...' : 'Gợi ý media (Gemini Web)'}
                </Button>
            </Box>

            <ShortVideoAgentVisualCatalogDrawer
                open={visualDrawerOpen}
                onClose={() => { void handleCloseVisualDrawer(); }}
                marketingPostImages={state.marketingPostImages}
                visualCatalog={state.visualCatalog}
                onAddItem={state.handleAddVisualCatalogItem}
                onRemoveItem={state.handleRemoveVisualCatalogItem}
                onSave={async () => { await state.persistImportHtmlAssets(); }}
                saving={state.savingImportAssets}
                dirty={state.isVisualCatalogDirty}
            />

            <FormControlLabel
                control={(
                    <Switch
                        size="small"
                        checked={state.sfxBeatTransition}
                        onChange={(e) => state.setSfxBeatTransition(e.target.checked)}
                    />
                )}
                label="SFX chuyển beat"
            />
            <FormControlLabel
                control={(
                    <Switch
                        size="small"
                        checked={state.sfxHook}
                        onChange={(e) => state.setSfxHook(e.target.checked)}
                    />
                )}
                label="SFX hook (đầu video)"
                sx={{ display: 'block', mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Phát hiệu ứng hook ngay giây 0 của video, không phải thời lượng 0 giây
            </Typography>

            <LoadingButton
                size="small"
                variant="contained"
                fullWidth
                loading={state.savingImportAssets}
                onClick={() => { void state.persistImportHtmlAssets(); }}
                sx={{ mb: 2, textTransform: 'none' }}
            >
                Lưu tài nguyên
            </LoadingButton>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Composition
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                    size="small"
                    label={state.importHtmlReady ? 'Đủ beat HTML' : 'Thiếu beat HTML'}
                    color={state.importHtmlReady ? 'success' : 'default'}
                />
                <Chip
                    size="small"
                    label={state.whisperStatus === 'completed' ? 'Whisper OK' : `Whisper: ${state.whisperStatus}`}
                    color={state.whisperStatus === 'completed' ? 'success' : 'warning'}
                />
                <Chip
                    size="small"
                    label={assembleOk ? 'Đã ghép' : 'Chưa ghép'}
                    color={assembleOk ? 'success' : 'default'}
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
                        Ghép composition thất bại
                    </Typography>
                    <Typography variant="body2">
                        {assembleErrorHuman}
                    </Typography>
                </Alert>
            ) : null}

            {state.beatsRenderErrorCount > 0 ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Beat lỗi render/assemble
                    </Typography>
                    <Typography variant="body2">
                        {state.beatRenderErrorIds.join(', ')}
                        {' '}
                        — hover tab beat hoặc segment timeline để xem chi tiết.
                    </Typography>
                    {state.composition?.render_error ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {state.composition.render_error}
                        </Typography>
                    ) : null}
                </Alert>
            ) : null}

            {state.composition?.render_status === 'failed' && state.beatsRenderErrorCount === 0 && state.composition?.render_error ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Render thất bại
                    </Typography>
                    <Typography variant="body2">
                        {state.composition.render_error}
                    </Typography>
                </Alert>
            ) : null}

            {assembleBlockers.length > 0 ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                        Chưa thể ghép composition vì:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                        {assembleBlockers.map((item) => (
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
            ) : null}

            <LoadingButton
                size="small"
                variant="contained"
                color="secondary"
                fullWidth
                loading={state.launchingAssemble}
                disabled={!canAssemble}
                startIcon={<PlayArrowIcon />}
                onClick={() => { void state.handleLaunchImportHtmlAssemble(); }}
                sx={{ mb: 1, textTransform: 'none' }}
            >
                Ghép composition
            </LoadingButton>
            <LoadingButton
                size="small"
                variant="outlined"
                fullWidth
                loading={state.launchingPreview}
                disabled={!assembleOk && !canAssemble}
                startIcon={<OpenInNewIcon />}
                onClick={() => { void state.handleLaunchImportHtmlPreview(); }}
                sx={{ mb: 1, textTransform: 'none' }}
            >
                Mở preview
            </LoadingButton>
            {state.previewStudioUrl ? (
                <Alert
                    severity="success"
                    sx={{ mb: 1 }}
                    action={(
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => openExternalTabViaExtension(state.previewStudioUrl)}
                            sx={{ textTransform: 'none' }}
                        >
                            Mở studio
                        </Button>
                    )}
                >
                    Preview:
                    {' '}
                    {state.previewStudioUrl}
                </Alert>
            ) : null}
            <LoadingButton
                size="small"
                variant="contained"
                color="primary"
                fullWidth
                loading={state.launchingScriptRender}
                disabled={!canRender}
                startIcon={<PlayArrowIcon />}
                onClick={() => { void state.handleLaunchImportHtmlRender(); }}
                sx={{ textTransform: 'none' }}
            >
                Render video
            </LoadingButton>

            {!canRender ? (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                        Chưa thể render vì:
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
                    Đủ điều kiện render — bấm Render video để chạy daemon local.
                </Typography>
            )}
        </Box>
    );
}
