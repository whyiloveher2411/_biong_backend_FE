import { Box, Button, Typography, Paper, IconButton, Divider, Tooltip } from '@mui/material';
import React, { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DrawerCustom from "components/molecules/DrawerCustom";
import QuestionPreview from '../Common/QuestionPreview';

import ReactMarkdown from 'react-markdown';

interface StepExportProps {
    post: ANY;
    onBack: () => void;
}

export default function StepExport({ post, onBack }: StepExportProps) {
    const outline = post.outline || [];
    const [expandedLesson, setExpandedLesson] = useState<{ cIndex: number, lIndex: number } | null>(null);
    const [previewDrawer, setPreviewDrawer] = useState<{ open: boolean, title: string, cIndex: number, lIndex: number } | null>(null);

    const handleToggleExpand = (cIndex: number, lIndex: number) => {
        if (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) {
            setExpandedLesson(null);
        } else {
            setExpandedLesson({ cIndex, lIndex });
        }
    };

    const handleTogglePreview = (cIndex: number, lIndex: number, title: string) => {
        setPreviewDrawer({
            open: true,
            title: `Xem trước: ${title}`,
            cIndex,
            lIndex
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
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                            {chapter.title}
                        </Typography>

                        <Box sx={{ pl: 2 }}>
                            {chapter.lessons?.map((lesson: ANY, lIndex: number) => {
                                const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                                const questions = lessonData.questions || [];
                                const welcome = lessonData.welcom_content;
                                const recap = lessonData.recap_content;
                                const lessonContent = lessonData.content || lesson.content;
                                const flashcards = lessonData.flashcards || lesson.flashcards;
                                const hasQuestions = questions.length > 0;
                                const hasFlashcards = !!flashcards;
                                const hasAnyContent = !!welcome || !!recap || hasQuestions || hasFlashcards || !!lessonContent;
                                const isExpanded = expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex;

                                return (
                                    <Box key={lIndex} sx={{ mb: 1 }}>
                                        <Paper
                                            sx={{
                                                p: 1.5,
                                                bgcolor: hasAnyContent ? 'rgba(45, 206, 13, 0.08)' : 'background.default',
                                                borderRadius: 1,
                                                borderLeft: hasAnyContent ? '5px solid #2dce0d' : '5px solid #ccc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: (hasQuestions || hasFlashcards) ? 'pointer' : 'default',
                                                '&:hover': (hasQuestions || hasFlashcards) ? { bgcolor: hasAnyContent ? 'rgba(45, 206, 13, 0.12)' : '#f0f0f0' } : {}
                                            }}
                                            elevation={0}
                                            onClick={() => (hasQuestions || hasFlashcards) && handleToggleExpand(cIndex, lIndex)}
                                        >
                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: isExpanded ? 'bold' : 'normal' }}>
                                                    {lIndex + 1}. {lesson.title}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {questions.length > 0 && (
                                                        <Tooltip title={`${questions.length} câu hỏi`}>
                                                            <Box sx={{ bgcolor: 'primary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold' }}>
                                                                Question: {questions.length}
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                    {flashcards && (
                                                        <Tooltip title="Đã có Flashcard">
                                                            <Box sx={{ bgcolor: 'secondary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold' }}>
                                                                Flashcard: {Array.isArray(flashcards) ? flashcards.length : 1}
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={(e) => { e.stopPropagation(); handleTogglePreview(cIndex, lIndex, lesson.title); }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                                {(hasQuestions || hasFlashcards) && (
                                                    <IconButton size="small">
                                                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </Paper>

                                        {isExpanded && (welcome || hasQuestions || recap || hasFlashcards) && (
                                            <Box sx={{ pl: 4, pt: 1, pb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {welcome && (
                                                    <Paper
                                                        sx={{
                                                            p: 1.2,
                                                            bgcolor: '#f5f5f5',
                                                            borderRadius: 1,
                                                            border: '1px solid #eee',
                                                            borderLeft: '4px solid #ff9800',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        elevation={0}
                                                    >
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '0.8125rem' }}>
                                                            [Welcome Content]
                                                        </Typography>
                                                    </Paper>
                                                )}

                                                {questions.map((q: ANY, qIndex: number) => (
                                                    <Paper
                                                        key={qIndex}
                                                        sx={{
                                                            p: 1.2,
                                                            bgcolor: '#fcfcfc',
                                                            borderRadius: 1,
                                                            border: '1px solid #eee',
                                                            borderLeft: '3px solid #1976d2',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                        elevation={0}
                                                    >
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                                                            Question {qIndex + 1}: {typeof q === 'string' ? q : q.idea}
                                                        </Typography>
                                                        {typeof q !== 'string' && q.type && (
                                                            <Typography variant="caption" sx={{ ml: 1, bgcolor: '#e3f2fd', px: 1, borderRadius: 1, color: 'primary.main', fontWeight: 'bold' }}>
                                                                {q.type}
                                                            </Typography>
                                                        )}
                                                    </Paper>
                                                ))}

                                                {flashcards && (
                                                    <Paper
                                                        sx={{
                                                            p: 1.2,
                                                            bgcolor: '#f5f5f5',
                                                            borderRadius: 1,
                                                            border: '1px solid #eee',
                                                            borderLeft: '4px solid #9c27b0',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        elevation={0}
                                                    >
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '0.8125rem' }}>
                                                            [Flashcards]
                                                        </Typography>
                                                    </Paper>
                                                )}

                                                {recap && (
                                                    <Paper
                                                        sx={{
                                                            p: 1.2,
                                                            bgcolor: '#f5f5f5',
                                                            borderRadius: 1,
                                                            border: '1px solid #eee',
                                                            borderLeft: '4px solid #4caf50',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        elevation={0}
                                                    >
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '0.8125rem' }}>
                                                            [Recap Content]
                                                        </Typography>
                                                    </Paper>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ))}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #eee', p: 2 }}>
                <Button onClick={onBack}>Quay lại</Button>
                <Button variant="contained" color="success">
                    Hoàn tất
                </Button>
            </Box>

            <DrawerCustom
                activeOnClose
                open={previewDrawer?.open || false}
                onClose={() => setPreviewDrawer(null)}
                title={previewDrawer?.title || ''}
                width={800}
            >
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {previewDrawer && (() => {
                        const lessonData = post.content?.[previewDrawer.cIndex]?.[previewDrawer.lIndex] || {};
                        const questions = lessonData.questions || [];
                        const welcome = lessonData.welcom_content;
                        const recap = lessonData.recap_content;
                        const flashcards = lessonData.flashcards || (post.outline?.[previewDrawer.cIndex]?.lessons?.[previewDrawer.lIndex]?.flashcards);

                        return (
                            <>
                                {welcome && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main', fontSize: 24 }}>
                                            Chào mừng (Welcome):
                                        </Typography>
                                        <QuestionPreview question={typeof welcome === 'object' && !Array.isArray(welcome) ? welcome : { question_detail: welcome }} />
                                    </Box>
                                )}
                                <Divider />

                                {questions.length > 0 && (
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
                                <Divider />
                                {recap && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'success.main', fontSize: 24 }}>
                                            Tóm tắt (Recap):
                                        </Typography>
                                        <QuestionPreview question={typeof recap === 'object' && !Array.isArray(recap) ? recap : { question_detail: recap }} />
                                    </Box>
                                )}

                                {flashcards && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'secondary.main', fontSize: 24 }}>
                                            Flashcards:
                                        </Typography>
                                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                            <ReactMarkdown>{typeof flashcards === 'string' ? flashcards : JSON.stringify(flashcards, null, 2)}</ReactMarkdown>
                                        </Paper>
                                    </Box>
                                )}

                                {!welcome && questions.length === 0 && !recap && !flashcards && (
                                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                                        Chưa có nội dung để hiển thị.
                                    </Typography>
                                )}
                            </>
                        );
                    })()}
                </Box>
            </DrawerCustom>
        </Box>
    );
}
