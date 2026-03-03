import { Box, Button, Typography, Paper, IconButton, Divider, Tooltip } from '@mui/material';
import { LoadingButton } from "@mui/lab";
import React, { useState } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DrawerCustom from "components/molecules/DrawerCustom";
import QuestionPreview from '../Common/QuestionPreview';
import ReactMarkdown from 'react-markdown';
import useAjax from 'hook/useApi';

interface StepExportProps {
    post: ANY;
    onBack: () => void;
    onFinish?: () => void;
}

export default function StepExport({ post, onBack, onFinish }: StepExportProps) {
    const { ajax } = useAjax();
    const [loading, setLoading] = useState(false);
    const outline = post.outline || [];
    const [previewDrawer, setPreviewDrawer] = useState<{ open: boolean, title: string, cIndex: number, lIndex: number, filter?: 'questions' | 'flashcards' | 'content' | 'all' } | null>(null);
    const [openChapterDrawer, setOpenChapterDrawer] = useState<number | null>(null);

    // Bỏ số thứ tự có sẵn trong title để hiển thị theo index
    const stripLeadingNumber = (s: string) => {
        if (!s || typeof s !== 'string') return s || '';
        const m = s.match(/^\d+\.\s*(.*)$/);
        return m ? m[1].trim() : s;
    };

    const extractContent = (data: ANY): string => {
        if (data === null || data === undefined) return '';
        if (typeof data === 'object' && !Array.isArray(data) && data !== null && 'content' in data && typeof data.content === 'string') {
            return data.content;
        }
        if (typeof data === 'string') {
            const trimmed = data.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(data);
                    const extracted = extractContent(parsed);
                    if (extracted) return extracted;
                } catch (e) {
                    return data;
                }
            }
            return data;
        }
        if (Array.isArray(data)) {
            if (data.length > 0) {
                return extractContent(data[0]);
            }
            return '';
        }
        return '';
    };

    const handleTogglePreview = (cIndex: number, lIndex: number, title: string, filter: 'questions' | 'flashcards' | 'content' | 'all' = 'all') => {
        setPreviewDrawer({
            open: true,
            title: filter === 'questions' ? `Câu hỏi: ${title}` : (filter === 'flashcards' ? `Flashcards: ${title}` : (filter === 'content' ? `Nội dung bài học: ${title}` : `Xem trước: ${title}`)),
            cIndex,
            lIndex,
            filter
        });
    };

    const getLessonCompletion = (cIndex: number, lIndex: number) => {
        const lessonData = post.content?.[cIndex]?.[lIndex] || {};
        const lessonOutline = outline[cIndex]?.lessons?.[lIndex] || {};

        const questions = lessonData.questions || [];
        const lessonContent = extractContent(lessonData.content || lessonOutline.content);
        const flashcards = lessonData.flashcards || lessonOutline.flashcards;

        let percentage = 0;
        const reasons: string[] = [];

        if (lessonContent) {
            percentage += 30;
        } else {
            reasons.push("Nội dung (30%)");
        }

        if (questions && questions.length > 0) {
            percentage += 50;
        } else {
            reasons.push("Câu hỏi (50%)");
        }

        if (flashcards && (Array.isArray(flashcards) ? flashcards.length > 0 : !!flashcards)) {
            percentage += 20;
        } else {
            reasons.push("Flashcard (20%)");
        }

        return { percentage, reasons };
    };

    const getChapterCompletion = (cIndex: number) => {
        const chapter = outline[cIndex];
        if (!chapter) return 0;

        let chapterContentPercentage = 0;
        if (post.chapters?.[cIndex]) {
            chapterContentPercentage = 10;
        }

        let lessonsPercentage = 0;
        if (chapter.lessons && chapter.lessons.length > 0) {
            let totalLessonPercentage = 0;
            chapter.lessons.forEach((_: ANY, lIndex: number) => {
                totalLessonPercentage += getLessonCompletion(cIndex, lIndex).percentage;
            });
            lessonsPercentage = (totalLessonPercentage / chapter.lessons.length) * 0.9;
        } else {
            // If no lessons, we can consider the lessons part as 100% completed or 0%
            // Based on user request "lesson hoàn thành tất cả (90%)", if no lessons exist, 
            // maybe it should be 90%? But usually, no lessons means incomplete if lessons are expected.
            // Let's assume 0% if lessons are expected but missing.
            lessonsPercentage = 0;
        }

        return Math.round(chapterContentPercentage + lessonsPercentage);
    };

    const getCourseCompletion = () => {
        if (!outline.length) return 0;
        let totalPercentage = 0;
        outline.forEach((_: ANY, cIndex: number) => {
            totalPercentage += getChapterCompletion(cIndex);
        });
        return Math.round(totalPercentage / outline.length);
    };

    const coursePercentage = getCourseCompletion();

    const handleFinish = () => {
        setLoading(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step6',
            method: 'POST',
            data: { id: post.id },
            success: (result: ANY) => {
                setLoading(false);
                // if (onFinish) onFinish();
            },
            error: () => {
                setLoading(false);
            }
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                    {post.title?.vi || post.title || 'Dữ liệu khóa học'}
                </Typography>

                {outline.map((chapter: ANY, cIndex: number) => (
                    <Box key={cIndex} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                    {cIndex + 1}. {chapter.title}
                                </Typography>
                                {(() => {
                                    const percentage = getChapterCompletion(cIndex);
                                    return (
                                        <Box sx={{
                                            bgcolor: percentage === 100 ? 'success.main' : 'warning.main',
                                            color: 'white',
                                            px: 1,
                                            py: 0.2,
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {percentage}%
                                        </Box>
                                    );
                                })()}
                            </Box>
                            <IconButton size="small" onClick={() => setOpenChapterDrawer(cIndex)}>
                                <VisibilityIcon fontSize="small" color={post.chapters?.[cIndex] ? 'primary' : 'inherit'} />
                            </IconButton>
                        </Box>

                        <Box sx={{ pl: 2 }}>
                            {chapter.lessons?.map((lesson: ANY, lIndex: number) => {
                                const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                                const questions = lessonData.questions || [];
                                const lessonContent = extractContent(lessonData.content || lesson.content);
                                const flashcards = lessonData.flashcards || lesson.flashcards;
                                const { percentage, reasons } = getLessonCompletion(cIndex, lIndex);
                                const isCompleted = percentage === 100;

                                return (
                                    <Box key={lIndex} sx={{ mb: 1 }}>
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                bgcolor: isCompleted ? 'rgba(45, 206, 13, 0.08)' : 'background.default',
                                                borderRadius: 1,
                                                borderLeft: isCompleted ? '5px solid #2dce0d' : '5px solid #ccc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                            elevation={0}
                                        >
                                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        {lIndex + 1}. {stripLeadingNumber(lesson.title)}
                                                    </Typography>
                                                    <Box sx={{
                                                        bgcolor: isCompleted ? 'success.main' : 'warning.main',
                                                        color: 'white',
                                                        px: 1,
                                                        py: 0.1,
                                                        borderRadius: 0.5,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {percentage}%
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {questions.length > 0 && (
                                                            <Tooltip title={`${questions.length} câu hỏi`}>
                                                                <Box
                                                                    onClick={(e) => { e.stopPropagation(); handleTogglePreview(cIndex, lIndex, lesson.title, 'questions'); }}
                                                                    sx={{
                                                                        bgcolor: 'primary.main',
                                                                        color: 'white',
                                                                        fontSize: '0.65rem',
                                                                        px: 0.6,
                                                                        py: 0.1,
                                                                        borderRadius: 0.5,
                                                                        fontWeight: 'bold',
                                                                        cursor: 'pointer',
                                                                        '&:hover': { opacity: 0.8 }
                                                                    }}
                                                                >
                                                                    Question: {questions.length}
                                                                </Box>
                                                            </Tooltip>
                                                        )}
                                                        {flashcards && (
                                                            <Tooltip title="Đã có Flashcard">
                                                                <Box
                                                                    onClick={(e) => { e.stopPropagation(); handleTogglePreview(cIndex, lIndex, lesson.title, 'flashcards'); }}
                                                                    sx={{
                                                                        bgcolor: 'secondary.main',
                                                                        color: 'white',
                                                                        fontSize: '0.65rem',
                                                                        px: 0.6,
                                                                        py: 0.1,
                                                                        borderRadius: 0.5,
                                                                        fontWeight: 'bold',
                                                                        cursor: 'pointer',
                                                                        '&:hover': { opacity: 0.8 }
                                                                    }}
                                                                >
                                                                    Flashcard: {Array.isArray(flashcards) ? flashcards.length : 1}
                                                                </Box>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </Box>
                                                {!isCompleted && (
                                                    <Typography variant="caption" color="error.main" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                                        Chưa hoàn thành: {reasons.join(', ')}
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    color={lessonContent ? 'primary' : 'inherit'}
                                                    onClick={(e) => { e.stopPropagation(); handleTogglePreview(cIndex, lIndex, lesson.title, 'content'); }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Paper>

                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ))}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #eee', p: 2, alignItems: 'center' }}>
                <Button onClick={onBack}>Quay lại</Button>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Course Progress:</Typography>
                        <Box sx={{
                            bgcolor: coursePercentage === 100 ? 'success.main' : 'warning.main',
                            color: 'white',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}>
                            {coursePercentage}%
                        </Box>
                    </Box>
                    <LoadingButton loading={loading} variant="contained" color="success" onClick={handleFinish}>
                        Hoàn tất
                    </LoadingButton>
                </Box>
            </Box>

            <DrawerCustom
                activeOnClose
                open={previewDrawer?.open || false}
                onClose={() => setPreviewDrawer(null)}
                title={previewDrawer?.title || ''}
                width={1600}
            >
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {previewDrawer && (() => {
                        const lessonData = post.content?.[previewDrawer.cIndex]?.[previewDrawer.lIndex] || {};
                        const questions = lessonData.questions || [];
                        const welcome = lessonData.welcom_content;
                        const recap = lessonData.recap_content;
                        const flashcards = lessonData.flashcards || (post.outline?.[previewDrawer.cIndex]?.lessons?.[previewDrawer.lIndex]?.flashcards);
                        const filter = previewDrawer.filter || 'all';
                        const lessonContent = lessonData.content || (post.outline?.[previewDrawer.cIndex]?.lessons?.[previewDrawer.lIndex]?.content);

                        return (
                            <>
                                {filter === 'content' && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main', fontSize: 24 }}>
                                            Nội dung bài học:
                                        </Typography>
                                        <Box sx={{
                                            p: 2,
                                            color: 'text.primary',
                                            '& h1': { fontSize: '1.5rem', fontWeight: 'bold', mb: 1, mt: 2 },
                                            '& h2': { fontSize: '1.25rem', fontWeight: 'bold', mb: 1, mt: 2 },
                                            '& h3': { fontSize: '1.1rem', fontWeight: 'bold', mb: 1, mt: 1.5 },
                                            '& p': { mb: 1.5, lineHeight: 1.6 },
                                            '& ul, & ol': { mb: 1.5, pl: 3 },
                                            '& li': { mb: 0.5 },
                                            '& code': { bgcolor: '#f5f5f5', p: 0.5, borderRadius: 1, fontFamily: 'monospace' },
                                            '& pre': { bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, overflowX: 'auto', mb: 1.5 },
                                            '& blockquote': { borderLeft: '4px solid #ccc', pl: 2, color: 'text.secondary', fontStyle: 'italic', my: 2 }
                                        }}>
                                            <ReactMarkdown>{extractContent(lessonContent) || '*Chưa có nội dung bài học.*'}</ReactMarkdown>
                                        </Box>
                                    </Box>
                                )}

                                {(filter === 'all' || filter === 'questions') && welcome && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main', fontSize: 24 }}>
                                            Chào mừng (Welcome):
                                        </Typography>
                                        <QuestionPreview question={typeof welcome === 'object' && !Array.isArray(welcome) ? welcome : { question_detail: welcome }} />
                                    </Box>
                                )}
                                {(filter === 'all' || filter === 'questions') && welcome && <Divider />}

                                {(filter === 'all' || filter === 'questions') && questions.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main', fontSize: 24 }}>
                                            Danh sách câu hỏi:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, backgroundColor: '#cececeff', p: 2, borderRadius: 2 }}>
                                            {questions.map((q: ANY, i: number) => (<Box key={i}>
                                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1, color: 'primary.main', fontSize: 24 }}>Câu hỏi {i + 1}</Typography>
                                                <QuestionPreview key={i} question={typeof q === 'string' ? { idea: q, type: 'select_answer' } : q} />
                                            </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                                {(filter === 'all' || filter === 'questions') && questions.length > 0 && <Divider />}
                                {(filter === 'all' || filter === 'questions') && recap && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'success.main', fontSize: 24 }}>
                                            Tóm tắt (Recap):
                                        </Typography>
                                        <QuestionPreview question={typeof recap === 'object' && !Array.isArray(recap) ? recap : { question_detail: recap }} />
                                    </Box>
                                )}

                                {(filter === 'all' || filter === 'flashcards') && flashcards && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'secondary.main', fontSize: 24 }}>
                                            Flashcards:
                                        </Typography>
                                        <QuestionPreview question={{ flashcards }} />
                                    </Box>
                                )}

                                {filter === 'all' && !welcome && questions.length === 0 && !recap && !flashcards && (
                                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                                        Chưa có nội dung để hiển thị.
                                    </Typography>
                                )}
                                {filter === 'questions' && questions.length === 0 && (
                                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                                        Chưa có danh sách câu hỏi.
                                    </Typography>
                                )}
                                {filter === 'flashcards' && !flashcards && (
                                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                                        Chưa có flashcards.
                                    </Typography>
                                )}
                            </>
                        );
                    })()}
                </Box>
            </DrawerCustom>

            <DrawerCustom
                activeOnClose
                open={openChapterDrawer !== null}
                onClose={() => setOpenChapterDrawer(null)}
                title={openChapterDrawer !== null ? `Nội dung chương ${openChapterDrawer + 1}: ${outline[openChapterDrawer].title}` : ''}
                width={1000}
            >
                <Box sx={{ p: 3 }}>
                    <Box
                        sx={{
                            minHeight: '200px',
                            p: 2,
                            border: '1px solid #eee',
                            borderRadius: 1,
                            '& h1, & h2, & h3': { mt: 2, mb: 1 },
                            '& p': { mb: 1.5, lineHeight: 1.6 }
                        }}
                    >
                        <ReactMarkdown>
                            {post.chapters?.[openChapterDrawer || 0] || '*Chưa có nội dung chương.*'}
                        </ReactMarkdown>
                    </Box>
                </Box>
            </DrawerCustom>
        </Box>
    );
}
