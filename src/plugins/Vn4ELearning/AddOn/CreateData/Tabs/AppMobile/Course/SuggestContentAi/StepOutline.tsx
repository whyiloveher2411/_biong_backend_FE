import { Box, Button, Typography, Grid, FormControlLabel, Checkbox, TextField, CircularProgress } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import Markdown from 'components/atoms/Markdown';
import { useState } from 'react';
import useAjax from 'hook/useApi';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

export default function StepOutline({ onNext, onBack, post, onReview, onSyncAiData, maxStep }: { onNext: () => void, onBack: () => void, post: ANY, onReview: ANY, onSyncAiData: (aiSuggest: ANY) => void, maxStep: number }) {

    const [newKeyword, setNewKeyword] = useState('');
    const { ajax } = useAjax();
    const [loading, setLoading] = useState(false);

    // Use local references for rendering to avoid mutations
    const profile = post.course_identity_profile || {};
    const keywords = Array.isArray(profile.keywords) ? profile.keywords : [];

    const handleAddKeyword = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newKeyword.trim()) {
            const currentKeywords = keywords;
            if (!currentKeywords.includes(newKeyword.trim())) {
                const updatedProfile = {
                    ...profile,
                    keywords: [...currentKeywords, newKeyword.trim()]
                };
                onReview(updatedProfile, 'course_identity_profile');
            }
            setNewKeyword('');
        }
    };

    const handleToggleKeyword = (keyword: string) => {
        const updatedProfile = {
            ...profile,
            keywords: keywords.filter((k: string) => k !== keyword)
        };
        onReview(updatedProfile, 'course_identity_profile');
    };

    const handleSubmit = () => {
        setLoading(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step2',
            method: 'POST',
            data: {
                id: post.id,
                course_identity_profile: profile
            },
            success: (result: ANY) => {
                setLoading(false);
                if (result.success) {
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                    } else if (result.outline) {
                        onReview(result.outline, 'outline');
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {post.style && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #cbd5e1' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1, textTransform: 'uppercase' }}>
                            Phong cách bài học (Refined Style)
                        </Typography>
                        <Markdown className="markdown-style">
                            {post.style}
                        </Markdown>
                    </Box>
                )}
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Định hướng nội dung (Content Strategy)</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FieldForm
                                post={profile}
                                name="targets"
                                onReview={(value) => onReview({ ...profile, targets: value }, 'course_identity_profile')}
                                component="textarea"
                                config={{
                                    title: "Mục tiêu bài học (Targets)",
                                    rows: 3
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Từ khóa (Keywords)</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                {keywords.map((keyword: string, index: number) => (
                                    <FormControlLabel
                                        key={index}
                                        control={
                                            <Checkbox
                                                checked={true}
                                                onChange={() => handleToggleKeyword(keyword)}
                                                name={keyword}
                                                color="primary"
                                                size="small"
                                            />
                                        }
                                        label={keyword}
                                    />
                                ))}
                            </Box>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Nhập từ khóa và ấn Enter..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={handleAddKeyword}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Cấu trúc khóa học (Course Structure)</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <FieldForm
                                post={profile}
                                name="number_of_chapters"
                                onReview={(value) => onReview({ ...profile, number_of_chapters: value }, 'course_identity_profile')}
                                component="text"
                                config={{
                                    title: "Số lượng chương",
                                    note: "Số lượng chương dự kiến."
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FieldForm
                                post={profile}
                                name="number_of_lessons_per_chapter"
                                onReview={(value) => onReview({ ...profile, number_of_lessons_per_chapter: value }, 'course_identity_profile')}
                                component="text"
                                config={{
                                    title: "Số bài học/chương",
                                    note: "VD: 3-5 bài"
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FieldForm
                                post={profile}
                                name="estimated_duration"
                                onReview={(value) => onReview({ ...profile, estimated_duration: value }, 'course_identity_profile')}
                                component="text"
                                config={{
                                    title: "Thời lượng dự kiến",
                                    note: "VD: 4 weeks, 10 hours"
                                }}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={onBack}>Quay lại</Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {maxStep > 1 && (
                        <Button
                            variant="outlined"
                            onClick={onNext}
                        >
                            Bỏ qua và đến bước tiếp theo
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowRightAltIcon />}
                        disabled={loading}
                    >
                        {loading ? 'Đang xử lý...' : (maxStep > 1 ? 'Cập nhật & Tiếp tục' : 'Tạo Outline')}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
