import React, { useState } from 'react';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { Box, TextField, MenuItem, Button, Typography, Select, FormControl, InputLabel, Grid, Stepper, Step, StepLabel, OutlinedInput, Chip, SelectChangeEvent, Checkbox, InputAdornment, Slider } from '@mui/material';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import FieldForm from 'components/atoms/fields/FieldForm';
import Icon from 'components/atoms/Icon';

interface SuggestAiDrawerProps {
    open: boolean;
    onClose: () => void;
    onFinish?: () => void;
    data: CreatePostTypeData;
}

const steps = [
    {
        label: 'Thiết lập chương trình',
        description: 'Dữ liệu cốt lõi cho toàn bộ marketing',
    },
    {
        label: 'Thiết lập chiến lược',
        description: 'Bối cảnh & phân bổ chủ đề',
    },
    { label: 'Review lịch trình', description: 'Xem lại và xác nhận' },
];

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const platformOptions = [
    "Website",
    "App Mobile",
    "Facebook",
    "Instagram",
    "TikTok",
    "YouTube",
    "X",
    "LinkedIn",
    "Threads"
];

/** Palette màu tương phản rõ: mỗi ô khác sắc (hue), dễ phân biệt trên calendar */
const PILLAR_COLOR_SWATCHES = [
    '#5C6BC0', '#2E7D32', '#EF6C00', '#7B1FA2', '#C62828',
    '#00695C', '#558B2F', '#AD1457', '#1565C0', '#5D4037',
];

const durationOptions = [
    "7 ngày (Thử nghiệm)",
    "14 ngày (Ngắn hạn)",
    "30 ngày (Chiến dịch tổng thể)"
];

const postsPerWeekOptions = [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "5", label: "5" },
    { value: "7", label: "7 (Hàng ngày)" },
    { value: "mỗi ngày 2 bài", label: "Mỗi ngày 2 bài" },
    { value: "mỗi ngày 3 bài", label: "Mỗi ngày 3 bài" },
    { value: "mỗi ngày 4 bài", label: "Mỗi ngày 4 bài" },
    { value: "mỗi ngày 5 bài", label: "Mỗi ngày 5 bài" },
    { value: "mỗi ngày 6 bài", label: "Mỗi ngày 6 bài" },
    { value: "mỗi ngày 7 bài", label: "Mỗi ngày 7 bài" },
];

const languageOptions = [
    "Tiếng Việt",
    "English"
];

type BrandPillar = {
    title: string;
    description: string;
    example_post_title?: string;
    ratio?: number;
    color?: string;
};

 type BrandContext = {
    mission?: string;
    core_features?: string[];
    target_audience?: string;
    tone_of_voice?: string;
    primary_color?: string;
    pillars?: BrandPillar[];
    summary?: string;
};

const getInitialBrandContext = (raw: ANY): BrandContext => {
    if (!raw) return {};

    let parsed: ANY = raw;

    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            // Nếu parse lỗi thì trả về object rỗng
            return {};
        }
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
    }

    const context: BrandContext = {
        mission: parsed.mission,
        core_features: Array.isArray(parsed.core_features) ? parsed.core_features : undefined,
        target_audience: parsed.target_audience,
        tone_of_voice: parsed.tone_of_voice,
        primary_color: parsed.primary_color,
    };
    const rawPillars =
        (Array.isArray(parsed.pillars) && parsed.pillars) ||
        (Array.isArray(parsed.content_pillars) && parsed.content_pillars) ||
        undefined;

    if (rawPillars) {
        context.pillars = rawPillars.map((p: BrandPillar) => ({
            ...p,
            ratio: typeof p.ratio === 'number' ? p.ratio : 100,
        }));
    }

    if (typeof parsed.summary === 'string') {
        context.summary = parsed.summary;
    }

    return context;
};

export default function SuggestAiDrawer({ open, onClose, onFinish, data }: SuggestAiDrawerProps) {
    const api = useAjax();

    // Chuẩn bị brand context ban đầu từ post
    const initialBrand = getInitialBrandContext(data.post.marketing_brand_context);
    const hasInitialPillars = Array.isArray(initialBrand.pillars) && initialBrand.pillars.length > 0;

    const [activeStep, setActiveStep] = useState(() => (hasInitialPillars ? 1 : 0));
    const [maxStep, setMaxStep] = useState(() => (hasInitialPillars ? 1 : 0));

    // Step 0 State - Brand context & content pillars
    const [initialBrandContext] = useState<BrandContext>(initialBrand);
    const [mission, setMission] = useState<string>(initialBrandContext.mission || '');
    const [coreFeatures, setCoreFeatures] = useState<string>(
        (initialBrandContext.core_features || []).join('\n'),
    );
    const [targetAudience, setTargetAudience] = useState<string>(
        initialBrandContext.target_audience || '',
    );
    const [brandToneOfVoice, setBrandToneOfVoice] = useState<string>(
        initialBrandContext.tone_of_voice || '',
    );
    const [primaryColor, setPrimaryColor] = useState<string>(
        initialBrandContext.primary_color || '',
    );
    const [pillars, setPillars] = useState<BrandPillar[]>(initialBrandContext.pillars || []);
    const [pillarsSummary, setPillarsSummary] = useState<string>(initialBrandContext.summary || '');

    // Step 1 State - Strategy
    const [topic, setTopic] = useState('');
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [loadingSuggestTopic, setLoadingSuggestTopic] = useState(false);
    const [duration, setDuration] = useState('');
    const [language, setLanguage] = useState('Tiếng Việt');
    const [startDate, setStartDate] = useState('');

    // Step 2 State
    const [postsPerWeek, setPostsPerWeek] = useState('mỗi ngày 3 bài');
    const [platforms, setPlatforms] = useState<string[]>(['Facebook']);

    // Step 4 State
    const [scheduleData, setScheduleData] = useState<ANY[]>([]);
    const [strategyAdvice, setStrategyAdvice] = useState<string>('');
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingSuggestPillars, setLoadingSuggestPillars] = useState(false);
    const [loadingBrandContext, setLoadingBrandContext] = useState(false);

    const [platformsOpen, setPlatformsOpen] = useState(false);

    const totalPillarPoints = pillars.reduce((sum, p) => sum + (p.ratio ?? 0), 0);
    const getPillarPercent = (points: number) =>
        totalPillarPoints > 0 ? Math.round((points / totalPillarPoints) * 100) : 0;

    const handlePlatformsChange = (event: SelectChangeEvent<typeof platforms>) => {
        const {
            target: { value },
        } = event;
        setPlatforms(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleNext = () => {
        setActiveStep((prevActiveStep) => {
            const nextStep = prevActiveStep + 1;
            if (nextStep > maxStep) {
                setMaxStep(nextStep);
            }
            // Khi chuyển bước luôn reset trạng thái loading nút
            if (nextStep === 1) {
                setLoadingSuggest(false);
            }
            if (nextStep === 2) {
                setLoadingSubmit(false);
            }
            return nextStep;
        });
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => {
            const prev = prevActiveStep - 1;
            if (prev === 1) {
                setLoadingSuggest(false);
            }
            return prev;
        });
    };

    React.useEffect(() => {
        if (open) {
            setLoadingSuggest(false);
            setLoadingSubmit(false);
        }
    }, [open]);

    const buildBrandContextPayload = () => ({
        mission,
        core_features: coreFeatures
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s),
        target_audience: targetAudience,
        tone_of_voice: brandToneOfVoice,
        primary_color: primaryColor,
        pillars,
        summary: pillarsSummary,
    });

    const handleSuggestContentPillars = () => {
        setLoadingSuggestPillars(true);
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/marketing/suggest-content-pillars",
            method: "POST",
            data: {
                id: data.post.id,
                brand_context: buildBrandContextPayload(),
            },
            success: (res: ANY) => {
                setLoadingSuggestPillars(false);
                const layer1 = res?.data || res || {};
                const result = layer1?.data || layer1 || {};

                const apiPillars: ANY = Array.isArray(result.pillars)
                    ? result.pillars
                    : (Array.isArray(result.content_pillars) ? result.content_pillars : undefined);

                if (Array.isArray(apiPillars)) {
                    const normalizedPillars: BrandPillar[] = apiPillars.map((p: BrandPillar) => ({
                        ...p,
                        ratio: typeof p.ratio === 'number' ? p.ratio : 100,
                    }));

                    setPillars(normalizedPillars);
                    setCoreFeatures(
                        normalizedPillars
                            .map((p: BrandPillar) => p.title)
                            .filter((s: string) => !!s)
                            .join('\n'),
                    );
                }

                if (typeof result.summary === 'string') {
                    setPillarsSummary(result.summary);
                }

                if (result.target_audience) {
                    setTargetAudience(result.target_audience);
                }
                if (result.tone_of_voice) {
                    setBrandToneOfVoice(result.tone_of_voice);
                }
                if (result.primary_color) {
                    setPrimaryColor(result.primary_color);
                }
            },
            error: () => {
                setLoadingSuggestPillars(false);
            }
        });
    };

    const handleSubmitBrandContext = () => {
        setLoadingBrandContext(true);
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/marketing/submit-brand-context",
            method: "POST",
            data: {
                id: data.post.id,
                brand_context: buildBrandContextPayload(),
            },
            success: (res: ANY) => {
                setLoadingBrandContext(false);
                const result = res?.data || res || {};
                if (result.success || result.status) {
                    handleNext();
                } else {
                    api.showMessage(result.message || "Lưu brand context thất bại", "error");
                }
            },
            error: () => {
                setLoadingBrandContext(false);
            }
        });
    };

    const handleSubmit = () => {
        const finalTopicArray = topic.split(',').map(s => s.trim()).filter(s => s);

        setLoadingSuggest(true);
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/marketing/schedule",
            method: "POST",
            data: {
                id: data.post.id,
                brand_context: buildBrandContextPayload(),
                topic: finalTopicArray,
                duration,
                postsPerWeek,
                platforms,
                language,
                start_date: startDate
            },
            success: (res: ANY) => {
                setLoadingSuggest(false);
                const resultData = res.data || res;
                if (resultData.schedule) {
                    setScheduleData(resultData.schedule);
                    setStrategyAdvice(resultData.strategy_advice || '');
                    handleNext();
                } else {
                    api.showMessage("Không nhận được dữ liệu lịch trình từ AI", "error");
                }
            },
            error: () => {
                setLoadingSuggest(false);
            }
        });
    };

    const handleSubmitSchedule = () => {
        setLoadingSubmit(true);
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/marketing/submit-schedule",
            method: "POST",
            data: {
                id: data.post.id,
                schedule: scheduleData,
                language: language
            },
            success: () => {
                setLoadingSubmit(false);
                api.showMessage("Đã lưu lịch trình thành công", "success");
                if (onClose) onClose();
                if (onFinish) onFinish();
            },
            error: () => {
                setLoadingSubmit(false);
            }
        });
    };

    const handleReset = () => {
        setMission(initialBrandContext.mission || '');
        setCoreFeatures((initialBrandContext.core_features || []).join('\n'));
        setTargetAudience(initialBrandContext.target_audience || '');
        setBrandToneOfVoice(initialBrandContext.tone_of_voice || '');
        setPrimaryColor(initialBrandContext.primary_color || '');
        setPillars(initialBrandContext.pillars || []);
        setPillarsSummary(initialBrandContext.summary || '');
        setTopic('');
        setSuggestedTopics([]);
        setDuration('');
        setStartDate('');
        setPostsPerWeek('mỗi ngày 3 bài');
        setPlatforms(['Facebook']);
        setScheduleData([]);
        setStrategyAdvice('');
        setLanguage('Tiếng Việt');
        const hasPillarsOnReset =
            Array.isArray(initialBrandContext.pillars) && initialBrandContext.pillars.length > 0;
        setActiveStep(hasPillarsOnReset ? 1 : 0);
        setMaxStep(hasPillarsOnReset ? 1 : 0);
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            <Typography variant="h6" fontWeight="bold">
                                Dữ liệu chương trình marketing
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Thiết lập bối cảnh thương hiệu và trụ cột nội dung. Các dữ liệu này sẽ được dùng chung cho toàn bộ chiến dịch marketing, giúp AI hiểu rõ sản phẩm, trải nghiệm và tệp khách hàng mục tiêu.
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Sứ mệnh (Mission)"
                                        multiline
                                        minRows={3}
                                        value={mission}
                                        onChange={(e) => setMission(e.target.value)}
                                        helperText="Mô tả ngắn gọn sứ mệnh, giá trị cốt lõi của sản phẩm/chương trình."
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Tệp khách hàng mục tiêu"
                                        multiline
                                        minRows={3}
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Tone of voice"
                                        multiline
                                        minRows={2}
                                        value={brandToneOfVoice}
                                        onChange={(e) => setBrandToneOfVoice(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Màu sắc chủ đạo"
                                        multiline
                                        minRows={2}
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Tính năng cốt lõi / Content pillars"
                                        multiline
                                        minRows={5}
                                        value={coreFeatures}
                                        onChange={(e) => setCoreFeatures(e.target.value)}
                                        helperText="Mỗi dòng là một tính năng hoặc trụ cột nội dung quan trọng."
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleSuggestContentPillars}
                                            disabled={loadingSuggestPillars}
                                        >
                                            {loadingSuggestPillars ? 'Đang gợi ý...' : 'Gợi ý Content Pillars từ AI'}
                                        </Button>
                                    </Box>
                                </Grid>
                                {pillars.length > 0 && (
                                    <Grid item xs={12}>
                                        <Box
                                            sx={{
                                                mt: 1,
                                                p: 2.5,
                                                borderRadius: 2,
                                                border: '1px dashed',
                                                borderColor: 'primary.light',
                                                bgcolor: 'background.default',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 2,
                                            }}
                                        >
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                                Content Pillars được gợi ý
                                            </Typography>
                                            {pillarsSummary && (
                                                <Typography variant="body2" color="textSecondary">
                                                    {pillarsSummary}
                                                </Typography>
                                            )}

                                            <Grid container spacing={2}>
                                                {pillars.map((pillar, index) => {
                                                    const points = pillar.ratio ?? 0;
                                                    const percent = getPillarPercent(points);
                                                    return (
                                                        <Grid item xs={12} md={6} key={index}>
                                                            <Box
                                                                sx={{
                                                                    height: '100%',
                                                                    borderRadius: 2,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    bgcolor: 'background.paper',
                                                                    p: 2,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 1,
                                                                    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                                                                }}
                                                            >
                                                                <Typography variant="body1" fontWeight="bold">
                                                                    {pillar.title}
                                                                </Typography>
                                                                <Typography variant="body2" color="textSecondary">
                                                                    {pillar.description}
                                                                </Typography>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.75 }}>
                                                                        Màu hiển thị (calendar)
                                                                    </Typography>
                                                                    <Box
                                                                        sx={{
                                                                            display: 'flex',
                                                                            flexWrap: 'wrap',
                                                                            gap: 0.75,
                                                                            alignItems: 'center',
                                                                        }}
                                                                    >
                                                                        {PILLAR_COLOR_SWATCHES.map((hex) => {
                                                                            const selected = (pillar.color ?? '') === hex;
                                                                            return (
                                                                                <Box
                                                                                    key={hex}
                                                                                    onClick={() => setPillars((prev) => prev.map((p, i) => i === index ? { ...p, color: hex } : p))}
                                                                                    sx={{
                                                                                        width: 28,
                                                                                        height: 28,
                                                                                        minWidth: 28,
                                                                                        minHeight: 28,
                                                                                        boxSizing: 'border-box',
                                                                                        borderRadius: 1,
                                                                                        bgcolor: hex,
                                                                                        border: '3px solid',
                                                                                        borderColor: selected ? '#000' : 'rgba(0,0,0,0.1)',
                                                                                        boxShadow: selected ? '0 0 0 1px #000, 0 0 0 3px #fff' : 'none',
                                                                                        cursor: 'pointer',
                                                                                        flexShrink: 0,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                    }}
                                                                                    aria-label={`Chọn màu ${hex}`}
                                                                                >
                                                                                    {selected && (
                                                                                        <Icon
                                                                                            icon="Check"
                                                                                            sx={{ fontSize: 16, color: '#fff', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))' }}
                                                                                        />
                                                                                    )}
                                                                                </Box>
                                                                            );
                                                                        })}
                                                                    </Box>
                                                                </Box>
                                                                {pillar.example_post_title && (
                                                                    <Box
                                                                        sx={{
                                                                            mt: 0.5,
                                                                            p: 1,
                                                                            borderRadius: 1.5,
                                                                            bgcolor: 'primary.alpha12',
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="primary.main"
                                                                            sx={{ fontWeight: 600 }}
                                                                        >
                                                                            Ví dụ tiêu đề bài viết
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="body2"
                                                                            sx={{ mt: 0.25 }}
                                                                        >
                                                                            {pillar.example_post_title}
                                                                        </Typography>
                                                                    </Box>
                                                                )}

                                                                <Box sx={{ mt: 1 }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                                        <Typography variant="caption" color="textSecondary">
                                                                            Tỉ lệ: {percent}% ({points} điểm)
                                                                        </Typography>
                                                                    </Box>
                                                                    <Slider
                                                                        size="small"
                                                                        value={points}
                                                                        min={0}
                                                                        max={100}
                                                                        onChange={(_, value) => {
                                                                            const v = Array.isArray(value) ? value[0] : value;
                                                                            const safe = Math.max(0, Math.min(100, v ?? 0));
                                                                            setPillars((prev) => {
                                                                                const next = [...prev];
                                                                                next[index] = { ...next[index], ratio: safe };
                                                                                return next;
                                                                            });
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </Box>
                                                        </Grid>
                                                    );
                                                })}
                                            </Grid>

                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                                                    Tóm tắt tỉ lệ Content Pillars
                                                </Typography>
                                                {(() => {
                                                    const ranked = pillars
                                                        .map((pillar, index) => {
                                                            const points = pillar.ratio ?? 0;
                                                            const percent = getPillarPercent(points);
                                                            return { pillar, index, points, percent };
                                                        })
                                                        .sort((a, b) => b.percent - a.percent);

                                                    return (
                                                        <>
                                                            <Grid container spacing={1}>
                                                                {ranked.map(({ pillar, index, points, percent }, rank) => {
                                                                    let variant: 'h6' | 'body1' | 'body2' | 'caption' = 'body2';
                                                                    if (rank === 0) {
                                                                        variant = 'body1';
                                                                    } else if (rank === 1) {
                                                                        variant = 'body2';
                                                                    } else {
                                                                        variant = 'caption';
                                                                    }

                                                                    return (
                                                                        <Grid item xs={12} md={6} key={index}>
                                                                            <Typography variant={variant} color="textSecondary">
                                                                                <strong>{pillar.title}</strong>: {percent}% ({points} điểm)
                                                                            </Typography>
                                                                        </Grid>
                                                                    );
                                                                })}
                                                            </Grid>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ mt: 1, display: 'block' }}
                                                                color={totalPillarPoints > 0 ? 'success.main' : 'warning.main'}
                                                            >
                                                                Tổng điểm: {totalPillarPoints} (tỉ lệ phần trăm được chuẩn hóa theo tổng điểm)
                                                            </Typography>
                                                        </>
                                                    );
                                                })()}
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSubmitBrandContext}
                                disabled={loadingBrandContext}
                            >
                                {loadingBrandContext ? 'Đang lưu...' : 'Tiếp tục'}
                            </Button>
                        </Box>
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Nhóm 1: Thiết lập bối cảnh */}
                        <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                1. Thiết lập bối cảnh
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel id="language-label">Ngôn ngữ phản hồi</InputLabel>
                                        <Select
                                            labelId="language-label"
                                            value={language}
                                            label="Ngôn ngữ phản hồi"
                                            onChange={(e) => setLanguage(e.target.value as string)}
                                        >
                                            {languageOptions.map((opt) => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                                        Tạo ra một "xương sống" nội dung cho 7 ngày, 30 ngày hoặc hơn, giúp bạn nhìn thấy bức tranh toàn cảnh.
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="Seed Keyword"
                                        placeholder="ví dụ: Lập trình Flutter cho người mới, Học React Native"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        color="primary"
                                                        disabled={!topic || loadingSuggestTopic}
                                                        onClick={() => {
                                                            setLoadingSuggestTopic(true);
                                                            api.ajax({
                                                                url: "plugin/vn4-e-learning/app-mobile/marketing/suggest-topic",
                                                                data: { topic },
                                                                success: (res: ANY) => {
                                                                    setSuggestedTopics(Array.isArray(res) ? res : (res.topics || []));
                                                                    setLoadingSuggestTopic(false);
                                                                },
                                                                error: () => {
                                                                    setLoadingSuggestTopic(false);
                                                                }
                                                            });
                                                        }}
                                                        sx={{ borderRadius: 1, minWidth: 'max-content', textTransform: 'none' }}
                                                    >
                                                        {loadingSuggestTopic ? 'Đang gợi ý...' : 'Gợi ý từ AI'}
                                                    </Button>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    {suggestedTopics.length > 0 && (
                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Typography variant="body2" color="textSecondary">Chọn các chủ đề gợi ý (hệ thống sẽ tự thêm vào phía trên):</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {suggestedTopics.map((sTopic, i) => {
                                                    const currentTopics = topic.split(',').map(s => s.trim()).filter(s => s);
                                                    const isChecked = currentTopics.includes(sTopic);
                                                    return (
                                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: 1, px: 1, cursor: 'pointer', "&:hover": { backgroundColor: '#f5f5f5' } }} onClick={() => {
                                                            if (isChecked) {
                                                                setTopic(currentTopics.filter(t => t !== sTopic).join(', '));
                                                            } else {
                                                                setTopic([...currentTopics, sTopic].join(', '));
                                                            }
                                                        }}>
                                                            <Checkbox size="small" checked={isChecked} disableRipple sx={{ p: 0.5 }} />
                                                            <Typography variant="body2">{sTopic}</Typography>
                                                        </Box>
                                                    )
                                                })}
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        const currentTopics = topic.split(',').map(s => s.trim()).filter(s => s);
                                                        const newTopics = new Set([...currentTopics, ...suggestedTopics]);
                                                        setTopic(Array.from(newTopics).join(', '));
                                                    }}
                                                >
                                                    Chọn tất cả
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FieldForm
                                        component="date_picker"
                                        config={{ title: 'Ngày bắt đầu' }}
                                        name="start_date"
                                        post={{ start_date: startDate }}
                                        onReview={(value) => setStartDate(value ?? '')}
                                        data={data}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel id="duration-label">Thời lượng</InputLabel>
                                        <Select
                                            labelId="duration-label"
                                            value={duration}
                                            label="Thời lượng"
                                            onChange={(e) => setDuration(e.target.value)}
                                        >
                                            {durationOptions.map((opt) => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Nhóm 2: Phân bổ chủ đề */}
                        <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                2. Phân bổ chủ đề
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel id="postsPerWeek-label">Số bài viết / tuần</InputLabel>
                                        <Select
                                            labelId="postsPerWeek-label"
                                            value={postsPerWeek}
                                            label="Số bài viết / tuần"
                                            onChange={(e) => setPostsPerWeek(e.target.value as string)}
                                        >
                                            {postsPerWeekOptions.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel id="platforms-label">Nền tảng đăng</InputLabel>
                                        <Select
                                            labelId="platforms-label"
                                            multiple
                                            open={platformsOpen}
                                            onOpen={() => setPlatformsOpen(true)}
                                            onClose={() => setPlatformsOpen(false)}
                                            value={platforms}
                                            onChange={handlePlatformsChange}
                                            input={<OutlinedInput id="platforms-multiple-chip" label="Nền tảng đăng" />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip key={value} label={value} size="small" />
                                                    ))}
                                                </Box>
                                            )}
                                            MenuProps={MenuProps}
                                        >
                                            {platformOptions.map((opt) => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                            <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                                <Button
                                                    size="small"
                                                    fullWidth
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setPlatforms(platformOptions);
                                                        setPlatformsOpen(false);
                                                    }}
                                                >
                                                    Chọn tất cả
                                                </Button>
                                            </Box>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Box>

                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Nhấn "Tạo lịch bằng AI" để bắt đầu quá trình sinh nội dung. Quá trình này có thể mất vài phút.
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Button variant="outlined" onClick={handleBack} disabled={loadingSuggest}>
                                Quay lại bước 1
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSubmit}
                                disabled={loadingSuggest}
                            >
                                {loadingSuggest ? 'Đang tạo...' : 'Tạo lịch bằng AI'}
                            </Button>
                        </Box>
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Typography variant="h6">Chi tiết lịch trình tự động ({scheduleData.length} bài đăng)</Typography>

                        {strategyAdvice && (
                            <Box sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText', p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Lời khuyên chiến lược từ AI:</Typography>
                                <Typography variant="body2">{strategyAdvice}</Typography>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {scheduleData.map((item: ANY, index: number) => {
                                const dateStr = item.date ? new Date(item.date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
                                return (
                                    <Box key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                            <Typography variant="subtitle1" fontWeight="bold">{dateStr}</Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {item.platforms && item.platforms.map((p: string) => <Chip key={p} label={p} size="small" variant="outlined" />)}
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                                            {item.angle && (
                                                <Typography variant="caption" color="primary" fontWeight="600">
                                                    {item.angle}
                                                </Typography>
                                            )}
                                            {item.pillar != null && (
                                                <Chip
                                                    size="small"
                                                    label={typeof item.pillar === 'string' ? item.pillar : (item.pillar?.title ?? item.pillar)}
                                                    variant="filled"
                                                    color="secondary"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            )}
                                        </Box>
                                        <Typography variant="body1" fontWeight="bold">
                                            {item.headline_idea}
                                        </Typography>
                                        {item.key_points && (
                                            Array.isArray(item.key_points) ? (
                                                <Box component="ul" sx={{ pl: 3, my: 0.5 }}>
                                                    {item.key_points.map((kp: string, i: number) => (
                                                        <Typography key={i} component="li" variant="body2">
                                                            {kp}
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                    {item.key_points}
                                                </Typography>
                                            )
                                        )}
                                        {item.knowledge_base && (
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                                Nguồn kiến thức: {Array.isArray(item.knowledge_base) ? item.knowledge_base.join(', ') : item.knowledge_base}
                                            </Typography>
                                        )}
                                        {item.visual_brief && (
                                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>
                                                {item.visual_brief}
                                            </Typography>
                                        )}
                                        {item.cta && (
                                            <Typography variant="body2" fontStyle="italic" color="secondary" sx={{ mt: 0.5 }}>
                                                CTA: {item.cta}
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Button variant="outlined" onClick={handleBack} disabled={loadingSubmit}>
                                Quay lại
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleSubmitSchedule} disabled={loadingSubmit}>
                                {loadingSubmit ? 'Đang lưu...' : 'Submit schedule'}
                            </Button>
                        </Box>
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <DrawerCustom
            title="Lên lịch bằng AI"
            open={open}
            onClose={onClose}
            width={1300}
        >
            <Box sx={{ display: 'flex', height: '100%', gap: 3, pt: 2 }}>
                {/* Left Sidebar - Steps */}
                <Box sx={{ width: 250, minWidth: 250, borderRight: '1px solid #divider', pr: 3 }}>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        {steps.map((step, index) => (
                            <Step key={step.label} completed={index < maxStep}>
                                <StepLabel
                                    onClick={() => index <= maxStep && setActiveStep(index)}
                                    sx={{
                                        cursor: index <= maxStep ? 'pointer !important' : 'default',
                                        '& *': {
                                            cursor: index <= maxStep ? 'pointer !important' : 'default',
                                        },
                                        '& .MuiStepLabel-label': {
                                            fontWeight: index === activeStep ? 'bold' : 'normal',
                                            color: index > maxStep
                                                ? 'text.disabled'
                                                : (index > activeStep ? 'primary.light' : 'primary.main'),
                                            opacity: (index > activeStep && index <= maxStep) ? 0.6 : 1,
                                        },
                                        '& .MuiStepIcon-root': {
                                            color: index > maxStep
                                                ? 'text.disabled'
                                                : (index > activeStep ? 'primary.light' : 'primary.main'),
                                            opacity: (index > activeStep && index <= maxStep) ? 0.6 : 1,
                                            '&.Mui-active': {
                                                color: 'primary.main',
                                                opacity: 1,
                                            },
                                            '&.Mui-completed': {
                                                color: index > activeStep ? 'primary.light' : 'primary.main',
                                                opacity: (index > activeStep && index <= maxStep) ? 0.7 : 1,
                                            }
                                        },
                                        '&:hover': index <= maxStep ? {
                                            '& .MuiStepLabel-labelContainer': {
                                                opacity: 0.8
                                            }
                                        } : {}
                                    }}
                                    optional={
                                        <Typography variant="caption" sx={{
                                            color: index > maxStep ? 'text.disabled' : (index > activeStep ? 'primary.light' : 'text.secondary'),
                                            opacity: (index > activeStep && index <= maxStep) ? 0.6 : 1,
                                        }}>
                                            {step.description}
                                        </Typography>
                                    }
                                >
                                    {step.label}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button
                            variant="outlined"
                            color="inherit"
                            fullWidth
                            onClick={handleReset}
                            sx={{ textTransform: 'none' }}
                        >
                            Reset dữ liệu
                        </Button>
                    </Box>
                </Box>

                {/* Right Content Area */}
                <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', overflowY: 'auto', p: 1 }}>
                        {renderStepContent(activeStep)}
                    </Box>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
