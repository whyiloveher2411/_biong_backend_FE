import { Box, Button, CircularProgress, Typography, Grid, FormControlLabel, Checkbox } from '@mui/material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import TransslateField from '../TransslateField';
import FieldForm from 'components/atoms/fields/FieldForm';
import useAjax from 'hook/useApi';
import { useState } from 'react';

interface StepIdentityProps {
    post: ANY;
    onReview: ANY;
    onNext: () => void;
    maxStep: number;
    onSyncAiData: (aiSuggest: ANY) => void;
}

export default function StepIdentity({ post, onReview, onNext, maxStep, onSyncAiData }: StepIdentityProps) {

    const { ajax } = useAjax();
    const [loading, setLoading] = useState(false);

    const profile = post.course_identity_profile || {};

    const styleGroups = [
        {
            key: 'approach',
            title: 'Cách tiếp cận (Approach)',
            styles: ['Thực tế', 'Tương tác', 'Truyền cảm hứng', 'Sáng tạo', 'Kể chuyện', 'Thực chứng']
        },
        {
            key: 'tone',
            title: 'Âm điệu (Tone)',
            styles: ['Chuyên nghiệp', 'Gần gũi', 'Hài hước', 'Thân thiện', 'Dễ thương', 'Khích lệ', 'Hàn lâm']
        },
        {
            key: 'depth',
            title: 'Độ chi tiết (Depth)',
            styles: ['Chi tiết', 'Ngắn gọn', 'Tư duy', 'Hành động']
        },
        {
            key: 'visuals',
            title: 'Minh họa (Visuals)',
            styles: ['Trực quan', 'Ví dụ minh họa', 'Sử dụng icon và emoji']
        }
    ];

    const handleToggleStyle = (groupKey: string, style: string) => {
        const currentFieldStyles = (post[groupKey] || '').split(',').map((s: string) => s.trim()).filter(Boolean);

        let nextStyles: string[];
        if (currentFieldStyles.includes(style)) {
            nextStyles = currentFieldStyles.filter((s: string) => s !== style);
        } else {
            nextStyles = [...currentFieldStyles, style];
        }

        onReview(nextStyles.join(', '), groupKey);
    };

    const handleSubmit = () => {
        console.log('[DEBUG] Submitting response_language:', post.response_language);
        setLoading(true);
        const data = {
            id: post.id,
            title: post.title,
            description: post.description,
            audience: post.audience,
            learning_outcome: post.learning_outcome,
            content_requirements: post.content_requirements || 'Hãy tưởng tượng là đang giảng dạy cho học viên có chỉ số IQ dưới mức trung bình',
            prerequisites: post.prerequisites,
            knowledge_base: post.knowledge_base,
            response_language: post.response_language,
            approach: post.approach,
            tone: post.tone,
            depth: post.depth,
            visuals: post.visuals,
            course_identity_profile: profile
        };
        console.log('[DEBUG] StepIdentity handleSubmit data:', data);

        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step1',
            method: 'POST',
            data: data,
            success: (result: ANY) => {
                setLoading(false);
                if (result.success) {
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                    }
                    onNext();
                } else {
                    if (result.message) {
                        alert(result.message);
                    }
                }
            },
            error: () => {
                setLoading(false);
            }
        });
    };


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Section 1: Course Identity */}
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    1. Danh tính khóa học (Course Identity)
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
                                primary_view: "text"
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>Ngôn ngữ phản hồi</Typography>
                        <FieldForm
                            post={post}
                            name="response_language"
                            onReview={(value) => onReview(value, "response_language")}
                            component="text"
                            config={{
                                title: false,
                                placeholder: "Ví dụ: Tiếng Việt, Tiếng Anh...",
                            }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>Mô tả tổng quan (Description)</Typography>
                        <FieldForm
                            post={post}
                            name="description"
                            onReview={(value) => onReview(value, "description")}
                            component="textarea"
                            config={{
                                title: false,
                                note: "Mô tả tổng quan về khóa học giúp AI hiểu ngữ cảnh tốt hơn.",
                                rows: 3
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Section 2: Learner Orientation */}
            <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>
                    2. Định hướng người học (Learner Orientation)
                </Typography>
                <Grid container spacing={5}>
                    <Grid item xs={12} md={5}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.primary' }}>Đối tượng mục tiêu (Audience)</Typography>
                        <FieldForm
                            post={post}
                            name="audience"
                            onReview={(value) => onReview(value, "audience")}
                            component="checkbox"
                            config={{
                                title: false,
                                note: "Chọn đối tượng phù hợp nhất cho khóa học này.",
                                list_option: {
                                    student: { title: "Học sinh" },
                                    worker: { title: "Người đi làm" },
                                    senior: { title: "Senior muốn chuyển ngành" },
                                    all: { title: "Tất cả" },
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={7}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>Kết quả đào tạo (Learning Outcome)</Typography>
                        <FieldForm
                            post={post}
                            name="learning_outcome"
                            onReview={(value) => onReview(value, "learning_outcome")}
                            component="textarea"
                            config={{
                                title: false,
                                note: "\"Sau khóa học này, học viên sẽ nắm vững...\"",
                                rows: 5
                            }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>Yêu cầu nội dung (Content Requirements)</Typography>
                        <FieldForm
                            post={post}
                            name="content_requirements"
                            onReview={(value) => onReview(value, "content_requirements")}
                            component="textarea"
                            config={{
                                title: false,
                                note: "Thêm hướng dẫn đặc biệt cho AI. VD: Tưởng tượng đang hướng dẫn cho người có chỉ số IQ dưới trung bình (để AI tạo nội dung dễ hiểu hơn).",
                                placeholder: "VD: Giải thích như đang nói chuyện với người mới bắt đầu, dùng ví dụ đời thường...",
                                rows: 3
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Section 3: Supporting Resources */}
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 4, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1 }}>
                    3. Tài nguyên bổ trợ (Supporting Resources)
                </Typography>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>Yêu cầu đầu vào (Prerequisites)</Typography>
                        <FieldForm
                            post={post}
                            name="prerequisites"
                            onReview={(value) => onReview(value, "prerequisites")}
                            component="textarea"
                            config={{
                                title: false,
                                note: "Kiến thức cần có trước khi bắt đầu bài học.",
                                rows: 4
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>Dữ liệu đào tạo chuyên sâu (Knowledge Base)</Typography>
                        <FieldForm
                            post={post}
                            name="knowledge_base"
                            onReview={(value) => onReview(value, "knowledge_base")}
                            component="asset-file"
                            config={{
                                title: false,
                                note: "Upload PDF/Docx để AI học theo phong cách riêng của bạn (RAG).",
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Section 4: Style & Strategy */}
            <Box sx={{ p: 3, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #cbd5e1' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>
                    4. Phong cách & Định hướng (Style & Strategy)
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Grid container spacing={2}>
                            {styleGroups.map((group) => (
                                <Grid item xs={12} sm={6} md={3} key={group.title}>
                                    <Box sx={{ p: 2, height: '100%', bgcolor: '#fff', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 1, lineHeight: 1.2 }}>
                                            {group.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {group.styles.map((style) => (
                                                <FormControlLabel
                                                    key={style}
                                                    control={
                                                        <Checkbox
                                                            checked={(post[group.key] || '').split(',').map((s: ANY) => s.trim()).includes(style)}
                                                            onChange={() => handleToggleStyle(group.key, style)}
                                                            size="small"
                                                            sx={{ p: 0.5 }}
                                                        />
                                                    }
                                                    label={<Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{style}</Typography>}
                                                    sx={{ m: 0 }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
                </Grid>
            </Box>

            {/* Navigation Section */}
            <Box sx={{ mt: 2, pt: 3, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                {maxStep > 0 && (
                    <Button
                        variant="outlined"
                        onClick={onNext}
                    >
                        Bỏ qua
                    </Button>
                )}
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    size="large"
                    endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowRightAltIcon />}
                    disabled={loading}
                    sx={{ px: 4 }}
                >
                    {loading ? 'Đang xử lý...' : (maxStep > 0 ? 'Cập nhật & Tiếp tục' : 'Tạo Outline Khóa Học')}
                </Button>
            </Box>
        </Box>
    );
}

