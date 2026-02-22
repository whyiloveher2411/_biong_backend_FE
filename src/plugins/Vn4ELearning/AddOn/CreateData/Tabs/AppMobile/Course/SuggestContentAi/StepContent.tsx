import { Box, Button, Typography, Paper, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import React, { useState, useRef, useEffect } from 'react';
import useAjax from 'hook/useApi';
import ReactMarkdown from 'react-markdown';
import DrawerCustom from 'components/molecules/DrawerCustom';

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
}

export default function StepContent({
    post,
    onReview,
    onSyncAiData,
    onNext,
    onBack,
    setActiveStep
}: StepContentProps) {

    const outline = post.outline || [];
    const [editing, setEditing] = useState<{ type: 'chapter' | 'lesson' | 'lesson-content', cIndex: number, lIndex?: number } | null>(null);
    const [editValue, setEditValue] = useState('');
    const { ajax } = useAjax();
    const [generating, setGenerating] = useState<{ cIndex: number, lIndex: number } | null>(null);
    const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
    const [expandedLesson, setExpandedLesson] = useState<{ cIndex: number, lIndex: number } | null>(null);
    const [openChapterDrawer, setOpenChapterDrawer] = useState<number | null>(null);

    const postRef = useRef(post);
    useEffect(() => {
        postRef.current = post;
    }, [post]);

    const [updatedLessons, setUpdatedLessons] = useState<{ [key: string]: string }>({});
    const [, setRefreshCount] = useState(0);

    // Simple force update
    const [, forceUpdate] = useState(0);
    const refresh = () => forceUpdate(prev => prev + 1);

    const handleEditStart = (type: 'chapter' | 'lesson' | 'lesson-content', cIndex: number, lIndex?: number, currentValue?: string) => {
        setEditing({ type, cIndex, lIndex });
        setEditValue(currentValue || '');
    };

    const handleEditSave = () => {
        if (!editing) return;

        const newOutline = outline.map((chapter: ANY, index: number) => {
            if (index === editing.cIndex) {
                const newChapter = { ...chapter };
                if (editing.type === 'chapter') {
                    newChapter.title = editValue;
                } else if (typeof editing.lIndex === 'number') {
                    newChapter.lessons = chapter.lessons.map((lesson: ANY, lIdx: number) => {
                        if (lIdx === editing.lIndex) {
                            const newLesson = { ...lesson };
                            if (editing.type === 'lesson') {
                                newLesson.title = editValue;
                            } else if (editing.type === 'lesson-content') {
                                newLesson.content = editValue;
                                setUpdatedLessons(prev => ({ ...prev, [`${editing.cIndex}-${editing.lIndex}`]: editValue }));
                            }
                            return newLesson;
                        }
                        return lesson;
                    });
                }
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

    const handleGenerateContent = (cIndex: number, lIndex: number, lesson: ANY) => {
        setGenerating({ cIndex, lIndex });
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
                setGenerating(null);
                if (result.success) {
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                        setRefreshCount(prev => prev + 1);
                        setExpandedLesson({ cIndex, lIndex });
                        refresh();
                        return;
                    }

                    let newContent = result.content;

                    if (result.spacedev_course_ai_suggest && result.spacedev_course_ai_suggest.content) {
                        let fullContent = result.spacedev_course_ai_suggest.content;

                        // Parse if it's a string
                        if (typeof fullContent === 'string' && (fullContent.trim().startsWith('[') || fullContent.trim().startsWith('{'))) {
                            try {
                                fullContent = JSON.parse(fullContent);
                            } catch (e) {
                                console.error("Error parsing spacedev_course_ai_suggest.content", e);
                            }
                        }

                        // If it's the full 2D array, extract the specific lesson
                        if (Array.isArray(fullContent) && fullContent[cIndex] !== undefined) {
                            if (Array.isArray(fullContent[cIndex]) && fullContent[cIndex][lIndex] !== undefined) {
                                newContent = fullContent[cIndex][lIndex];
                            } else if (lIndex === undefined || lIndex === null) {
                                // Should not happen for lesson content
                                newContent = fullContent[cIndex];
                            }
                        } else {
                            // If it's just the content for this lesson or some other format
                            newContent = fullContent;
                        }
                    }

                    // Update content
                    if (newContent) {

                        // 1. Update local state explicitly to force re-render
                        const contentKey = `${cIndex}-${lIndex}`;
                        setUpdatedLessons(prev => ({ ...prev, [contentKey]: newContent }));

                        // 2. Immutable update for outline
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
                        // post.outline = newOutline; // Don't mutate prop directly if possible
                        onReview(newOutline, 'outline');

                        // 3. Update post.content structure for persistence/fallback
                        let currentContent = currentPost.content || [];
                        if (!Array.isArray(currentContent)) currentContent = [];

                        const newContentStructure = [...currentContent];
                        if (!newContentStructure[cIndex]) newContentStructure[cIndex] = [];
                        if (!Array.isArray(newContentStructure[cIndex])) newContentStructure[cIndex] = [];

                        const currentLessonContentObj = newContentStructure[cIndex][lIndex] || {};
                        newContentStructure[cIndex][lIndex] = {
                            ...currentLessonContentObj,
                            content: newContent
                        };
                        // post.content = newContentStructure; // Don't mutate prop directly
                        onReview(newContentStructure, 'content');
                        setRefreshCount(prev => prev + 1);

                        // 4. Auto expand
                        setExpandedLesson({ cIndex, lIndex });

                        console.log('Content updated for lesson', cIndex, lIndex, newContent);

                        // 5. Force Update via separate state to ensure memoized components re-render if any
                        refresh();

                    } else {
                        alert('AI không trả về nội dung nào.');
                    }
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setGenerating(null);
            }
        });
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
                setGeneratingChapter(null);
                if (result.success) {
                    if (result.spacedev_course_ai_suggest) {
                        onSyncAiData(result.spacedev_course_ai_suggest);
                        refresh();
                        return;
                    }

                    const newChapters = Array.isArray(post.chapters) ? [...post.chapters] : [];
                    newChapters[cIndex] = result.content;
                    onReview(newChapters, 'chapters');
                    refresh();
                } else {
                    if (result.message) alert(result.message);
                }
            },
            error: () => {
                setGeneratingChapter(null);
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
                                        <Button variant="contained" size="small" onClick={() => { handleEditSave(); refresh(); }}>Save</Button>
                                        <Button size="small" onClick={() => setEditing(null)}>Cancel</Button>
                                    </Box>
                                ) : (
                                    <>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', flex: 1 }}>
                                            {chapter.title}
                                        </Typography>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleEditStart('chapter', cIndex, undefined, chapter.title)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => setOpenChapterDrawer(cIndex)}>
                                                <VisibilityIcon fontSize="small" color={post.chapters?.[cIndex] ? 'primary' : 'inherit'} />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => { handleDelete('chapter', cIndex); refresh(); }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </>
                                )}
                            </Box>

                            <Box sx={{ pl: 2 }}>
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
                                        <Box key={lIndex} sx={{
                                            mb: 1,
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
                                                    <Box sx={{ display: 'flex', flex: 1, gap: 1 }}>
                                                        <TextField
                                                            fullWidth size="small"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                        />
                                                        <Button variant="contained" size="small" onClick={() => { handleEditSave(); refresh(); }}>Save</Button>
                                                        <Button size="small" onClick={() => setEditing(null)}>Cancel</Button>
                                                    </Box>
                                                ) : (
                                                    <>
                                                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: (expandedLesson?.cIndex === cIndex && expandedLesson?.lIndex === lIndex) ? 'bold' : 'normal' }}
                                                            >
                                                                {lIndex + 1}. {lesson.title}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                {(() => {
                                                                    const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                                                                    const rawQuestions = lessonData.questions || [];
                                                                    const qCount = Array.isArray(rawQuestions) ? rawQuestions.length : Object.values(rawQuestions || {}).length;
                                                                    return qCount > 0 ? (
                                                                        <Tooltip title={`${qCount} câu hỏi`}>
                                                                            <Box sx={{ bgcolor: 'primary.main', color: 'white', fontSize: '0.65rem', px: 0.6, py: 0.1, borderRadius: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
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
                                                                    disabled={generating?.cIndex === cIndex && generating?.lIndex === lIndex}
                                                                >
                                                                    {generating?.cIndex === cIndex && generating?.lIndex === lIndex ?
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
                                    );
                                })}
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
                title={`Nội dung chương: ${openChapterDrawer !== null ? outline[openChapterDrawer]?.title : ''}`}
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
