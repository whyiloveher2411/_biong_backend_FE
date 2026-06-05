import React from 'react';
import {
    Alert,
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
    keyframes,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import useAjax from 'hook/useApi';
import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { EDITORIAL_SUBSTEP_LABELS } from './editorialConstants';
import MarketingAiLlmButtons, { type MarketingAiLlmSuccessPayload } from './MarketingAiLlmButtons';
import { MarketingCopyPromptButton, MarketingReloadPromptButton } from './MarketingPromptActionButtons';
const pulseKeyframes = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.45); }
  70% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
`;

const RESULT_MARKER_HINT = '###RESULT: START### … ###RESULT: END###';

export type EditorialPipelineSlice = {
    editorial_passes?: Record<string, Record<string, unknown>>;
    editorial_completed_substeps?: string[];
    editorial_working_content?: string;
    editorial_substep_index?: number;
    editorial_active_version?: string;
    completed_stages?: string[];
    drafts?: { writer?: string; editor?: string };
};

interface Props {
    postId: number;
    contentType: string;
    substeps: string[];
    pipeline: EditorialPipelineSlice;
    setPipeline: React.Dispatch<React.SetStateAction<EditorialPipelineSlice & Record<string, unknown>>>;
    onPipelineSaved?: (pipeline: EditorialPipelineSlice) => void;
    onEditorialComplete?: () => void;
}

function isSubstepComplete(pipeline: EditorialPipelineSlice, substep: string): boolean {
    return (pipeline.editorial_completed_substeps || []).includes(substep);
}

function computeMaxSubstep(pipeline: EditorialPipelineSlice, substeps: string[]): number {
    for (let i = 0; i < substeps.length; i++) {
        if (!isSubstepComplete(pipeline, substeps[i])) {
            return i;
        }
    }
    return substeps.length - 1;
}

function buildGoogleEditorialUrl(
    postId: number,
    substage: string,
    contentType: string,
    promptText: string,
): string {
    const accessToken = getAccessToken() ?? '';
    const apiUrl = convertToURL(
        getApiHost(),
        '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
    );
    const url = new URL('https://www.google.com/search');
    url.searchParams.set('udm', '50');
    url.searchParams.set('hl', 'vi');
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_post_id: String(postId),
        marketing_stage: substage,
        access_token: accessToken,
        api_url: apiUrl,
        content_type: contentType,
        marketing_fill_only: '1',
    });
    if (promptText.trim()) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptText));
    }
    url.hash = hashParams.toString();
    return url.toString();
}

export default function EditorialSubWizard({
    postId,
    contentType,
    substeps,
    pipeline,
    setPipeline,
    onPipelineSaved,
    onEditorialComplete,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    const promptFetchIdRef = React.useRef(0);

    const [activeSubstep, setActiveSubstep] = React.useState(() => Math.min(
        pipeline.editorial_substep_index ?? 0,
        Math.max(0, substeps.length - 1),
    ));
    const [stagePrompt, setStagePrompt] = React.useState('');
    const [promptLoading, setPromptLoading] = React.useState(false);
    const [overviewPaste, setOverviewPaste] = React.useState('');
    const [navHint, setNavHint] = React.useState('');
    const [highlightPaste, setHighlightPaste] = React.useState(false);
    const [voiceVersion, setVoiceVersion] = React.useState(
        pipeline.editorial_active_version || 'layman',
    );
    const currentSubstage = substeps[activeSubstep] || substeps[0];
    const maxReachable = computeMaxSubstep(pipeline, substeps);
    const currentComplete = isSubstepComplete(pipeline, currentSubstage);

    React.useEffect(() => {
        setActiveSubstep(Math.min(
            pipeline.editorial_substep_index ?? 0,
            Math.max(0, substeps.length - 1),
        ));
    }, [substeps.length, pipeline.editorial_substep_index]);

    const fetchSubstepPrompt = React.useCallback((substage: string) => {
        if (!postId) return;
        const fetchId = ++promptFetchIdRef.current;
        setPromptLoading(true);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/get-overview-prompt',
            data: { post_id: postId, stage: substage, editorial_substage: substage },
            loading: false,
            success: (res: { prompt?: string }) => {
                if (fetchId !== promptFetchIdRef.current) return;
                if (res?.prompt) setStagePrompt(res.prompt);
            },
            finally: () => {
                if (fetchId === promptFetchIdRef.current) setPromptLoading(false);
            },
        });
    }, [postId]);

    React.useEffect(() => {
        setStagePrompt('');
        fetchSubstepPrompt(currentSubstage);
    }, [currentSubstage, fetchSubstepPrompt]);

    const persistSubstep = React.useCallback((
        index: number,
        options?: { highlight?: boolean; invalidateFrom?: string },
    ) => {
        const safe = Math.max(0, Math.min(index, substeps.length - 1));
        setActiveSubstep(safe);
        setNavHint('');
        if (options?.highlight) {
            setHighlightPaste(true);
            window.setTimeout(() => setHighlightPaste(false), 2000);
        }
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                editorial_substep_index: safe,
                content_ai_stage: 'editorial',
                ...(options?.invalidateFrom ? {
                    invalidate_editorial_substep: options.invalidateFrom,
                    invalidate_editorial_include_from: 1,
                } : {}),
            },
            success: (res: { pipeline?: EditorialPipelineSlice }) => {
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                    onPipelineSaved?.(res.pipeline);
                }
            },
        });
    }, [postId, substeps.length, setPipeline, onPipelineSaved]);

    const submitPaste = () => {
        if (!overviewPaste.trim()) return;
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                stage: currentSubstage,
                overview_text: overviewPaste,
                access_token: getAccessToken() || '',
            },
            success: (res: { pipeline?: EditorialPipelineSlice }) => {
                setOverviewPaste('');
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                    onPipelineSaved?.(res.pipeline);
                }
            },
        });
    };

    const saveVoiceVersion = (ver: string) => {
        setVoiceVersion(ver);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                editorial_active_version: ver,
            },
            success: (res: { pipeline?: EditorialPipelineSlice }) => {
                if (res?.pipeline) {
                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                }
            },
        });
    };

    const allEditorialDone = substeps.every((s) => isSubstepComplete(pipeline, s));

    const savedPass = pipeline.editorial_passes?.[currentSubstage];

    return (
        <Box sx={{ display: 'flex', gap: 2, minHeight: 0, flex: 1 }}>
            <Box sx={{ width: 220, flexShrink: 0, borderRight: 1, borderColor: 'divider', pr: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, px: 0.5 }}>
                    Biên tập nâng cao (7 bước)
                </Typography>
                <Stepper activeStep={activeSubstep} orientation="vertical" nonLinear>
                    {substeps.map((s, index) => {
                        const done = isSubstepComplete(pipeline, s);
                        const locked = index > maxReachable;
                        return (
                            <Step key={s} completed={done && index !== activeSubstep}>
                                <StepLabel
                                    onClick={locked ? undefined : () => persistSubstep(index, { highlight: index < activeSubstep })}
                                    sx={{
                                        cursor: locked ? 'default' : 'pointer',
                                        '& .MuiStepLabel-label': { fontSize: 11 },
                                    }}
                                >
                                    {EDITORIAL_SUBSTEP_LABELS[s] || s}
                                </StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Box className="custom_scroll" sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>{EDITORIAL_SUBSTEP_LABELS[currentSubstage]}</strong>
                        {' — '}
                        Mỗi bước chỉnh trên <strong>kết quả bước trước</strong> (trong prompt: mục «Văn bản đầu vào»).
                        {' '}
                        Mở Google AI mode → Copy → Dán → Lưu, hoặc <strong>Dùng Gemini</strong> / <strong>DeepSeek</strong>.
                        {' '}
                        Bấm <strong>Làm lại từ bước này</strong> để xóa các bước sau và chạy lại chuỗi.
                    </Alert>

                    {currentSubstage === 'ed_voice' && (
                        <FormControl sx={{ mb: 2 }}>
                            <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5 }}>
                                Phiên bản dùng cho các bước sau
                            </Typography>
                            <RadioGroup
                                row
                                value={voiceVersion}
                                onChange={(e) => saveVoiceVersion(e.target.value)}
                            >
                                <FormControlLabel value="layman" control={<Radio size="small" />} label="Phổ thông" />
                                <FormControlLabel value="professional" control={<Radio size="small" />} label="Chuyên ngành" />
                            </RadioGroup>
                        </FormControl>
                    )}

                    <Box sx={{ mb: 2 }}>
                        <MarketingAiLlmButtons
                            postId={postId}
                            stage={currentSubstage}
                            stageLabel={EDITORIAL_SUBSTEP_LABELS[currentSubstage] || currentSubstage}
                            contentType={contentType}
                            editorialSubstage={currentSubstage}
                            editorialActiveVersion={voiceVersion}
                            promptReady={Boolean(stagePrompt.trim()) && !promptLoading}
                            onSuccess={(res: MarketingAiLlmSuccessPayload) => {
                                setOverviewPaste('');
                                if (res?.pipeline) {
                                    setPipeline((p) => ({ ...p, ...res.pipeline }));
                                    onPipelineSaved?.(res.pipeline as EditorialPipelineSlice);
                                }
                            }}
                        >
                            <LoadingButton variant="contained" loading={promptLoading} onClick={() => window.open(
                                buildGoogleEditorialUrl(postId, currentSubstage, contentType, stagePrompt),
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
                                onReload={() => fetchSubstepPrompt(currentSubstage)}
                            />
                            {currentComplete && (
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    size="small"
                                    onClick={() => persistSubstep(activeSubstep, { invalidateFrom: currentSubstage })}
                                >
                                    Làm lại từ bước này
                                </Button>
                            )}
                        </MarketingAiLlmButtons>
                    </Box>

                    {(stagePrompt || promptLoading) && (
                        <TextField
                            key={currentSubstage}
                            label={`Prompt — ${EDITORIAL_SUBSTEP_LABELS[currentSubstage] || currentSubstage} (${currentSubstage})`}
                            multiline
                            minRows={4}
                            fullWidth
                            value={promptLoading && !stagePrompt.trim()
                                ? 'Đang tải prompt cho bước này…'
                                : stagePrompt}
                            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 11 } }}
                            sx={{ mb: 2 }}
                        />
                    )}

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2">Dán kết quả Google Overview</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        JSON/markdown giữa {RESULT_MARKER_HINT}
                    </Typography>
                    <TextField
                        multiline
                        minRows={6}
                        fullWidth
                        value={overviewPaste}
                        onChange={(e) => setOverviewPaste(e.target.value)}
                        sx={{
                            mb: 1,
                            ...(highlightPaste ? { animation: `${pulseKeyframes} 1.5s ease 2` } : {}),
                            '& .MuiOutlinedInput-root': highlightPaste ? {
                                borderColor: 'primary.main',
                            } : {},
                        }}
                    />
                    <LoadingButton
                        variant="contained"
                        loading={api.open}
                        disabled={!overviewPaste.trim()}
                        onClick={submitPaste}
                    >
                        Lưu — {EDITORIAL_SUBSTEP_LABELS[currentSubstage]}
                    </LoadingButton>

                    {currentComplete && savedPass && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            <Typography variant="caption" fontWeight={600}>Đã lưu bước này</Typography>
                            <Box component="pre" sx={{ fontSize: 10, maxHeight: 160, overflow: 'auto', mt: 1 }}>
                                {JSON.stringify(savedPass, null, 2)}
                            </Box>
                        </Alert>
                    )}

                    {pipeline.editorial_working_content && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            <Typography variant="caption" fontWeight={600}>
                                Bản đang làm việc ({pipeline.editorial_working_content.length.toLocaleString('vi-VN')} ký tự)
                            </Typography>
                        </Alert>
                    )}
                </Box>

                {navHint && <Alert severity="warning" sx={{ mt: 1 }}>{navHint}</Alert>}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button disabled={activeSubstep <= 0} onClick={() => persistSubstep(activeSubstep - 1)}>
                        Quay lại
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!currentComplete || activeSubstep >= substeps.length - 1}
                        onClick={() => {
                            if (!currentComplete) {
                                setNavHint('Lưu kết quả bước hiện tại trước.');
                                return;
                            }
                            persistSubstep(activeSubstep + 1);
                        }}
                    >
                        Tiếp theo
                    </Button>
                    {activeSubstep >= substeps.length - 1 && allEditorialDone && (
                        <Button variant="contained" color="success" onClick={() => onEditorialComplete?.()}>
                            Hoàn tất biên tập
                        </Button>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
