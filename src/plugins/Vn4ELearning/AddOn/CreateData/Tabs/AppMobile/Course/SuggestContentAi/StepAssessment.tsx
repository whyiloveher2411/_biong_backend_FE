import { Box, Button, Typography, Paper, IconButton, Tooltip, TextField, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SendIcon from '@mui/icons-material/Send';
import ReactMarkdown from 'react-markdown';
import DrawerCustom from "components/molecules/DrawerCustom";
import useAjax from 'hook/useApi';
import QuestionPreview from '../Common/QuestionPreview';

interface StepAssessmentProps {
    post: ANY;
    onReview: (value: ANY, key: string) => void;
    onSyncAiData: (aiSuggest: ANY) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function StepAssessment({
    post,
    onReview,
    onSyncAiData,
    onNext,
    onBack
}: StepAssessmentProps) {

    const { ajax } = useAjax();
    const outline = post.outline || [];
    const [expandedLesson, setExpandedLesson] = useState<{ cIndex: number, lIndex: number } | null>(null);
    const [drawerData, setDrawerData] = useState<{ open: boolean, title: string, content: string }>({ open: false, title: '', content: '' });
    const [loadingAssessments, setLoadingAssessments] = useState<{ [key: string]: boolean }>({});
    const [loadingQuestions, setLoadingQuestions] = useState<{ [key: string]: boolean }>({});
    const [loadingExtra, setLoadingExtra] = useState<{ [key: string]: boolean }>({});
    const [updateKey, setUpdateKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [openChapterDrawer, setOpenChapterDrawer] = useState<number | null>(null);

    const postRef = useRef(post);
    useEffect(() => {
        postRef.current = post;
    }, [post]);

    const handleToggleExpand = (cIndex: number, lIndex: number) => {
        if (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) {
            setExpandedLesson(null);
        } else {
            setExpandedLesson({ cIndex, lIndex });
        }
    };

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

    const handleViewContent = (cIndex: number, lIndex: number, title: string) => {
        const lesson = outline[cIndex].lessons[lIndex];
        const content = lesson.content || (post.content?.[cIndex]?.[lIndex]?.content);
        setDrawerData({
            open: true,
            title: `Nội dung: ${title}`,
            content: extractContent(content) || '*Chưa có nội dung bài học.*'
        });
    };

    const handleGenerateAssessment = (cIndex: number, lIndex: number) => {
        const lesson = outline[cIndex].lessons[lIndex];
        const contentKey = `${cIndex}-${lIndex}`;

        setLoadingAssessments(prev => ({ ...prev, [contentKey]: true }));

        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step4',
            method: 'POST',
            data: {
                id: post.id,
                cIndex,
                lIndex,
                number_of_questions: lesson.number_of_questions || 'Không giới hạn (yêu cầu đầy dủ nội dung bài học)',
                lesson_title: lesson.title,
                lesson_content: lesson.content || (post.content?.[cIndex]?.[lIndex]?.content),
            },
            success: (result: ANY) => {
                console.log(`[DEBUG] handleGenerateAssessment success at ${new Date().toLocaleTimeString()}:`, result);
                setLoadingAssessments(prev => ({ ...prev, [contentKey]: false }));
                if (result.success) {
                    let newAssessment = '';
                    let newQuestions: ANY[] = [];

                    if (result.spacedev_course_ai_suggest) {
                        if (result.spacedev_course_ai_suggest.assessment) {
                            newAssessment = result.spacedev_course_ai_suggest.assessment;
                        }
                        if (result.spacedev_course_ai_suggest.questions) {
                            newQuestions = result.spacedev_course_ai_suggest.questions;
                        }
                    }

                    if (!newAssessment && result.assessment) {
                        newAssessment = result.assessment;
                    }
                    if (newQuestions.length === 0 && result.questions) {
                        newQuestions = result.questions;
                    }

                    // Convert string questions to objects or ensure proper structure
                    newQuestions = newQuestions.map((q: ANY) => {
                        if (typeof q === 'string') return { idea: q, answer: '', type: 'select_answer' };
                        return {
                            idea: q.idea || q.title || '',
                            answer: q.answer || '',
                            type: q.type || 'select_answer',
                            content: q.content || '',
                            question_detail: q.question_detail || null
                        };
                    });

                    // Update Outline for backward compatibility/summary if needed
                    if (newAssessment) {
                        const currentPost = postRef.current;
                        const newOutline = [...(currentPost.outline || [])];
                        newOutline[cIndex] = { ...newOutline[cIndex] };
                        newOutline[cIndex].lessons = [...newOutline[cIndex].lessons];
                        newOutline[cIndex].lessons[lIndex] = {
                            ...newOutline[cIndex].lessons[lIndex],
                            assessment: newAssessment
                        };
                        onReview(newOutline, 'outline');
                    }

                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                        setUpdateKey(prev => prev + 1);
                    } else if (newQuestions && Array.isArray(newQuestions)) {
                        const currentPost = postRef.current;
                        const newContent = currentPost.content ? [...currentPost.content] : [];
                        if (!newContent[cIndex]) newContent[cIndex] = [];
                        else newContent[cIndex] = [...newContent[cIndex]];

                        newContent[cIndex][lIndex] = {
                            ...(newContent[cIndex][lIndex] || {}),
                            questions: newQuestions
                        };
                        onReview(newContent, 'content');
                        setUpdateKey(prev => prev + 1);
                    }
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setLoadingAssessments(prev => ({ ...prev, [contentKey]: false }));
            }
        });
    };

    const handleGenerateExtraContent = (cIndex: number, lIndex: number, type: 'welcom_content' | 'recap_content') => {
        const extraKey = `${cIndex}-${lIndex}-${type}`;
        setLoadingExtra(prev => ({ ...prev, [extraKey]: true }));

        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step4-3',
            method: 'POST',
            data: {
                id: post.id,
                cIndex,
                lIndex,
                type: type === 'welcom_content' ? 'welcome' : 'recap',
            },
            success: (result: ANY) => {
                console.log(`[DEBUG] handleGenerateExtraContent (${type}) success:`, result);
                setLoadingExtra(prev => ({ ...prev, [extraKey]: false }));
                if (result.success) {
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                        setUpdateKey(prev => prev + 1);
                    } else if (result.content) {
                        const currentPost = postRef.current;
                        // Safe construction of newContent array
                        const newContent: ANY[] = Array.isArray(currentPost.content) ? [...currentPost.content] : [];
                        if (!Array.isArray(currentPost.content) && currentPost.content && typeof currentPost.content === 'object') {
                            Object.keys(currentPost.content).forEach(k => {
                                const idx = parseInt(k);
                                if (!isNaN(idx)) newContent[idx] = currentPost.content[k];
                            });
                        }

                        if (!newContent[cIndex]) newContent[cIndex] = [];

                        // Safe construction of chapter array
                        let currentChapter: ANY[] = Array.isArray(newContent[cIndex]) ? [...newContent[cIndex]] : [];
                        if (!Array.isArray(newContent[cIndex]) && typeof newContent[cIndex] === 'object' && newContent[cIndex] !== null) {
                            Object.keys(newContent[cIndex] || {}).forEach(k => {
                                const idx = parseInt(k);
                                if (!isNaN(idx)) currentChapter[idx] = newContent[cIndex][k];
                            });
                        }
                        newContent[cIndex] = currentChapter;

                        newContent[cIndex][lIndex] = {
                            ...(newContent[cIndex][lIndex] || {}),
                            [type]: result.content
                        };
                        onReview(newContent, 'content');
                        setUpdateKey(prev => prev + 1);
                    }
                } else if (result.message) {
                    alert(result.message);
                }
            },
            error: () => {
                setLoadingExtra(prev => ({ ...prev, [extraKey]: false }));
            }
        });
    };

    const handleGenerateQuestionContent = (cIndex: number, lIndex: number, qIndex: number) => {
        const lessonData = post.content?.[cIndex]?.[lIndex] || {};
        const questions = [...(lessonData.questions || [])];
        const rawQuestion = questions[qIndex];

        let question: ANY = { ...rawQuestion };
        if (typeof rawQuestion === 'string') {
            question = { idea: rawQuestion, answer: '', type: 'select_answer' };
        } else {
            if (!question.type) question.type = 'select_answer';
            if (!question.idea) question.idea = question.title || '';
            if (!question.answer) question.answer = '';
        }

        const qKey = `${cIndex}-${lIndex}-${qIndex}`;

        setLoadingQuestions(prev => ({ ...prev, [qKey]: true }));

        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step4-2',
            method: 'POST',
            data: {
                id: post.id,
                cIndex,
                lIndex,
                qIndex,
                question_type: question.type,
            },
            success: (result: ANY) => {
                console.log(`[DEBUG] handleGenerateQuestionContent success at ${new Date().toLocaleTimeString()}:`, result);
                setLoadingQuestions(prev => ({ ...prev, [qKey]: false }));
                if (result.success) {
                    if (result.spacedev_course_ai_suggest) {
                        console.log(`[${new Date().toLocaleTimeString()}] AI Global Sync Assessment:`, result.spacedev_course_ai_suggest);
                        onSyncAiData(result.spacedev_course_ai_suggest);
                        setUpdateKey(prev => prev + 1);
                    } else {
                        const newQuestionsContent = result.content || result.spacedev_course_ai_suggest?.content;
                        const questionDetail = result.question_detail || result.spacedev_course_ai_suggest?.question_detail;

                        if (newQuestionsContent || questionDetail || result.idea || result.answer) {
                            console.log(`[${new Date().toLocaleTimeString()}] AI Fallback Sync Assessment:`, result);
                            const currentPost = postRef.current;
                            const lessonData = currentPost.content?.[cIndex]?.[lIndex] || {};
                            const currentQuestions = [...(lessonData.questions || [])];

                            // Safe construction of newContent array
                            const newContent: ANY[] = Array.isArray(currentPost.content) ? [...currentPost.content] : [];
                            if (!Array.isArray(currentPost.content) && currentPost.content && typeof currentPost.content === 'object') {
                                Object.keys(currentPost.content).forEach(k => {
                                    const idx = parseInt(k);
                                    if (!isNaN(idx)) newContent[idx] = currentPost.content[k];
                                });
                            }

                            if (!newContent[cIndex]) newContent[cIndex] = [];

                            // Safe construction of chapter array
                            let currentChapter: ANY[] = Array.isArray(newContent[cIndex]) ? [...newContent[cIndex]] : [];
                            if (!Array.isArray(newContent[cIndex]) && typeof newContent[cIndex] === 'object' && newContent[cIndex] !== null) {
                                Object.keys(newContent[cIndex] || {}).forEach(k => {
                                    const idx = parseInt(k);
                                    if (!isNaN(idx)) currentChapter[idx] = newContent[cIndex][k];
                                });
                            }
                            newContent[cIndex] = currentChapter;

                            newContent[cIndex][lIndex] = {
                                ...newContent[cIndex][lIndex],
                                questions: currentQuestions.map((q, idx) => {
                                    if (idx === qIndex) {
                                        const normalizedQ = typeof q === 'string' ? { idea: q, answer: '', type: 'select_answer', content: '', question_detail: null } : { ...q };
                                        const updatedQ = {
                                            ...normalizedQ,
                                            idea: result.idea || normalizedQ.idea,
                                            answer: result.answer || normalizedQ.answer,
                                            type: result.type || normalizedQ.type || question.type,
                                            content: newQuestionsContent || normalizedQ.content,
                                            question_detail: questionDetail || normalizedQ.question_detail
                                        };
                                        return updatedQ;
                                    }
                                    return q;
                                })
                            };
                            console.log(`[DEBUG] StepAssessment onReview content (questions)`, newContent[cIndex][lIndex].questions[qIndex]);
                            onReview(newContent, 'content');
                            setUpdateKey(prev => prev + 1);
                        }
                    }
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setLoadingQuestions(prev => ({ ...prev, [qKey]: false }));
            }
        });
    };

    const handleUpdateQuestion = (cIndex: number, lIndex: number, qIndex: number, newQuestion: ANY) => {
        const currentPost = postRef.current;
        const newContent = currentPost.content ? [...currentPost.content] : [];
        if (!newContent[cIndex]) newContent[cIndex] = [];
        else newContent[cIndex] = [...newContent[cIndex]];

        const currentQuestions = [...(newContent[cIndex][lIndex]?.questions || [])];
        currentQuestions[qIndex] = newQuestion;

        newContent[cIndex][lIndex] = {
            ...newContent[cIndex][lIndex],
            questions: currentQuestions
        };
        onReview(newContent, 'content');
        setUpdateKey(prev => prev + 1);
    };

    const handleUpdateExtraContent = (cIndex: number, lIndex: number, type: 'welcom_content' | 'recap_content', newContentData: ANY) => {
        const currentPost = postRef.current;
        const newContent = currentPost.content ? [...currentPost.content] : [];
        if (!newContent[cIndex]) newContent[cIndex] = [];
        else newContent[cIndex] = [...newContent[cIndex]];

        newContent[cIndex][lIndex] = {
            ...newContent[cIndex][lIndex],
            [type]: newContentData
        };
        onReview(newContent, 'content');
        setUpdateKey(prev => prev + 1);
    };

    const handleTypeChange = (cIndex: number, lIndex: number, qIndex: number, type: string) => {
        const currentPost = postRef.current;
        const lessonData = currentPost.content?.[cIndex]?.[lIndex] || {};
        const questions = [...(lessonData.questions || [])];

        const newContent = currentPost.content ? [...currentPost.content] : [];
        if (!newContent[cIndex]) newContent[cIndex] = [];
        else newContent[cIndex] = [...newContent[cIndex]];

        newContent[cIndex][lIndex] = {
            ...newContent[cIndex][lIndex],
            questions: questions.map((q, idx) => {
                if (idx === qIndex) {
                    const normalizedQ = typeof q === 'string' ? { idea: q, answer: '', type: 'select_answer', content: '', question_detail: null } : q;
                    return { ...normalizedQ, type };
                }
                return q;
            })
        };
        onReview(newContent, 'content');
        setUpdateKey(prev => prev + 1);
    };

    const handleNextWithApi = () => {
        setSubmitting(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step4-4',
            method: 'POST',
            data: { id: post.id },
            success: (result: ANY) => {
                setSubmitting(false);
                if (result.success) {
                    onNext();
                } else if (result.message) {
                    alert(result.message);
                }
            },
            error: () => {
                setSubmitting(false);
            }
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Tạo bài kiểm tra (Assessment)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Điều chỉnh thông số bài tập cho từng bài học. Xem lại nội dung bài giảng nếu cần.
                </Typography>

                {outline.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                        Chưa có dữ liệu outline. Vui lòng quay lại bước trước để tạo.
                    </Typography>
                ) : (
                    outline.map((chapter: ANY, cIndex: number) => (
                        <Paper key={cIndex} sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }} elevation={0}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', flex: 1 }}>
                                    {cIndex + 1}. {chapter.title}
                                </Typography>
                                <IconButton size="small" onClick={() => setOpenChapterDrawer(cIndex)}>
                                    <VisibilityIcon fontSize="small" color={post.chapters?.[cIndex] ? 'primary' : 'inherit'} />
                                </IconButton>
                            </Box>

                            <Box sx={{ pl: 2 }}>
                                {chapter.lessons?.map((lesson: ANY, lIndex: number) => {
                                    const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                                    const rawQuestions = lessonData.questions || [];

                                    // ADDED: Log to track real-time content updates
                                    if (lessonData.welcom_content || lessonData.recap_content || rawQuestions.length > 0) {
                                        console.log(`[RENDER] Lesson ${cIndex}-${lIndex} data:`, {
                                            welcom: !!lessonData.welcom_content,
                                            recap: !!lessonData.recap_content,
                                            questions: rawQuestions.length,
                                            timestamp: new Date().toLocaleTimeString()
                                        });
                                    }

                                    const questions = (Array.isArray(rawQuestions) ? rawQuestions : Object.values(rawQuestions || {})).map((q: ANY) => {
                                        if (typeof q === 'string') return { idea: q, answer: '', type: 'select_answer', question_detail: null };
                                        return {
                                            ...q,
                                            idea: q.idea || q.title || '',
                                            answer: q.answer || '',
                                            type: q.type || 'select_answer',
                                            content: q.content || '',
                                            question_detail: q.question_detail || null
                                        };
                                    });
                                    const lessonContent = lesson.content || (post.content?.[cIndex]?.[lIndex]?.content);
                                    const hasAssessment = !!lesson.assessment || questions.length > 0 || !!lessonContent;
                                    const contentKey = `${cIndex}-${lIndex}`;
                                    const isGenerating = loadingAssessments[contentKey];

                                    return (
                                        <Box key={lIndex} sx={{
                                            mb: 1,
                                            p: 1.5,
                                            bgcolor: hasAssessment ? 'rgba(45, 206, 13, 0.08)' : 'background.default',
                                            borderRadius: 1,
                                            borderLeft: hasAssessment ? '5px solid #2dce0d' : '5px solid #ccc',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                        }}
                                            onClick={() => handleToggleExpand(cIndex, lIndex)}
                                        >
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                mb: (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) ? 1 : 0
                                            }}
                                            >
                                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) ? 'bold' : 'normal' }}
                                                    >
                                                        {lIndex + 1}. {stripLeadingNumber(lesson.title)}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {questions.length > 0 && (
                                                            <Tooltip title={`${questions.length} câu hỏi`}>
                                                                <Box sx={{ bgcolor: 'primary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                                                    Question: {questions.length}
                                                                </Box>
                                                            </Tooltip>
                                                        )}
                                                        {(() => {
                                                            const flashcards = lessonData.flashcards || lesson.flashcards;
                                                            let fCount = 0;
                                                            if (Array.isArray(flashcards)) fCount = flashcards.length;
                                                            else if (flashcards && typeof flashcards === 'string') fCount = 1; // Hoặc logic đếm dòng/markdown

                                                            return fCount > 0 ? (
                                                                <Tooltip title="Đã có Flashcard">
                                                                    <Box sx={{ bgcolor: 'secondary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                                                        Flashcard: {fCount}
                                                                    </Box>
                                                                </Tooltip>
                                                            ) : null;
                                                        })()}
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title="Xem nội dung bài học">
                                                        <IconButton
                                                            size="small"
                                                            color={lessonContent ? 'primary' : 'inherit'}
                                                            onClick={(e) => { e.stopPropagation(); handleViewContent(cIndex, lIndex, lesson.title); }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Điều chỉnh thông số">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); handleToggleExpand(cIndex, lIndex); }}
                                                        >
                                                            {expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>

                                            {expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex && (
                                                <Box sx={{ mt: 1, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #eee' }} onClick={(e) => e.stopPropagation()}>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Thông số bài giảng:</Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                            <TextField
                                                                fullWidth
                                                                label="Số lượng câu hỏi"
                                                                type="text"
                                                                size="small"
                                                                value={lesson.number_of_questions || 'Không giới hạn (yêu cầu đầy dủ nội dung bài học)'}
                                                                onChange={(e: ANY) => {
                                                                    const currentPost = postRef.current;
                                                                    const newOutline = [...(currentPost.outline || [])];
                                                                    newOutline[cIndex] = { ...newOutline[cIndex] };
                                                                    newOutline[cIndex].lessons = [...newOutline[cIndex].lessons];
                                                                    newOutline[cIndex].lessons[lIndex] = {
                                                                        ...newOutline[cIndex].lessons[lIndex],
                                                                        number_of_questions: e.target.value
                                                                    };
                                                                    onReview(newOutline, 'outline');
                                                                }}
                                                                placeholder="Nhập số lượng câu hỏi (ví dụ: 10)"
                                                                InputProps={{ inputProps: { min: 1, max: 20 } }}
                                                            />
                                                            <Button
                                                                variant="contained"
                                                                startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                                                                onClick={() => handleGenerateAssessment(cIndex, lIndex)}
                                                                disabled={isGenerating}
                                                                sx={{ height: 40, whiteSpace: 'nowrap', px: 2, minWidth: 'unset' }}
                                                            >
                                                                {isGenerating ? 'Đang tạo...' : 'Tạo outline câu hỏi'}
                                                            </Button>
                                                        </Box>
                                                    </Box>

                                                    {(lesson.assessment || questions.length > 0) && (
                                                        <Box sx={{ mt: 3, p: 1.5, bgcolor: '#dcdcdcff', borderRadius: 1, border: '1px dashed #ccc' }}>
                                                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>Danh sách câu hỏi:</Typography>
                                                            <Box sx={{ mt: 1 }}>
                                                                {questions.length > 0 ? (
                                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        {/* Welcome Content Button & Preview */}
                                                                        {/* Welcom Content Button & Preview */}
                                                                        <Paper sx={{ p: 2, variant: 'outlined', bgcolor: '#f0f7ff', border: '1px solid #c2e0ff', mb: 2 }}>
                                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Nội dung chào mừng (Welcom):</Typography>
                                                                                <Button
                                                                                    variant="contained"
                                                                                    size="small"
                                                                                    startIcon={loadingExtra[`${cIndex}-${lIndex}-welcom_content`] ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
                                                                                    onClick={() => handleGenerateExtraContent(cIndex, lIndex, 'welcom_content')}
                                                                                    disabled={loadingExtra[`${cIndex}-${lIndex}-welcom_content`]}
                                                                                >
                                                                                    {loadingExtra[`${cIndex}-${lIndex}-welcom_content`] ? 'Đang tạo...' : 'Tạo chi tiết'}
                                                                                </Button>
                                                                            </Box>
                                                                            {lessonData.welcom_content ? (
                                                                                <QuestionPreview
                                                                                    key={`welcom-${cIndex}-${lIndex}-${updateKey}`}
                                                                                    question={typeof lessonData.welcom_content === 'object' && !Array.isArray(lessonData.welcom_content) ? lessonData.welcom_content : { question_detail: lessonData.welcom_content }}
                                                                                    onUpdate={(newData) => handleUpdateExtraContent(cIndex, lIndex, 'welcom_content', newData)}
                                                                                    postId={post.id}
                                                                                    cIndex={cIndex}
                                                                                    lIndex={lIndex}
                                                                                />
                                                                            ) : (
                                                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Chưa có nội dung chào mừng.</Typography>
                                                                            )}
                                                                        </Paper>

                                                                        {questions.map((q: ANY, i: number) => {
                                                                            const qKey = `${cIndex}-${lIndex}-${i}`;
                                                                            const qLoading = loadingQuestions[qKey];
                                                                            return (
                                                                                <Paper key={i} sx={{ p: 2, variant: 'outlined', bgcolor: 'white' }}>
                                                                                    <Box sx={{ mb: 2 }}>
                                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Câu hỏi {i + 1}:</Typography>
                                                                                            <Typography variant="caption" color="text.secondary">Cập nhật: {new Date().toLocaleTimeString()}</Typography>
                                                                                        </Box>
                                                                                        <Typography variant="body1" sx={{ mt: 0.5, fontSize: 16 }}><strong>Idea:</strong> {q.idea}</Typography>
                                                                                        <Typography variant="body1" sx={{ mt: 0.5, fontSize: 16, color: 'text.secondary' }}><strong>Answer:</strong> {q.answer}</Typography>
                                                                                    </Box>
                                                                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                                                                            <InputLabel>Loại câu hỏi</InputLabel>
                                                                                            <Select
                                                                                                value={q.type || 'select_answer'}
                                                                                                label="Loại câu hỏi"
                                                                                                onChange={(e) => handleTypeChange(cIndex, lIndex, i, e.target.value)}
                                                                                            >
                                                                                                <MenuItem value="text">Văn bản (Text)</MenuItem>
                                                                                                <MenuItem value="image">Hình ảnh (Image)</MenuItem>
                                                                                                <MenuItem value="video">Video</MenuItem>
                                                                                                <MenuItem value="code">Mã nguồn (Code)</MenuItem>
                                                                                                <MenuItem value="parts">Điền chỗ trống (Parts)</MenuItem>
                                                                                                <MenuItem value="select_answer">Trắc nghiệm (Select Answer)</MenuItem>
                                                                                                <MenuItem value="select_answer_multi_choice">Trắc nghiệm (Select Answer Multi Choice)</MenuItem>
                                                                                                <MenuItem value="order_list">Sắp xếp (Order List)</MenuItem>
                                                                                                <MenuItem value="connect_block">Nối cặp (Connect Block)</MenuItem>
                                                                                            </Select>
                                                                                        </FormControl>
                                                                                        <Button
                                                                                            variant="contained"
                                                                                            size="small"
                                                                                            startIcon={qLoading ? <CircularProgress size={14} /> : <SendIcon fontSize="small" />}
                                                                                            onClick={() => handleGenerateQuestionContent(cIndex, lIndex, i)}
                                                                                            disabled={qLoading}
                                                                                        >
                                                                                            {qLoading ? 'Đang tạo...' : 'Tạo question chi tiết'}
                                                                                        </Button>
                                                                                    </Box>
                                                                                    {q.question_detail || q.content ? (
                                                                                        <QuestionPreview
                                                                                            key={`${i}-${updateKey}-${JSON.stringify(q).length}`}
                                                                                            question={q}
                                                                                            onUpdate={(newQ) => handleUpdateQuestion(cIndex, lIndex, i, newQ)}
                                                                                            postId={post.id}
                                                                                            cIndex={cIndex}
                                                                                            lIndex={lIndex}
                                                                                        />
                                                                                    ) : null}
                                                                                </Paper>
                                                                            );
                                                                        })}

                                                                        {/* Recap Content Button & Preview */}
                                                                        {/* Recap Content Button & Preview */}
                                                                        <Paper sx={{ p: 2, variant: 'outlined', bgcolor: '#f7fff0', border: '1px solid #daecc8', mt: 2 }}>
                                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>Nội dung tóm tắt (Recap):</Typography>
                                                                                <Button
                                                                                    variant="contained"
                                                                                    size="small"
                                                                                    color="success"
                                                                                    startIcon={loadingExtra[`${cIndex}-${lIndex}-recap_content`] ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
                                                                                    onClick={() => handleGenerateExtraContent(cIndex, lIndex, 'recap_content')}
                                                                                    disabled={loadingExtra[`${cIndex}-${lIndex}-recap_content`]}
                                                                                >
                                                                                    {loadingExtra[`${cIndex}-${lIndex}-recap_content`] ? 'Đang tạo...' : 'Tạo chi tiết'}
                                                                                </Button>
                                                                            </Box>
                                                                            {lessonData.recap_content ? (
                                                                                <QuestionPreview
                                                                                    key={`recap-${cIndex}-${lIndex}-${updateKey}`}
                                                                                    question={typeof lessonData.recap_content === 'object' && !Array.isArray(lessonData.recap_content) ? lessonData.recap_content : { question_detail: lessonData.recap_content }}
                                                                                    onUpdate={(newData) => handleUpdateExtraContent(cIndex, lIndex, 'recap_content', newData)}
                                                                                    postId={post.id}
                                                                                    cIndex={cIndex}
                                                                                    lIndex={lIndex}
                                                                                />
                                                                            ) : (
                                                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Chưa có nội dung tóm tắt.</Typography>
                                                                            )}
                                                                        </Paper>
                                                                    </Box>
                                                                ) : (
                                                                    <ReactMarkdown>
                                                                        {lesson.assessment}
                                                                    </ReactMarkdown>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Paper>
                    ))
                )}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #eee', p: 2 }}>
                <Button onClick={onBack} disabled={submitting}>Quay lại</Button>
                <Button
                    variant="contained"
                    onClick={handleNextWithApi}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    {submitting ? 'Đang xử lý...' : 'Tiếp tục'}
                </Button>
            </Box>

            <DrawerCustom
                activeOnClose
                open={drawerData.open}
                onClose={() => setDrawerData(prev => ({ ...prev, open: false }))}
                title={drawerData.title}
                width={800}
            >
                <Box sx={{
                    p: 3,
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
                    <ReactMarkdown>{drawerData.content}</ReactMarkdown>
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
