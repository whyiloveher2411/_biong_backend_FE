import { Box, Button, Chip, Typography, Paper, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import React, { useState, useRef, useEffect } from 'react';
import useAjax from 'hook/useApi';
import ReactMarkdown from 'react-markdown';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LessonPreviewDrawer from '../Common/LessonPreviewDrawer';
import { pollCheckQueue } from '../Common/checkQueue';

interface StepContentProps {
    post: ANY;
    onReview: ANY;
    onSyncAiData: (aiSuggest: ANY) => void;
    content: string;
    setContent: (content: string) => void;
    addAssessment: string;
    setAddAssessment: (value: string) => void;
    onNext: () => void;
    onBack: () => void;
    setActiveStep: (step: number) => void;
    onRefresh?: () => void;
    dataVersion?: number;
}

export default function StepContent({
    post,
    onReview,
    onSyncAiData,
    onNext,
    onBack,
    setActiveStep,
    onRefresh,
    dataVersion = 0
}: StepContentProps) {

    const outline = post.outline || [];
    const [editing, setEditing] = useState<{ type: 'chapter' | 'lesson' | 'lesson-content', cIndex: number, lIndex?: number } | null>(null);
    const [editValue, setEditValue] = useState('');
    const { ajax } = useAjax();
    const [generatingLessons, setGeneratingLessons] = useState<Set<string>>(new Set());
    const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
    const [generatingAllLessons, setGeneratingAllLessons] = useState<Set<number>>(new Set());
    const [completedLessonJobs, setCompletedLessonJobs] = useState<Set<string>>(new Set());
    const [completedChapterJobs, setCompletedChapterJobs] = useState<Set<number>>(new Set());
    const [expandedLesson, setExpandedLesson] = useState<{ cIndex: number, lIndex: number } | null>(null);
    const [openChapterDrawer, setOpenChapterDrawer] = useState<number | null>(null);
    const [addLessonAt, setAddLessonAt] = useState<{ cIndex: number, insertAfter: number } | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [addingLesson, setAddingLesson] = useState(false);
    const [savingChapterTitle, setSavingChapterTitle] = useState(false);
    const [savingLessonTitle, setSavingLessonTitle] = useState(false);
    const [previewDrawer, setPreviewDrawer] = useState<{ title: string, cIndex: number, lIndex: number, filter?: 'questions' | 'flashcards' } | null>(null);

    const postRef = useRef(post);
    const cancelPollsRef = useRef<Map<string, () => void>>(new Map());
    const cancelChapterPollRef = useRef<(() => void) | null>(null);
    const cancelAllLessonsPollsRef = useRef<Map<number, () => void>>(new Map());

    useEffect(() => {
        postRef.current = post;
    }, [post]);

    useEffect(() => () => {
        cancelPollsRef.current.forEach((cancel) => cancel());
        cancelPollsRef.current.clear();
        cancelChapterPollRef.current?.();
        cancelAllLessonsPollsRef.current.forEach((cancel) => cancel());
        cancelAllLessonsPollsRef.current.clear();
    }, []);

    const [updatedLessons, setUpdatedLessons] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (dataVersion > 0) {
            setUpdatedLessons({});
            setCompletedLessonJobs(new Set());
            setCompletedChapterJobs(new Set());
        }
    }, [dataVersion]);

    // Simple force update
    const [, forceUpdate] = useState(0);
    const refresh = () => forceUpdate(prev => prev + 1);

    // Bỏ số thứ tự có sẵn trong title để hiển thị theo index
    const stripLeadingNumber = (s: string) => {
        if (!s || typeof s !== 'string') return s || '';
        const m = s.match(/^\d+\.\s*(.*)$/);
        return m ? m[1].trim() : s;
    };

    const handleEditStart = (type: 'chapter' | 'lesson' | 'lesson-content', cIndex: number, lIndex?: number, currentValue?: string) => {
        setEditing({ type, cIndex, lIndex });
        setEditValue(currentValue || '');
    };

    const handleEditSave = () => {
        if (!editing) return;

        if (editing.type === 'chapter') {
            setSavingChapterTitle(true);
            ajax({
                url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3-edit-title-chapter',
                method: 'POST',
                data: {
                    id: post.id,
                    chapter_index: editing.cIndex,
                    title: editValue,
                },
                success: (result: ANY) => {
                    setSavingChapterTitle(false);
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                    } else {
                        const newOutline = outline.map((chapter: ANY, index: number) => {
                            if (index === editing.cIndex) {
                                return { ...chapter, title: editValue };
                            }
                            return chapter;
                        });
                        onReview(newOutline, 'outline');
                    }
                    setEditing(null);
                    setEditValue('');
                    refresh();
                },
                error: () => {
                    setSavingChapterTitle(false);
                }
            });
            return;
        }

        if (editing.type === 'lesson' && typeof editing.lIndex === 'number') {
            setSavingLessonTitle(true);
            ajax({
                url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3-edit-lesson',
                method: 'POST',
                data: {
                    id: post.id,
                    chapter_index: editing.cIndex,
                    lesson_index: editing.lIndex,
                    title: editValue,
                },
                success: (result: ANY) => {
                    setSavingLessonTitle(false);
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                    } else {
                        const newOutline = outline.map((chapter: ANY, index: number) => {
                            if (index === editing.cIndex) {
                                const newChapter = { ...chapter };
                                newChapter.lessons = chapter.lessons.map((lesson: ANY, lIdx: number) => {
                                    if (lIdx === editing.lIndex) {
                                        return { ...lesson, title: editValue };
                                    }
                                    return lesson;
                                });
                                return newChapter;
                            }
                            return chapter;
                        });
                        onReview(newOutline, 'outline');
                    }
                    setEditing(null);
                    setEditValue('');
                    refresh();
                },
                error: () => {
                    setSavingLessonTitle(false);
                }
            });
            return;
        }

        const newOutline = outline.map((chapter: ANY, index: number) => {
            if (index === editing.cIndex && typeof editing.lIndex === 'number') {
                const newChapter = { ...chapter };
                newChapter.lessons = chapter.lessons.map((lesson: ANY, lIdx: number) => {
                    if (lIdx === editing.lIndex) {
                        const newLesson = { ...lesson };
                        if (editing.type === 'lesson-content') {
                            newLesson.content = editValue;
                            setUpdatedLessons(prev => ({ ...prev, [`${editing.cIndex}-${editing.lIndex}`]: editValue }));
                        }
                        return newLesson;
                    }
                    return lesson;
                });
                return newChapter;
            }
            return chapter;
        });

        onReview(newOutline, 'outline');
        setEditing(null);
        setEditValue('');
    };

    const handleDelete = (type: 'chapter' | 'lesson', cIndex: number, lIndex?: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;

        let newOutline = [...outline];
        if (type === 'chapter') {
            newOutline = newOutline.filter((_, idx) => idx !== cIndex);
        } else if (type === 'lesson' && typeof lIndex === 'number') {
            newOutline = newOutline.map((chapter: ANY, idx: number) => {
                if (idx === cIndex) {
                    return {
                        ...chapter,
                        lessons: chapter.lessons.filter((_: ANY, lIdx: number) => lIdx !== lIndex)
                    };
                }
                return chapter;
            });
        }

        onReview(newOutline, 'outline');
        refresh();
    };

    const processStep3Result = (result: ANY, cIndex: number, lIndex: number) => {
        if (result.spacedev_course_ai_suggest) {
            onSyncAiData(result.spacedev_course_ai_suggest);
            setExpandedLesson({ cIndex, lIndex });
            refresh();
            return;
        }

        let newContent = result.content;

        if (result.spacedev_course_ai_suggest && result.spacedev_course_ai_suggest.content) {
            let fullContent = result.spacedev_course_ai_suggest.content;
            if (typeof fullContent === 'string' && (fullContent.trim().startsWith('[') || fullContent.trim().startsWith('{'))) {
                try {
                    fullContent = JSON.parse(fullContent);
                } catch (e) {
                    console.error("Error parsing spacedev_course_ai_suggest.content", e);
                }
            }
            if (Array.isArray(fullContent) && fullContent[cIndex] !== undefined) {
                if (Array.isArray(fullContent[cIndex]) && fullContent[cIndex][lIndex] !== undefined) {
                    newContent = fullContent[cIndex][lIndex];
                } else {
                    newContent = fullContent[cIndex];
                }
            } else {
                newContent = fullContent;
            }
        }

        if (newContent) {
            const contentKey = `${cIndex}-${lIndex}`;
            setUpdatedLessons(prev => ({ ...prev, [contentKey]: newContent }));

            const currentPost = postRef.current;
            const newOutline = [...(currentPost.outline || [])];
            if (newOutline[cIndex]) {
                newOutline[cIndex] = { ...newOutline[cIndex] };
                if (newOutline[cIndex].lessons) {
                    newOutline[cIndex].lessons = [...newOutline[cIndex].lessons];
                    if (newOutline[cIndex].lessons[lIndex]) {
                        newOutline[cIndex].lessons[lIndex] = {
                            ...newOutline[cIndex].lessons[lIndex],
                            content: newContent
                        };
                    }
                }
            }
            onReview(newOutline, 'outline');

            let currentContent = currentPost.content || [];
            if (!Array.isArray(currentContent)) currentContent = [];
            const newContentStructure = [...currentContent];
            if (!newContentStructure[cIndex]) newContentStructure[cIndex] = [];
            if (!Array.isArray(newContentStructure[cIndex])) newContentStructure[cIndex] = [];
            const currentLessonContentObj = newContentStructure[cIndex][lIndex] || {};
            newContentStructure[cIndex][lIndex] = { ...currentLessonContentObj, content: newContent };
            onReview(newContentStructure, 'content');
            setExpandedLesson({ cIndex, lIndex });
            refresh();
        } else {
            // alert('AI không trả về nội dung nào.');
        }
    };

    const handleGenerateContent = (cIndex: number, lIndex: number, lesson: ANY) => {
        const key = `${cIndex}-${lIndex}`;
        setGeneratingLessons(prev => new Set(prev).add(key));
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3',
            method: 'POST',
            data: {
                id: post.id,
                title: lesson.title,
                chapter_index: cIndex,
                lesson_index: lIndex,
                index: lIndex
            },
            success: (result: ANY) => {
                if (result.job_id != null) {
                    const cancel = pollCheckQueue(ajax, Number(result.job_id), {
                        onCompleted: () => {
                            cancelPollsRef.current.delete(key);
                            setGeneratingLessons(prev => {
                                const next = new Set(prev);
                                next.delete(key);
                                return next;
                            });
                            setCompletedLessonJobs(prev => new Set(prev).add(key));
                        },
                        onFailed: () => {
                            cancelPollsRef.current.delete(key);
                            setGeneratingLessons(prev => {
                                const next = new Set(prev);
                                next.delete(key);
                                return next;
                            });
                        }
                    });
                    cancelPollsRef.current.set(key, cancel);
                    return;
                }
                setGeneratingLessons(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
                if (result.success) {
                    processStep3Result(result, cIndex, lIndex);
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setGeneratingLessons(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }
        });
    };

    const processChapterResult = (result: ANY, cIndex: number) => {
        if (result.spacedev_course_ai_suggest) {
            onSyncAiData(result.spacedev_course_ai_suggest);
            refresh();
            return;
        }
        const newChapters = Array.isArray(post.chapters) ? [...post.chapters] : [];
        newChapters[cIndex] = result.content;
        onReview(newChapters, 'chapters');
        refresh();
    };

    const handleGenerateChapterContent = (cIndex: number) => {
        setGeneratingChapter(cIndex);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3-generate-content-chapter',
            method: 'POST',
            data: {
                id: post.id,
                chapter_index: cIndex,
                index: cIndex
            },
            success: (result: ANY) => {
                if (result.job_id != null) {
                    cancelChapterPollRef.current?.();
                    cancelChapterPollRef.current = pollCheckQueue(ajax, Number(result.job_id), {
                        onCompleted: () => {
                            cancelChapterPollRef.current = null;
                            setGeneratingChapter(null);
                            setCompletedChapterJobs(prev => new Set(prev).add(cIndex));
                        },
                        onFailed: () => {
                            cancelChapterPollRef.current = null;
                            setGeneratingChapter(null);
                        }
                    });
                    return;
                }
                setGeneratingChapter(null);
                if (result.success) {
                    processChapterResult(result, cIndex);
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setGeneratingChapter(null);
            }
        });
    };

    const handleGenerateAllLessonsContent = (cIndex: number) => {
        setGeneratingAllLessons(prev => new Set(prev).add(cIndex));
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3-generate-content-all-lessons',
            method: 'POST',
            data: {
                id: post.id,
                chapter_index: cIndex,
            },
            success: (result: ANY) => {
                if (result.job_id != null) {
                    const cancel = pollCheckQueue(ajax, Number(result.job_id), {
                        onCompleted: () => {
                            cancelAllLessonsPollsRef.current.delete(cIndex);
                            setGeneratingAllLessons(prev => {
                                const next = new Set(prev);
                                next.delete(cIndex);
                                return next;
                            });
                            const chapter = outline[cIndex];
                            const lessonCount = chapter?.lessons?.length ?? 0;
                            setCompletedLessonJobs(prev => {
                                const next = new Set(prev);
                                for (let i = 0; i < lessonCount; i++) next.add(`${cIndex}-${i}`);
                                return next;
                            });
                            if (result.spacedev_course_ai_suggest) onSyncAiData(result.spacedev_course_ai_suggest);
                            refresh();
                        },
                        onFailed: () => {
                            cancelAllLessonsPollsRef.current.delete(cIndex);
                            setGeneratingAllLessons(prev => {
                                const next = new Set(prev);
                                next.delete(cIndex);
                                return next;
                            });
                        }
                    });
                    cancelAllLessonsPollsRef.current.set(cIndex, cancel);
                    return;
                }
                setGeneratingAllLessons(prev => {
                    const next = new Set(prev);
                    next.delete(cIndex);
                    return next;
                });
                if (result.spacedev_course_ai_suggest) {
                    onSyncAiData(result.spacedev_course_ai_suggest);
                }
                refresh();
            },
            error: () => {
                setGeneratingAllLessons(prev => {
                    const next = new Set(prev);
                    next.delete(cIndex);
                    return next;
                });
            }
        });
    };

    const handleToggleExpand = (cIndex: number, lIndex: number) => {
        if (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) {
            setExpandedLesson(null);
        } else {
            setExpandedLesson({ cIndex, lIndex });
        }
    };

    const handleAddLessonConfirm = () => {
        if (!addLessonAt || !newLessonTitle.trim()) return;
        const { cIndex, insertAfter } = addLessonAt;
        const chapter = outline[cIndex];
        const lessons = chapter?.lessons || [];
        const insertIndex = insertAfter + 1;

        const newLesson = { title: newLessonTitle.trim(), content: '' };
        const newLessons = [...lessons];
        newLessons.splice(insertIndex, 0, newLesson);

        const titles = newLessons.map((l: ANY) => l.title || '');

        setAddingLesson(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3-add-lesson',
            method: 'POST',
            data: {
                id: post.id,
                chapter_index: cIndex,
                titles,
            },
            success: (result: ANY) => {
                setAddingLesson(false);
                setAddLessonAt(null);
                setNewLessonTitle('');
                if (result.spacedev_course_ai_suggest) {
                    onSyncAiData(result.spacedev_course_ai_suggest);
                } else {
                    const newOutline = outline.map((ch: ANY, idx: number) => {
                        if (idx === cIndex) {
                            return { ...ch, lessons: newLessons };
                        }
                        return ch;
                    });
                    onReview(newOutline, 'outline');
                }
                refresh();
            },
            error: () => {
                setAddingLesson(false);
            }
        });
    };

    const [transitionLoading, setTransitionLoading] = useState(false);

    const handleNext = () => {
        setTransitionLoading(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step3-2',
            method: 'POST',
            data: {
                id: post.id,
            },
            success: (result: ANY) => {
                setTransitionLoading(false);
                if (result.success) {
                    onNext();
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setTransitionLoading(false);
            }
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Chi tiết nội dung (Detailed Outline)</Typography>

                {outline.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                        Chưa có dữ liệu outline. Vui lòng quay lại bước trước để tạo.
                    </Typography>
                ) : (
                    outline.map((chapter: ANY, cIndex: number) => (
                        <Paper key={cIndex} sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }} elevation={0}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                {editing?.type === 'chapter' && editing.cIndex === cIndex ? (
                                    <Box sx={{ display: 'flex', flex: 1, gap: 1 }}>
                                        <TextField
                                            fullWidth size="small"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                        />
                                        <Button variant="contained" size="small" onClick={() => { handleEditSave(); refresh(); }} disabled={savingChapterTitle}>
                                            {savingChapterTitle ? <CircularProgress size={20} /> : 'Save'}
                                        </Button>
                                        <Button size="small" onClick={() => setEditing(null)} disabled={savingChapterTitle}>Cancel</Button>
                                    </Box>
                                ) : (
                                    <>
                                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                {cIndex + 1}. {chapter.title}
                                            </Typography>
                                            {completedChapterJobs.has(cIndex) && (
                                                <Chip
                                                    label="Queue hoàn thành - Bấm để cập nhật"
                                                    color="success"
                                                    size="small"
                                                    onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
                                                    sx={{ fontWeight: 500, cursor: 'pointer' }}
                                                />
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Tooltip title="Sinh nội dung tất cả bài học trong chương">
                                                <span>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        startIcon={generatingAllLessons.has(cIndex) ? <CircularProgress size={16} /> : <AutoAwesomeIcon fontSize="small" />}
                                                        onClick={() => handleGenerateAllLessonsContent(cIndex)}
                                                        disabled={generatingAllLessons.has(cIndex) || !chapter.lessons?.length}
                                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                    >
                                                        {generatingAllLessons.has(cIndex) ? 'Đang...' : 'Generate tất cả bài học'}
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                            <IconButton size="small" onClick={() => handleEditStart('chapter', cIndex, undefined, chapter.title)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            {post.chapters?.[cIndex] ? (
                                                <Tooltip title="Xem nội dung chương">
                                                    <IconButton size="small" onClick={() => setOpenChapterDrawer(cIndex)}>
                                                        <VisibilityIcon fontSize="small" color="primary" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Sinh nội dung chương bằng AI">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleGenerateChapterContent(cIndex)}
                                                        disabled={generatingChapter === cIndex}
                                                    >
                                                        {generatingChapter === cIndex ? <CircularProgress size={20} /> : <AutoAwesomeIcon fontSize="small" />}
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <IconButton size="small" onClick={() => { handleDelete('chapter', cIndex); refresh(); }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </>
                                )}
                            </Box>

                            <Box sx={{ pl: 2 }}>
                                {(() => {
                                    const isAddActive = (insertAfter: number) =>
                                        addLessonAt?.cIndex === cIndex && addLessonAt?.insertAfter === insertAfter;
                                    const renderAddSlot = (insertAfter: number) => (
                                        <Box key={`add-${insertAfter}`} sx={{ mb: 0 }} onClick={(e) => e.stopPropagation()}>
                                            {isAddActive(insertAfter) ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1, border: '1px dashed #1976d2' }}>
                                                    <TextField
                                                        size="small"
                                                        placeholder="Nhập tiêu đề bài học..."
                                                        value={newLessonTitle}
                                                        onChange={(e) => setNewLessonTitle(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddLessonConfirm()}
                                                        sx={{ flex: 1, minWidth: 200 }}
                                                        autoFocus
                                                    />
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={handleAddLessonConfirm}
                                                        disabled={addingLesson || !newLessonTitle.trim()}
                                                    >
                                                        {addingLesson ? <CircularProgress size={20} /> : 'Xác nhận'}
                                                    </Button>
                                                    <Button size="small" onClick={() => { setAddLessonAt(null); setNewLessonTitle(''); }}>
                                                        Hủy
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Tooltip title="Thêm bài học">
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        onClick={() => { setAddLessonAt({ cIndex, insertAfter }); setNewLessonTitle(''); }}
                                                        sx={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0,
                                                            py: 0,
                                                            minHeight: 4,
                                                            border: 'none',
                                                            bgcolor: 'transparent',
                                                            cursor: 'pointer',
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s ease',
                                                            '&:hover': { opacity: 1 },
                                                            '& .line': {
                                                                flex: 1,
                                                                minHeight: 1,
                                                                borderTop: '1px dashed',
                                                                borderColor: 'primary.main',
                                                                transition: 'opacity 0.2s ease',
                                                            },
                                                            '& .plus': {
                                                                px: 1,
                                                                color: 'primary.main',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            },
                                                        }}
                                                    >
                                                        <Box className="line" />
                                                        <Box className="plus"><AddIcon sx={{ fontSize: 14 }} /></Box>
                                                        <Box className="line" />
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    );
                                    return (
                                        <>
                                            {renderAddSlot(-1)}
                                            {chapter.lessons?.map((lesson: ANY, lIndex: number) => {
                                    const hasContent = (() => {
                                        let content = updatedLessons[`${cIndex}-${lIndex}`] !== undefined
                                            ? updatedLessons[`${cIndex}-${lIndex}`]
                                            : lesson.content;

                                        if (!content && post.content && Array.isArray(post.content) && post.content[cIndex] && post.content[cIndex][lIndex]) {
                                            content = post.content[cIndex][lIndex]?.content;
                                        }
                                        return !!content;
                                    })();

                                    return (
                                        <React.Fragment key={lIndex}>
                                        <Box sx={{
                                            mb: 0.5,
                                            p: 1.5,
                                            bgcolor: hasContent ? 'rgba(45, 206, 13, 0.08)' : 'background.default',
                                            borderRadius: 1,
                                            borderLeft: hasContent ? '3px solid #00a20bff' : '3px solid #ccc',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                        }}
                                            onClick={() => handleToggleExpand(cIndex, lIndex)}
                                        >
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                mb: (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) ? 2 : 0
                                            }}
                                            >
                                                {editing?.type === 'lesson' && editing.cIndex === cIndex && editing.lIndex === lIndex ? (
                                                    <Box sx={{ display: 'flex', flex: 1, gap: 1 }} onClick={(e) => e.stopPropagation()}>
                                                        <TextField
                                                            fullWidth size="small"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                        />
                                                        <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); handleEditSave(); refresh(); }} disabled={savingLessonTitle}>
                                                            {savingLessonTitle ? <CircularProgress size={20} /> : 'Save'}
                                                        </Button>
                                                        <Button size="small" onClick={(e) => { e.stopPropagation(); setEditing(null); }} disabled={savingLessonTitle}>Cancel</Button>
                                                    </Box>
                                                ) : (
                                                    <>
                                                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) ? 'bold' : 'normal' }}
                                                            >
                                                                {lIndex + 1}. {stripLeadingNumber(lesson.title)}
                                                            </Typography>
                                                            {completedLessonJobs.has(`${cIndex}-${lIndex}`) && (
                                                                <Chip
                                                                    label="Queue hoàn thành - Bấm để cập nhật"
                                                                    color="success"
                                                                    size="small"
                                                                    onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
                                                                    sx={{ fontWeight: 500, cursor: 'pointer', height: 20 }}
                                                                />
                                                            )}
                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                {(() => {
                                                                    const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                                                                    const rawQuestions = lessonData.questions || [];
                                                                    const qCount = Array.isArray(rawQuestions) ? rawQuestions.length : Object.values(rawQuestions || {}).length;
                                                                    return qCount > 0 ? (
                                                                        <Tooltip title={`${qCount} câu hỏi - Bấm để xem`}>
                                                                            <Box
                                                                                onClick={(e) => { e.stopPropagation(); setPreviewDrawer({ cIndex, lIndex, title: `Câu hỏi: ${lesson.title}`, filter: 'questions' }); }}
                                                                                sx={{ bgcolor: 'primary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                                                                            >
                                                                                Question: {qCount}
                                                                            </Box>
                                                                        </Tooltip>
                                                                    ) : null;
                                                                })()}
                                                                {(() => {
                                                                    const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                                                                    const flashcards = lessonData.flashcards || lesson.flashcards;
                                                                    let fCount = 0;
                                                                    if (Array.isArray(flashcards)) fCount = flashcards.length;
                                                                    else if (flashcards && typeof flashcards === 'string') fCount = 1;

                                                                    return fCount > 0 ? (
                                                                        <Tooltip title="Đã có Flashcard - Bấm để xem">
                                                                            <Box
                                                                                onClick={(e) => { e.stopPropagation(); setPreviewDrawer({ cIndex, lIndex, title: `Flashcards: ${lesson.title}`, filter: 'flashcards' }); }}
                                                                                sx={{ bgcolor: 'secondary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                                                                            >
                                                                                Flashcard: {fCount}
                                                                            </Box>
                                                                        </Tooltip>
                                                                    ) : null;
                                                                })()}
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Tooltip title="Nội dung bài học">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleExpand(cIndex, lIndex); }}
                                                                    color={(() => {
                                                                        // Check if lesson has content
                                                                        let content = updatedLessons[`${cIndex}-${lIndex}`] !== undefined
                                                                            ? updatedLessons[`${cIndex}-${lIndex}`]
                                                                            : lesson.content;

                                                                        if (!content && post.content && Array.isArray(post.content) && post.content[cIndex] && post.content[cIndex][lIndex]) {
                                                                            content = post.content[cIndex][lIndex]?.content;
                                                                        }
                                                                        return content ? 'primary' : 'default';
                                                                    })()}
                                                                    disabled={(() => {
                                                                        // Disable if no content
                                                                        let content = updatedLessons[`${cIndex}-${lIndex}`] !== undefined
                                                                            ? updatedLessons[`${cIndex}-${lIndex}`]
                                                                            : lesson.content;

                                                                        if (!content && post.content && Array.isArray(post.content) && post.content[cIndex] && post.content[cIndex][lIndex]) {
                                                                            content = post.content[cIndex][lIndex]?.content;
                                                                        }
                                                                        return !content && !(expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex); // Allow collapse if expanded
                                                                    })()}
                                                                >
                                                                    {expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Sinh nội dung bằng AI">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={(e) => { e.stopPropagation(); handleGenerateContent(cIndex, lIndex, lesson); }}
                                                                    disabled={generatingLessons.has(`${cIndex}-${lIndex}`)}
                                                                >
                                                                    {generatingLessons.has(`${cIndex}-${lIndex}`) ?
                                                                        <CircularProgress size={20} /> : <AutoAwesomeIcon fontSize="small" />
                                                                    }
                                                                </IconButton>
                                                            </Tooltip>
                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditStart('lesson', cIndex, lIndex, lesson.title); }}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete('lesson', cIndex, lIndex); refresh(); }}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </>
                                                )}
                                            </Box>

                                            {expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex && (
                                                <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #eee' }}>
                                                    {editing?.type === 'lesson-content' && editing.cIndex === cIndex && editing.lIndex === lIndex ? (
                                                        <Box>
                                                            <TextField
                                                                fullWidth
                                                                multiline
                                                                minRows={10}
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                placeholder="Nhập nội dung bài học (Markdown)..."
                                                                sx={{ mb: 1, bgcolor: 'white' }}
                                                            />
                                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                                <Button variant="contained" size="small" onClick={() => { handleEditSave(); refresh(); }}>Lưu Nội dung</Button>
                                                                <Button size="small" onClick={() => setEditing(null)}>Hủy</Button>
                                                            </Box>
                                                        </Box>
                                                    ) : (
                                                        <Box onClick={() => handleEditStart('lesson-content', cIndex, lIndex, (() => {
                                                            // Get content for editing
                                                            let content = lesson.content;
                                                            // Fallback to post.content
                                                            if (!content && post.content && Array.isArray(post.content) && post.content[cIndex] && post.content[cIndex][lIndex]) {
                                                                content = post.content[cIndex][lIndex]?.content; // This could be object or string or anything
                                                            }

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

                                                            const result = extractContent(content);
                                                            return result || '*Chưa có nội dung. Nhấn vào biểu tượng cây đũa thần để AI sinh nội dung hoặc nhấn vào đây để tự viết.*';
                                                        })())} sx={{
                                                            cursor: 'text',
                                                            minHeight: '100px',
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
                                                            <ReactMarkdown>
                                                                {(() => {
                                                                    let content = updatedLessons[`${cIndex}-${lIndex}`] !== undefined
                                                                        ? updatedLessons[`${cIndex}-${lIndex}`]
                                                                        : lesson.content;

                                                                    // Fallback to post.content
                                                                    if (!content && post.content && Array.isArray(post.content) && post.content[cIndex] && post.content[cIndex][lIndex]) {
                                                                        content = post.content[cIndex][lIndex]?.content;
                                                                    }
                                                                    const extractContent = (data: ANY): string => {
                                                                        if (data === null || data === undefined) return '';

                                                                        // If specifically looking for the 'content' key in an object
                                                                        if (typeof data === 'object' && !Array.isArray(data) && data !== null && 'content' in data && typeof data.content === 'string') {
                                                                            return data.content;
                                                                        }

                                                                        if (typeof data === 'string') {
                                                                            // Try to parse if it looks like JSON array/object
                                                                            const trimmed = data.trim();
                                                                            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                                                                                try {
                                                                                    const parsed = JSON.parse(data);
                                                                                    // If parsed successfully, recursive extract
                                                                                    const extracted = extractContent(parsed);
                                                                                    // If recursion returns something, use it. 
                                                                                    // If it returns empty string but the original was a long string, maybe we shouldn't have parsed it?
                                                                                    // Assumption: AI returns Markdown string OR JSON structure wrapping Markdown.
                                                                                    if (extracted) return extracted;
                                                                                } catch (e) {
                                                                                    // Parse failed, treat as raw string
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

                                                                    const result = extractContent(content);
                                                                    if (!result) return 'Loading or Empty Content...'; // Debugging indicator
                                                                    return result;
                                                                })()}
                                                            </ReactMarkdown>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                        {renderAddSlot(lIndex)}
                                        </React.Fragment>
                                    );
                                })}
                                            </>
                                        );
                                    })()}
                            </Box>
                        </Paper>
                    ))
                )}
            </Box>

            <DrawerCustom
                anchor="right"
                open={openChapterDrawer !== null}
                onClose={() => setOpenChapterDrawer(null)}
                activeOnClose
                width={1300}
                headerAction={
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => openChapterDrawer !== null && handleGenerateChapterContent(openChapterDrawer)}
                        disabled={generatingChapter === openChapterDrawer}
                    >
                        {generatingChapter === openChapterDrawer ? <CircularProgress size={20} /> : 'Generate AI'}
                    </Button>
                }
                title={
                    openChapterDrawer !== null
                        ? `Nội dung chương ${openChapterDrawer + 1}: ${outline[openChapterDrawer]?.title || ''}${completedChapterJobs.has(openChapterDrawer) ? ' (Job đã hoàn thành)' : ''}`
                        : ''
                }
            >
                {openChapterDrawer !== null && (
                    <Box sx={{ height: '100%', pt: 3, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            {editing?.type === 'chapter' && editing.cIndex === openChapterDrawer ? (
                                <Box>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={15}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        placeholder="Nhập nội dung chương (Markdown)..."
                                        sx={{ mb: 1, bgcolor: 'white' }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button variant="contained" size="small" onClick={() => {
                                            const newChapters = Array.isArray(post.chapters) ? [...post.chapters] : [];
                                            newChapters[openChapterDrawer] = editValue;
                                            onReview(newChapters, 'chapters');
                                            setEditing(null);
                                            refresh();
                                        }}>Lưu</Button>
                                        <Button size="small" onClick={() => setEditing(null)}>Hủy</Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box
                                    onClick={() => {
                                        setEditing({ type: 'chapter', cIndex: openChapterDrawer });
                                        setEditValue(post.chapters?.[openChapterDrawer] || '');
                                    }}
                                    sx={{
                                        cursor: 'text',
                                        minHeight: '200px',
                                        p: 2,
                                        border: '1px solid #eee',
                                        borderRadius: 1,
                                        '& h1, & h2, & h3': { mt: 2, mb: 1 },
                                        '& p': { mb: 1.5, lineHeight: 1.6 }
                                    }}
                                >
                                    <ReactMarkdown>
                                        {post.chapters?.[openChapterDrawer] || '*Chưa có nội dung chương. Nhấn Generate để tạo nội dung bằng AI hoặc nhấn vào đây để tự viết.*'}
                                    </ReactMarkdown>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </DrawerCustom>

            <LessonPreviewDrawer
                post={post}
                open={previewDrawer !== null}
                onClose={() => setPreviewDrawer(null)}
                previewDrawer={previewDrawer}
            />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #eee' }}>
                <Button onClick={onBack} disabled={transitionLoading}>Quay lại</Button>
                <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={transitionLoading}
                    endIcon={transitionLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    {transitionLoading ? 'Đang xử lý...' : 'Tiếp tục'}
                </Button>
            </Box>
        </Box>
    );
}
