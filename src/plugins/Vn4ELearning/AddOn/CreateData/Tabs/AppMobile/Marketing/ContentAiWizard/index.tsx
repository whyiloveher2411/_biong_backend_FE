import React from 'react';
import {
    Box,
    Button,
    Stepper,
    Step,
    StepLabel,
    TextField,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Radio,
    RadioGroup,
    FormControlLabel,
    Alert,
    Divider,
    Tab,
    Tabs,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import StageSavedSummary from '../StageSavedSummary';
import StagePurposeBanner from '../StagePurposeBanner';
import MarketingImagePlacementsEditor from '../MarketingImagePlacementsEditor';
import MarketingCoverVisualPanel, { getCoverFieldsFromPipeline } from '../MarketingCoverVisualPanel';
import PlatformDistributionWizard from '../PlatformDistributionWizard';
import EditorialSubWizard from '../EditorialSubWizard';
import MarketingAiLlmButtons, { type MarketingAiLlmSuccessPayload } from '../MarketingAiLlmButtons';
import { MarketingCopyPromptButton, MarketingReloadPromptButton } from '../MarketingPromptActionButtons';
import { editorialSubstepsForContentType } from '../editorialConstants';
import { PLATFORM_LABELS } from '../platformDistributionConstants';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Markdown from 'components/atoms/Markdown';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { getAccessToken } from 'store/user/user.reducers';
import { convertToURL } from 'helpers/url';
import { marketingPipelinePreviewMarkdown } from '../marketingPipelinePreview';

const RESULT_MARKER_HINT = '###RESULT: START### … ###RESULT: END###';

type SerpOrganicItem = {
    title?: string;
    link?: string;
    snippet?: string;
    position?: number;
};

type SerpRelatedItem = {
    query?: string;
};

type SerpData = {
    organic?: SerpOrganicItem[];
    relatedSearches?: SerpRelatedItem[];
};

type ImagePlacement = {
    id: string;
    role?: string;
    after_heading?: string;
    alt_text?: string;
    visual_prompt?: string;
    image_keyword?: string;
    placement_hint?: string;
    url?: string;
};

type Pipeline = {
    topic?: string;
    reader_persona?: string;
    emotional_angle?: string;
    writing_framework?: string;
    serp_data?: SerpData;
    serp_sources?: Array<{ title?: string; url?: string; snippet?: string }>;
    angles?: Array<{ id: string; title: string; summary?: string; why_unique?: string }>;
    selected_angle_id?: string;
    selected_angle?: { id: string; title: string; summary?: string } | null;
    outline?: { sections?: Array<{ heading: string; key_points?: string[] }> };
    outline_feedback?: string;
    overview_text_fallback?: string;
    drafts?: { writer?: string; editor?: string; editor_with_slots?: string; reviewer_issues?: unknown[] };
    completed_stages?: string[];
    wizard_step_index?: number;
    research_sources?: Array<{ title?: string; url?: string; snippet?: string }>;
    image_placements?: ImagePlacement[];
    visual_prompt?: string;
    cover_image_keyword?: string;
    meta_description?: string;
    draft_title?: string;
    platform_distribution?: Record<string, {
        completed_stages?: string[];
        strategy?: Record<string, unknown>;
        copy?: Record<string, unknown>;
        media?: Record<string, unknown>;
        wizard_step_index?: number;
    }>;
    platform_distribution_stale?: boolean;
    active_distribution_tab?: string;
    publish_place?: string;
    mandatory_terms?: string;
    immutable_facts?: string;
    editorial_passes?: Record<string, Record<string, unknown>>;
    editorial_completed_substeps?: string[];
    editorial_working_content?: string;
    editorial_substep_index?: number;
    editorial_active_version?: string;
};

const STAGE_LABELS: Record<string, string> = {
    setup: 'Thiết lập & SERP',
    angles: 'Góc nhìn (3 angles)',
    research: 'Nghiên cứu chuyên sâu',
    outline: 'Dàn ý chiến lược',
    writer: 'Bản thảo (Writer)',
    editorial: 'Biên tập nâng cao',
    illustrations: 'Minh họa (Illustrations)',
    image_urls: 'Cập nhật URL ảnh',
    final: 'Lưu CMS',
};

function truncate(str: string, max: number): string {
    const s = String(str || '').trim();
    if (s.length <= max) return s;
    return s.slice(0, max) + '…';
}

function buildPromptContext(pipeline: Pipeline, post: Record<string, unknown>): Record<string, unknown> {
    const selected = pipeline.selected_angle
        || (pipeline.angles || []).find((a) => a.id === pipeline.selected_angle_id);
    return {
        topic: pipeline.topic || post.title,
        toneOfVoice: post.tone_of_voice || '',
        lengthConstraint: post.length_constraint || '',
        writingFramework: pipeline.writing_framework || 'pas',
        knowledgeBase: truncate(String(post.knowledge_base || ''), 8000),
        serpData: pipeline.serp_data || null,
        serpSources: (pipeline.serp_sources || []).slice(0, 12),
        selectedAngle: selected || null,
        angleTitle: selected?.title || '',
        outline: pipeline.outline || null,
        outlineFeedback: pipeline.outline_feedback || '',
        writerDraft: pipeline.drafts?.editor || pipeline.drafts?.writer || '',
        reviewerIssues: pipeline.drafts?.reviewer_issues || [],
        readerPersona: pipeline.reader_persona || '',
        emotionalAngle: pipeline.emotional_angle || '',
        visualPrompt: pipeline.visual_prompt || '',
        coverImageKeyword: pipeline.cover_image_keyword || getCoverFieldsFromPipeline(pipeline).imageKeyword,
        editorDraft: pipeline.drafts?.editor || '',
    };
}

/** URL Google AI mode + hash để extension Chrome tự điền prompt vào ô input */
function buildGoogleMarketingUrl(
    postId: number,
    stage: string,
    contentType: string,
    pipeline: Pipeline,
    post: Record<string, unknown>,
    promptText?: string,
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
        marketing_stage: stage,
        access_token: accessToken,
        api_url: apiUrl,
        content_type: contentType,
        marketing_fill_only: '1',
        topic: String(pipeline.topic || post.title || ''),
    });
    const promptContext = buildPromptContext(pipeline, post);
    hashParams.set('prompt_context', encodeURIComponent(JSON.stringify(promptContext)));
    const prompt = String(promptText || '').trim();
    if (prompt) {
        hashParams.set('marketing_prompt', encodeURIComponent(prompt));
    }
    url.hash = hashParams.toString();
    return url.toString();
}

function buildGoogleSerpUrl(topic: string): string {
    const url = new URL('https://www.google.com/search');
    url.searchParams.set('q', topic);
    url.searchParams.set('hl', 'vi');
    return url.toString();
}

const DEFAULT_WIZARD_STAGES = [
    'setup', 'angles', 'research', 'outline', 'writer', 'editorial', 'illustrations', 'image_urls', 'final',
];

function isStageComplete(
    stage: string,
    pipeline: Pipeline,
    displayStages: string[],
    contentType = 'long_form',
): boolean {
    if (stage === 'setup') {
        return Boolean(String(pipeline.topic || '').trim());
    }
    if (stage === 'final') {
        return displayStages
            .filter((s) => s !== 'final' && s !== 'setup')
            .every((s) => isStageComplete(s, pipeline, displayStages, contentType));
    }
    if (stage === 'angles') {
        const hasAngles = (pipeline.angles || []).length > 0;
        const saved = (pipeline.completed_stages || []).includes('angles');
        const picked = Boolean(String(pipeline.selected_angle_id || '').trim());
        return hasAngles && saved && picked;
    }
    if (stage === 'editorial') {
        const subs = editorialSubstepsForContentType(contentType);
        const done = pipeline.editorial_completed_substeps || [];
        return subs.length > 0 && subs.every((s) => done.includes(s));
    }
    if (stage === 'illustrations') {
        return (pipeline.image_placements || []).length > 0
            && (pipeline.completed_stages || []).includes('illustrations');
    }
    if (stage === 'image_urls') {
        const placements = pipeline.image_placements || [];
        if (placements.length === 0) return false;
        return placements.every((p) => String(p.url || '').trim() !== '');
    }
    if (!(pipeline.completed_stages || []).includes(stage)) {
        return false;
    }
    return true;
}


function computeMaxReachableStep(
    displayStages: string[],
    pipeline: Pipeline,
    contentType = 'long_form',
): number {
    for (let i = 0; i < displayStages.length; i++) {
        if (!isStageComplete(displayStages[i], pipeline, displayStages, contentType)) {
            return i;
        }
    }
    return displayStages.length - 1;
}

function stageIncompleteHint(stage: string, contentType = 'long_form'): string {
    const hints: Record<string, string> = {
        setup: 'Nhập chủ đề rộng trước khi sang bước tiếp theo.',
        angles: 'Lưu kết quả Google Overview và chọn một góc nhìn.',
        research: 'Lưu kết quả nghiên cứu từ Google Overview.',
        outline: 'Lưu dàn ý từ Google Overview.',
        writer:
            contentType === 'long_form'
                ? 'Lưu bản thảo markdown (giữa marker, không JSON, không title).'
                : 'Lưu bản thảo Writer từ Google Overview.',
        editorial: 'Hoàn thành tất cả bước biên tập nâng cao.',
        illustrations: 'Lưu danh sách ảnh + prompt từ Google Overview.',
        image_urls: 'Dán URL cho tất cả ảnh trong bảng (mỗi dòng một link https://...).',
        final: 'Hoàn thành các bước trước đó.',
    };
    return hints[stage] || 'Hoàn thành bước hiện tại trước khi tiếp tục.';
}

interface Props {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
    onRefreshPost?: () => void;
}

export default function ContentAiWizard({ open, onClose, data, onRefreshPost }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const post = data.post || {};
    const postRef = React.useRef(post);
    postRef.current = post;
    const postId = Number(post.id);

    /** Hủy response prompt cũ khi đổi bước nhanh (không cache — mỗi lần vào bước đều gọi API). */
    const promptFetchIdRef = React.useRef(0);

    const [stages, setStages] = React.useState<string[]>(DEFAULT_WIZARD_STAGES);
    const [activeStep, setActiveStep] = React.useState(0);
    const [navHint, setNavHint] = React.useState('');
    const [pipeline, setPipeline] = React.useState<Pipeline>({});
    const [contentType, setContentType] = React.useState('long_form');
    const [serpHtml, setSerpHtml] = React.useState('');
    const [overviewPaste, setOverviewPaste] = React.useState('');
    const [stagePrompt, setStagePrompt] = React.useState('');
    const [promptLoading, setPromptLoading] = React.useState(false);
    const [finalTitle, setFinalTitle] = React.useState('');
    const [finalDescription, setFinalDescription] = React.useState('');
    const [finalContent, setFinalContent] = React.useState('');
    const [wizardPost, setWizardPost] = React.useState<Record<string, unknown>>({});
    const [topTab, setTopTab] = React.useState<string>('article');
    const [distributionPlatforms, setDistributionPlatforms] = React.useState<string[]>([]);
    const [hasArticleSource, setHasArticleSource] = React.useState(false);
    const [platformDistributionStale, setPlatformDistributionStale] = React.useState(false);
    const [editorialSubsteps, setEditorialSubsteps] = React.useState<string[]>(
        () => editorialSubstepsForContentType('long_form'),
    );

    const displayPost = React.useMemo(
        () => ({ ...(post as Record<string, unknown>), ...wizardPost }),
        [post, wizardPost],
    );

    const loadPrepare = React.useCallback((options?: { preserveNavigation?: boolean }) => {
        if (!postId) return;
        const preserveNavigation = Boolean(options?.preserveNavigation);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/prepare',
            data: { post_id: postId },
            success: (res: {
                success?: boolean;
                pipeline?: Pipeline;
                stages?: string[];
                wizard_stages?: string[];
                wizard_step_index?: number;
                content_type?: string;
                distribution_platforms?: string[];
                has_article_source?: boolean;
                platform_distribution_stale?: boolean;
                editorial_substeps?: string[];
                editorial_substep_index?: number;
                post?: Record<string, unknown>;
            }) => {
                const pl = res?.pipeline || {};
                if (res?.pipeline) setPipeline(pl);
                if (res?.wizard_stages?.length) {
                    setStages(res.wizard_stages);
                } else if (res?.stages?.length) {
                    setStages(['setup', ...res.stages.filter((s) => s !== 'setup' && s !== 'final'), 'final']);
                }
                const wizardStages = res?.wizard_stages?.length
                    ? res.wizard_stages
                    : (res?.stages?.length
                        ? ['setup', ...res.stages.filter((s) => s !== 'setup' && s !== 'final'), 'final']
                        : DEFAULT_WIZARD_STAGES);
                if (!preserveNavigation) {
                    const stepIdx = typeof res?.wizard_step_index === 'number'
                        ? res.wizard_step_index
                        : computeMaxReachableStep(wizardStages, pl, res?.content_type || contentType);
                    setActiveStep(Math.max(0, Math.min(stepIdx, wizardStages.length - 1)));
                }
                if (res?.content_type) {
                    setContentType(res.content_type);
                    setEditorialSubsteps(
                        res.editorial_substeps?.length
                            ? res.editorial_substeps
                            : editorialSubstepsForContentType(res.content_type),
                    );
                } else if (res?.editorial_substeps?.length) {
                    setEditorialSubsteps(res.editorial_substeps);
                }
                const p = res?.post || postRef.current;
                if (res?.post) setWizardPost(res.post);
                setFinalTitle(String(p.title || ''));
                setFinalDescription(String(p.description || ''));
                setFinalContent(marketingPipelinePreviewMarkdown(pl, p as Record<string, unknown>));
                if (Array.isArray(res.distribution_platforms)) {
                    setDistributionPlatforms(res.distribution_platforms);
                }
                if (typeof res.has_article_source === 'boolean') {
                    setHasArticleSource(res.has_article_source);
                }
                if (typeof res.platform_distribution_stale === 'boolean') {
                    setPlatformDistributionStale(res.platform_distribution_stale);
                }
                if (!preserveNavigation) {
                    const activeDist = String(pl?.active_distribution_tab || '').trim();
                    if (activeDist === 'article' || activeDist === '') {
                        setTopTab('article');
                    } else {
                        setTopTab(activeDist);
                    }
                }
            },
        });
    }, [postId, contentType]);

    React.useEffect(() => {
        if (open && postId) {
            promptFetchIdRef.current += 1;
            setWizardPost((postRef.current as Record<string, unknown>) || {});
            loadPrepare();
            setSerpHtml('');
            setOverviewPaste('');
            setStagePrompt('');
        }
    }, [open, postId, loadPrepare]);

    const fetchStagePrompt = React.useCallback((stage: string) => {
        if (!postId || stage === 'setup' || stage === 'final' || stage === 'image_urls') {
            return;
        }

        const fetchId = ++promptFetchIdRef.current;
        setPromptLoading(true);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/get-overview-prompt',
            data: { post_id: postId, stage },
            loading: false,
            success: (res: { prompt?: string }) => {
                if (fetchId !== promptFetchIdRef.current) {
                    return;
                }
                if (res?.prompt) {
                    setStagePrompt(res.prompt);
                }
            },
            finally: () => {
                if (fetchId === promptFetchIdRef.current) {
                    setPromptLoading(false);
                }
            },
        });
    }, [postId]);

    const displayStages = stages.length ? stages : DEFAULT_WIZARD_STAGES;

    const maxReachableStep = React.useMemo(
        () => computeMaxReachableStep(displayStages, pipeline, contentType),
        [displayStages, pipeline, contentType],
    );

    const persistWizardStep = React.useCallback((
        stepIndex: number,
        options?: {
            pipelinePatch?: Partial<Pipeline>;
            invalidateAfterStage?: string;
            invalidateDownstreamOnly?: boolean;
            markSetupComplete?: boolean;
            markStageComplete?: string;
        },
    ) => {
        const safeIndex = Math.max(0, Math.min(stepIndex, displayStages.length - 1));
        const stageId = displayStages[safeIndex] || 'setup';
        const patch = options?.pipelinePatch || {};
        const next: Pipeline = {
            ...pipeline,
            ...patch,
            wizard_step_index: safeIndex,
        };

        if (options?.invalidateAfterStage) {
            const invIdx = displayStages.indexOf(options.invalidateAfterStage);
            if (invIdx >= 0) {
                const keepBefore = options.invalidateDownstreamOnly ? invIdx + 1 : invIdx;
                const keepCompleted = (next.completed_stages || []).filter((s) => {
                    const sIdx = displayStages.indexOf(s);
                    return sIdx >= 0 && sIdx < keepBefore;
                });
                next.completed_stages = keepCompleted;
            }
        }

        if (options?.markStageComplete) {
            const completed = new Set(next.completed_stages || []);
            completed.add(options.markStageComplete);
            next.completed_stages = Array.from(completed);
        }

        setActiveStep(safeIndex);
        setPipeline(next);
        setNavHint('');

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                topic: next.topic,
                writing_framework: next.writing_framework,
                content_type: contentType,
                selected_angle_id: next.selected_angle_id,
                outline_feedback: next.outline_feedback,
                reader_persona: next.reader_persona,
                emotional_angle: next.emotional_angle,
                publish_place: next.publish_place,
                mandatory_terms: next.mandatory_terms,
                immutable_facts: next.immutable_facts,
                overview_text_fallback: overviewPaste,
                content_ai_stage: stageId,
                wizard_step_index: safeIndex,
                invalidate_after_stage: options?.invalidateAfterStage || '',
                invalidate_downstream_only: options?.invalidateDownstreamOnly ? 1 : 0,
                mark_setup_complete: options?.markSetupComplete ? 1 : 0,
                mark_stage_complete: options?.markStageComplete || '',
                pipeline_patch: patch,
            },
            success: (res: { pipeline?: Pipeline; wizard_step_index?: number }) => {
                if (res?.pipeline) {
                    setPipeline(res.pipeline);
                    if (typeof res.wizard_step_index === 'number') {
                        setActiveStep(res.wizard_step_index);
                    }
                }
            },
        });
    }, [api, postId, pipeline, contentType, overviewPaste, displayStages]);

    const savePipeline = (
        patch: Partial<Pipeline> & {
            content_ai_stage?: string;
            invalidate_after_stage?: string;
            invalidate_downstream_only?: boolean;
        },
    ) => {
        const invalidateStage = patch.invalidate_after_stage;
        const invalidateDownstreamOnly = patch.invalidate_downstream_only;
        const stageOverride = patch.content_ai_stage;
        const pipelinePatch = { ...patch };
        delete pipelinePatch.invalidate_after_stage;
        delete pipelinePatch.invalidate_downstream_only;
        delete pipelinePatch.content_ai_stage;
        const stepIndex = stageOverride
            ? displayStages.indexOf(stageOverride)
            : activeStep;
        persistWizardStep(stepIndex >= 0 ? stepIndex : activeStep, {
            pipelinePatch,
            invalidateAfterStage: invalidateStage,
            invalidateDownstreamOnly: invalidateDownstreamOnly,
        });
    };

    const goToStep = (stepIndex: number) => {
        if (stepIndex > maxReachableStep) {
            setNavHint('Bạn cần hoàn thành các bước trước đó trước khi mở bước này.');
            return;
        }
        persistWizardStep(stepIndex);
    };

    const goNext = () => {
        const stage = displayStages[activeStep] || 'setup';
        if (!isStageComplete(stage, pipeline, displayStages, contentType)) {
            setNavHint(stageIncompleteHint(stage, contentType));
            return;
        }
        if (activeStep >= displayStages.length - 1) return;
        const nextIndex = activeStep + 1;
        persistWizardStep(nextIndex, {
            markSetupComplete: stage === 'setup',
            markStageComplete: stage === 'image_urls' ? 'image_urls' : undefined,
        });
    };

    const goBack = () => {
        if (activeStep <= 0) return;
        persistWizardStep(activeStep - 1);
    };

    const parseSerpHtml = () => {
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/parse-serp-html',
            method: 'POST',
            data: { post_id: postId, serp_html: serpHtml },
            success: (res: { pipeline?: Pipeline; serp_data?: SerpData }) => {
                if (res?.pipeline) {
                    setPipeline(res.pipeline);
                } else if (res?.serp_data) {
                    setPipeline((p) => ({ ...p, serp_data: res.serp_data }));
                }
                persistWizardStep(activeStep, { invalidateAfterStage: 'setup' });
                loadPrepare();
            },
        });
    };

    const openGoogleOverview = (stage: string) => {
        if (!postId || !stage || stage === 'setup' || stage === 'final' || stage === 'image_urls') return;
        const url = buildGoogleMarketingUrl(
            postId,
            stage,
            contentType,
            pipeline,
            post as Record<string, unknown>,
            stagePrompt,
        );
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const applyMarketingAiSaveResult = React.useCallback((res: MarketingAiLlmSuccessPayload) => {
        if (res?.pipeline) {
            setPipeline(res.pipeline as Pipeline);
            setPlatformDistributionStale(Boolean((res.pipeline as Pipeline).platform_distribution_stale));
            setHasArticleSource(true);
        }
        const resAny = res as MarketingAiLlmSuccessPayload & {
            preview_markdown?: string;
            normalized?: { preview_markdown?: string; content_text?: string };
        };
        const syncedBody = resAny?.preview_markdown
            || resAny?.normalized?.preview_markdown
            || resAny?.normalized?.content_text
            || (res?.pipeline ? marketingPipelinePreviewMarkdown(res.pipeline as Pipeline) : '');
        if (syncedBody) {
            setFinalContent(String(syncedBody));
        }
        if (res?.post) setWizardPost(res.post);
        loadPrepare({ preserveNavigation: true });
    }, [loadPrepare]);

    const submitOverviewPaste = (stage: string) => {
        if (!overviewPaste.trim()) return;
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                stage,
                overview_text: overviewPaste,
                access_token: getAccessToken() || '',
            },
            success: (res: MarketingAiLlmSuccessPayload & { success?: boolean }) => {
                setOverviewPaste('');
                applyMarketingAiSaveResult(res);
            },
        });
    };

    const finalize = () => {
        const coverUrl = getCoverFieldsFromPipeline(pipeline).url;
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/finalize',
            method: 'POST',
            data: {
                post_id: postId,
                title: finalTitle,
                description: finalDescription,
                ...(coverUrl ? { cover_thumbnail_url: coverUrl } : {}),
            },
            success: () => {
                onRefreshPost?.();
                onClose();
            },
        });
    };

    const currentStage = displayStages[activeStep] || 'setup';
    const currentStageComplete = isStageComplete(currentStage, pipeline, displayStages, contentType);
    const canGoNext = activeStep < displayStages.length - 1 && currentStageComplete;
    const isSetupStep = currentStage === 'setup';
    const isFinalStep = currentStage === 'final';
    const isImageUrlsStep = currentStage === 'image_urls';

    const handleCoverPipelineUpdate = React.useCallback((res: {
        pipeline?: Pipeline;
        preview_markdown?: string;
        editorial_working_content?: string;
        image_placements?: ImagePlacement[];
    }) => {
        if (res.pipeline || res.image_placements) {
            setPipeline((p) => ({
                ...p,
                ...(res.pipeline || {}),
                ...(res.image_placements ? { image_placements: res.image_placements } : {}),
            }));
        }
        const preview = res.preview_markdown
            || res.editorial_working_content
            || (res.pipeline ? marketingPipelinePreviewMarkdown(res.pipeline) : '');
        if (preview) {
            setFinalContent(preview);
        }
    }, []);

    const showLongFormCoverPanel = contentType === 'long_form' && (
        isImageUrlsStep
        || isFinalStep
        || (['editorial', 'illustrations'].includes(currentStage)
            && ((pipeline.completed_stages || []).includes('editorial')
                || Boolean(getCoverFieldsFromPipeline(pipeline).visualPrompt
                    || getCoverFieldsFromPipeline(pipeline).imageKeyword)))
    );

    React.useEffect(() => {
        if (!open || !postId) return;
        if (currentStage === 'setup' || currentStage === 'final' || currentStage === 'image_urls' || currentStage === 'editorial') {
            setStagePrompt('');
            return;
        }
        fetchStagePrompt(currentStage);
    }, [open, postId, currentStage, fetchStagePrompt]);
    const previewBody =
        finalContent ||
        marketingPipelinePreviewMarkdown(pipeline, displayPost as Record<string, unknown>) ||
        pipeline.editorial_working_content ||
        pipeline.drafts?.editor_with_slots ||
        pipeline.drafts?.editor ||
        pipeline.drafts?.writer ||
        pipeline.overview_text_fallback ||
        '';

    const isWriterLongForm =
        currentStage === 'writer' && contentType === 'long_form';
    const overviewPasteHint = isWriterLongForm
        ? 'Giữa 2 marker là markdown thuần (không JSON, không title). Hệ thống tự lọc phần ngoài marker.'
        : `Không cần chỉnh JSON: hệ thống tự lọc phần ngoài ${RESULT_MARKER_HINT} và sửa lỗi dấu ngoặc thường gặp.`;
    const overviewPastePlaceholder = isWriterLongForm
        ? `Dán câu trả lời Google — giữa ${RESULT_MARKER_HINT} là markdown bài viết (không title)`
        : `Dán toàn bộ câu trả lời Google (có thể kèm text thừa; nên có ${RESULT_MARKER_HINT})`;

    const stepContent = () => {
        if (isSetupStep) {
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Chủ đề rộng"
                        fullWidth
                        value={pipeline.topic || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, topic: e.target.value }))}
                        onBlur={() => savePipeline({ topic: pipeline.topic, invalidate_after_stage: 'setup' })}
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Loại nội dung</InputLabel>
                        <Select
                            label="Loại nội dung"
                            value={contentType}
                            onChange={(e) => {
                                const v = e.target.value;
                                setContentType(v);
                                setEditorialSubsteps(editorialSubstepsForContentType(v));
                                savePipeline({ invalidate_after_stage: 'setup' });
                            }}
                        >
                            <MenuItem value="long_form">Long-form / Blog</MenuItem>
                            <MenuItem value="single_image">Single Image</MenuItem>
                            <MenuItem value="carousel">Carousel</MenuItem>
                            <MenuItem value="reels">Reels</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Độc giả / nỗi sợ (tùy chọn)"
                        fullWidth
                        multiline
                        minRows={2}
                        value={pipeline.reader_persona || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, reader_persona: e.target.value }))}
                        onBlur={() => savePipeline({
                            reader_persona: pipeline.reader_persona,
                            invalidate_after_stage: 'setup',
                        })}
                    />
                    <TextField
                        label="Cảm xúc chủ đạo muốn chạm (tùy chọn)"
                        fullWidth
                        multiline
                        minRows={2}
                        value={pipeline.emotional_angle || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, emotional_angle: e.target.value }))}
                        onBlur={() => savePipeline({
                            emotional_angle: pipeline.emotional_angle,
                            invalidate_after_stage: 'setup',
                        })}
                    />
                    <TextField
                        label="Nơi đăng / mục đích (bước 1 framework)"
                        fullWidth
                        value={pipeline.publish_place || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, publish_place: e.target.value }))}
                        onBlur={() => savePipeline({ publish_place: pipeline.publish_place })}
                    />
                    <TextField
                        label="Thuật ngữ bắt buộc giữ nguyên (mỗi dòng một mục)"
                        fullWidth
                        multiline
                        minRows={2}
                        value={pipeline.mandatory_terms || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, mandatory_terms: e.target.value }))}
                        onBlur={() => savePipeline({ mandatory_terms: pipeline.mandatory_terms })}
                    />
                    <TextField
                        label="Sự thật không được thay đổi"
                        fullWidth
                        multiline
                        minRows={2}
                        value={pipeline.immutable_facts || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, immutable_facts: e.target.value }))}
                        onBlur={() => savePipeline({ immutable_facts: pipeline.immutable_facts })}
                    />
                    <FormControl>
                        <InputLabel shrink>Khung viết</InputLabel>
                        <RadioGroup
                            row
                            value={pipeline.writing_framework || 'pas'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setPipeline((p) => ({ ...p, writing_framework: v }));
                                savePipeline({ writing_framework: v, invalidate_after_stage: 'setup' });
                            }}
                        >
                            <FormControlLabel value="pas" control={<Radio />} label="PAS" />
                            <FormControlLabel value="storytelling" control={<Radio />} label="Storytelling" />
                        </RadioGroup>
                    </FormControl>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            onClick={() => window.open(buildGoogleSerpUrl(pipeline.topic || String(post.title || '')), '_blank')}
                        >
                            Mở Google Search
                        </Button>
                        <LoadingButton variant="outlined" loading={api.open} onClick={parseSerpHtml}>
                            Trích xuất nguồn từ HTML
                        </LoadingButton>
                    </Box>
                    <TextField
                        label="Dán HTML trang Google Search (tùy chọn)"
                        multiline
                        minRows={4}
                        fullWidth
                        value={serpHtml}
                        onChange={(e) => setSerpHtml(e.target.value)}
                    />
                    <StageSavedSummary
                        stage="setup"
                        pipeline={pipeline}
                        contentType={contentType}
                        post={displayPost}
                        buildGoogleSerpUrl={buildGoogleSerpUrl}
                    />
                </Box>
            );
        }

        if (isImageUrlsStep) {
            const showImageEditor = contentType === 'long_form' && (pipeline.image_placements || []).length > 0;
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {showLongFormCoverPanel && (
                        <MarketingCoverVisualPanel
                            postId={postId}
                            pipeline={pipeline}
                            showUrlField
                            onUpdated={handleCoverPipelineUpdate}
                        />
                    )}
                    {showImageEditor ? (
                        <MarketingImagePlacementsEditor
                            postId={postId}
                            placements={pipeline.image_placements || []}
                            onPlacementsChange={(next) => {
                                setPipeline((p) => ({ ...p, image_placements: next }));
                            }}
                            onSynced={(res) => {
                                const preview = res.preview_markdown || res.editorial_working_content;
                                if (preview) {
                                    setFinalContent(preview);
                                }
                                if (res.image_placements) {
                                    setPipeline((p) => ({ ...p, image_placements: res.image_placements }));
                                }
                            }}
                        />
                    ) : (
                        <Alert severity="warning">
                            Chưa có danh sách ảnh — hoàn thành bước Minh họa trước.
                        </Alert>
                    )}
                    {previewBody && (
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, maxHeight: 360, overflow: 'auto' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Xem trước bài (markdown)</Typography>
                            <Markdown>{previewBody}</Markdown>
                        </Box>
                    )}
                </Box>
            );
        }

        if (isFinalStep) {
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label="Tiêu đề" fullWidth value={finalTitle} onChange={(e) => setFinalTitle(e.target.value)} />
                    <TextField
                        label="Mô tả SEO"
                        fullWidth
                        multiline
                        minRows={2}
                        value={finalDescription}
                        onChange={(e) => setFinalDescription(e.target.value)}
                    />
                    <TextField
                        label="Xem trước markdown (pipeline)"
                        fullWidth
                        multiline
                        minRows={12}
                        value={finalContent || previewBody}
                        InputProps={{ readOnly: true }}
                        helperText="Khi bấm Lưu vào CMS, hệ thống tách thành các block text (markdown) + image cho app mobile."
                    />
                    {showLongFormCoverPanel && (
                        <MarketingCoverVisualPanel
                            postId={postId}
                            pipeline={pipeline}
                            showUrlField
                            onUpdated={handleCoverPipelineUpdate}
                        />
                    )}
                    {previewBody && (
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, maxHeight: 320, overflow: 'auto' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Xem trước</Typography>
                            <Markdown>{previewBody}</Markdown>
                        </Box>
                    )}
                    <LoadingButton variant="contained" color="success" loading={api.open} onClick={finalize}>
                        Lưu vào CMS
                    </LoadingButton>
                </Box>
            );
        }

        if (currentStage === 'editorial') {
            return (
                <EditorialSubWizard
                    postId={postId}
                    contentType={contentType}
                    substeps={editorialSubsteps}
                    pipeline={pipeline}
                    setPipeline={setPipeline}
                    onPipelineSaved={(pl) => setPipeline((p) => ({ ...p, ...pl }))}
                    onEditorialComplete={() => {
                        persistWizardStep(activeStep, { markStageComplete: 'editorial' });
                    }}
                />
            );
        }

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info">
                    <strong>Bước 1:</strong> Bấm <strong>Mở Google AI mode</strong> (cần extension Chrome Vn4) — prompt tự điền vào ô, bạn chỉ bấm <strong>Gửi</strong> →{' '}
                    <strong>Bước 2:</strong> Bấm <strong>Copy</strong> trên Google → dán nguyên cả khối vào ô bên dưới → <strong>Lưu kết quả</strong>.
                    {' '}
                    Hoặc bấm <strong>Dùng Gemini</strong> / <strong>Dùng DeepSeek</strong> để tự động tạo và lưu (không cần Google).
                    {' '}
                    {overviewPasteHint}
                    {' '}
                    Không có extension: dùng <strong>Sao chép prompt</strong> rồi dán thủ công trên Google.
                </Alert>
                <Box sx={{ mb: 2 }}>
                    <MarketingAiLlmButtons
                        postId={postId}
                        stage={currentStage}
                        stageLabel={STAGE_LABELS[currentStage] || currentStage}
                        contentType={contentType}
                        promptReady={Boolean(stagePrompt.trim()) && !promptLoading}
                        onSuccess={applyMarketingAiSaveResult}
                    >
                        <MarketingReloadPromptButton
                            loading={promptLoading}
                            onReload={() => fetchStagePrompt(currentStage)}
                        />
                        <MarketingCopyPromptButton
                            promptText={stagePrompt}
                            disabled={!stagePrompt.trim()}
                        />
                        <Button
                            variant="contained"
                            disabled={!stagePrompt.trim()}
                            onClick={() => openGoogleOverview(currentStage)}
                        >
                            Mở Google AI mode
                        </Button>
                    </MarketingAiLlmButtons>
                </Box>
                {stagePrompt && (
                    <TextField
                        label={`Prompt — ${STAGE_LABELS[currentStage] || currentStage}`}
                        multiline
                        minRows={6}
                        fullWidth
                        value={stagePrompt}
                        InputProps={{ readOnly: true }}
                        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
                    />
                )}

                {currentStage === 'angles' && (pipeline.angles || []).length > 0 && (
                    <RadioGroup
                        value={pipeline.selected_angle_id || ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            const angle = (pipeline.angles || []).find((a) => a.id === id);
                            setPipeline((p) => ({
                                ...p,
                                selected_angle_id: id,
                                selected_angle: angle || null,
                            }));
                            savePipeline({
                                selected_angle_id: id,
                                selected_angle: angle || null,
                                invalidate_after_stage: 'angles',
                                invalidate_downstream_only: true,
                            });
                        }}
                    >
                        {(pipeline.angles || []).map((a) => (
                            <Box key={a.id} sx={{ mb: 1, p: 1.5, border: '1px solid #eee', borderRadius: 1 }}>
                                <FormControlLabel value={a.id} control={<Radio />} label={a.title} />
                                <Typography variant="body2" color="text.secondary">{a.summary}</Typography>
                            </Box>
                        ))}
                    </RadioGroup>
                )}

                {currentStage === 'outline' && (
                    <TextField
                        label="Phản hồi chỉnh dàn ý (gửi lại khi chạy Outline)"
                        multiline
                        minRows={2}
                        fullWidth
                        value={pipeline.outline_feedback || ''}
                        onChange={(e) => setPipeline((p) => ({ ...p, outline_feedback: e.target.value }))}
                        onBlur={() => savePipeline({
                            outline_feedback: pipeline.outline_feedback,
                            invalidate_after_stage: 'outline',
                        })}
                    />
                )}

                <Divider />
                <Typography variant="subtitle2">Dán kết quả Google Overview</Typography>
                <TextField
                    multiline
                    minRows={6}
                    fullWidth
                    placeholder={overviewPastePlaceholder}
                    value={overviewPaste}
                    onChange={(e) => setOverviewPaste(e.target.value)}
                />
                <LoadingButton
                    variant="contained"
                    color="primary"
                    loading={api.open}
                    disabled={!overviewPaste.trim()}
                    onClick={() => submitOverviewPaste(currentStage)}
                >
                    Lưu kết quả — {STAGE_LABELS[currentStage] || currentStage}
                </LoadingButton>

                <StageSavedSummary
                    stage={currentStage}
                    pipeline={pipeline}
                    contentType={contentType}
                    post={displayPost}
                    buildGoogleSerpUrl={buildGoogleSerpUrl}
                />

                {showLongFormCoverPanel && !isImageUrlsStep && !isFinalStep && (
                    <MarketingCoverVisualPanel
                        postId={postId}
                        pipeline={pipeline}
                        onUpdated={handleCoverPipelineUpdate}
                    />
                )}
            </Box>
        );
    };

    if (!postId) {
        return (
            <DrawerCustom open={open} onClose={onClose} title="Sinh nội dung Marketing" width={1600}>
                <Alert severity="warning">Vui lòng lưu bài post trước khi sinh nội dung.</Alert>
            </DrawerCustom>
        );
    }

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Pipeline sinh nội dung (Google Overview)"
            width={1600}
            activeOnClose
            restDialogContent={{
                sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    p: 0,
                    flex: '1 1 auto',
                    minHeight: 0,
                    height: 'calc(100vh - 64px)',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    height: '100%',
                    minHeight: 0,
                }}
            >
                <Box sx={{ px: 2, pt: 1, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={topTab}
                        onChange={(_, v) => {
                            setTopTab(v);
                            if (!postId) return;
                            apiAjaxRef.current({
                                url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
                                method: 'POST',
                                loading: false,
                                data: {
                                    post_id: postId,
                                    active_distribution_tab: v,
                                    ...(v !== 'article' ? {
                                        distribution_platform: v,
                                    } : {}),
                                    pipeline_patch: {
                                        active_distribution_tab: v,
                                    },
                                },
                                success: (saveRes: { pipeline?: Pipeline }) => {
                                    if (saveRes?.pipeline) {
                                        setPipeline((p) => ({ ...p, ...saveRes.pipeline }));
                                    }
                                },
                            });
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab label="Bài viết" value="article" />
                        {distributionPlatforms.map((plat) => (
                            <Tab
                                key={plat}
                                label={PLATFORM_LABELS[plat] || plat}
                                value={plat}
                                disabled={!hasArticleSource && plat !== topTab}
                            />
                        ))}
                    </Tabs>
                    {distributionPlatforms.length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ py: 0.5, display: 'block' }}>
                            Chọn nền tảng đăng trong tab Basic của bài post để hiện tab MXH.
                        </Typography>
                    )}
                </Box>

                {topTab !== 'article' ? (
                    <Box sx={{ flex: 1, minHeight: 0, px: 2, py: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <PlatformDistributionWizard
                            key={topTab}
                            postId={postId}
                            platform={topTab}
                            pipeline={pipeline}
                            setPipeline={setPipeline}
                            contentType={contentType}
                            post={displayPost}
                            hasArticleSource={hasArticleSource}
                            platformDistributionStale={platformDistributionStale}
                            onPipelineSaved={(pl) => {
                                setPipeline((p) => ({ ...p, ...pl }));
                                setPlatformDistributionStale(Boolean(pl.platform_distribution_stale));
                            }}
                        />
                    </Box>
                ) : (
                <>
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'stretch',
                        px: 2,
                        pt: 2,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: 248,
                            minWidth: 248,
                            flexShrink: 0,
                            minHeight: 0,
                            overflowY: 'auto',
                            pr: 2,
                            mr: 1,
                            borderRight: 1,
                            borderColor: 'divider',
                        }}
                        className="custom_scroll"
                    >
                        <Stepper
                            activeStep={activeStep}
                            orientation="vertical"
                            nonLinear
                            sx={{
                                width: '100%',
                                '& .MuiStepConnector-root': {
                                    marginLeft: '12px',
                                },
                                '& .MuiStepConnector-line': {
                                    minHeight: 16,
                                    borderLeftWidth: 2,
                                },
                            }}
                        >
                            {displayStages.map((s, index) => {
                                const done = isStageComplete(s, pipeline, displayStages, contentType);
                                const locked = index > maxReachableStep;
                                const isActive = index === activeStep;
                                return (
                                    <Step key={s} completed={done && !isActive}>
                                        <StepLabel
                                            onClick={locked ? undefined : () => goToStep(index)}
                                            sx={{
                                                cursor: locked ? 'default' : 'pointer',
                                                py: 0.5,
                                                alignItems: 'flex-start',
                                                '& .MuiStepLabel-label': {
                                                    fontWeight: isActive ? 700 : 400,
                                                    fontSize: 13,
                                                    lineHeight: 1.35,
                                                    color: locked ? 'text.disabled' : 'text.primary',
                                                },
                                                '& .MuiStepIcon-root': {
                                                    color: locked
                                                        ? 'action.disabled'
                                                        : (done ? 'success.main' : (isActive ? 'primary.main' : 'grey.500')),
                                                },
                                            }}
                                        >
                                            {STAGE_LABELS[s] || s}
                                        </StepLabel>
                                    </Step>
                                );
                            })}
                        </Stepper>
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            minHeight: 0,
                            height: '100%',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Box
                            className="custom_scroll"
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                height: '100%',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                pb: 2,
                                WebkitOverflowScrolling: 'touch',
                            }}
                        >
                        {navHint && (
                            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setNavHint('')}>
                                {navHint}
                            </Alert>
                        )}
                        {!currentStageComplete && currentStage !== 'final' && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {stageIncompleteHint(currentStage, contentType)}
                            </Alert>
                        )}
                        <StagePurposeBanner
                            stage={currentStage}
                            stepIndex={activeStep}
                            totalSteps={displayStages.length}
                            contentType={contentType}
                        />
                        {stepContent()}
                        </Box>
                    </Box>
                </Box>
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
                        zIndex: 2,
                    }}
                >
                    <Button disabled={activeStep === 0} onClick={goBack}>
                        Quay lại
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button onClick={() => loadPrepare()}>Tải lại</Button>
                        <Button
                            variant="contained"
                            disabled={!canGoNext}
                            onClick={goNext}
                        >
                            Tiếp theo
                        </Button>
                    </Box>
                </Box>
                </>
                )}
            </Box>
        </DrawerCustom>
    );
}
