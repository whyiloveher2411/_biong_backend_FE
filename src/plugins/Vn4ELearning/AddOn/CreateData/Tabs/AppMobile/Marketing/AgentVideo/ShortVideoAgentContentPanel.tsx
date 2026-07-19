import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    LinearProgress,
    Menu,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import LoadingButton from 'components/atoms/LoadingButton';
import TextareaForm from 'components/atoms/fields/textarea/Form';
import { convertToURL, validURL } from 'helpers/url';
import type { useAgentVideoContent } from './useAgentVideoContent';
import {
    FULL_AUTO_PIPELINE_STEP_LABELS,
    FULL_AUTO_PIPELINE_STEP_ORDER,
    type FullAutoPipelineStepKey,
} from './agentVideoApi';
import { WorkflowSection, workflowFieldSurfaceSx } from './workflowPanelSection';
import ShortVideoAgentAvatarDrawer, {
    AVATAR_PIP_ANCHORS,
} from './ShortVideoAgentAvatarDrawer';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

function ReadmeMediaThumb({
    mediaType,
    url,
    label,
}: {
    mediaType: 'image' | 'video';
    url: string;
    label: string;
}) {
    const [failed, setFailed] = React.useState(false);

    return (
        <Box
            sx={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: 0.75,
                overflow: 'hidden',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {mediaType === 'video' || failed ? (
                mediaType === 'video'
                    ? <VideocamOutlinedIcon color="action" />
                    : <ImageOutlinedIcon color="action" />
            ) : (
                <Box
                    component="img"
                    src={url}
                    alt={label}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setFailed(true)}
                />
            )}
        </Box>
    );
}

function resolveRestartableSet(
    restartable?: string[] | null,
    steps?: Record<string, { status?: string }> | null,
    currentStep?: string,
): Set<string> {
    if (Array.isArray(restartable) && restartable.length > 0) {
        return new Set(restartable);
    }
    // Fallback FE nếu API cũ chưa trả restartable_steps
    let maxIdx = 0;
    FULL_AUTO_PIPELINE_STEP_ORDER.forEach((key, idx) => {
        const status = String(steps?.[key]?.status || 'pending');
        if (['done', 'skipped', 'running', 'failed'].includes(status)) {
            maxIdx = idx;
        }
    });
    if (currentStep) {
        const cur = FULL_AUTO_PIPELINE_STEP_ORDER.indexOf(
            currentStep as FullAutoPipelineStepKey,
        );
        if (cur > maxIdx) maxIdx = cur;
    }
    const lastIdx = FULL_AUTO_PIPELINE_STEP_ORDER.length - 1;
    if (maxIdx < lastIdx) {
        const topKey = FULL_AUTO_PIPELINE_STEP_ORDER[maxIdx];
        const topStatus = String(steps?.[topKey]?.status || 'pending');
        if (topStatus === 'done' || topStatus === 'skipped') {
            maxIdx += 1;
        }
    }
    return new Set(FULL_AUTO_PIPELINE_STEP_ORDER.slice(0, maxIdx + 1));
}

const PIPELINE_STEP_STATUS_LABEL: Record<string, string> = {
    done: 'Xong',
    skipped: 'Bỏ qua',
    running: 'Đang chạy',
    failed: 'Lỗi',
    pending: 'Chưa làm',
};

function pipelineStepStatusColor(status: string): string {
    switch (status) {
        case 'done':
            return 'success.main';
        case 'skipped':
            return 'text.secondary';
        case 'running':
            return 'info.main';
        case 'failed':
            return 'error.main';
        default:
            return 'text.disabled';
    }
}

export default function ShortVideoAgentContentPanel({ state }: Props) {
    const linked = state.marketingPostId > 0;
    const contentPostRef = React.useRef({
        agent_source_content: state.agentSourceContent,
    });
    const [restartMenuAnchor, setRestartMenuAnchor] = React.useState<null | HTMLElement>(null);
    const restartableSet = React.useMemo(
        () => resolveRestartableSet(
            state.fullAutoPipeline?.restartable_steps,
            state.fullAutoPipeline?.steps,
            state.fullAutoPipeline?.current_step,
        ),
        [
            state.fullAutoPipeline?.restartable_steps,
            state.fullAutoPipeline?.steps,
            state.fullAutoPipeline?.current_step,
        ],
    );
    const [contentFieldKey, setContentFieldKey] = React.useState(0);
    const prevFetchingReadmeRef = React.useRef(false);

    React.useEffect(() => {
        contentPostRef.current.agent_source_content = state.savedAgentSourceContent;
        setContentFieldKey((prev) => prev + 1);
    }, [state.shortVideoId, state.savedAgentSourceContent]);

    React.useEffect(() => {
        if (prevFetchingReadmeRef.current && !state.fetchingGithubReadme) {
            contentPostRef.current.agent_source_content = state.agentSourceContent;
            setContentFieldKey((prev) => prev + 1);
        }
        prevFetchingReadmeRef.current = state.fetchingGithubReadme;
    }, [state.fetchingGithubReadme, state.agentSourceContent]);

    const sourceDirty = !linked && (
        String(contentPostRef.current.agent_source_content || '') !== state.savedAgentSourceContent
        || state.agentGithubRepo !== state.savedAgentGithubRepo
        || state.agentSourceFormat !== state.savedAgentSourceFormat
    );
    const additionalDirty = state.agentAdditionalInfo !== state.savedAgentAdditionalInfo;
    const isDirty = sourceDirty || additionalDirty;

    const handleSave = () => {
        if (!isDirty) {
            return;
        }
        const content = String(contentPostRef.current.agent_source_content || '');
        if (!linked) {
            state.setAgentSourceContent(content);
        }
        void state.handleSaveSourceContent(
            linked ? undefined : content,
            state.agentAdditionalInfo,
        );
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 1.5,
                    pb: 1,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : 'grey.50'),
                }}
            >
                <Stack spacing={1.5}>
                    <WorkflowSection
                        title="Nguồn chính"
                        tone="info"
                        description={
                            linked
                                ? `Đang liên kết marketing post #${state.marketingPostId} — nội dung chỉ đọc.`
                                : 'Chọn loại nội dung, nhập nguồn hoặc fetch README từ GitHub.'
                        }
                    >
                        {linked ? (
                            <Stack spacing={1}>
                                {state.contentPlainText.trim() ? (
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            p: 1.25,
                                            ...workflowFieldSurfaceSx,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontFamily: 'inherit',
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            maxHeight: '50vh',
                                            overflow: 'auto',
                                        }}
                                    >
                                        {state.contentPlainText}
                                    </Box>
                                ) : (
                                    <Alert severity="warning" sx={{ py: 0.5 }}>
                                        Marketing post chưa có nội dung plain text.
                                    </Alert>
                                )}
                            </Stack>
                        ) : (
                            <Stack spacing={1.5}>
                                {state.githubTopEnrich?.status === 'preparing' ? (
                                    <Box
                                        sx={{
                                            border: '1px solid',
                                            borderColor: 'info.light',
                                            borderRadius: 1,
                                            bgcolor: 'rgba(2, 136, 209, 0.06)',
                                            p: 1.25,
                                        }}
                                    >
                                        <Stack spacing={0.75}>
                                            <Typography variant="body2" fontWeight={600}>
                                                Đang lấy nguồn top repo
                                                {typeof state.githubTopEnrich.percent === 'number'
                                                    ? ` — ${state.githubTopEnrich.percent}%`
                                                    : ''}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {typeof state.githubTopEnrich.current_index === 'number'
                                                && state.githubTopEnrich.current_index > 0
                                                && typeof state.githubTopEnrich.total === 'number'
                                                    ? `Đang xử lý repo ${state.githubTopEnrich.current_index}/${state.githubTopEnrich.total}`
                                                    : 'Đang xếp hàng trên queue'}
                                                {state.githubTopEnrich.current_full_name
                                                    ? `: ${state.githubTopEnrich.current_full_name}`
                                                    : ''}
                                                {typeof state.githubTopEnrich.done === 'number'
                                                && typeof state.githubTopEnrich.total === 'number'
                                                    ? ` · Hoàn tất ${state.githubTopEnrich.done}/${state.githubTopEnrich.total}`
                                                    : ''}
                                                {typeof state.githubTopEnrich.failed === 'number'
                                                && state.githubTopEnrich.failed > 0
                                                    ? ` · Lỗi ${state.githubTopEnrich.failed}`
                                                    : ''}
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.max(
                                                    0,
                                                    Math.min(100, Number(state.githubTopEnrich.percent || 0))
                                                )}
                                                sx={{ height: 8, borderRadius: 4 }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                Nội dung sẽ tự cập nhật khi xong — có thể để drawer mở.
                                            </Typography>
                                        </Stack>
                                    </Box>
                                ) : null}
                                {state.githubTopEnrich?.status === 'failed' ? (
                                    <Alert severity="warning" sx={{ py: 0.5 }}>
                                        Lấy nguồn top repo thất bại
                                        {state.githubTopEnrich.error
                                            ? `: ${state.githubTopEnrich.error}`
                                            : ''}
                                        .
                                    </Alert>
                                ) : null}
                                {state.githubTopEnrich?.status === 'ready' ? (
                                    <Alert severity="success" sx={{ py: 0.5 }}>
                                        Đã lấy xong nguồn top repo
                                        {typeof state.githubTopEnrich.done === 'number'
                                            ? ` (${state.githubTopEnrich.done}/${state.githubTopEnrich.total || state.githubTopEnrich.done} repo)`
                                            : ''}
                                        .
                                    </Alert>
                                ) : null}
                                <FormControl fullWidth size="small" sx={workflowFieldSurfaceSx}>
                                    <InputLabel id="agent-source-format-label">Loại nội dung nguồn</InputLabel>
                                    <Select
                                        labelId="agent-source-format-label"
                                        label="Loại nội dung nguồn"
                                        value={state.agentSourceFormat}
                                        onChange={(e) => state.setAgentSourceFormat(String(e.target.value))}
                                    >
                                        {state.agentSourceFormatCatalog.map((item) => (
                                            <MenuItem key={item.key} value={item.key}>
                                                {item.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box
                                    sx={{
                                        ...workflowFieldSurfaceSx,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        p: 1,
                                        '& .MuiFormControl-root': { m: 0 },
                                    }}
                                >
                                    <TextareaForm
                                        key={contentFieldKey}
                                        component="textarea"
                                        name="agent_source_content"
                                        post={contentPostRef.current}
                                        config={{
                                            title: 'Nội dung nguồn',
                                            rows: 12,
                                            note: 'Dán hoặc viết nội dung nguồn cho short video',
                                        }}
                                        onReview={(value) => {
                                            const nextValue = String(value ?? '');
                                            contentPostRef.current.agent_source_content = nextValue;
                                            state.setAgentSourceContent(nextValue);
                                        }}
                                    />
                                </Box>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                                    <TextField
                                        label="GitHub repo"
                                        value={state.agentGithubRepo}
                                        onChange={(e) => state.setAgentGithubRepo(e.target.value)}
                                        fullWidth
                                        size="small"
                                        placeholder="owner/repo hoặc https://github.com/owner/repo"
                                        sx={workflowFieldSurfaceSx}
                                    />
                                    <LoadingButton
                                        variant="outlined"
                                        loading={state.fetchingGithubReadme}
                                        startIcon={<CloudDownloadIcon />}
                                        onClick={() => void state.handleFetchGithubReadme()}
                                        disabled={!state.agentGithubRepo.trim()}
                                        sx={{
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        Lấy thông tin
                                    </LoadingButton>
                                </Stack>
                            </Stack>
                        )}
                    </WorkflowSection>

                    <WorkflowSection
                        title="Thông tin thêm"
                        tone="meta"
                        description="Tuỳ chọn — nếu có, prompt sinh script sẽ bắt buộc đưa vào lời thoại"
                    >
                        <TextField
                            multiline
                            minRows={4}
                            maxRows={10}
                            fullWidth
                            size="small"
                            placeholder="42k stars GitHub, 500k downloads, featured Product Hunt..."
                            value={state.agentAdditionalInfo}
                            onChange={(e) => state.setAgentAdditionalInfo(e.target.value)}
                            sx={workflowFieldSurfaceSx}
                        />
                    </WorkflowSection>

                    {!linked ? (
                        <WorkflowSection
                            title="Media từ README"
                            tone="visual"
                            description="Ảnh/GIF/video quét từ repo — import vào tài nguyên video (ưu tiên như user upload)."
                            headerAction={(
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    loading={state.importingAllReadmeMedia}
                                    disabled={
                                        state.readmeMedia.length === 0
                                        || state.readmeMedia.every((item) => state.isReadmeMediaImported(item))
                                        || state.importingReadmeMediaIds.length > 0
                                    }
                                    onClick={() => void state.handleImportAllReadmeMedia()}
                                    startIcon={<CloudDownloadIcon />}
                                    sx={{
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    Import tất cả
                                </LoadingButton>
                            )}
                        >

                            {state.agentSourceFormat === 'github_repo_review' ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                        mb: 1.25,
                                        px: 1.25,
                                        py: 1,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: state.agentGithubScreenshotHomepage
                                            ? 'primary.light'
                                            : 'divider',
                                        bgcolor: 'background.paper',
                                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 1,
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'action.hover',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            color: state.agentGithubScreenshotHomepage
                                                ? 'primary.main'
                                                : 'text.secondary',
                                        }}
                                    >
                                        <DesktopWindowsOutlinedIcon sx={{ fontSize: 20 }} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                                            Chụp màn hình trang chủ
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            display="block"
                                            sx={{ mt: 0.15, lineHeight: 1.35 }}
                                        >
                                            Khi «Lấy thông tin», tự cover bằng screenshot nếu README chưa có ảnh.
                                        </Typography>
                                    </Box>
                                    <Switch
                                        size="small"
                                        edge="end"
                                        checked={state.agentGithubScreenshotHomepage}
                                        disabled={state.savingGithubScreenshotHomepage}
                                        onChange={(e) => {
                                            void state.handleGithubScreenshotHomepageChange(e.target.checked);
                                        }}
                                        inputProps={{ 'aria-label': 'Chụp màn hình trang chủ' }}
                                    />
                                </Box>
                            ) : null}

                            {(state.githubTopRepos?.repos?.length || 0) > 0 ? (
                                <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Cover theo repo
                                    </Typography>
                                    {state.githubTopRepos?.repos?.map((repo) => {
                                        const name = String(repo.full_name || '').trim() || '—';
                                        const cover = String(repo.cover_image_url || '').trim();
                                        const imgCount = Array.isArray(repo.visual_catalog_ids)
                                            ? repo.visual_catalog_ids.length
                                            : 0;
                                        const st = String(repo.status || 'pending');
                                        return (
                                            <Stack
                                                key={name}
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    p: 0.75,
                                                    bgcolor: 'background.paper',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: 0.75,
                                                        overflow: 'hidden',
                                                        bgcolor: 'action.hover',
                                                        flexShrink: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {cover ? (
                                                        <Box
                                                            component="img"
                                                            src={cover}
                                                            alt={name}
                                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <ImageOutlinedIcon fontSize="small" color="disabled" />
                                                    )}
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" noWrap fontWeight={500} title={name}>
                                                        {name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {imgCount > 0
                                                            ? `${imgCount} ảnh trong catalog`
                                                            : 'Chưa có ảnh'}
                                                        {cover ? ' · có cover' : ' · thiếu cover'}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    size="small"
                                                    label={st}
                                                    color={
                                                        st === 'ready'
                                                            ? (cover ? 'success' : 'warning')
                                                            : st === 'failed'
                                                                ? 'error'
                                                                : 'default'
                                                    }
                                                    sx={{ height: 22 }}
                                                />
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            ) : null}

                            {state.readmeMedia.length === 0 ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        gap: 0.75,
                                        px: 2,
                                        py: 2.25,
                                        borderRadius: 1,
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <CollectionsOutlinedIcon
                                        sx={{ fontSize: 28, color: 'text.disabled' }}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                                        {state.agentSourceFormat === 'github_repo_review'
                                            ? (state.agentGithubScreenshotHomepage
                                                ? 'Chưa có media — bấm «Lấy thông tin» để quét README (sẽ screenshot nếu thiếu ảnh).'
                                                : 'Chưa có media — bấm «Lấy thông tin» để quét README.')
                                            : 'Chưa có media — bấm «Lấy thông tin» hoặc đợi enrich top repo xong.'}
                                    </Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1}>
                                    {state.readmeMedia.map((item) => {
                                        const imported = state.isReadmeMediaImported(item);
                                        const importing = state.importingAllReadmeMedia
                                            || state.importingReadmeMediaIds.includes(item.id);
                                        const label = item.alt?.trim()
                                            || item.origin_path?.trim()
                                            || item.resolved_url;
                                        return (
                                            <Stack
                                                key={item.id}
                                                direction="row"
                                                spacing={1.25}
                                                alignItems="center"
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    p: 1,
                                                    bgcolor: 'background.paper',
                                                }}
                                            >
                                                <ReadmeMediaThumb
                                                    mediaType={item.media_type}
                                                    url={item.resolved_url}
                                                    label={label}
                                                />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography
                                                        variant="body2"
                                                        noWrap
                                                        title={label}
                                                        sx={{ fontWeight: 500 }}
                                                    >
                                                        {label}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                                                        <Chip
                                                            size="small"
                                                            icon={item.media_type === 'video'
                                                                ? <VideocamOutlinedIcon />
                                                                : <ImageOutlinedIcon />}
                                                            label={item.media_type === 'video' ? 'Video' : 'Ảnh'}
                                                            sx={{ height: 22 }}
                                                        />
                                                        {item.origin_path ? (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                noWrap
                                                                title={item.origin_path}
                                                                sx={{ maxWidth: 180 }}
                                                            >
                                                                {item.origin_path}
                                                            </Typography>
                                                        ) : null}
                                                    </Stack>
                                                </Box>
                                                {imported ? (
                                                    <Chip size="small" color="success" label="Đã import" />
                                                ) : (
                                                    <LoadingButton
                                                        size="small"
                                                        variant="contained"
                                                        loading={importing}
                                                        disabled={state.importingAllReadmeMedia}
                                                        onClick={() => void state.handleImportReadmeMediaItem(item)}
                                                    >
                                                        Import
                                                    </LoadingButton>
                                                )}
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            )}
                        </WorkflowSection>
                    ) : null}

                    <WorkflowSection
                        title="Pipeline tự động A→Z"
                        tone="pipeline"
                        description="Script → cải thiện → chuẩn hóa giọng đọc → duyệt/TTS → Whisper → chia beat → fill HTML → BGM → render. Tiến trình lưu DB, refresh không mất."
                    >
                        {state.fullAutoPipeline ? (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                                <Chip
                                    size="small"
                                    label={`Status: ${state.fullAutoPipeline.status || 'idle'}`}
                                    color={
                                        state.fullAutoPipeline.status === 'completed'
                                            ? 'success'
                                            : state.fullAutoPipeline.status === 'failed'
                                                ? 'error'
                                                : state.fullAutoPipeline.status === 'running'
                                                    ? 'primary'
                                                    : 'default'
                                    }
                                />
                                {state.fullAutoPipeline.current_step ? (
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={`Bước: ${state.fullAutoPipeline.current_step}`}
                                        sx={{ bgcolor: 'background.paper' }}
                                    />
                                ) : null}
                            </Stack>
                        ) : null}
                        {state.fullAutoPipeline?.last_error?.message ? (
                            <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                                [{state.fullAutoPipeline.last_error.step || '?'}]
                                {' '}
                                {state.fullAutoPipeline.last_error.message}
                            </Alert>
                        ) : null}
                        <Stack spacing={1.25}>
                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    sx={{ mb: 1, fontWeight: 600, letterSpacing: 0.2 }}
                                >
                                    Chạy pipeline
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <LoadingButton
                                        size="small"
                                        variant="contained"
                                        startIcon={<PlayArrowIcon />}
                                        endIcon={<ArrowDropDownIcon />}
                                        loading={state.startingFullAuto}
                                        disabled={state.fullAutoPipeline?.status === 'running'}
                                        onClick={(event) => {
                                            setRestartMenuAnchor(event.currentTarget);
                                        }}
                                    >
                                        Chạy từ bước…
                                    </LoadingButton>
                                    <Menu
                                        anchorEl={restartMenuAnchor}
                                        open={Boolean(restartMenuAnchor)}
                                        onClose={() => setRestartMenuAnchor(null)}
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                    >
                                        {FULL_AUTO_PIPELINE_STEP_ORDER.map((stepKey, index) => {
                                            const enabled = restartableSet.has(stepKey);
                                            const stepInfo = state.fullAutoPipeline?.steps?.[stepKey];
                                            const status = String(stepInfo?.status || 'pending');
                                            const statusLabel = PIPELINE_STEP_STATUS_LABEL[status]
                                                || status;
                                            return (
                                                <MenuItem
                                                    key={stepKey}
                                                    disabled={!enabled || state.startingFullAuto}
                                                    onClick={() => {
                                                        setRestartMenuAnchor(null);
                                                        void state.handleStartFullAutoPipeline('restart', stepKey);
                                                    }}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 2,
                                                        minWidth: 300,
                                                        py: 1,
                                                    }}
                                                >
                                                    <Typography
                                                        component="span"
                                                        variant="body2"
                                                        sx={{
                                                            color: enabled ? 'text.primary' : 'text.disabled',
                                                            fontWeight: status === 'running' ? 600 : 400,
                                                        }}
                                                    >
                                                        {index + 1}. {FULL_AUTO_PIPELINE_STEP_LABELS[stepKey]}
                                                    </Typography>
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{
                                                            color: enabled
                                                                ? pipelineStepStatusColor(status)
                                                                : 'text.disabled',
                                                            fontWeight: 600,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {statusLabel}
                                                    </Typography>
                                                </MenuItem>
                                            );
                                        })}
                                    </Menu>
                                    {state.fullAutoPipeline?.status === 'running' ? (
                                        <LoadingButton
                                            size="small"
                                            variant="outlined"
                                            color="inherit"
                                            startIcon={<StopIcon />}
                                            loading={state.cancellingFullAuto}
                                            disabled={state.cancellingFullAuto}
                                            onClick={() => { void state.handleCancelFullAutoPipeline(); }}
                                        >
                                            Dừng
                                        </LoadingButton>
                                    ) : null}
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box sx={{ px: 1.25, pt: 1.25, pb: 0.75 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                        sx={{ fontWeight: 600, letterSpacing: 0.2 }}
                                    >
                                        Tùy chọn clip
                                    </Typography>
                                </Box>
                                <Stack divider={<Divider flexItem />}>
                                    <FormControlLabel
                                        sx={{
                                            m: 0,
                                            px: 1.25,
                                            py: 1,
                                            width: '100%',
                                            alignItems: 'flex-start',
                                            gap: 1,
                                        }}
                                        control={(
                                            <Switch
                                                size="small"
                                                checked={state.agentIntroduceApp}
                                                disabled={state.savingIntroduceApp}
                                                onChange={(e) => {
                                                    void state.handleIntroduceAppChange(e.target.checked);
                                                }}
                                                inputProps={{ 'aria-label': 'Giới thiệu app trong video' }}
                                            />
                                        )}
                                        label={(
                                            <Box sx={{ pt: 0.25 }}>
                                                <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                                    Giới thiệu app trong video
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                                    Bật: CTA cuối mời mở/tải app. Tắt: chỉ CTA engagement.
                                                </Typography>
                                            </Box>
                                        )}
                                    />
                                    <FormControlLabel
                                        sx={{
                                            m: 0,
                                            px: 1.25,
                                            py: 1,
                                            width: '100%',
                                            alignItems: 'flex-start',
                                            gap: 1,
                                        }}
                                        control={(
                                            <Switch
                                                size="small"
                                                checked={state.agentShowKaraoke}
                                                disabled={state.savingShowKaraoke}
                                                onChange={(e) => {
                                                    void state.handleAgentShowKaraokeChange(e.target.checked);
                                                }}
                                                inputProps={{ 'aria-label': 'Hiện text karaoke' }}
                                            />
                                        )}
                                        label={(
                                            <Box sx={{ pt: 0.25 }}>
                                                <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                                    Hiện text karaoke
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                                    Tắt: không ghép caption layer. Band dưới beat vẫn chừa ~360px (UI channel).
                                                </Typography>
                                            </Box>
                                        )}
                                    />
                                    <FormControlLabel
                                        sx={{
                                            m: 0,
                                            px: 1.25,
                                            py: 1,
                                            width: '100%',
                                            alignItems: 'flex-start',
                                            gap: 1,
                                        }}
                                        control={(
                                            <Switch
                                                size="small"
                                                checked={state.agentGeminiOpenBrowser}
                                                disabled={state.savingGeminiOpenBrowser}
                                                onChange={(e) => {
                                                    void state.handleGeminiOpenBrowserChange(e.target.checked);
                                                }}
                                                inputProps={{ 'aria-label': 'Hiện browser Gemini' }}
                                            />
                                        )}
                                        label={(
                                            <Box sx={{ pt: 0.25 }}>
                                                <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                                    Hiện browser Gemini
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                                    Mở cửa sổ trình duyệt khi chạy fill/chia beat headless.
                                                </Typography>
                                            </Box>
                                        )}
                                    />
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    sx={{ mb: 1, fontWeight: 600, letterSpacing: 0.2 }}
                                >
                                    Avatar lip-sync
                                </Typography>
                                {(() => {
                                    const selected = state.verifiedAvatars.find(
                                        (item) => item.id === state.agentAvatarId,
                                    );
                                    const masterRaw = String(
                                        state.agentAvatarMasterUrl || selected?.master_url || '',
                                    ).trim();
                                    let thumbSrc = '';
                                    if (masterRaw) {
                                        if (validURL(masterRaw) || masterRaw.startsWith('data:')) {
                                            thumbSrc = masterRaw;
                                        } else if (masterRaw.startsWith('//')) {
                                            thumbSrc = `https:${masterRaw}`;
                                        } else {
                                            thumbSrc = convertToURL(
                                                process.env.REACT_APP_BASE_URL,
                                                masterRaw.replace(/^\//, ''),
                                            );
                                        }
                                    }
                                    const anchorLabel = AVATAR_PIP_ANCHORS.find(
                                        (item) => item.id === state.agentAvatarAnchor,
                                    )?.label || 'Dưới phải';
                                    const hasAvatar = state.agentAvatarId > 0;
                                    return (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="inherit"
                                            disabled={state.savingAgentAvatar}
                                            onClick={() => state.setAvatarDrawerOpen(true)}
                                            endIcon={<ChevronRightIcon />}
                                            sx={{
                                                ...workflowFieldSurfaceSx,
                                                justifyContent: 'flex-start',
                                                textTransform: 'none',
                                                py: 1,
                                                px: 1.25,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        bgcolor: '#fff',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {thumbSrc ? (
                                                        <Box
                                                            component="img"
                                                            src={thumbSrc}
                                                            alt=""
                                                            sx={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                display: 'block',
                                                            }}
                                                        />
                                                    ) : null}
                                                </Box>
                                                <Box sx={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                        {selected?.title
                                                            || (hasAvatar
                                                                ? `Avatar #${state.agentAvatarId}`
                                                                : 'Chọn avatar')}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                                        {hasAvatar
                                                            ? `PiP · ${anchorLabel}`
                                                            : 'Không dùng · mở drawer để chọn'}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Button>
                                    );
                                })()}
                                <ShortVideoAgentAvatarDrawer
                                    open={state.avatarDrawerOpen}
                                    onClose={() => state.setAvatarDrawerOpen(false)}
                                    avatars={state.verifiedAvatars}
                                    selectedId={state.agentAvatarId}
                                    selectedAnchor={state.agentAvatarAnchor}
                                    saving={state.savingAgentAvatar}
                                    onApply={state.handleAgentAvatarApply}
                                />
                            </Box>
                        </Stack>
                    </WorkflowSection>
                </Stack>
            </Box>

            <Box
                sx={{
                    flexShrink: 0,
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <LoadingButton
                        variant="contained"
                        loading={state.savingSourceContent}
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={!isDirty || state.savingSourceContent}
                    >
                        Lưu
                    </LoadingButton>
                    {isDirty ? (
                        <Typography variant="caption" color="warning.main">
                            Có thay đổi chưa lưu
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Đã lưu
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
