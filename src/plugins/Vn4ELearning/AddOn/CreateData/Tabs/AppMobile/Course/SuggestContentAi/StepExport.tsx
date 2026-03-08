import { Box, Button, Typography, Paper, IconButton, Divider, Tooltip } from '@mui/material';
import { LoadingButton } from "@mui/lab";
import React, { useState, useEffect, useMemo } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
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

    type ImageItem = { cIndex: number; lIndex: number; source: string; location: string; prompt: string; image_id?: number | string };
    const [imageStatusMap, setImageStatusMap] = useState<Record<string, boolean>>({});

    const collectAllImageItems = (): ImageItem[] => {
        const result: ImageItem[] = [];
        const scanComponents = (arr: ANY[], location: string, cIndex: number, lIndex: number, source: string) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((comp: ANY, i: number) => {
                if (!comp || typeof comp !== 'object') return;
                if (comp.type === 'image' && comp.prompt) {
                    result.push({
                        cIndex, lIndex, source, location: `${location}[${i}]`, prompt: comp.prompt,
                        image_id: comp.image_id
                    });
                }
                if (Array.isArray(comp.parts)) scanComponents(comp.parts, `${location}[${i}].parts`, cIndex, lIndex, source);
            });
        };

        outline.forEach((chapter: ANY, cIndex: number) => {
            chapter.lessons?.forEach((_: ANY, lIndex: number) => {
                const lessonData = post.content?.[cIndex]?.[lIndex] || {};
                const lessonOutline = outline[cIndex]?.lessons?.[lIndex] || {};

                const questions = lessonData.questions || [];
                questions.forEach((q: ANY, qIdx: number) => {
                    const detail = typeof q?.question_detail === 'string' ? (() => { try { return JSON.parse(q.question_detail); } catch { return {}; } })() : (q?.question_detail || q);
                    const body = detail?.body || q?.body || detail;
                    const bodyArr = Array.isArray(body) ? body : (body?.body ? (Array.isArray(body.body) ? body.body : [body.body]) : []);
                    scanComponents(bodyArr, `Câu hỏi ${qIdx + 1}`, cIndex, lIndex, 'question');
                });

                const flashcards = lessonData.flashcards || lessonOutline.flashcards || [];
                const fcArr = Array.isArray(flashcards) ? flashcards : [];
                fcArr.forEach((fc: ANY, fcIdx: number) => {
                    const front = Array.isArray(fc?.front) ? fc.front : [];
                    const back = Array.isArray(fc?.back) ? fc.back : [];
                    scanComponents(front, `Flashcard ${fcIdx + 1} (mặt trước)`, cIndex, lIndex, 'flashcard');
                    scanComponents(back, `Flashcard ${fcIdx + 1} (mặt sau)`, cIndex, lIndex, 'flashcard');
                });

                const welcome = lessonData.welcom_content || lessonData.welcome_content;
                if (welcome) {
                    const wDetail = typeof welcome === 'string' ? (() => { try { return JSON.parse(welcome); } catch { return {}; } })() : welcome;
                    const wBody = wDetail?.body || welcome?.body;
                    const wArr = Array.isArray(wBody) ? wBody : (wBody ? [wBody] : []);
                    scanComponents(wArr, 'Chào mừng', cIndex, lIndex, 'question');
                }
                const recap = lessonData.recap_content || lessonData.recap;
                if (recap) {
                    const rDetail = typeof recap === 'string' ? (() => { try { return JSON.parse(recap); } catch { return {}; } })() : recap;
                    const rBody = rDetail?.body || recap?.body;
                    const rArr = Array.isArray(rBody) ? rBody : (rBody ? [rBody] : []);
                    scanComponents(rArr, 'Tóm tắt', cIndex, lIndex, 'question');
                }

                const lessonContent = lessonData.content || lessonOutline.content;
                const contentArr = Array.isArray(lessonContent) ? lessonContent : (typeof lessonContent === 'object' && lessonContent?.body ? (Array.isArray(lessonContent.body) ? lessonContent.body : [lessonContent.body]) : []);
                scanComponents(contentArr, 'Nội dung bài học', cIndex, lIndex, 'content');
            });
        });
        return result;
    };

    const allImageItems = useMemo(() => collectAllImageItems(), [post, outline]);
    const imageIdsToCheck = useMemo(() => {
        const ids: (number | string)[] = [];
        const seen = new Set<string>();
        allImageItems.forEach((item) => {
            if (item.image_id != null && item.image_id !== '') {
                const key = String(item.image_id);
                if (!seen.has(key)) {
                    seen.add(key);
                    ids.push(item.image_id);
                }
            }
        });
        return ids;
    }, [allImageItems]);

    useEffect(() => {
        if (imageIdsToCheck.length === 0) {
            setImageStatusMap({});
            return;
        }
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/get-image-ai',
            method: 'POST',
            data: { image_ids: imageIdsToCheck },
            success: (result: ANY) => {
                const images = result?.images;
                const map: Record<string, boolean> = {};
                if (images && typeof images === 'object') {
                    imageIdsToCheck.forEach((id) => {
                        const key = String(id);
                        const val = images[key] ?? images[id] ?? images[Number(id)];
                        let hasValidSrc = false;
                        if (val != null && val !== '') {
                            try {
                                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                                const link = parsed?.link;
                                hasValidSrc = !!(link != null && link !== '');
                            } catch {
                                hasValidSrc = false;
                            }
                        }
                        map[key] = hasValidSrc;
                    });
                }
                setImageStatusMap(map);
            },
            error: () => setImageStatusMap({})
        });
    }, [imageIdsToCheck.join(',')]);

    const ungeneratedImages = useMemo(() => {
        return allImageItems.filter((item) => {
            if (item.image_id == null || item.image_id === '') return true;
            const key = String(item.image_id);
            return !imageStatusMap[key];
        });
    }, [allImageItems, imageStatusMap]);
    const ungeneratedCountByLesson = React.useMemo(() => {
        const map: Record<string, number> = {};
        ungeneratedImages.forEach(({ cIndex, lIndex }) => {
            const key = `${cIndex}-${lIndex}`;
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [ungeneratedImages]);
    const totalCountByLesson = React.useMemo(() => {
        const map: Record<string, number> = {};
        allImageItems.forEach(({ cIndex, lIndex }) => {
            const key = `${cIndex}-${lIndex}`;
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [allImageItems]);

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

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {(() => {
                                                    const totalImg = totalCountByLesson[`${cIndex}-${lIndex}`] || 0;
                                                    const ungenImg = ungeneratedCountByLesson[`${cIndex}-${lIndex}`] || 0;
                                                    return totalImg > 0 ? (
                                                        <Tooltip title="Chưa generate / Tổng">
                                                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                                                                <Typography component="span" sx={{ color: ungenImg > 0 ? 'warning.main' : 'success.main', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                                    {ungenImg}
                                                                </Typography>
                                                                <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>/</Typography>
                                                                <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                                                    {totalImg}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    ) : null;
                                                })()}
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

            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: allImageItems.length > 0 ? 2 : 0 }}>
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

                {allImageItems.length > 0 && (
                    <Paper sx={{ p: 2, bgcolor: ungeneratedImages.length > 0 ? 'rgba(255, 152, 0, 0.08)' : 'rgba(76, 175, 80, 0.08)', border: ungeneratedImages.length > 0 ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid rgba(76, 175, 80, 0.3)', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ImageNotSupportedIcon fontSize="small" color={ungeneratedImages.length > 0 ? 'warning' : 'success'} />
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: ungeneratedImages.length > 0 ? 'warning.dark' : 'success.dark' }}>
                                Hình ảnh chưa được generate:{' '}
                                <Typography component="span" sx={{ color: ungeneratedImages.length > 0 ? 'warning.main' : 'success.main', fontWeight: 'bold' }}>{ungeneratedImages.length}</Typography>
                                <Typography component="span" sx={{ color: 'text.secondary', mx: 0.5 }}>/</Typography>
                                <Typography component="span" sx={{ color: 'text.secondary' }}>{allImageItems.length}</Typography>
                            </Typography>
                        </Box>
                    </Paper>
                )}
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
