import React from 'react';
import {
    Alert,
    Box,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LoadingButton from 'components/atoms/LoadingButton';
import type { ImportHtmlThumbnailIdea } from './agentVideoApi';
import { WorkflowSection } from './workflowPanelSection';

const VISUAL_STYLE_LABELS: Record<string, string> = {
    cyber_dark: 'Cyber dark',
    clean_tech_editorial: 'Clean tech editorial',
    experiment_lab: 'Experiment lab',
};

type Props = {
    idea: ImportHtmlThumbnailIdea | null | undefined;
    geminiIdeaStatus: string;
    geminiIdeaError: string;
    enqueueing: boolean;
    onRegenerateIdea: () => void | Promise<void>;
};

export default function ShortVideoAgentThumbnailIdeaPanel({
    idea,
    geminiIdeaStatus,
    geminiIdeaError,
    enqueueing,
    onRegenerateIdea,
}: Props) {
    const status = String(geminiIdeaStatus || 'none');
    const ideaBusy = status === 'queued' || status === 'processing';
    const hasIdea = Boolean(String(idea?.headline || '').trim());

    return (
        <WorkflowSection title="Concept & brief">
            <Stack spacing={1.5}>
                {ideaBusy ? (
                    <Chip size="small" color="info" label="Đang sinh idea thumbnail…" />
                ) : null}
                {status === 'failed' ? (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                        {geminiIdeaError || 'Sinh idea thumbnail thất bại'}
                    </Alert>
                ) : null}

                {!hasIdea && !ideaBusy ? (
                    <Typography variant="body2" color="text.secondary">
                        Chưa có idea — pipeline sẽ tự sinh ở bước 13 hoặc bấm Regenerate.
                    </Typography>
                ) : null}

                {hasIdea ? (
                    <Box
                        sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 1.5,
                            bgcolor: 'action.hover',
                        }}
                    >
                        <Stack spacing={1}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {idea?.concept_label || idea?.concept_id ? (
                                    <Chip
                                        size="small"
                                        color="primary"
                                        label={idea?.concept_label || idea?.concept_id}
                                    />
                                ) : null}
                                {idea?.visual_style ? (
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={VISUAL_STYLE_LABELS[idea.visual_style] || idea.visual_style}
                                    />
                                ) : null}
                                {idea?.series_label ? (
                                    <Chip size="small" variant="outlined" label={idea.series_label} />
                                ) : null}
                            </Stack>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                {idea?.headline}
                            </Typography>
                            {idea?.subline ? (
                                <Typography variant="body2" color="text.secondary">
                                    {idea.subline}
                                </Typography>
                            ) : null}
                            {idea?.subject ? (
                                <Typography variant="body2">
                                    <strong>Chủ thể:</strong>
                                    {' '}
                                    {idea.subject}
                                </Typography>
                            ) : null}
                            {idea?.layout ? (
                                <Typography variant="body2">
                                    <strong>Bố cục:</strong>
                                    {' '}
                                    {idea.layout}
                                </Typography>
                            ) : null}
                            {idea?.content_signal ? (
                                <Typography variant="body2">
                                    <strong>Nội dung text truyền tải:</strong>
                                    {' '}
                                    {idea.content_signal}
                                </Typography>
                            ) : null}
                            {idea?.support_visuals_below ? (
                                <Typography variant="body2">
                                    <strong>Visuals dưới chữ:</strong>
                                    {' '}
                                    {idea.support_visuals_below}
                                </Typography>
                            ) : null}
                            {idea?.background_layers ? (
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Nền layered:</strong>
                                    {' '}
                                    {idea.background_layers}
                                </Typography>
                            ) : null}
                            {idea?.curiosity_element ? (
                                <Typography variant="body2">
                                    <strong>Tò mò:</strong>
                                    {' '}
                                    {idea.curiosity_element}
                                </Typography>
                            ) : null}
                            {idea?.visual_description ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {idea.visual_description}
                                </Typography>
                            ) : null}
                            {idea?.rationale ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                    {idea.rationale}
                                </Typography>
                            ) : null}
                        </Stack>
                    </Box>
                ) : null}

                <LoadingButton
                    variant="outlined"
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    loading={enqueueing || ideaBusy}
                    disabled={enqueueing || ideaBusy}
                    onClick={() => { void onRegenerateIdea(); }}
                >
                    Regenerate idea
                </LoadingButton>
            </Stack>
        </WorkflowSection>
    );
}
