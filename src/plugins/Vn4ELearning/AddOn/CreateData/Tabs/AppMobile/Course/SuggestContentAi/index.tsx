import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material';
import React from 'react';
import StepIdentity from './StepIdentity';
import StepOutline from './StepOutline';
import StepContent from './StepContent';
import StepAssessment from './StepAssessment';
import StepFlashcard from './StepFlashcard';
import StepExport from './StepExport';
import useAjax from 'hook/useApi';

const steps = [
    { label: 'Identity', description: 'Xác nhận thông tin khóa học' },
    { label: 'Outline', description: 'Chọn bài học để viết chi tiết' },
    { label: 'Content', description: 'Viết nội dung sâu sắc' },
    { label: 'Assessment', description: 'Tạo câu hỏi đánh giá' },
    { label: 'Flashcard', description: 'Tạo flash card' },
    { label: 'Export', description: 'Xuất dữ liệu' },
];


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

export default function SuggestContentAi({ post, onReview, courses }: { post: ANY, onReview: ANY, courses?: ANY[] }) {
    const [activeStep, setActiveStep] = React.useState(0);
    const [content, setContent] = React.useState('');
    const [addAssessment, setAddAssessment] = React.useState('no');

    const [maxStep, setMaxStep] = React.useState(0);

    const getInitialData = () => {
        const getStr = (val: ANY) => {
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && val !== null) {
                return val.vi || val.en || Object.values(val)[0] || '';
            }
            return '';
        };

        const initial = {
            id: post.id,
            title: post.title || '',
            description: getStr(post.description),
            audience: post.audience || [],
            learning_outcome: post.learning_outcome || '',
            prerequisites: post.prerequisites || '',
            knowledge_base: post.knowledge_base || '',
            response_language: post.response_language || '',
            approach: post.approach || '',
            tone: post.tone || '',
            depth: post.depth || '',
            visuals: post.visuals || '',
            course_identity_profile: post.course_identity_profile || {},
            outline: post.outline || [],
            content: post.content || []
        };

        if (post.input_identity) {
            try {
                const identity = typeof post.input_identity === 'string' ? JSON.parse(post.input_identity) : post.input_identity;
                if (identity) {
                    // For title, ONLY update if initial.title is a string or empty, to protect TransslateField object
                    if (typeof initial.title === 'string' || !initial.title) {
                        if (identity.title_course) initial.title = identity.title_course;
                        else if (identity.title) initial.title = identity.title;
                    }

                    // For other fields, we want the data from input_identity (user's last edits)
                    if (identity.description) initial.description = identity.description;
                    if (identity.audience) {
                        initial.audience = Array.isArray(identity.audience) ? identity.audience : (typeof identity.audience === 'string' ? identity.audience.split(',').map((s: string) => s.trim()) : []);
                    }
                    if (identity.learning_outcome) initial.learning_outcome = identity.learning_outcome;
                    if (identity.prerequisites) initial.prerequisites = identity.prerequisites;
                    if (identity.response_language) initial.response_language = identity.response_language;

                    if (identity.style && typeof identity.style === 'object') {
                        if (identity.style.approach) initial.approach = identity.style.approach;
                        if (identity.style.tone) initial.tone = identity.style.tone;
                        if (identity.style.depth) initial.depth = identity.style.depth;
                        if (identity.style.visuals) initial.visuals = identity.style.visuals;
                    }
                }
            } catch (e) {
                console.error('[DEBUG] Failed to parse initial input_identity:', e);
            }
        }
        return initial;
    };

    // State for the AI suggestion data (separate from the main Course post)
    const [suggestionData, setSuggestionData] = React.useState<ANY>(getInitialData());

    console.log('[DEBUG] SuggestContentAi post prop:', {
        id: post.id,
        title: post.title,
        description: post.description,
        description_type: typeof post.description,
        is_array: Array.isArray(post.description)
    });

    const { ajax } = useAjax();
    const [keyRefresh, setKeyRefresh] = React.useState(0);

    // Sync from post prop if it updates (e.g. data arrives late)
    // ONLY sync title from post to support multi-language editing
    React.useEffect(() => {
        setSuggestionData((prev: ANY) => {
            if (post.title && post.title !== prev.title && !prev._user_edited_title) {
                console.log('[DEBUG] Syncing title from post prop');
                return { ...prev, title: post.title };
            }
            return prev;
        });
    }, [post.title]);

    // Handle updates to suggestionData from children
    // Helper to merge arrays or objects (like questions or flashcards)
    const mergeDeepItems = (prevItems: ANY, newItems: ANY) => {
        if (!newItems) return Array.isArray(prevItems) ? prevItems : [];

        // Always try to work with an array for these specific list fields
        const result: ANY[] = Array.isArray(prevItems) ? [...prevItems] : [];

        // If prevItems was an object with numeric keys, import it into our array
        if (!Array.isArray(prevItems) && prevItems && typeof prevItems === 'object') {
            Object.keys(prevItems).forEach(key => {
                const idx = parseInt(key);
                if (!isNaN(idx)) result[idx] = prevItems[key];
            });
        }

        const applyMerge = (items: ANY) => {
            if (Array.isArray(items)) {
                items.forEach((item, idx) => {
                    if (item) {
                        result[idx] = (typeof item === 'object' && item !== null) ? { ...((result[idx] as ANY) || {}), ...item } : item;
                    }
                });
            } else if (typeof items === 'object' && items !== null) {
                Object.keys(items).forEach(key => {
                    const idx = parseInt(key);
                    if (!isNaN(idx)) {
                        result[idx] = (typeof items[key] === 'object' && items[key] !== null) ? { ...((result[idx] as ANY) || {}), ...items[key] } : items[key];
                    }
                });
            }
        };

        applyMerge(newItems);
        return result;
    };

    const syncFromAiSuggest = (aiSuggest: ANY) => {
        console.log('[DEBUG] syncFromAiSuggest FULL OBJECT:', JSON.stringify(aiSuggest, null, 2));
        if (!aiSuggest) return;

        setSuggestionData((prev: ANY) => {
            const newSuggestionData = { ...prev };
            let hasUpdates = false;

            // ... (Root level fields omitted for brevity in instruction, keep them as is)
            // Note: I will only replace the content merging part to keep the diff clean

            // Re-using existing root fields logic... (will be handled by replace_file_content target)
            if (aiSuggest.title && (!newSuggestionData.title || newSuggestionData.title === '')) { newSuggestionData.title = aiSuggest.title; hasUpdates = true; }
            if (aiSuggest.description && !prev._user_edited_description) { newSuggestionData.description = aiSuggest.description; hasUpdates = true; }
            if (aiSuggest.audience && !prev._user_edited_audience) { newSuggestionData.audience = aiSuggest.audience; hasUpdates = true; }
            if (aiSuggest.learning_outcome && !prev._user_edited_learning_outcome) { newSuggestionData.learning_outcome = aiSuggest.learning_outcome; hasUpdates = true; }
            if (aiSuggest.prerequisites && !prev._user_edited_prerequisites) { newSuggestionData.prerequisites = aiSuggest.prerequisites; hasUpdates = true; }
            if (aiSuggest.response_language) { newSuggestionData.response_language = aiSuggest.response_language; hasUpdates = true; }
            if (aiSuggest.style) { newSuggestionData.style = aiSuggest.style; hasUpdates = true; }
            if (aiSuggest.approach) { newSuggestionData.approach = aiSuggest.approach; hasUpdates = true; }
            if (aiSuggest.tone) { newSuggestionData.tone = aiSuggest.tone; hasUpdates = true; }
            if (aiSuggest.depth) { newSuggestionData.depth = aiSuggest.depth; hasUpdates = true; }
            if (aiSuggest.visuals) { newSuggestionData.visuals = aiSuggest.visuals; hasUpdates = true; }

            if (aiSuggest.input_identity) {
                try {
                    const identity = typeof aiSuggest.input_identity === 'string' ? JSON.parse(aiSuggest.input_identity) : aiSuggest.input_identity;
                    if (identity) {
                        if (identity.title_course) { if (typeof newSuggestionData.title === 'string' || !newSuggestionData.title) newSuggestionData.title = identity.title_course; }
                        else if (identity.title) { if (typeof newSuggestionData.title === 'string' || !newSuggestionData.title) newSuggestionData.title = identity.title; }
                        if (identity.audience) newSuggestionData.audience = Array.isArray(identity.audience) ? identity.audience : (typeof identity.audience === 'string' ? identity.audience.split(',').map((s: string) => s.trim()) : []);
                        if (identity.learning_outcome) newSuggestionData.learning_outcome = identity.learning_outcome;
                        if (identity.prerequisites) newSuggestionData.prerequisites = identity.prerequisites;
                        if (identity.description !== undefined) newSuggestionData.description = identity.description;
                        if (identity.response_language) newSuggestionData.response_language = identity.response_language;
                        if (identity.style && typeof identity.style === 'object') {
                            if (identity.style.approach) newSuggestionData.approach = identity.style.approach;
                            if (identity.style.tone) newSuggestionData.tone = identity.style.tone;
                            if (identity.style.depth) newSuggestionData.depth = identity.style.depth;
                            if (identity.style.visuals) newSuggestionData.visuals = identity.style.visuals;
                        }
                        hasUpdates = true;
                    }
                } catch (e) { console.error('[DEBUG] Failed to parse input_identity:', e); }
            }

            if (aiSuggest.course_identity_profile) {
                try {
                    let profile = aiSuggest.course_identity_profile;
                    if (typeof profile === 'string') profile = JSON.parse(profile);
                    if (profile) { newSuggestionData.course_identity_profile = profile; hasUpdates = true; }
                } catch (e) { console.error("Error parsing course_identity_profile", e); }
            }

            if (aiSuggest.outline) {
                try {
                    let outline = aiSuggest.outline;
                    if (typeof outline === 'string') outline = JSON.parse(outline);
                    if (outline && Array.isArray(outline)) {
                        const newOutline = Array.isArray(newSuggestionData.outline) ? [...newSuggestionData.outline] : [];
                        outline.forEach((chapter, cIdx) => {
                            if (chapter) {
                                newOutline[cIdx] = { ...(newOutline[cIdx] || {}), ...chapter };
                                if (chapter.lessons && Array.isArray(chapter.lessons)) {
                                    const newLessons = Array.isArray(newOutline[cIdx].lessons) ? [...newOutline[cIdx].lessons] : [];
                                    chapter.lessons.forEach((lesson: ANY, lIdx: number) => {
                                        if (lesson) newLessons[lIdx] = { ...(newLessons[lIdx] || {}), ...lesson };
                                    });
                                    newOutline[cIdx].lessons = newLessons;
                                }
                            }
                        });
                        newSuggestionData.outline = newOutline;
                        hasUpdates = true;
                    }
                } catch (e) { console.error("Error parsing outline", e); }
            }

            if (aiSuggest.content) {
                try {
                    let content = aiSuggest.content;
                    if (typeof content === 'string') content = JSON.parse(content);
                    if (content) {
                        const newContent = Array.isArray(newSuggestionData.content) ? [...newSuggestionData.content] : [];
                        const mergeLesson = (cIdx: number, lIdx: number, lessonContent: ANY) => {
                            if (!lessonContent) return;
                            if (!newContent[cIdx]) newContent[cIdx] = [];
                            else newContent[cIdx] = [...newContent[cIdx]];

                            const prevLessonData = newContent[cIdx][lIdx] || {};
                            const mergedLessonData = { ...prevLessonData, ...lessonContent };

                            // Deep merge questions
                            mergedLessonData.questions = mergeDeepItems(prevLessonData.questions, lessonContent.questions);
                            // Deep merge flashcards
                            mergedLessonData.flashcards = mergeDeepItems(prevLessonData.flashcards, lessonContent.flashcards);

                            newContent[cIdx][lIdx] = mergedLessonData;
                        };

                        if (Array.isArray(content)) {
                            content.forEach((chapterContent: ANY, cIdx: number) => {
                                if (chapterContent) {
                                    if (Array.isArray(chapterContent)) {
                                        chapterContent.forEach((lessonContent: ANY, lIdx: number) => mergeLesson(cIdx, lIdx, lessonContent));
                                    } else {
                                        Object.keys(chapterContent).forEach(lIdxKey => {
                                            const lIdx = parseInt(lIdxKey);
                                            if (!isNaN(lIdx)) mergeLesson(cIdx, lIdx, chapterContent[lIdxKey]);
                                        });
                                    }
                                }
                            });
                        } else {
                            Object.keys(content).forEach(cIdxKey => {
                                const cIdx = parseInt(cIdxKey);
                                if (!isNaN(cIdx)) {
                                    const chapterContent = content[cIdxKey];
                                    if (typeof chapterContent === 'object') {
                                        Object.keys(chapterContent).forEach(lIdxKey => {
                                            const lIdx = parseInt(lIdxKey);
                                            if (!isNaN(lIdx)) mergeLesson(cIdx, lIdx, chapterContent[lIdxKey]);
                                        });
                                    }
                                }
                            });
                        }
                        newSuggestionData.content = newContent;
                        hasUpdates = true;
                        console.log('[DEBUG] Merged content deeply');
                    }
                } catch (e) { console.error("Error parsing content", e); }
            }

            if (hasUpdates) return newSuggestionData;
            return prev;
        });

        setKeyRefresh(prev => prev + 1);
    };

    // Handle updates to suggestionData from children
    const handleSuggestionReview = (value: ANY, key: string) => {
        console.log('[DEBUG] handleSuggestionReview called:', { key, value });
        setSuggestionData((prevValue: ANY) => {
            if (key === 'content') {
                // Ensure value is handled as an array of chapters
                const incomingChapters = Array.isArray(value) ? value : (typeof value === 'object' && value !== null ? Object.values(value) : []);

                // Perform a deep merge of the content chapters/lessons/questions to avoid overwriting rapid updates
                const newContent: ANY[] = Array.isArray(prevValue.content) ? [...prevValue.content] : [];
                if (!Array.isArray(prevValue.content) && prevValue.content && typeof prevValue.content === 'object') {
                    Object.keys(prevValue.content).forEach(k => {
                        const idx = parseInt(k);
                        if (!isNaN(idx)) newContent[idx] = prevValue.content[k];
                    });
                }

                incomingChapters.forEach((chapter, cIdx) => {
                    if (chapter) {
                        // Normalize existing chapter to array
                        let currentChapter: ANY[] = Array.isArray(newContent[cIdx]) ? [...newContent[cIdx]] : [];
                        if (!Array.isArray(newContent[cIdx]) && newContent[cIdx] && typeof newContent[cIdx] === 'object') {
                            Object.keys(newContent[cIdx]).forEach(k => {
                                const idx = parseInt(k);
                                if (!isNaN(idx)) currentChapter[idx] = newContent[cIdx][k];
                            });
                        }

                        // Normalize incoming chapter to iterate lessons
                        const incomingLessons = Array.isArray(chapter) ? chapter : (typeof chapter === 'object' ? Object.values(chapter) : []);

                        incomingLessons.forEach((lesson, lIdx) => {
                            if (lesson) {
                                const prevLesson = currentChapter[lIdx] || {};
                                const mergedLesson = { ...prevLesson, ...lesson };

                                // Deep merge questions and flashcards
                                if (lesson.questions) {
                                    mergedLesson.questions = mergeDeepItems(prevLesson.questions, lesson.questions);
                                }
                                if (lesson.flashcards) {
                                    mergedLesson.flashcards = mergeDeepItems(prevLesson.flashcards, lesson.flashcards);
                                }

                                currentChapter[lIdx] = mergedLesson;
                            }
                        });
                        newContent[cIdx] = currentChapter;
                    }
                });
                console.log('[DEBUG] handleSuggestionReview merged content:', { chapters: newContent.length });
                return { ...prevValue, content: newContent, _user_edited_content: true };
            }

            let updates: ANY = {};
            if (key && typeof key === 'string') {
                updates = { [key]: value, [`_user_edited_${key}`]: true };
            } else {
                // If no key, value is expected to be the full updated post object
                updates = { ...value };
                // Also mark fields as user edited
                Object.keys(value).forEach(k => {
                    updates[`_user_edited_${k}`] = true;
                });
            }
            return { ...prevValue, ...updates };
        });
        setKeyRefresh(prev => prev + 1);
    };

    React.useEffect(() => {
        if (post?.id) {
            ajax({
                url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step0',
                method: 'POST',
                data: { id: post.id },
                success: (result: ANY) => {
                    if (result.spacedev_course_ai_suggest) {
                        syncFromAiSuggest(result.spacedev_course_ai_suggest);
                        if (result.spacedev_course_ai_suggest.step_current) {
                            const step = parseInt(result.spacedev_course_ai_suggest.step_current);
                            if (!isNaN(step) && step > 0) {
                                setActiveStep(step - 1);
                                setMaxStep(step - 1);
                            }
                        }
                    }
                }
            });
        }
    }, [post?.id]);

    const handleNext = () => {
        // Validation removed for Step 2 as requested
        setActiveStep((prevActiveStep) => {
            const nextStep = prevActiveStep + 1;
            if (nextStep > maxStep) {
                setMaxStep(nextStep);
            }
            return nextStep;
        });
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0: // Identity
                return (
                    <StepIdentity
                        key={keyRefresh}
                        post={suggestionData}
                        onReview={handleSuggestionReview}
                        onNext={handleNext}
                        maxStep={maxStep}
                        onSyncAiData={syncFromAiSuggest}
                    />
                );
            case 1: // Outline
                return (
                    <StepOutline
                        key={keyRefresh}
                        onNext={handleNext}
                        onBack={handleBack}
                        post={suggestionData}
                        onReview={handleSuggestionReview}
                        onSyncAiData={syncFromAiSuggest}
                        maxStep={maxStep}
                    />
                );
            case 2: // Content
                return (
                    <StepContent
                        post={suggestionData}
                        onReview={handleSuggestionReview}
                        onSyncAiData={syncFromAiSuggest}
                        content={content}
                        setContent={setContent}
                        addAssessment={addAssessment}
                        setAddAssessment={setAddAssessment}
                        onNext={handleNext}
                        onBack={handleBack}
                        setActiveStep={setActiveStep}
                    />
                );
            case 3: // Assessment
                return (
                    <StepAssessment
                        post={suggestionData}
                        onReview={handleSuggestionReview}
                        onSyncAiData={syncFromAiSuggest}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 4: // Flashcard
                return (
                    <StepFlashcard
                        post={suggestionData}
                        onReview={handleSuggestionReview}
                        onSyncAiData={syncFromAiSuggest}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 5: // Export
                return (
                    <StepExport
                        post={suggestionData}
                        onBack={handleBack}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100%', gap: 3 }}>
            {/* Left Sidebar - Steps */}
            <Box sx={{ width: 250, minWidth: 250, borderRight: '1px solid #divider', pr: 3 }}>
                <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((step, index) => (
                        <Step key={step.label}>
                            <StepLabel
                                optional={
                                    <Typography variant="caption">{step.description}</Typography>
                                }
                            >
                                {step.label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            {/* Right Content Area */}
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', overflowY: 'auto', p: 1 }}>
                    {renderStepContent(activeStep)}
                </Box>
            </Box>
        </Box>
    );
}
