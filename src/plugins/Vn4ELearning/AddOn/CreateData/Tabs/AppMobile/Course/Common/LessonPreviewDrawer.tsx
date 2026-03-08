import { Box, Typography, Divider } from '@mui/material';
import React from 'react';
import DrawerCustom from 'components/molecules/DrawerCustom';
import QuestionPreview from './QuestionPreview';
import ReactMarkdown from 'react-markdown';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

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

export interface LessonPreviewDrawerProps {
    post: ANY;
    open: boolean;
    onClose: () => void;
    previewDrawer: { cIndex: number; lIndex: number; title: string; filter?: 'questions' | 'flashcards' | 'content' | 'all' } | null;
}

export default function LessonPreviewDrawer({ post, open, onClose, previewDrawer }: LessonPreviewDrawerProps) {
    const outline = post.outline || [];

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title={previewDrawer?.title || ''}
            width={1600}
        >
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {previewDrawer && (() => {
                    const lessonData = post.content?.[previewDrawer.cIndex]?.[previewDrawer.lIndex] || {};
                    const questions = lessonData.questions || [];
                    const welcome = lessonData.welcom_content;
                    const recap = lessonData.recap_content;
                    const flashcards = lessonData.flashcards || (outline?.[previewDrawer.cIndex]?.lessons?.[previewDrawer.lIndex]?.flashcards);
                    const filter = previewDrawer.filter || 'all';
                    const lessonContent = lessonData.content || (outline?.[previewDrawer.cIndex]?.lessons?.[previewDrawer.lIndex]?.content);

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
    );
}
