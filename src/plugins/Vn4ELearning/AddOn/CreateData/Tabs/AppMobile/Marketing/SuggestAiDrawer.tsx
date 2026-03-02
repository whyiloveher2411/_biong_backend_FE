import React, { useState } from 'react';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { Box, TextField, MenuItem, Button, Typography, Select, FormControl, InputLabel, Grid, Stepper, Step, StepLabel, OutlinedInput, Chip, SelectChangeEvent, Checkbox, InputAdornment, Autocomplete, Paper } from '@mui/material';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';

interface SuggestAiDrawerProps {
    open: boolean;
    onClose: () => void;
    onFinish?: () => void;
    data: CreatePostTypeData;
}

const steps = [
    { label: 'Thiết lập bối cảnh', description: 'Chủ đề, mục tiêu, đối tượng' },
    { label: 'Phân bổ chủ đề', description: 'Tần suất và nền tảng' },
    { label: 'Tối ưu hóa giờ đăng', description: 'Smart Scheduling' },
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

const objectiveOptions = [
    "Tăng nhận diện thương hiệu (Branding)",
    "Tìm kiếm học viên/khách hàng mới (Lead Gen)",
    "Tăng tương tác cộng đồng (Engagement)",
    "Chia sẻ kiến thức chuyên môn (Authority)"
];

const audienceOptions = [
    "Sinh viên IT / Newbie",
    "Người đang đi làm (Junior/Mid-level)",
    "Người muốn chuyển ngành (Non-tech)",
    "Nhà tuyển dụng / Quản lý dự án",
    "Tất cả đối tượng",
];

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

const postTimeOptions = [
    "Sáng sớm (07:00 - 09:00)",
    "Nghỉ trưa (11:30 - 13:30)",
    "Giờ vàng tối (20:00 - 22:00)",
    "Không giới hạn khung giờ",
    "AI Tự động tối ưu (Dựa trên data cũ)"
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

const contentTypeRatioOptions = [
    "80% Kiến thức - 20% Quảng cáo",
    "50% Kiến thức - 50% Giải trí",
    "Tùy chỉnh (AI tự đề xuất)"
];

const toneOfVoiceOptions = [
    "Chuyên nghiệp & Đĩnh đạc",
    "Thân thiện & Gần gũi",
    "Hài hước & Bắt trend",
    "Sâu sắc & Triết lý",
    "Tùy chỉnh (AI tự đề xuất)"
];

const languageOptions = [
    "Tiếng Việt",
    "English"
];

export default function SuggestAiDrawer({ open, onClose, onFinish, data }: SuggestAiDrawerProps) {
    const api = useAjax();
    const [activeStep, setActiveStep] = useState(0);
    const [maxStep, setMaxStep] = useState(0);

    // Step 1 State
    const [topic, setTopic] = useState('');
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [loadingSuggestTopic, setLoadingSuggestTopic] = useState(false);
    const [objective, setObjective] = useState<string[]>([]);
    const [audience, setAudience] = useState<string[]>([]);
    const [duration, setDuration] = useState('');
    const [language, setLanguage] = useState('Tiếng Việt');

    // Step 2 State
    const [postsPerWeek, setPostsPerWeek] = useState('');
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [contentTypeRatio, setContentTypeRatio] = useState('');

    // Step 3 State
    const [postTime, setPostTime] = useState<string[]>([]);
    const [toneOfVoice, setToneOfVoice] = useState('');

    // Step 4 State
    const [scheduleData, setScheduleData] = useState<ANY[]>([]);
    const [strategyAdvice, setStrategyAdvice] = useState<string>('');
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    const [objectiveOpen, setObjectiveOpen] = useState(false);
    const [audienceOpen, setAudienceOpen] = useState(false);
    const [platformsOpen, setPlatformsOpen] = useState(false);
    const [postTimeOpen, setPostTimeOpen] = useState(false);

    const handlePlatformsChange = (event: SelectChangeEvent<typeof platforms>) => {
        const {
            target: { value },
        } = event;
        setPlatforms(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handlePostTimeChange = (event: SelectChangeEvent<typeof postTime>) => {
        const {
            target: { value },
        } = event;
        setPostTime(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleNext = () => {
        setActiveStep((prevActiveStep) => {
            const nextStep = prevActiveStep + 1;
            if (nextStep > maxStep) {
                setMaxStep(nextStep);
            }
            return nextStep;
        });
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSubmit = () => {
        const finalTopicArray = topic.split(',').map(s => s.trim()).filter(s => s);

        setLoadingSuggest(true);
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/marketing/schedule",
            method: "POST",
            data: {
                id: data.post.id,
                topic: finalTopicArray,
                objective,
                audience,
                duration,
                postsPerWeek,
                platforms,
                contentTypeRatio,
                postTime,
                toneOfVoice,
                language
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
        setTopic('');
        setSuggestedTopics([]);
        setObjective([]);
        setAudience([]);
        setDuration('');
        setPostsPerWeek('');
        setPlatforms([]);
        setContentTypeRatio('');
        setPostTime([]);
        setToneOfVoice('');
        setScheduleData([]);
        setStrategyAdvice('');
        setLanguage('Tiếng Việt');
        setActiveStep(0);
        setMaxStep(0);
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                                    label="Chủ đề chính"
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
                            <Grid item xs={12}>
                                <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    freeSolo
                                    open={objectiveOpen}
                                    onOpen={() => setObjectiveOpen(true)}
                                    onClose={() => setObjectiveOpen(false)}
                                    options={objectiveOptions}
                                    value={objective}
                                    onChange={(event, newValue) => setObjective(newValue as string[])}
                                    renderInput={(params) => <TextField {...params} label="Mục tiêu" placeholder="Nhập hoặc chọn mục tiêu..." />}
                                    PaperComponent={(paperProps) => {
                                        const { children, ...rest } = paperProps;
                                        return (
                                            <Paper {...rest}>
                                                {children}
                                                <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                                    <Button
                                                        size="small"
                                                        fullWidth
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setObjective(objectiveOptions);
                                                            setObjectiveOpen(false);
                                                        }}
                                                    >
                                                        Chọn tất cả
                                                    </Button>
                                                </Box>
                                            </Paper>
                                        );
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    freeSolo
                                    open={audienceOpen}
                                    onOpen={() => setAudienceOpen(true)}
                                    onClose={() => setAudienceOpen(false)}
                                    options={audienceOptions}
                                    value={audience}
                                    onChange={(event, newValue) => setAudience(newValue as string[])}
                                    renderInput={(params) => <TextField {...params} label="Đối tượng" placeholder="Thêm đối tượng..." />}
                                    PaperComponent={(paperProps) => {
                                        const { children, ...rest } = paperProps;
                                        return (
                                            <Paper {...rest}>
                                                {children}
                                                <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                                    <Button
                                                        size="small"
                                                        fullWidth
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setAudience(audienceOptions);
                                                            setAudienceOpen(false);
                                                        }}
                                                    >
                                                        Chọn tất cả
                                                    </Button>
                                                </Box>
                                            </Paper>
                                        );
                                    }}
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

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Button variant="contained" color="primary" onClick={handleNext}>
                                Tiếp tục
                            </Button>
                        </Box>
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="contentTypeRatio-label">Tỷ lệ nội dung</InputLabel>
                                    <Select
                                        labelId="contentTypeRatio-label"
                                        value={contentTypeRatio}
                                        label="Tỷ lệ nội dung"
                                        onChange={(e) => setContentTypeRatio(e.target.value as string)}
                                    >
                                        {contentTypeRatioOptions.map((opt) => (
                                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
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

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Button variant="outlined" onClick={handleBack}>
                                Quay lại
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleNext}>
                                Tiếp tục
                            </Button>
                        </Box>
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="postTime-label">Khung giờ ưu tiên</InputLabel>
                                    <Select
                                        labelId="postTime-label"
                                        multiple
                                        open={postTimeOpen}
                                        onOpen={() => setPostTimeOpen(true)}
                                        onClose={() => setPostTimeOpen(false)}
                                        value={postTime}
                                        onChange={handlePostTimeChange}
                                        input={<OutlinedInput id="posttime-multiple-chip" label="Khung giờ ưu tiên" />}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {selected.map((value) => (
                                                    <Chip key={value} label={value} size="small" />
                                                ))}
                                            </Box>
                                        )}
                                        MenuProps={MenuProps}
                                    >
                                        {postTimeOptions.map((opt) => (
                                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                        ))}
                                        <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                            <Button
                                                size="small"
                                                fullWidth
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setPostTime(postTimeOptions);
                                                    setPostTimeOpen(false);
                                                }}
                                            >
                                                Chọn tất cả
                                            </Button>
                                        </Box>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="toneOfVoice-label">Tone of voice</InputLabel>
                                    <Select
                                        labelId="toneOfVoice-label"
                                        value={toneOfVoice}
                                        label="Tone of voice"
                                        onChange={(e) => setToneOfVoice(e.target.value as string)}
                                    >
                                        {toneOfVoiceOptions.map((opt) => (
                                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Nhấn "Tạo lịch bằng AI" để bắt đầu quá trình sinh nội dung. Quá trình này có thể mất vài phút.
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Button variant="outlined" onClick={handleBack} disabled={loadingSuggest}>
                                Quay lại
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loadingSuggest}>
                                {loadingSuggest ? 'Đang tạo...' : 'Tạo lịch bằng AI'}
                            </Button>
                        </Box>
                    </Box>
                );
            case 3:
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
                            {scheduleData.map((item, index) => (
                                <Box key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1" fontWeight="bold">Ngày {item.day} - {item.time}</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {item.platforms && item.platforms.map((p: string) => <Chip key={p} label={p} size="small" variant="outlined" />)}
                                        </Box>
                                    </Box>
                                    <Typography variant="body1" color="primary" fontWeight="bold">
                                        [{item.content_type}] {item.topic_idea}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line' }}>
                                        {item.content_detail}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {item.hashtags && (Array.isArray(item.hashtags) ? item.hashtags : item.hashtags.split(' ')).map((tag: string) => <Chip key={tag} label={tag} size="small" />)}
                                    </Box>
                                    <Typography variant="body2" fontStyle="italic" color="secondary">
                                        CTA: {item.cta}
                                    </Typography>
                                </Box>
                            ))}
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
