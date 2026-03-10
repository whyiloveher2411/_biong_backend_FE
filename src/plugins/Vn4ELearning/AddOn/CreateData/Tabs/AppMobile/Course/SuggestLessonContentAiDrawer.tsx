import React from "react";
import {
    Box,
    Button,
    Stepper,
    Step,
    StepLabel,
    Typography,
    Grid,
    FormControlLabel,
    Checkbox,
    TextField,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import DrawerCustom from "components/molecules/DrawerCustom";
import TransslateField from "./TransslateField";
import FieldForm from "components/atoms/fields/FieldForm";
import useAjax from "hook/useApi";
import QuestionPreview from "./Common/QuestionPreview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

interface SuggestLessonContentAiDrawerProps {
    open: boolean;
    onClose: () => void;
    post: ANY;
    // Giữ kiểu lỏng giống StepIdentity để tương thích TransslateField
    onReview: ANY;
}

const styleGroups = [
    {
        key: "approach",
        title: "Cách tiếp cận (Approach)",
        styles: ["Thực tế", "Tương tác", "Truyền cảm hứng", "Sáng tạo", "Kể chuyện", "Thực chứng"],
    },
    {
        key: "tone",
        title: "Âm điệu (Tone)",
        styles: ["Chuyên nghiệp", "Gần gũi", "Hài hước", "Thân thiện", "Dễ thương", "Khích lệ", "Hàn lâm"],
    },
    {
        key: "depth",
        title: "Độ chi tiết (Depth)",
        styles: ["Chi tiết", "Ngắn gọn", "Tư duy", "Hành động"],
    },
    {
        key: "visuals",
        title: "Minh họa (Visuals)",
        styles: ["Trực quan", "Ví dụ minh họa", "Sử dụng icon và emoji"],
    },
];

const lessonSteps = [
    { label: "Identity", description: "Xác định thông tin bài học" },
    { label: "Scope", description: "Phạm vi & nguồn dữ liệu" },
    { label: "Assessment", description: "Thiết lập câu hỏi & flashcard" },
    { label: "Preview", description: "Xem trước & áp dụng" },
];

export default function SuggestLessonContentAiDrawer({
    open,
    onClose,
    post,
    onReview,
}: SuggestLessonContentAiDrawerProps) {
    const [step, setStep] = React.useState(0);
    const [sourceSummary, setSourceSummary] = React.useState("");
    const [extraRequirements, setExtraRequirements] = React.useState("");
    const [questionCount, setQuestionCount] = React.useState("");
    const [flashcardCount, setFlashcardCount] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [confirming, setConfirming] = React.useState(false);
    const { ajax } = useAjax();

    const handleClose = () => {
        setStep(0);
        onClose();
    };

    const handleNext = () => {
        if (step < 3) {
            setStep(prev => Math.min(prev + 1, 3));
            return;
        }
        handleClose();
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = () => {
        if (!post?.id) {
            handleClose();
            return;
        }

        setSubmitting(true);

        ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/ai/suggest-content-lesson-queue",
            method: "POST",
            data: {
                lesson_id: post.id,
                title: post.title,
                audience: post.audience,
                learning_outcome: post.learning_outcome,
                response_language: post.response_language,
                approach: post.approach,
                tone: post.tone,
                depth: post.depth,
                visuals: post.visuals,
                source_summary: sourceSummary,
                extra_requirements: extraRequirements,
                number_of_questions: questionCount,
                number_of_flashcards: flashcardCount,
            },
            success: (result: ANY) => {
                setSubmitting(false);
                if (result?.success) {
                    handleClose();
                } else if (result?.message) {
                    // eslint-disable-next-line no-alert
                    alert(result.message);
                }
            },
            error: () => {
                setSubmitting(false);
            },
        });
    };

    React.useEffect(() => {
        if (open && post?.suggest_status === "completed") {
            setStep(3);
        }
    }, [open, post?.suggest_status]);

    const handleConfirmAccept = () => {
        if (!post?.id) {
            handleClose();
            return;
        }
        setConfirming(true);
        ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/ai/confirm-accept-suggest-lesson",
            method: "POST",
            data: {
                lesson_id: post.id,
                course_ai_id: post.course_ai_id,
            },
            success: (result: ANY) => {
                setConfirming(false);
                if (result?.success) {
                    handleClose();
                } else if (result?.message) {
                    // eslint-disable-next-line no-alert
                    alert(result.message);
                }
            },
            error: () => {
                setConfirming(false);
            },
        });
    };

    const handleToggleStyle = (groupKey: string, style: string) => {
        const currentFieldStyles = (post[groupKey] || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);

        let nextStyles: string[];
        if (currentFieldStyles.includes(style)) {
            nextStyles = currentFieldStyles.filter((s: string) => s !== style);
        } else {
            nextStyles = [...currentFieldStyles, style];
        }

        onReview(nextStyles.join(", "), groupKey);
    };

    return (
        <DrawerCustom
            open={open}
            onClose={handleClose}
            title="Gợi ý nội dung bài học bằng AI"
            width={1900}
            restDialogContent={{
                sx: {
                    p: 0,
                    overflow: "hidden",
                },
            }}
        >
            <Box sx={{ display: "flex", height: "100%" }}>
                {/* Left sidebar steps */}
                <Box sx={{ width: 250, minWidth: 250, borderRight: "1px solid #e0e0e0", p: 2 }}>
                    <Stepper activeStep={step} orientation="vertical">
                        {lessonSteps.map((s, index) => (
                            <Step key={s.label} completed={index < step}>
                                <StepLabel
                                    onClick={() => setStep(index)}
                                    sx={{
                                        cursor: "pointer !important",
                                        "& *": { cursor: "pointer !important" },
                                        "& .MuiStepLabel-label": {
                                            fontWeight: index === step ? "bold" : "normal",
                                            color:
                                                index > step
                                                    ? "text.disabled"
                                                    : index > 0
                                                        ? "primary.light"
                                                        : "primary.main",
                                            opacity: index > step ? 0.6 : 1,
                                        },
                                        "& .MuiStepIcon-root": {
                                            color:
                                                index > step
                                                    ? "text.disabled"
                                                    : index > 0
                                                        ? "primary.light"
                                                        : "primary.main",
                                            opacity: index > step ? 0.6 : 1,
                                            "&.Mui-active": {
                                                color: "primary.main",
                                                opacity: 1,
                                            },
                                            "&.Mui-completed": {
                                                color: index > step ? "primary.light" : "primary.main",
                                                opacity: index > step ? 0.7 : 1,
                                            },
                                        },
                                    }}
                                    optional={
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: index > step ? "text.disabled" : "text.secondary",
                                                opacity: index > step ? 0.6 : 1,
                                            }}
                                        >
                                            {s.description}
                                        </Typography>
                                    }
                                >
                                    {s.label}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Box>

                {/* Right content */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
                    {step === 0 && (
                        <Box sx={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                1. Xác định thông tin bài học
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <TransslateField
                                        post={post}
                                        name="title"
                                        onReview={onReview}
                                        component="text"
                                        config={{
                                            title: false,
                                            primary_view: "text",
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{ fontWeight: "bold", mb: 1, color: "text.primary" }}
                                    >
                                        Ngôn ngữ phản hồi
                                    </Typography>
                                    <FieldForm
                                        post={post}
                                        name="response_language"
                                        onReview={(value: ANY) => onReview(value, "response_language")}
                                        component="text"
                                        config={{
                                            title: false,
                                            placeholder: "Ví dụ: Tiếng Việt, Tiếng Anh...",
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{ fontWeight: "bold", mb: 1.5, color: "text.primary" }}
                                    >
                                        Đối tượng bài học (Audience)
                                    </Typography>
                                    <FieldForm
                                        post={post}
                                        name="audience"
                                        onReview={(value: ANY) => onReview(value, "audience")}
                                        component="checkbox"
                                        config={{
                                            title: false,
                                            note: "Chọn đối tượng phù hợp nhất cho bài học này.",
                                            list_option: {
                                                student: { title: "Học sinh" },
                                                worker: { title: "Người đi làm" },
                                                senior: { title: "Senior muốn chuyển ngành" },
                                                all: { title: "Tất cả" },
                                            },
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{ fontWeight: "bold", mb: 1, color: "text.primary" }}
                                    >
                                        Mục tiêu học tập (Learning outcome)
                                    </Typography>
                                    <FieldForm
                                        post={post}
                                        name="learning_outcome"
                                        onReview={(value: ANY) => onReview(value, "learning_outcome")}
                                        component="textarea"
                                        config={{
                                            title: false,
                                            rows: 4,
                                            note: '"Sau bài học này, học viên sẽ nắm được..."',
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 3, p: 2.5, bgcolor: "#f1f5f9", borderRadius: 2, border: "1px solid #cbd5e1" }}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: "bold", mb: 2, color: "#0f172a" }}
                                >
                                    Phong cách &amp; Định hướng (Style &amp; Strategy)
                                </Typography>
                                <Grid container spacing={2}>
                                    {styleGroups.map(group => (
                                        <Grid item xs={12} sm={6} md={3} key={group.key}>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    height: "100%",
                                                    bgcolor: "#fff",
                                                    borderRadius: 1.5,
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <Typography
                                                    variant="overline"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: "primary.main",
                                                        display: "block",
                                                        mb: 1,
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    {group.title}
                                                </Typography>
                                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                    {group.styles.map(style => (
                                                        <FormControlLabel
                                                            key={style}
                                                            control={
                                                                <Checkbox
                                                                    checked={(post[group.key] || "")
                                                                        .split(",")
                                                                        .map((s: ANY) => s.trim())
                                                                        .includes(style)}
                                                                    onChange={() => handleToggleStyle(group.key, style)}
                                                                    size="small"
                                                                    sx={{ p: 0.5 }}
                                                                />
                                                            }
                                                            label={
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontSize: "0.8rem", fontWeight: 500 }}
                                                                >
                                                                    {style}
                                                                </Typography>
                                                            }
                                                            sx={{ m: 0 }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Box>
                    )}

                    {step === 1 && (
                        <Box sx={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                2. Phạm vi &amp; nguồn dữ liệu cho nội dung
                            </Typography>
                            <TextField
                                label="Tóm tắt nội dung nguồn (từ data crawl hoặc mô tả của bạn)"
                                fullWidth
                                multiline
                                minRows={4}
                                placeholder="Tóm tắt ngắn nội dung bài từ file JSON hoặc mô tả thêm cho AI..."
                                value={sourceSummary}
                                onChange={e => setSourceSummary(e.target.value)}
                            />
                            <TextField
                                label="Yêu cầu đặc biệt cho nội dung (tone, độ sâu, ví dụ, tránh điều gì...)"
                                fullWidth
                                multiline
                                minRows={3}
                                value={extraRequirements}
                                onChange={e => setExtraRequirements(e.target.value)}
                            />
                        </Box>
                    )}

                    {step === 2 && (
                        <Box sx={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                3. Thiết lập Assessment &amp; Flashcard
                            </Typography>
                            <TextField
                                label="Số lượng câu hỏi mong muốn"
                                fullWidth
                                size="small"
                                placeholder="VD: 5, 10 hoặc 'Không giới hạn'"
                                value={questionCount}
                                onChange={e => setQuestionCount(e.target.value)}
                            />
                            <TextField
                                label="Số lượng flashcards mong muốn"
                                fullWidth
                                size="small"
                                placeholder="VD: 10 hoặc 'Không giới hạn'"
                                value={flashcardCount}
                                onChange={e => setFlashcardCount(e.target.value)}
                            />
                        </Box>
                    )}

                    {step === 3 && (
                        <Box sx={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                4. Review nội dung AI gợi ý
                            </Typography>

                            {/* Welcome content suggest */}
                            <Box sx={{ p: 2, bgcolor: "#f0f7ff", borderRadius: 2, border: "1px solid #c2e0ff" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                                    Nội dung chào mừng (Welcome)
                                </Typography>
                                {post.welcom_content_suggest ? (
                                    <QuestionPreview
                                        question={
                                            typeof post.welcom_content_suggest === "object" &&
                                            !Array.isArray(post.welcom_content_suggest)
                                                ? post.welcom_content_suggest
                                                : { question_detail: post.welcom_content_suggest }
                                        }
                                    />
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                        Chưa có nội dung chào mừng được gợi ý.
                                    </Typography>
                                )}
                            </Box>

                            {/* Questions / assessment suggest */}
                            <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2, border: "1px solid #e5e7eb" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                                    Câu hỏi &amp; bài kiểm tra (Questions)
                                </Typography>
                                {post.question_detail_suggest ? (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        {(() => {
                                            let raw = post.question_detail_suggest as ANY;
                                            if (typeof raw === "string") {
                                                const trimmed = raw.trim();
                                                if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                                                    try {
                                                        raw = JSON.parse(trimmed);
                                                    } catch (e) {
                                                        // eslint-disable-next-line no-console
                                                        console.error("Failed to parse question_detail_suggest JSON", e);
                                                    }
                                                }
                                            }
                                            const list: ANY[] = Array.isArray(raw)
                                                ? raw
                                                : typeof raw === "object" && raw !== null
                                                    ? Object.values(raw)
                                                    : raw
                                                        ? [raw]
                                                        : [];

                                            return list.map((q, idx) => (
                                                <Box key={idx} sx={{ borderRadius: 1, border: "1px solid #e5e7eb", p: 2, bgcolor: "#ffffff" }}>
                                                    <Typography variant="overline" sx={{ fontWeight: "bold", color: "primary.main" }}>
                                                        Câu {idx + 1}
                                                    </Typography>
                                                    <QuestionPreview question={q} />
                                                </Box>
                                            ));
                                        })()}
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                        Chưa có câu hỏi được gợi ý.
                                    </Typography>
                                )}
                            </Box>

                            {/* Flashcards suggest */}
                            <Box sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 2, border: "1px solid #bbf7d0" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                                    Flashcards
                                </Typography>
                                {post.flashcards_suggest ? (
                                    <QuestionPreview
                                        question={{
                                            flashcards: post.flashcards_suggest,
                                        }}
                                    />
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                        Chưa có flashcard được gợi ý.
                                    </Typography>
                                )}
                            </Box>

                            {/* Recap content suggest */}
                            <Box sx={{ p: 2, bgcolor: "#fefce8", borderRadius: 2, border: "1px solid #facc15" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                                    Nội dung tóm tắt (Recap)
                                </Typography>
                                {post.recap_content_suggest ? (
                                    <QuestionPreview
                                        question={
                                            typeof post.recap_content_suggest === "object" &&
                                            !Array.isArray(post.recap_content_suggest)
                                                ? post.recap_content_suggest
                                                : { question_detail: post.recap_content_suggest }
                                        }
                                    />
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                        Chưa có nội dung tóm tắt được gợi ý.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                    </Box>

                    <Box sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #eee",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                    }}>
                        <Button disabled={step === 0 || submitting || confirming} onClick={handleBack}>
                            Quay lại
                        </Button>
                        {step === 2 && (
                            <LoadingButton
                                variant="contained"
                                loading={submitting}
                                onClick={handleSubmit}
                                disabled={confirming}
                            >
                                Gửi yêu cầu AI
                            </LoadingButton>
                        )}
                        {step === 3 && (
                            <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleClose}
                                    disabled={confirming}
                                >
                                    Đóng
                                </Button>
                                <LoadingButton
                                    variant="contained"
                                    color="success"
                                    loading={confirming}
                                    onClick={handleConfirmAccept}
                                >
                                    Xác nhận tạo data theo gợi ý
                                </LoadingButton>
                            </Box>
                        )}
                        {step < 2 && (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                disabled={submitting || confirming}
                            >
                                Tiếp tục
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </DrawerCustom>
    );
}


