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
                Chọn nhạc nền, hình ảnh/video cho Gemini, lưu tài nguyên, rồi render hoặc preview trên máy local.
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
                            Hình ảnh / video
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
            {state.composition?.assemble_status === 'failed' && state.composition.assemble_error ? (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                    {state.composition.assemble_error}
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
                disabled={!canAssemble || state.bgmSegments.length === 0}
                startIcon={<PlayArrowIcon />}
                onClick={() => { void state.handleLaunchImportHtmlRender(); }}
                sx={{ textTransform: 'none' }}
            >
                Render video
            </LoadingButton>

            {!canAssemble ? (
                <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                    Cần script duyệt, audio, beat-map + đủ HTML + whisper.
                </Typography>
            ) : null}
        </Box>
    );
}
