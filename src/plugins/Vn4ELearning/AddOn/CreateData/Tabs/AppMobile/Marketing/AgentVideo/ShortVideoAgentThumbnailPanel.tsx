import React from 'react';
import {
    Alert,
    Box,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import LoadingButton from 'components/atoms/LoadingButton';
import type { useAgentVideoContent } from './useAgentVideoContent';
import ShortVideoAgentThumbnailHtmlPreview from './ShortVideoAgentThumbnailHtmlPreview';
import ShortVideoAgentThumbnailImagePreview from './ShortVideoAgentThumbnailImagePreview';
import ShortVideoAgentThumbnailIdeaPanel from './ShortVideoAgentThumbnailIdeaPanel';
import ShortVideoAgentThumbnailQaPanel from './ShortVideoAgentThumbnailQaPanel';
import { WorkflowSection } from './workflowPanelSection';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentThumbnailPanel({ state }: Props) {
    const fillStatus = String(state.geminiThumbnailFillStatus || 'none');
    const hasIdea = Boolean(String(state.thumbnailBlock?.idea?.headline || '').trim());
    const hasHtml = Boolean(String(state.thumbnailHtml || '').trim());
    const fillStatusBusy = fillStatus === 'queued' || fillStatus === 'processing';
    const fillBusy = state.enqueueingThumbnailFill || fillStatusBusy;
    const captureBusy = state.capturingThumbnail;
    const thumbnailBusy = fillBusy || captureBusy;

    return (
        <Box
            sx={{
                height: '100%',
                overflow: 'auto',
                p: 2,
            }}
        >
            <Stack spacing={2}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Thumbnail
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        HTML cover 1080×1920 → chụp ảnh cho short video.
                    </Typography>
                </Box>

                {String(state.thumbnailBlock?.qa_status || '') === 'approved' ? (
                    <Alert severity="success" sx={{ py: 0.5 }}>
                        Thumbnail đã được đánh dấu ổn — pipeline sẽ bỏ qua bước generate ở lần chạy sau.
                    </Alert>
                ) : null}

                <ShortVideoAgentThumbnailIdeaPanel
                    idea={state.thumbnailBlock?.idea}
                    geminiIdeaStatus={state.geminiThumbnailIdeaStatus}
                    geminiIdeaError={state.thumbnailGeminiIdeaError}
                    enqueueing={state.enqueueingThumbnailIdea}
                    onRegenerateIdea={() => state.handleEnqueueThumbnailIdea(true)}
                />

                <WorkflowSection title="Thao tác">
                    <Stack spacing={1}>
                        <LoadingButton
                            variant="contained"
                            size="small"
                            startIcon={<AutoFixHighIcon />}
                            loading={fillBusy}
                            disabled={thumbnailBusy || (!hasIdea && !hasHtml)}
                            onClick={() => { void state.handleEnqueueThumbnailFill(true); }}
                        >
                            Fill AI (Gemini headless)
                        </LoadingButton>
                        {fillStatusBusy ? (
                            <Chip
                                size="small"
                                color="info"
                                label="Đang sinh HTML thumbnail…"
                            />
                        ) : null}
                        {fillStatus === 'failed' ? (
                            <Alert severity="error" sx={{ py: 0.5 }}>
                                {state.thumbnailGeminiFillError || 'Fill thumbnail thất bại'}
                            </Alert>
                        ) : null}
                    </Stack>
                </WorkflowSection>

                <WorkflowSection title="Preview HTML (t = 0)">
                    <ShortVideoAgentThumbnailHtmlPreview
                        html={state.thumbnailHtml}
                        revision={state.thumbnailBlock?.updated_at || ''}
                    />
                </WorkflowSection>

                <Stack spacing={1}>
                    <LoadingButton
                        variant="outlined"
                        size="small"
                        startIcon={<PhotoCameraOutlinedIcon />}
                        loading={captureBusy}
                        disabled={
                            thumbnailBusy
                            || !String(state.thumbnailHtml || '').trim()
                        }
                        onClick={() => { void state.handleCaptureThumbnail(true); }}
                    >
                        Generate image
                    </LoadingButton>
                    {captureBusy ? (
                        <Chip
                            size="small"
                            color="info"
                            label="Đang chụp ảnh thumbnail…"
                        />
                    ) : null}
                </Stack>

                <ShortVideoAgentThumbnailQaPanel
                    thumbnailBlock={state.thumbnailBlock}
                    hasHtml={hasHtml}
                    saving={state.savingThumbnailQa}
                    regenerating={fillBusy}
                    onSaveThumbnailQa={state.handleSaveThumbnailQa}
                    onRegenerateThumbnail={state.handleRegenerateThumbnailFromQa}
                />

                <WorkflowSection title="Ảnh thumbnail">
                    <ShortVideoAgentThumbnailImagePreview
                        imageUrl={state.thumbnailImageUrl}
                        shortVideoId={state.shortVideoId}
                        onDownloadError={(message) => state.showMessage(message, 'error')}
                    />
                </WorkflowSection>
            </Stack>
        </Box>
    );
}
