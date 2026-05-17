import React from 'react';
import {
    Alert,
    Box,
    Button,
    Divider,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import useAjax from 'hook/useApi';
import { getAccessToken } from 'store/user/user.reducers';
import { convertToURL } from 'helpers/url';
import PlatformDistributionPreview from './PlatformDistributionPreview';
import { getCoverFieldsFromPipeline } from './MarketingCoverVisualPanel';
import type { ImagePlacement } from './MarketingImagePlacementsEditor';
import {
    DISTRIBUTION_STAGES,
    DISTRIBUTION_STAGE_LABELS,
    PLATFORM_COPY_LIMITS,
    PLATFORM_LABELS,
    type DistributionStage,
    type PlatformDistributionEntry,
    type PlatformDistributionMap,
} from './platformDistributionConstants';
import MarketingAiLlmButtons, { type MarketingAiLlmSuccessPayload } from './MarketingAiLlmButtons';
import { MarketingCopyPromptButton, MarketingReloadPromptButton } from './MarketingPromptActionButtons';

const GENERATION_STAGES: DistributionStage[] = [
    'plat_strategy',
    'plat_copy',
    'plat_polish',
    'plat_audience',
    'plat_media',
];

const AI_LLM_DISTRIBUTION_STAGES: DistributionStage[] = [
    'plat_strategy',
    'plat_copy',
    'plat_polish',
    'plat_audience',
];

const RESULT_MARKER_HINT = '###RESULT: START### … ###RESULT: END###';

type PipelineSlice = {
    platform_distribution?: PlatformDistributionMap;
    topic?: string;
    drafts?: { editor?: string };
    visual_prompt?: string;
    cover_image_keyword?: string;
    image_placements?: ImagePlacement[];
};

interface Props {
    postId: number;
    platform: string;
    pipeline: PipelineSlice;
    setPipeline: React.Dispatch<React.SetStateAction<PipelineSlice & Record<string, unknown>>>;
    contentType: string;
    post: Record<string, unknown>;
    hasArticleSource: boolean;
    platformDistributionStale?: boolean;
    onPipelineSaved?: (pipeline: PipelineSlice & { platform_distribution_stale?: boolean }) => void;
}

function getEntry(pipeline: PipelineSlice, platform: string): PlatformDistributionEntry {
    const all = pipeline.platform_distribution || {};
    return all[platform] || { completed_stages: [], strategy: {}, copy: {}, media: {}, wizard_step_index: 0 };
}

function isDistStageComplete(entry: PlatformDistributionEntry, stage: DistributionStage): boolean {
    return (entry.completed_stages || []).includes(stage);
}

function computeMaxDistStep(entry: PlatformDistributionEntry): number {
    for (let i = 0; i < GENERATION_STAGES.length; i++) {
        if (!isDistStageComplete(entry, GENERATION_STAGES[i])) {
            return i;
        }
    }
    return DISTRIBUTION_STAGES.indexOf('plat_preview');
}

function canOpenPreview(entry: PlatformDistributionEntry): boolean {
    return GENERATION_STAGES.every((s) => isDistStageComplete(entry, s));
}

function resolveEntryStepIndex(entry: PlatformDistributionEntry): number {
    return Math.min(
        Math.max(0, entry.wizard_step_index ?? 0),
        DISTRIBUTION_STAGES.length - 1,
    );
}

function buildGoogleDistributionUrl(
    postId: number,
    platform: string,
    distributionStage: string,
    contentType: string,
    promptText: string,
): string {
    const accessToken = getAccessToken() ?? '';
    const apiUrl = convertToURL(
        process.env.REACT_APP_HOST_API_KEY || window.location.origin,
        '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
    );
    const url = new URL('https://www.google.com/search');
    url.searchParams.set('udm', '50');
    url.searchParams.set('hl', 'vi');
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_post_id: String(postId),
        marketing_stage: distributionStage,
        access_token: accessToken,
        api_url: apiUrl,
        content_type: contentType,
        marketing_fill_only: '1',
        platform,
        distribution_stage: distributionStage,
    });
    if (promptText.trim()) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptText));
    }
    url.hash = hashParams.toString();
    return url.toString();
}

function renderSavedBlock(data: Record<string, unknown> | undefined, stage: DistributionStage): React.ReactNode {
    if (!data || Object.keys(data).length === 0) return null;

    if (stage === 'plat_copy') {
        const caption = String(data.caption || data.primary_text || '');
        const title = String(data.title || '');
        const desc = String(data.description || '');
        return (
            <Box sx={{ mt: 1 }}>
                {title && <Typography variant="body2" fontWeight={700}>{title}</Typography>}
                {caption && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{caption}</Typography>}
                {desc && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{desc}</Typography>}
                {Array.isArray(data.hashtags) && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {(data.hashtags as string[]).map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')}
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box component="pre" sx={{ fontSize: 11, overflow: 'auto', maxHeight: 240, mt: 1, p: 1, bgcolor: 'grey.50' }}>
            {JSON.stringify(data, null, 2)}
        </Box>
    );
}

function countCopyChars(platform: string, copy: Record<string, unknown> | undefined): number {
    if (!copy) return 0;
    if (platform === 'youtube') {
        return String(copy.description || '').length;
    }
    return String(copy.caption || copy.primary_text || '').length;
}

export default function PlatformDistributionWizard({
    postId,
    platform,
    pipeline,
    setPipeline,
    contentType,
    post,
    hasArticleSource,
    platformDistributionStale,
    onPipelineSaved,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    const promptFetchIdRef = React.useRef(0);

    const entry = getEntry(pipeline, platform);
    const [activeStep, setActiveStep] = React.useState(() => resolveEntryStepIndex(entry));
    const [stagePrompt, setStagePrompt] = React.useState('');
    const [promptLoading, setPromptLoading] = React.useState(false);
    const [overviewPaste, setOverviewPaste] = React.useState('');
    const [navHint, setNavHint] = React.useState('');
    const [previewImageUrl, setPreviewImageUrl] = React.useState('');

    // Mỗi platform có wizard_step_index riêng trong pipeline — reset UI khi đổi tab MXH
    React.useEffect(() => {
        setActiveStep(resolveEntryStepIndex(getEntry(pipeline, platform)));
        setOverviewPaste('');
        setNavHint('');
        setStagePrompt('');
        promptFetchIdRef.current += 1;
    }, [platform]);

    const currentStage = DISTRIBUTION_STAGES[activeStep] || 'plat_strategy';
    const isPreviewStep = currentStage === 'plat_preview';
    const platformLabel = PLATFORM_LABELS[platform] || platform;
    const maxReachable = computeMaxDistStep(entry);
    const currentComplete = isDistStageComplete(entry, currentStage);
    const limits = PLATFORM_COPY_LIMITS[platform];

    React.useEffect(() => {
        const url = String(entry.media?.url || entry.media?.image_url || '').trim();
        setPreviewImageUrl(url);
    }, [entry.media, platform]);

    const fetchStagePrompt = React.useCallback((stage: DistributionStage) => {
        if (!postId || stage === 'plat_preview') return;
        const fetchId = ++promptFetchIdRef.current;
        setPromptLoading(true);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/get-overview-prompt',
            data: {
                post_id: postId,
                platform,
                distribution_stage: stage,
            },
            loading: false,
            success: (res: { prompt?: string }) => {
                if (fetchId !== promptFetchIdRef.current) return;
                if (res?.prompt) setStagePrompt(res.prompt);
            },
            finally: () => {
                if (fetchId === promptFetchIdRef.current) setPromptLoading(false);
            },
        });
    }, [postId, platform]);

    React.useEffect(() => {
        if (!hasArticleSource || isPreviewStep) return;
        fetchStagePrompt(currentStage);
    }, [hasArticleSource, platform, currentStage, isPreviewStep, fetchStagePrompt]);

    const persistStep = React.useCallback((
        stepIndex: number,
        options?: { markComplete?: DistributionStage },
    ) => {
        const safe = Math.max(0, Math.min(stepIndex, DISTRIBUTION_STAGES.length - 1));
        setActiveStep(safe);
        setNavHint('');
        const nextEntry = { ...getEntry(pipeline, platform), wizard_step_index: safe };
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                distribution_platform: platform,
                distribution_step_index: safe,
                distribution_stage: DISTRIBUTION_STAGES[safe],
                mark_distribution_stage_complete: options?.markComplete || '',
                pipeline_patch: {
                    platform_distribution: {
                        [platform]: nextEntry,
                    },
                    active_distribution_tab: platform,
                    distribution_platform: platform,
                },
            },
            success: (res: { pipeline?: PipelineSlice }) => {
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                }
            },
        });
    }, [postId, platform, pipeline, setPipeline]);

    const submitPaste = () => {
        if (!overviewPaste.trim()) return;
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                platform,
                distribution_stage: currentStage,
                stage: currentStage,
                overview_text: overviewPaste,
                access_token: getAccessToken() || '',
            },
            success: (res: {
                pipeline?: PipelineSlice & { platform_distribution_stale?: boolean };
                warnings?: string[];
            }) => {
                setOverviewPaste('');
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                    onPipelineSaved?.(res.pipeline);
                }
            },
        });
    };

    const savePreviewImageUrl = () => {
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                distribution_platform: platform,
                distribution_media_url: previewImageUrl.trim(),
            },
            success: (res: { pipeline?: PipelineSlice & { platform_distribution_stale?: boolean } }) => {
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                    onPipelineSaved?.(res.pipeline);
                }
            },
        });
    };

    const completePlatform = () => {
        if (!canOpenPreview(entry)) {
            setNavHint('Hoàn thành Chiến lược, Copy và Media trước.');
            return;
        }
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            data: {
                post_id: postId,
                distribution_platform: platform,
                distribution_step_index: DISTRIBUTION_STAGES.indexOf('plat_preview'),
                distribution_stage: 'plat_preview',
                mark_distribution_stage_complete: 'plat_preview',
                distribution_media_url: previewImageUrl.trim(),
            },
            success: (res: { pipeline?: PipelineSlice & { platform_distribution_stale?: boolean } }) => {
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                    onPipelineSaved?.(res.pipeline);
                }
                setNavHint('');
            },
        });
    };

    if (!hasArticleSource) {
        return (
            <Alert severity="warning">
                Hoàn thành tab <strong>Bài viết</strong> trước (cần có nội dung sau bước Biên tập hoặc Lưu CMS) để sinh nội dung cho {platformLabel}.
            </Alert>
        );
    }

  return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {platformDistributionStale && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Bài viết gốc đã thay đổi — nên chạy lại các bước trên {platformLabel} để đồng bộ nội dung đăng MXH.
                </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <Box sx={{ width: 200, flexShrink: 0, overflowY: 'auto', pr: 1, borderRight: 1, borderColor: 'divider' }}>
                    <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
                        {DISTRIBUTION_STAGES.map((s, index) => {
                            const done = isDistStageComplete(entry, s);
                            const locked = index > maxReachable;
                            return (
                                <Step key={s} completed={done && index !== activeStep}>
                                    <StepLabel
                                        onClick={locked ? undefined : () => persistStep(index)}
                                        sx={{ cursor: locked ? 'default' : 'pointer', '& .MuiStepLabel-label': { fontSize: 12 } }}
                                    >
                                        {DISTRIBUTION_STAGE_LABELS[s]}
                                    </StepLabel>
                                </Step>
                            );
                        })}
                    </Stepper>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Box className="custom_scroll" sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                        {isPreviewStep ? (
                            <>
                                {isDistStageComplete(entry, 'plat_preview') && (
                                    <Alert severity="success" sx={{ mb: 2 }}>
                                        Đã hoàn tất nội dung cho {platformLabel}. Chuyển sang tab nền tảng khác hoặc đóng wizard.
                                    </Alert>
                                )}
                                <PlatformDistributionPreview
                                    platform={platform}
                                    entry={entry}
                                    post={post}
                                    articleCoverUrl={getCoverFieldsFromPipeline(pipeline).url}
                                    imageUrl={previewImageUrl}
                                    onImageUrlChange={setPreviewImageUrl}
                                    onSaveImageUrl={savePreviewImageUrl}
                                    savingImage={api.open}
                                />
                            </>
                        ) : (
                            <>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">{platformLabel} — {DISTRIBUTION_STAGE_LABELS[currentStage]}</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {currentStage === 'plat_strategy' && 'Chọn format & hook phù hợp nền tảng, bám bài viết gốc.'}
                                {currentStage === 'plat_copy' && limits && `Copy khuyến nghị ≤${limits.recommended || limits.limit} ký tự (tối đa ${limits.limit}).`}
                                {currentStage === 'plat_polish' && 'Chỉnh sửa copy: ngữ pháp, tinh gọn, không đổi sự thật.'}
                                {currentStage === 'plat_audience' && 'Mô phỏng phản hồi độc giả — dùng gợi ý để chỉnh lại copy nếu cần.'}
                                {currentStage === 'plat_media' && 'Kích thước ảnh/video và prompt sinh visual. Sau khi lưu, bấm Tiếp theo để xem trước toàn bộ.'}
                                {AI_LLM_DISTRIBUTION_STAGES.includes(currentStage) && (
                                    <> Hoặc bấm <strong>Dùng Gemini</strong> / <strong>Dùng DeepSeek</strong> để tự động tạo và lưu.</>
                                )}
                            </Typography>
                        </Alert>

                        {currentStage === 'plat_copy' && entry.copy && limits && (
                            <Alert
                                severity={countCopyChars(platform, entry.copy) > limits.limit ? 'warning' : 'success'}
                                sx={{ mb: 2 }}
                            >
                                Độ dài copy đã lưu: {countCopyChars(platform, entry.copy).toLocaleString('vi-VN')} / {limits.limit} ký tự
                            </Alert>
                        )}

                        {(entry.strategy && currentStage !== 'plat_strategy') && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                <Typography variant="caption" fontWeight={600}>Chiến lược đã lưu</Typography>
                                {renderSavedBlock(entry.strategy, 'plat_strategy')}
                            </Alert>
                        )}

                        {entry.copy && currentStage === 'plat_media' && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                <Typography variant="caption" fontWeight={600}>Copy đã lưu</Typography>
                                {renderSavedBlock(entry.copy, 'plat_copy')}
                            </Alert>
                        )}

                        <Box sx={{ mb: 2 }}>
                            {AI_LLM_DISTRIBUTION_STAGES.includes(currentStage) ? (
                                <MarketingAiLlmButtons
                                    postId={postId}
                                    stage={currentStage}
                                    stageLabel={`${platformLabel} — ${DISTRIBUTION_STAGE_LABELS[currentStage]}`}
                                    contentType={contentType}
                                    platform={platform}
                                    distributionStage={currentStage}
                                    promptReady={Boolean(stagePrompt.trim()) && !promptLoading}
                                    onSuccess={(res: MarketingAiLlmSuccessPayload) => {
                                        setOverviewPaste('');
                                        if (res?.pipeline) {
                                            setPipeline((p) => ({ ...p, ...res.pipeline }));
                                            onPipelineSaved?.(res.pipeline as PipelineSlice);
                                        }
                                    }}
                                >
                                    <LoadingButton
                                        variant="contained"
                                        loading={promptLoading}
                                        onClick={() => window.open(
                                            buildGoogleDistributionUrl(postId, platform, currentStage, contentType, stagePrompt),
                                            '_blank',
                                            'noopener,noreferrer',
                                        )}
                                    >
                                        Mở Google AI mode
                                    </LoadingButton>
                                    <MarketingCopyPromptButton
                                        promptText={stagePrompt}
                                        disabled={!stagePrompt.trim()}
                                    />
                                    <MarketingReloadPromptButton
                                        variant="text"
                                        size="small"
                                        loading={promptLoading}
                                        onReload={() => fetchStagePrompt(currentStage)}
                                    />
                                </MarketingAiLlmButtons>
                            ) : (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <LoadingButton
                                        variant="contained"
                                        loading={promptLoading}
                                        onClick={() => window.open(
                                            buildGoogleDistributionUrl(postId, platform, currentStage, contentType, stagePrompt),
                                            '_blank',
                                            'noopener,noreferrer',
                                        )}
                                    >
                                        Mở Google AI mode
                                    </LoadingButton>
                                    <MarketingCopyPromptButton
                                        promptText={stagePrompt}
                                        disabled={!stagePrompt.trim()}
                                    />
                                    <MarketingReloadPromptButton
                                        variant="text"
                                        size="small"
                                        loading={promptLoading}
                                        onReload={() => fetchStagePrompt(currentStage)}
                                    />
                                </Box>
                            )}
                        </Box>

                        {stagePrompt && (
                            <TextField
                                label="Prompt (tham khảo)"
                                multiline
                                minRows={4}
                                fullWidth
                                value={stagePrompt}
                                InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 11 } }}
                                sx={{ mb: 2 }}
                            />
                        )}

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2">Dán kết quả Google Overview</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            JSON giữa {RESULT_MARKER_HINT}
                        </Typography>
                        <TextField
                            multiline
                            minRows={6}
                            fullWidth
                            value={overviewPaste}
                            onChange={(e) => setOverviewPaste(e.target.value)}
                            sx={{ mb: 1 }}
                        />
                        <LoadingButton
                            variant="contained"
                            color="primary"
                            loading={api.open}
                            disabled={!overviewPaste.trim()}
                            onClick={submitPaste}
                        >
                            Lưu — {DISTRIBUTION_STAGE_LABELS[currentStage]}
                        </LoadingButton>

                        {isDistStageComplete(entry, currentStage) && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                <Typography variant="caption" fontWeight={600}>Đã lưu bước này</Typography>
                                {renderSavedBlock(
                                    currentStage === 'plat_strategy' ? entry.strategy
                                        : currentStage === 'plat_copy' ? entry.copy
                                            : entry.media,
                                    currentStage,
                                )}
                                {currentStage === 'plat_media' && canOpenPreview(entry) && (
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Bấm <strong>Xem trước</strong> để kiểm tra toàn bộ nội dung trước khi hoàn tất.
                                    </Typography>
                                )}
                            </Alert>
                        )}
                            </>
                        )}
                    </Box>

                    {navHint && <Alert severity="warning" sx={{ mt: 1 }}>{navHint}</Alert>}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
                        <Button
                            disabled={activeStep <= 0}
                            onClick={() => persistStep(activeStep - 1)}
                        >
                            Quay lại
                        </Button>
                        {isPreviewStep ? (
                            <LoadingButton
                                variant="contained"
                                color="success"
                                loading={api.open}
                                disabled={!canOpenPreview(entry) || isDistStageComplete(entry, 'plat_preview')}
                                onClick={completePlatform}
                            >
                                {isDistStageComplete(entry, 'plat_preview')
                                    ? `Đã hoàn tất ${platformLabel}`
                                    : `Hoàn tất ${platformLabel}`}
                            </LoadingButton>
                        ) : (
                            <Button
                                variant="contained"
                                disabled={!currentComplete || activeStep >= DISTRIBUTION_STAGES.length - 1}
                                onClick={() => {
                                    if (!currentComplete) {
                                        setNavHint('Lưu kết quả bước hiện tại trước khi tiếp tục.');
                                        return;
                                    }
                                    persistStep(activeStep + 1, { markComplete: currentStage });
                                }}
                            >
                                {currentStage === 'plat_media' ? 'Xem trước' : 'Tiếp theo'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
