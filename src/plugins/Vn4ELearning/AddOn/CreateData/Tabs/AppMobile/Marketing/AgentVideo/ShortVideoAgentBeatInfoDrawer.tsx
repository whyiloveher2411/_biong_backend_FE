import React from 'react';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { formatDurationSec } from './agentVideoHfPromptDuration';
import {
    validateBeatVisualDescription,
    type BeatHtmlEntry,
    type BeatMap,
    type BeatMapSection,
} from './agentVideoBeatMap';
import ShortVideoAgentBeatVisualPreview from './ShortVideoAgentBeatVisualPreview';

type Props = {
    open: boolean;
    onClose: () => void;
    beatMap: BeatMap | null;
    beat: BeatMapSection | null;
    beatHtml?: BeatHtmlEntry | null;
    audioUrl?: string;
    beatIndex?: number | null;
    saving?: boolean;
    onSaveVisualDescription: (visualDescription: string) => Promise<boolean>;
};

function DetailSection({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Box
            component="section"
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ px: 2, pt: 1.75, pb: 1.25 }}>
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: 'block', fontSize: 10, lineHeight: 1.4, letterSpacing: '0.08em' }}
                >
                    {eyebrow}
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.25, fontWeight: 700 }}>
                    {title}
                </Typography>
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>
                {children}
            </Box>
        </Box>
    );
}

function MetadataItem({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    mt: 0.25,
                    fontWeight: 600,
                    overflowWrap: 'anywhere',
                    fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value || '—'}
            </Typography>
        </Box>
    );
}

export default function ShortVideoAgentBeatInfoDrawer({
    open,
    onClose,
    beatMap,
    beat,
    beatHtml = null,
    audioUrl = '',
    beatIndex = null,
    saving = false,
    onSaveVisualDescription,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [visualDescription, setVisualDescription] = React.useState('');
    const syncedOpenBeatRef = React.useRef('');

    React.useEffect(() => {
        if (!open) {
            syncedOpenBeatRef.current = '';
            return;
        }
        const beatId = String(beat?.id || '');
        if (!beatId || syncedOpenBeatRef.current === beatId) {
            return;
        }
        syncedOpenBeatRef.current = beatId;
        setVisualDescription(String(beat?.visual_description || ''));
    }, [beat?.id, beat?.visual_description, open]);

    const initialVisualDescription = String(beat?.visual_description || '');
    const normalizedVisualDescription = visualDescription.trim();
    const wordCount = normalizedVisualDescription
        ? normalizedVisualDescription.split(/\s+/).filter(Boolean).length
        : 0;
    const visualDescriptionValid = Boolean(
        validateBeatVisualDescription(normalizedVisualDescription),
    );
    const dirty = visualDescription !== initialVisualDescription;
    const canSave = Boolean(beat) && dirty && visualDescriptionValid && !saving;

    const rawJson = React.useMemo(() => JSON.stringify({
        beat_map: beatMap ? {
            schema_version: beatMap.schema_version,
            totalVideoSec: beatMap.totalVideoSec,
            source: beatMap.source ?? null,
            updated_at: beatMap.updated_at ?? null,
        } : null,
        beat,
    }, null, 2), [beat, beatMap]);

    const handleCopyJson = async () => {
        try {
            await navigator.clipboard.writeText(rawJson);
            showMessage('Đã copy JSON beat', 'success');
        } catch {
            showMessage('Không thể copy JSON vào clipboard', 'error');
        }
    };

    const handleSave = async () => {
        if (!canSave) {
            return;
        }
        const saved = await onSaveVisualDescription(normalizedVisualDescription);
        if (saved) {
            onClose();
        }
    };

    const title = beatIndex != null && beatIndex > 0
        ? `Thông tin beat ${beatIndex}`
        : 'Thông tin beat';
    const timeRange = beat
        ? `${formatDurationSec(beat.startSec)}s – ${formatDurationSec(beat.endSec)}s`
        : '—';

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={(
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <InfoOutlinedIcon fontSize="small" />
                    <span>{title}</span>
                </Box>
            )}
            width={600}
            sx={{ zIndex: 1600 }}
            ModalProps={{
                sx: { zIndex: 1600 },
                style: { zIndex: 1600 },
            }}
            restDialogContent={{
                sx: {
                    bgcolor: '#e9edf2',
                    overflowY: 'auto',
                    pb: 2,
                },
            }}
            action={(
                <LoadingButton
                    variant="contained"
                    color="primary"
                    loading={saving}
                    disabled={!canSave}
                    startIcon={<SaveOutlinedIcon />}
                    onClick={() => { void handleSave(); }}
                >
                    Lưu thay đổi
                </LoadingButton>
            )}
        >
            {beat && beatMap ? (
                <Stack spacing={2} sx={{ pt: 2.5 }}>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2.5,
                            color: 'common.white',
                            background: 'linear-gradient(135deg, #111827 0%, #334155 100%)',
                            boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                        }}
                    >
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: 'common.white',
                                        fontWeight: 750,
                                        lineHeight: 1.25,
                                    }}
                                >
                                    {beatIndex != null ? `Beat ${beatIndex}` : beat.id}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 0.5,
                                        color: 'rgba(255,255,255,0.82)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {timeRange}
                                </Typography>
                            </Box>
                            <Chip
                                label={beat.id}
                                size="small"
                                sx={{
                                    color: 'common.white',
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                }}
                            />
                        </Stack>
                    </Box>

                    <DetailSection eyebrow="Timing" title="Thời gian">
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                gap: 2,
                            }}
                        >
                            <MetadataItem label="Bắt đầu" value={`${formatDurationSec(beat.startSec)}s`} />
                            <MetadataItem label="Kết thúc" value={`${formatDurationSec(beat.endSec)}s`} />
                            <MetadataItem label="Thời lượng" value={`${formatDurationSec(beat.durationSec)}s`} />
                        </Box>
                    </DetailSection>

                    <DetailSection eyebrow="Narrative" title="Nội dung lời thoại">
                        <Typography
                            variant="body2"
                            sx={{
                                lineHeight: 1.75,
                                whiteSpace: 'pre-wrap',
                                color: 'text.primary',
                            }}
                        >
                            {beat.phrase_anchor || 'Chưa có nội dung lời thoại'}
                        </Typography>
                    </DetailSection>

                    <DetailSection eyebrow="Visual direction" title="Định hướng hình ảnh">
                        <TextField
                            label="Visual description"
                            value={visualDescription}
                            onChange={(event) => setVisualDescription(event.target.value)}
                            fullWidth
                            multiline
                            minRows={5}
                            maxRows={10}
                            disabled={saving}
                            error={dirty && !visualDescriptionValid}
                            helperText={(
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                    }}
                                >
                                    <span>
                                        {dirty && !visualDescriptionValid
                                            ? 'Cần viết tiếng Anh, dài 8–80 từ'
                                            : 'Mô tả nội dung, bố cục, phân cấp và chuyển động bằng tiếng Anh'}
                                    </span>
                                    <span>{wordCount}/80 từ</span>
                                </Box>
                            )}
                            inputProps={{ maxLength: 600 }}
                        />
                    </DetailSection>

                    <DetailSection eyebrow="Live HTML" title="Preview visual">
                        <ShortVideoAgentBeatVisualPreview
                            beatId={beat.id}
                            html={String(beatHtml?.html || '')}
                            revision={String(beatHtml?.updated_at || '')}
                            audioUrl={audioUrl}
                            startSec={beat.startSec}
                            durationSec={beat.durationSec}
                        />
                    </DetailSection>

                    <DetailSection eyebrow="Beat map" title="Thông tin toàn video">
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                gap: 2,
                            }}
                        >
                            <MetadataItem label="Schema version" value={beatMap.schema_version} mono />
                            <MetadataItem
                                label="Tổng thời lượng"
                                value={`${formatDurationSec(beatMap.totalVideoSec)}s`}
                            />
                            <MetadataItem label="Nguồn dữ liệu" value={beatMap.source || '—'} mono />
                            <MetadataItem label="Cập nhật lúc" value={beatMap.updated_at || '—'} />
                        </Box>
                    </DetailSection>

                    <Accordion
                        disableGutters
                        elevation={0}
                        sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: '12px !important',
                            overflow: 'hidden',
                            '&:before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    JSON nguyên bản
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Metadata beat-map và object của beat đang chọn
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Stack spacing={1}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
                                        onClick={() => { void handleCopyJson(); }}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Copy JSON
                                    </Button>
                                </Box>
                                <Box
                                    component="pre"
                                    sx={{
                                        m: 0,
                                        p: 1.5,
                                        maxHeight: 360,
                                        overflow: 'auto',
                                        borderRadius: 1.5,
                                        bgcolor: '#111827',
                                        color: '#e5e7eb',
                                        fontSize: 12,
                                        lineHeight: 1.65,
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                        whiteSpace: 'pre-wrap',
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {rawJson}
                                </Box>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

                    {dirty ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <AccessTimeOutlinedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600 }}>
                                Visual description có thay đổi chưa lưu
                            </Typography>
                        </Stack>
                    ) : null}
                </Stack>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    Không tìm thấy dữ liệu beat
                </Typography>
            )}
        </DrawerCustom>
    );
}
