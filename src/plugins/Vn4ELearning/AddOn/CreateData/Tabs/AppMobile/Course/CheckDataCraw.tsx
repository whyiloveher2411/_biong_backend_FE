import { Box, CircularProgress, FormControl, InputLabel, ListSubheader, MenuItem, Select, TextField, Typography, IconButton, Chip } from "@mui/material";
import { FieldFormItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";
import React from "react";
import { LoadingButton } from "@mui/lab";
import DrawerCustom from "components/molecules/DrawerCustom";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";
import { Layout, Fit, Alignment, useRive } from '@rive-app/react-canvas';
import useLanguages from "../hooks/useLanguages";

function CheckDataCraw(props: FieldFormItemProps & { autoPreview?: boolean }) {

    const ajaxUseApi = useAjax();

    const [chapters, setChapters] = React.useState<ANY[]>([]);
    const [loading, setLoading] = React.useState(false);

    const [previewData, setPreviewData] = React.useState<ANY>(null);
    const [openPreview, setOpenPreview] = React.useState(false);
    const { languages } = useLanguages();

    const [drawerData, setDrawerData] = React.useState<DataResultApiProps | false>(false);
    const [openDrawerEditPost, setOpenDrawerEditPost] = React.useState(false);

    const [activeQuestionIndex, setActiveQuestionIndex] = React.useState<number>(0);
    const questionRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    React.useEffect(() => {
        questionRefs.current = questionRefs.current.slice(0, previewData?.questions?.length || 0);
    }, [previewData]);

    React.useEffect(() => {
        if (!openPreview) return;
        const checkContainer = setInterval(() => {
            const scrollContainer = document.getElementById('scroll-container-questions');
            // Wait for elements to be painted and refs to be populated
            if (scrollContainer && questionRefs.current.length > 0) {
                clearInterval(checkContainer);
                initObserver(scrollContainer);
            }
        }, 100);

        let observer: IntersectionObserver;

        const initObserver = (root: HTMLElement) => {
            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        setActiveQuestionIndex(index);
                    }
                });
            }, {
                root: root,
                rootMargin: '-40% 0px -40% 0px', // Active when in center 20%
                threshold: 0
            });

            questionRefs.current.forEach(el => {
                if (el) observer.observe(el);
            });
        };

        return () => {
            clearInterval(checkContainer);
            if (observer) observer.disconnect();
        };
    }, [previewData, openPreview]);

    const handleCreateQuestion = (question: ANY, index: number) => {

        if (question.post_id) {
            // Edit existing question
            setLoading(true);
            const objectType = "spacedev_question";
            ajaxUseApi.ajax({
                url: `post-type/detail/${objectType}/${question.post_id}`,
                method: "POST",
                data: { id: question.post_id },
                success: (result: DataResultApiProps) => {
                    if (result.post) {
                        // Ensure order is updated/set if needed, but usually existing order is kept.
                        // If user wants to enforce preview order:
                        result.post.order = index + 1;

                        setDrawerData({
                            ...result,
                            type: objectType,
                            action: "EDIT",
                        });
                        setOpenDrawerEditPost(true);
                    }
                    setLoading(false);
                },
                error: () => {
                    setLoading(false);
                }
            });
            return;
        }

        // Fetch the "Create New Question" form structure
        // Parent: Current Lesson (props.post.id)
        // Child Object: spacedev_question
        const childObjectType = "spacedev_question";
        const parentObjectType = "spacedev_lesson"; // Lesson type
        const relationshipField = "spacedev_lesson";

        setLoading(true);
        ajaxUseApi.ajax({
            url: "post-type/show-post-relationship",
            method: "POST",
            data: {
                object: childObjectType,
                mainType: parentObjectType,
                id: props.post.id,
                field: relationshipField,
                view: "relationship_onetomany_show",
                page: 1,
                rowsPerPage: 5,
            },
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    // ... (existing logic for new question) ...
                    result.action = "ADD_NEW";
                    result.type = childObjectType;
                    // Initialize the new post data
                    if (!result.post) result.post = {};

                    // Set relationship to parent lesson
                    result.post[relationshipField] = props.post.id;
                    result.post.order = index + 1;

                    // Pre-fill data from the preview question
                    result.post.title = question.title;

                    // Map body to potential fields. 
                    // We stringify the body because form inputs typically expect strings.
                    // The field is multi-language, so we wrap it in an object with 'en' key.
                    const jsonBody = JSON.stringify(question.body, null, 4);

                    result.post.body = { en: jsonBody };

                    // Map content if it exists and is a valid object (not empty array)
                    if (question.content && !Array.isArray(question.content)) {
                        const jsonContent = JSON.stringify(question.content, null, 4);
                        result.post.content = { en: jsonContent };
                    }

                    setDrawerData({ ...result });
                    setOpenDrawerEditPost(true);
                }
                setLoading(false);
            },
            error: () => {
                setLoading(false);
            }
        });
    };

    const handleCheckDataCraw = () => {
        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/check-data-craw",
            method: "POST",
            data: {
                action: "check-data-craw",
                id: props.post.id,
            },
            success: (result) => {
                if (result.success && result.data) {
                    if (result.data.chapters) setChapters(result.data.chapters);
                }
                setLoading(false);
            },
        });
    }

    const handleAddDataFromJson = () => {
        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/add-lesson-from-json",
            method: "POST",
            data: {
                action: "add-data-from-json",
                id: props.post.id,
            },
            success: (result) => {
                if (result.success && result.data && result.data.chapters) {
                    setChapters(result.data.chapters);
                }
                setLoading(false);
            },
        });
    }

    const handlePreviewDataFromJson = () => {
        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/preview-data-lesson-from-json",
            method: "POST",
            data: {
                action: "preview-data-lesson-from-json",
                file: props.post[props.name || 'link_data_craw_json'],
                id: props.post.id,
            },
            success: (result) => {
                if (result.success && result.results) {
                    setPreviewData(result.results);
                    setOpenPreview(true);
                }
                setLoading(false);
            },
        });
    }

    const handleClosePreview = () => {
        setOpenPreview(false);
    };

    React.useEffect(() => {
        if (props.post.id) {
            handleCheckDataCraw();
        }
    }, [props.post.id]);

    React.useEffect(() => {
        if (props.autoPreview && props.post.id) {
            handlePreviewDataFromJson();
        }
    }, [props.autoPreview, props.post.id]);

    const value = props.post?.[props.name || 'link_data_craw_json'] || '';

    const handleChange = (event: ANY) => {
        props.onReview(event.target.value, props.name || 'link_data_craw_json');
    };

    if (loading && chapters.length === 0) {
        return <CircularProgress size={20} />;
    }

    const previewContent = (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

            {/* Main Scroll Container */}
            <div
                id="scroll-container-questions"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    height: '100%',
                    padding: '20px',
                    scrollBehavior: 'smooth',
                    position: 'relative'
                }}
            >
                {previewData && previewData.questions.map((question: ANY, index: number) => {
                    return (
                        <div
                            key={question.id || index}
                            ref={el => questionRefs.current[index] = el}
                            data-index={index}
                            style={{ scrollMarginTop: '20px', marginBottom: '20px' }}
                        >
                            <QuestionItem
                                index={index}
                                initialQuestion={question}
                                postId={props.post.id}
                                file={props.post[props.name || 'link_data_craw_json']}
                                languages={languages}
                                onDelete={() => {
                                    const newQuestions = [...previewData.questions];
                                    newQuestions.splice(index, 1);
                                    setPreviewData({ ...previewData, questions: newQuestions, count: newQuestions.length });
                                }}
                                onTranslated={handlePreviewDataFromJson}
                                onCreate={() => handleCreateQuestion(question, index)}
                            />
                        </div>
                    )
                })}
            </div>

            {/* TOC Sidebar */}
            <div style={{
                width: '60px',
                height: '100%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'center',
                paddingTop: '20px',
                paddingBottom: '20px',
                borderLeft: '1px solid #ddd',
                backgroundColor: '#fff'
            }}>
                {previewData && previewData.questions.map((question: ANY, index: number) => (
                    <div
                        key={index}
                        onClick={() => {
                            // Scroll inside container
                            const container = document.getElementById('scroll-container-questions');
                            const el = questionRefs.current[index];
                            if (container && el) {
                                // manual scroll calculation or just use scrollIntoView
                                // but scrollIntoView might scroll parent drawer if not careful.
                                // Use scrollIntoView with block: 'center' usually works well.
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            setActiveQuestionIndex(index);
                        }}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backgroundColor: activeQuestionIndex === index ? '#1976d2' : '#fff',
                            color: activeQuestionIndex === index ? '#fff' : '#666',
                            border: activeQuestionIndex === index ? 'none' : '1px solid #ddd',
                            fontWeight: 'bold',
                            transition: 'all 0.2s ease',
                            transform: activeQuestionIndex === index ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: activeQuestionIndex === index ? '0 4px 8px rgba(25, 118, 210, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                            fontSize: '14px',
                            flexShrink: 0,
                            ...(question.status === 'trash' ? { color: 'white', backgroundColor: '#c92f13ff' } : {})
                        }}
                        title={`Go to Question ${index + 1}`}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>
        </div>
    );

    if (props.autoPreview) {
        if (loading && !previewData) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <CircularProgress />
                </Box>
            );
        }
        return (
            <Box sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
                {previewData && previewContent}
                {/* Drawer for creating/editing the question using standard form */}
                {openDrawerEditPost && drawerData && (
                    <DrawerEditPost
                        open={openDrawerEditPost}
                        openLoading={ajaxUseApi.open}
                        setData={setDrawerData}
                        handleSubmit={() => {
                            if (drawerData) {
                                ajaxUseApi.ajax({
                                    url: "post-type/post/" + drawerData.type,
                                    method: "POST",
                                    data: {
                                        ...drawerData.post,
                                        _action: drawerData.action,
                                    },
                                    success: () => {
                                        setOpenDrawerEditPost(false);
                                        // Optionally remove form preview list?
                                        handlePreviewDataFromJson();
                                    },
                                });
                            }
                        }}
                        onClose={() => {
                            setOpenDrawerEditPost(false);
                        }}
                        data={drawerData}
                        handleAfterDelete={() => {
                            setOpenDrawerEditPost(false);
                            handlePreviewDataFromJson();
                        }}
                    />
                )}
            </Box>
        );
    }

    return (
        <Box>
            <FormControl fullWidth size="small">
                <InputLabel shrink id="link-data-craw-select-label">Link Data Craw JSON</InputLabel>
                <Select
                    labelId="link-data-craw-select-label"
                    value={value}
                    label="Link Data Craw JSON"
                    onChange={handleChange}
                    displayEmpty
                    title="Link Data Craw JSON"
                >
                    <MenuItem value="" disabled>
                        <em>Select Data</em>
                    </MenuItem>
                    {chapters.map((chapter, index) => {
                        // Calculate max match score to highlight only the best match(es)
                        let maxMatchScore = 0;
                        chapters.forEach(c => c.lessons?.forEach((l: ANY) => {
                            if (l.match_with_title > maxMatchScore) maxMatchScore = l.match_with_title;
                        }));

                        const items = [];
                        items.push(<ListSubheader key={`header-${index}`}>{chapter.title}</ListSubheader>);
                        if (chapter.lessons && Array.isArray(chapter.lessons)) {
                            chapter.lessons.forEach((lesson: ANY, lessonIndex: number) => {
                                if (!lesson.title) return;
                                items.push(
                                    <MenuItem
                                        key={`lesson-${index}-${lessonIndex}`}
                                        value={lesson.path || ''}
                                        disabled={!lesson.has_data}
                                        sx={{ pl: 4 }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <span>
                                                {lesson.title} {lesson.has_data ? '' : ' (No Data)'}
                                                {lesson.match_with_title === maxMatchScore && maxMatchScore > 0 && <span style={{ color: 'green', fontSize: '0.85em', marginLeft: '5px', fontWeight: 'bold' }}>(Match: {lesson.match_with_title}%)</span>}
                                            </span>
                                            {lesson.used_in_lesson && lesson.used_in_lesson !== props.post.id && (
                                                <span style={{ color: '#ff9800', fontSize: '0.85em', marginLeft: '10px' }}>
                                                    (Used)
                                                </span>
                                            )}
                                        </div>
                                    </MenuItem>
                                );
                            });
                        }
                        return items;
                    })}
                </Select>
            </FormControl>

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <LoadingButton loading={loading} sx={{ mt: 2 }} variant="contained" onClick={handlePreviewDataFromJson}>Preview</LoadingButton>
                <LoadingButton loading={loading} sx={{ mt: 2 }} variant="contained" onClick={handleAddDataFromJson}>Add lesson from json</LoadingButton>
            </Box>

            {/* Refactored Preview Drawer */}
            <DrawerCustom
                open={openPreview}
                onClose={handleClosePreview}
                title={`Preview Questions (${previewData?.count || 0})`}
                width={1900}
                restDialogContent={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        padding: '0px',
                        overflow: 'hidden',
                    }
                }}
            >
                {previewContent}
            </DrawerCustom>

            {/* Drawer for creating/editing the question using standard form */}
            {openDrawerEditPost && drawerData && (
                <DrawerEditPost
                    open={openDrawerEditPost}
                    openLoading={ajaxUseApi.open}
                    setData={setDrawerData}
                    handleSubmit={() => {
                        if (drawerData) {
                            ajaxUseApi.ajax({
                                url: "post-type/post/" + drawerData.type,
                                method: "POST",
                                data: {
                                    ...drawerData.post,
                                    _action: drawerData.action,
                                },
                                success: () => {
                                    setOpenDrawerEditPost(false);
                                    // Optionally remove form preview list?
                                    handlePreviewDataFromJson();
                                },
                            });
                        }
                    }}
                    onClose={() => {
                        setOpenDrawerEditPost(false);
                    }}
                    data={drawerData}
                    handleAfterDelete={() => {
                        setOpenDrawerEditPost(false);
                        handlePreviewDataFromJson();
                    }}
                />
            )}

        </Box>
    );
}

export default CheckDataCraw;

function QuestionItem({ index, initialQuestion, postId, file, onDelete, onCreate, onTranslated, languages }: { index: number, initialQuestion: ANY, postId: ANY, file: ANY, onDelete: () => void, onCreate: (question: ANY) => void, onTranslated?: () => void, languages: ANY[] }) {
    const ajaxUseApi = useAjax();
    const [question, setQuestion] = React.useState(initialQuestion);
    const [jsonBody, setJsonBody] = React.useState(JSON.stringify(initialQuestion.body_post || initialQuestion.body, null, 2));
    const [jsonContent, setJsonContent] = React.useState(initialQuestion.content_post || initialQuestion.content ? JSON.stringify(initialQuestion.content_post || initialQuestion.content, null, 2) : '');
    const [loadingTranslate, setLoadingTranslate] = React.useState<string | number | boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setQuestion(initialQuestion);
        setJsonBody(JSON.stringify(initialQuestion.body_post || initialQuestion.body, null, 2));
        setJsonContent(initialQuestion.content_post || initialQuestion.content ? JSON.stringify(initialQuestion.content_post || initialQuestion.content, null, 2) : '');
    }, [initialQuestion]);

    const availableLangs = React.useMemo(() => {
        const langs: string[] = ['en'];
        const langCodes = languages.map(l => l.code);

        [question.body_post, question.content_post, question.body, question.content].forEach(field => {
            if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
                Object.keys(field).forEach(key => {
                    if (langCodes.includes(key) && !langs.includes(key)) langs.push(key);
                });
            }
        });

        return langs;
    }, [question, languages]);

    const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setJsonBody(newVal);
        try {
            const parsed = JSON.parse(newVal);
            setQuestion({ ...question, body: parsed });
            setError(null);
        } catch (e) {
            // setError("Invalid JSON");
        }
    };

    const handleJsonContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setJsonContent(newVal);
        try {
            const parsed = JSON.parse(newVal);
            setQuestion({ ...question, content: parsed });
        } catch (e) {
            // Ignore error for now or handle it
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuestion({ ...question, title: e.target.value });
    };

    const handleTranslate = (lang: string | number) => {
        setLoadingTranslate(lang);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/translate-question-by-ai",
            method: "POST",
            data: { id: initialQuestion.post_id, lang: lang },
            success: (result: ANY) => {
                if (result.success && (result.post || result.data)) {
                    const data = result.post || result.data;

                    // Parse body/content if strings
                    if (typeof data.body === 'string') {
                        try { data.body = JSON.parse(data.body); } catch (e) { console.error("Parse body error", e); }
                    }
                    if (typeof data.content === 'string') {
                        try { data.content = JSON.parse(data.content); } catch (e) { console.error("Parse content error", e); }
                    }

                    const updatedQuestion = { ...question, ...data };
                    setQuestion(updatedQuestion);
                    setJsonBody(JSON.stringify(updatedQuestion.body_post || updatedQuestion.body, null, 2));
                    if (updatedQuestion.content_post || updatedQuestion.content) {
                        setJsonContent(JSON.stringify(updatedQuestion.content_post || updatedQuestion.content, null, 2));
                    }
                    if (onTranslated) {
                        onTranslated();
                    }
                }
                setLoadingTranslate(false);
            },
            error: () => {
                setLoadingTranslate(false);
            }
        });
    };

    // Modified to call parent's onCreate which opens DrawerEditPost
    const handleCreateQuestion = () => {
        // Pass the potentially edited question back to parent
        // Note: parent passes `initialQuestion` to `onCreate` currently? 
        // No, parent needs the *updated* question from here. 
        // But `onCreate` in parent was defined as `() => handleCreateQuestion(question)` where `question` is loop var (stale).
        // We should probably update the parent to accept the updated question object.
        // Let's assume for now we ignore local edits if we use standard form, OR we pass current state.
        // Best: Pass `question` (local state) to `onCreate`.
        onCreate(question);
    };

    return (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                    Question {index + 1} {initialQuestion.post_id ? (initialQuestion.status === 'trash' ? <Chip label="Deleted" color="error" /> : '') : <></>}
                </Typography>
                <div>
                    {initialQuestion.post_id && languages.filter(l => l.code !== 'en').map((lang) => (
                        <LoadingButton
                            key={lang.code}
                            variant="outlined"
                            size="small"
                            loading={loadingTranslate === lang.id}
                            disabled={loadingTranslate !== false && loadingTranslate !== lang.id}
                            onClick={() => handleTranslate(lang.id)}
                            startIcon={lang.icon_url ? (
                                <img src={lang.icon_url} alt={lang.name || lang.title} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
                            ) : (
                                <img src={`https://flagcdn.com/w20/${lang.flag_code}.png`} alt={lang.name || lang.title} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
                            )}
                            sx={{ mr: 1 }}
                            color="info"
                        >
                            Dịch {lang.name || lang.title}
                        </LoadingButton>
                    ))}
                    <LoadingButton
                        variant="contained"
                        size="small"
                        // loading={loading}
                        onClick={handleCreateQuestion}
                        sx={{ mr: 1 }}
                        color={initialQuestion.post_id ? "warning" : "primary"}
                    >
                        {initialQuestion.post_id ? "Edit Question" : "Create Question"}
                    </LoadingButton>
                    <IconButton size="small" onClick={onDelete} color="error">
                        <DeleteIcon />
                    </IconButton>
                </div>
            </div>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <TextField
                    label="Question Title"
                    fullWidth
                    size="small"
                    value={question.title}
                    onChange={handleTitleChange}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            label="JSON Body"
                            fullWidth
                            multiline
                            minRows={1}
                            maxRows={20}
                            value={jsonBody}
                            onChange={handleJsonChange}
                            error={!!error}
                            helperText={error}
                            size="small"
                            InputProps={{
                                style: { fontFamily: 'monospace', fontSize: '0.85rem' }
                            }}
                        />
                        <TextField
                            label="JSON Content"
                            fullWidth
                            multiline
                            minRows={1}
                            maxRows={20}
                            value={jsonContent}
                            onChange={handleJsonContentChange}
                            size="small"
                            sx={{ mt: 2 }}
                            InputProps={{
                                style: { fontFamily: 'monospace', fontSize: '0.85rem' }
                            }}
                        />
                    </Box>
                    <Box sx={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', p: 2, bgcolor: '#fafafa', position: 'relative' }}>
                        {(() => {
                            const checkSufficientData = () => {
                                // Check body
                                if (question.body && Array.isArray(question.body)) {
                                    for (const comp of question.body) {
                                        if (comp.type === 'parts') {
                                            const hasSecrets = comp.parts?.some((p: ANY) => p.isASecret);
                                            if (hasSecrets) {
                                                if (!comp.answer || comp.answer.length === 0) return false;
                                            }
                                        }
                                    }
                                }
                                // Check content
                                if (question.content && typeof question.content === 'object' && !Array.isArray(question.content)) {
                                    if (question.content.type === 'select_answer') {
                                        if (!question.content.options || !Array.isArray(question.content.options)) return false;
                                        if (!question.content.options.some((o: ANY) => o.isCorrect)) return false;
                                    }
                                }
                                return true;
                            };

                            const isSufficient = checkSufficientData();

                            return (
                                <>
                                    {isSufficient && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            bgcolor: 'rgba(46, 125, 50, 0.05)',
                                            zIndex: 10,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '4px',
                                            pointerEvents: 'none'
                                        }}>
                                            <CheckCircleIcon color="success" sx={{ fontSize: 200, opacity: 0.4, bgcolor: 'white', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} />
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: '1px solid #eee', pb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold' }}>Preview All Languages:</Typography>
                                    </Box>
                                </>
                            );
                        })()}
                        <Box sx={{
                            display: 'flex',
                            gap: '20px',
                            overflowX: 'auto',
                            pb: 1,
                            '&::-webkit-scrollbar': { height: '8px' },
                            '&::-webkit-scrollbar-thumb': { backgroundColor: '#ccc', borderRadius: '4px' }
                        }}>
                            {availableLangs.map((langCode) => {
                                const langInfo = languages.find(l => l.code === langCode);
                                return (
                                    <Box
                                        key={langCode}
                                        sx={{
                                            minWidth: availableLangs.length > 1 ? '500px' : '100%',
                                            flex: availableLangs.length > 1 ? '0 0 500px' : '1',
                                            bgcolor: 'white',
                                            p: 2,
                                            borderRadius: '4px',
                                            border: '1px solid #eee',
                                            position: 'relative'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 0.5, borderBottom: '1px dashed #ddd' }}>
                                            {langInfo?.icon_url ? (
                                                <img src={langInfo.icon_url} style={{ width: 18, height: 12, borderRadius: '2px', objectFit: 'cover' }} />
                                            ) : langInfo?.flag_code ? (
                                                <img src={`https://flagcdn.com/w20/${langInfo.flag_code}.png`} style={{ width: 18, height: 12, borderRadius: '2px', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '12px' }}>🌐</span>
                                            )}
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                                                {langInfo?.name || langCode.toUpperCase()}
                                            </Typography>
                                        </Box>

                                        {(() => {
                                            let questionData = { ...question };
                                            const langCodes = languages.map(l => l.code);

                                            const body = question.body_post || question.body;
                                            if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
                                                const isLocalized = Object.keys(body).some(key => langCodes.includes(key));
                                                if (isLocalized) {
                                                    const jsonStr = body[langCode] || body['en'] || Object.values(body)[0];
                                                    if (typeof jsonStr === 'string') {
                                                        try {
                                                            questionData.body = JSON.parse(jsonStr);
                                                        } catch (e) {
                                                            console.error("Failed to parse body JSON", e);
                                                        }
                                                    } else if (Array.isArray(jsonStr)) {
                                                        questionData.body = jsonStr;
                                                    }
                                                }
                                            }

                                            return questionData.body?.map((component: ANY, compIndex: number) => {
                                                switch (component.type) {
                                                    case 'text':
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px' }} dangerouslySetInnerHTML={{ __html: component.text }} />
                                                        );
                                                    case 'code':
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px', backgroundColor: '#282c34', color: '#abb2bf', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                                                {component.code}
                                                            </div>
                                                        );
                                                    case 'image':
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px', textAlign: 'center' }}>
                                                                <img src={component.image?.link} alt={component.description || 'Question Image'} style={{ maxWidth: '100%', borderRadius: '4px' }} />
                                                                {component.description && <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>{component.description}</div>}
                                                            </div>
                                                        );
                                                    case 'info':
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: '4px', borderLeft: '4px solid #1976d2' }} dangerouslySetInnerHTML={{ __html: component.info }} />
                                                        );
                                                    case 'parts': {
                                                        let secretIndexCounter = 0;
                                                        const isKeyboard = component.input_method === 'keyboard';
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px' }}>
                                                                {isKeyboard && (
                                                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#666', mb: 1, fontStyle: 'italic', bgcolor: '#f0f0f0', p: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                                                        <span style={{ fontSize: '14px' }}>⌨️</span> Keyboard Input
                                                                    </Typography>
                                                                )}
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                                                                    {component.parts?.map((part: ANY, partIndex: number) => {
                                                                        if (!part.isASecret) {
                                                                            if (part.content === '\n') {
                                                                                return <div key={partIndex} style={{ flexBasis: '100%', height: 20, color: 'red', fontSize: '12px' }} >"\n" Cần update data</div>;
                                                                            }

                                                                            if (part.type === 'new_line') {
                                                                                return <div key={partIndex} style={{ flexBasis: '100%', height: 0 }} />;
                                                                            }
                                                                            return <span key={partIndex}>{part.content}</span>;
                                                                        } else {
                                                                            const currentSecretIndex = secretIndexCounter++;
                                                                            const matchingAnswer = component.answer?.find((a: ANY) => a.index_correct === currentSecretIndex);

                                                                            if (isKeyboard) {
                                                                                const widthStyle = part.maxLength ? { minWidth: `${Math.max(30, part.maxLength * 9)}px` } : { minWidth: '40px' };
                                                                                return (
                                                                                    <span key={partIndex} style={{
                                                                                        display: 'inline-block',
                                                                                        ...widthStyle,
                                                                                        padding: '2px 8px',
                                                                                        backgroundColor: '#fff',
                                                                                        border: '1px solid #ccc',
                                                                                        borderRadius: '4px',
                                                                                        textAlign: 'center',
                                                                                        color: matchingAnswer ? '#333' : '#ccc',
                                                                                        fontFamily: 'monospace',
                                                                                        fontWeight: 'bold',
                                                                                        fontSize: '0.95em',
                                                                                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                                                                                    }}>
                                                                                        {matchingAnswer ? matchingAnswer.text : ''}
                                                                                    </span>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <span key={partIndex} style={{
                                                                                    display: 'inline-block',
                                                                                    minWidth: '30px',
                                                                                    padding: '2px 5px',
                                                                                    backgroundColor: matchingAnswer ? '#e8f5e9' : '#e0e0e0',
                                                                                    borderBottom: `2px solid ${matchingAnswer ? '#4caf50' : '#999'}`,
                                                                                    borderRadius: '2px',
                                                                                    textAlign: 'center',
                                                                                    color: matchingAnswer ? '#2e7d32' : '#555',
                                                                                    fontWeight: matchingAnswer ? 'bold' : 'normal',
                                                                                    fontSize: '0.9em'
                                                                                }}>
                                                                                    {matchingAnswer ? matchingAnswer.text : (part.content || '[...]')}
                                                                                </span>
                                                                            );
                                                                        }
                                                                    })}
                                                                </div>
                                                                {/* Render Answers/Options (Distractors only) */}
                                                                {component.answer && component.answer.some((a: ANY) => a.index_correct === -1) && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '10px' }}>
                                                                        {component.answer.filter((a: ANY) => a.index_correct === -1).map((answer: ANY, ansIndex: number) => (
                                                                            <div key={ansIndex} style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                color: 'inherit'
                                                                            }}>
                                                                                <span style={{
                                                                                    width: '20px',
                                                                                    height: '20px',
                                                                                    borderRadius: '50%',
                                                                                    border: '1px solid #ccc',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '12px'
                                                                                }}>
                                                                                    {String.fromCharCode(65 + ansIndex)}
                                                                                </span>
                                                                                <span>{answer.text}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    case 'run_code':
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    backgroundColor: '#f5f5f5',
                                                                    padding: '8px 12px',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    borderBottom: '1px solid #ddd'
                                                                }}>
                                                                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                                                                        {component.language || 'Code'} Playground
                                                                    </Typography>
                                                                    <LoadingButton
                                                                        size="small"
                                                                        variant="contained"
                                                                        color="success"
                                                                        startIcon={<PlayArrowIcon fontSize="small" />}
                                                                        sx={{ textTransform: 'none', py: 0.5, minWidth: 'auto', fontSize: '0.75rem', height: 24 }}
                                                                    >
                                                                        Run
                                                                    </LoadingButton>
                                                                </div>
                                                                <div style={{
                                                                    padding: '12px',
                                                                    backgroundColor: '#282c34',
                                                                    color: '#abb2bf',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.9rem',
                                                                    whiteSpace: 'pre-wrap',
                                                                    overflowX: 'auto'
                                                                }}>
                                                                    {component.code}
                                                                </div>
                                                                {component.testCases && component.testCases.length > 0 && (
                                                                    <div style={{ borderTop: '1px solid #ddd', backgroundColor: '#fff', padding: '10px' }}>
                                                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block', mb: 1 }}>Test Cases:</Typography>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                            {component.testCases.map((testCase: ANY, tcIndex: number) => (
                                                                                <div key={tcIndex} style={{
                                                                                    backgroundColor: '#f9f9f9',
                                                                                    padding: '8px',
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid #eee',
                                                                                    fontSize: '0.85rem'
                                                                                }}>
                                                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                                                        <span style={{ fontWeight: 'bold', minWidth: '50px', color: '#555' }}>Input:</span>
                                                                                        <code style={{ backgroundColor: '#eee', padding: '2px 4px', borderRadius: '3px', flex: 1, color: '#333', fontFamily: 'monospace' }}>
                                                                                            {testCase.input || '(empty)'}
                                                                                        </code>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                                                                        <span style={{ fontWeight: 'bold', minWidth: '50px', color: '#555' }}>Output:</span>
                                                                                        <code style={{ backgroundColor: '#eee', padding: '2px 4px', borderRadius: '3px', flex: 1, color: '#333', fontFamily: 'monospace' }}>
                                                                                            {testCase.output}
                                                                                        </code>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );

                                                    case 'chat_suggestions':
                                                        return (
                                                            <div key={compIndex} style={{ width: '100%', maxWidth: '600px', margin: '20px auto', fontFamily: 'Arial, sans-serif', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                                                                {/* Header */}
                                                                <div style={{ backgroundColor: '#e3f2fd', padding: '12px', textAlign: 'center', borderBottom: '2px solid #2196f3', color: '#1976d2', fontWeight: 'bold' }}>
                                                                    AI CHAT
                                                                </div>

                                                                <div style={{ padding: '20px', backgroundColor: '#f0f4f8' }}>
                                                                    {/* Instructions */}
                                                                    {component.chatInstructions && (
                                                                        <div style={{ marginBottom: '15px', color: '#546e7a', fontSize: '1.1em' }} dangerouslySetInnerHTML={{ __html: component.chatInstructions }} />
                                                                    )}

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                                        {component.options?.map((opt: ANY, optIdx: number) => (
                                                                            <div key={optIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                                {/* Question / Option (Simulating user input/selection) */}
                                                                                <div style={{
                                                                                    padding: '12px 16px',
                                                                                    backgroundColor: '#fff',
                                                                                    border: '1px solid #cfd8dc',
                                                                                    borderRadius: '20px',
                                                                                    color: '#37474f',
                                                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                                    alignSelf: 'flex-end',
                                                                                    maxWidth: '85%'
                                                                                }}>
                                                                                    {opt.text}
                                                                                </div>

                                                                                {/* Response (Simulating AI response) */}
                                                                                <div style={{
                                                                                    padding: '15px',
                                                                                    backgroundColor: '#e1eef9',
                                                                                    borderLeft: '4px solid #1976d2',
                                                                                    borderRadius: '4px',
                                                                                    color: '#263238',
                                                                                    alignSelf: 'flex-start',
                                                                                    maxWidth: '90%',
                                                                                    position: 'relative'
                                                                                }}>
                                                                                    <div style={{ fontSize: '0.85em', color: '#1565c0', fontWeight: 'bold', marginBottom: '5px' }}>AI Answer:</div>
                                                                                    <div dangerouslySetInnerHTML={{ __html: opt.response || '(No response provided yet)' }} />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    case 'ai_chat':
                                                        return (
                                                            <div key={compIndex} style={{ width: '100%', maxWidth: '600px', margin: '20px auto', fontFamily: 'Arial, sans-serif', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                                                                {/* Header */}
                                                                <div style={{ backgroundColor: '#e3f2fd', padding: '12px', textAlign: 'center', borderBottom: '2px solid #2196f3', color: '#1976d2', fontWeight: 'bold' }}>
                                                                    AI CHAT
                                                                </div>

                                                                <div style={{ padding: '20px', backgroundColor: '#f0f4f8' }}>
                                                                    {/* Instructions */}
                                                                    {component.chatInstructions && (
                                                                        <div style={{ marginBottom: '15px', color: '#546e7a', fontSize: '1.1em' }} dangerouslySetInnerHTML={{ __html: component.chatInstructions }} />
                                                                    )}

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                                                                        {/* Messages from messages array */}
                                                                        {component.messages && component.messages.length > 0 && (
                                                                            component.messages.map((msg: ANY, msgIdx: number) => (
                                                                                <div key={msgIdx} style={{
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: '5px',
                                                                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                                                    width: '100%'
                                                                                }}>
                                                                                    {msg.role === 'user' ? (
                                                                                        // User message - styled as a persona/system message
                                                                                        <div style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'flex-start',
                                                                                            gap: '10px',
                                                                                            maxWidth: '95%',
                                                                                            width: '100%'
                                                                                        }}>
                                                                                            {/* AI/Persona Icon */}
                                                                                            <div style={{
                                                                                                width: '32px',
                                                                                                height: '32px',
                                                                                                borderRadius: '50%',
                                                                                                background: 'linear-gradient(135deg, #1976d2, #d32f2f)',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                flexShrink: 0
                                                                                            }}>
                                                                                                <span style={{ fontSize: '16px' }}>🇫🇷</span>
                                                                                            </div>
                                                                                            <div style={{
                                                                                                padding: '15px',
                                                                                                backgroundColor: '#fff',
                                                                                                border: '1px solid #e0e0e0',
                                                                                                borderRadius: '12px',
                                                                                                color: '#37474f',
                                                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                                                                flex: 1,
                                                                                                whiteSpace: 'pre-wrap',
                                                                                                lineHeight: '1.6',
                                                                                                fontSize: '0.95em'
                                                                                            }}>
                                                                                                {msg.content}
                                                                                                {/* Copy button */}
                                                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                                                                                    <button style={{
                                                                                                        background: 'none',
                                                                                                        border: 'none',
                                                                                                        cursor: 'pointer',
                                                                                                        color: '#90a4ae',
                                                                                                        padding: '4px'
                                                                                                    }}>
                                                                                                        📋
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        // Assistant message
                                                                                        <div style={{
                                                                                            padding: '15px',
                                                                                            backgroundColor: '#e1eef9',
                                                                                            borderLeft: '4px solid #1976d2',
                                                                                            borderRadius: '4px',
                                                                                            color: '#263238',
                                                                                            maxWidth: '90%',
                                                                                            width: '100%',
                                                                                            whiteSpace: 'pre-wrap'
                                                                                        }}>
                                                                                            <div style={{ fontSize: '0.8rem', color: '#1565c0', marginBottom: '8px', fontWeight: 'bold' }}>AI:</div>
                                                                                            {msg.content}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        )}

                                                                        {/* Input field with default value */}
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
                                                                            marginTop: '10px'
                                                                        }}>
                                                                            {/* Refresh icon */}
                                                                            <button style={{
                                                                                width: '36px',
                                                                                height: '36px',
                                                                                borderRadius: '50%',
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                color: '#90a4ae'
                                                                            }}>
                                                                                🔄
                                                                            </button>
                                                                            {/* Input field */}
                                                                            <div style={{
                                                                                flex: 1,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                backgroundColor: '#fff',
                                                                                border: '1px solid #e0e0e0',
                                                                                borderRadius: '24px',
                                                                                padding: '10px 16px',
                                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                                                            }}>
                                                                                <span style={{ flex: 1, color: '#37474f', fontSize: '0.95em' }}>
                                                                                    {component.inputDefaultValue || 'Type your message...'}
                                                                                </span>
                                                                                {/* Send button */}
                                                                                <button style={{
                                                                                    width: '32px',
                                                                                    height: '32px',
                                                                                    borderRadius: '50%',
                                                                                    border: 'none',
                                                                                    backgroundColor: '#2196f3',
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    color: '#fff',
                                                                                    marginLeft: '10px'
                                                                                }}>
                                                                                    ↑
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Response (if any) */}
                                                                        {component.response && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start', width: '100%' }}>
                                                                                <div style={{ fontSize: '0.8rem', color: '#1565c0' }}>AI responds:</div>
                                                                                <div style={{
                                                                                    padding: '15px',
                                                                                    backgroundColor: '#e1eef9',
                                                                                    borderLeft: '4px solid #1976d2',
                                                                                    borderRadius: '4px',
                                                                                    color: '#263238',
                                                                                    maxWidth: '90%',
                                                                                    width: '100%'
                                                                                }}>
                                                                                    <div dangerouslySetInnerHTML={{ __html: component.response }} />
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    case 'rive': {
                                                        const assetUrl = component.webAssetUrl || component.mobileAssetUrl;
                                                        const ratio = component.webRatio || component.mobileRatio || "4:3";
                                                        let paddingTopPercentage = 75; // Default 4:3
                                                        if (ratio) {
                                                            const [widthRatio, heightRatio] = ratio.split(':').map(Number);
                                                            if (widthRatio > 0 && heightRatio > 0) {
                                                                paddingTopPercentage = (heightRatio / widthRatio) * 100;
                                                            }
                                                        }

                                                        return (
                                                            <div key={compIndex} style={{ width: '100%', maxWidth: '600px', margin: '20px auto' }}>
                                                                <div style={{
                                                                    position: 'relative',
                                                                    width: '100%',
                                                                    paddingTop: `${paddingTopPercentage}%`,
                                                                    backgroundColor: '#f0f0f0',
                                                                    borderRadius: '8px',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                                                        {assetUrl ? (
                                                                            <RivePlayer
                                                                                src={assetUrl}
                                                                                artboard={component.artboard}
                                                                                stateMachines={component.stateMachines}
                                                                                inputOnPress={component.inputOnPress}
                                                                                inputOnRelease={component.inputOnRelease}
                                                                                interactionZones={component.interactionZones}
                                                                                autoplay={true}
                                                                            />
                                                                        ) : (
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                                                                                No Rive asset URL provided
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    default:
                                                        return (
                                                            <div key={compIndex} style={{ marginBottom: '10px', color: '#888', fontStyle: 'italic' }}>
                                                                [Unsupported component type: {component.type}]
                                                            </div>
                                                        );
                                                }
                                            })
                                        })()
                                        }
                                        {/* Render content field if available (e.g. select_answer, order_list) */}
                                        {

                                            (() => {
                                                let questionData = { ...question };
                                                const langCodes = languages.map(l => l.code);

                                                const content = question.content_post || question.content;
                                                if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
                                                    const isLocalized = Object.keys(content).some(key => langCodes.includes(key));
                                                    if (isLocalized) {
                                                        const jsonStr = content[langCode] || content['en'] || Object.values(content)[0];
                                                        if (typeof jsonStr === 'string') {
                                                            try {
                                                                questionData.content = JSON.parse(jsonStr);
                                                            } catch (e) {
                                                                console.error("Failed to parse content JSON", e);
                                                            }
                                                        } else if (typeof jsonStr === 'object') {
                                                            questionData.content = jsonStr;
                                                        }
                                                    }
                                                }

                                                return questionData.content && !Array.isArray(question.content) && (
                                                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #eee' }}>
                                                        {questionData.content.type === 'select_answer' && questionData.content.options && (
                                                            <>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {questionData.content.options.map((option: ANY, optIndex: number) => (
                                                                        <div key={optIndex} style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
                                                                            padding: '8px',
                                                                            borderRadius: '4px',
                                                                            backgroundColor: option.isCorrect ? '#e8f5e9' : '#fff',
                                                                            border: `1px solid ${option.isCorrect ? '#a5d6a7' : '#eee'}`
                                                                        }}>
                                                                            <span style={{
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                borderRadius: '50%',
                                                                                backgroundColor: option.isCorrect ? '#4caf50' : '#eee',
                                                                                color: option.isCorrect ? '#fff' : '#666',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '13px',
                                                                                flexShrink: 0
                                                                            }}>
                                                                                {String.fromCharCode(65 + optIndex)}
                                                                            </span>
                                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                {option.imageUrl && (
                                                                                    <img
                                                                                        src={option.imageUrl}
                                                                                        alt={`Option ${optIndex + 1}`}
                                                                                        style={{ maxWidth: '100%', maxHeight: '200px', width: 'fit-content', borderRadius: '4px', objectFit: 'contain' }}
                                                                                    />
                                                                                )}
                                                                                {option.text && (
                                                                                    <span style={{ color: option.isCorrect ? '#2e7d32' : 'inherit', fontWeight: option.isCorrect ? '500' : 'normal' }}>
                                                                                        {option.text}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {option.isCorrect && <span style={{ fontSize: '0.85em', color: '#2e7d32', fontWeight: 'bold', whiteSpace: 'nowrap' }}>(Correct)</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}

                                                        {questionData.content.type === 'order_list' && questionData.content.items && (
                                                            <>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {questionData.content.items.map((item: ANY, itemIndex: number) => (
                                                                        <div key={itemIndex} style={{
                                                                            padding: '10px',
                                                                            backgroundColor: '#fff',
                                                                            border: '1px solid #ddd',
                                                                            borderRadius: '4px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
                                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                        }}>
                                                                            <span style={{
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                borderRadius: '50%',
                                                                                backgroundColor: '#e3f2fd',
                                                                                color: '#1976d2',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '13px',
                                                                                border: '1px solid #bbdefb'
                                                                            }}>
                                                                                {itemIndex + 1}
                                                                            </span>
                                                                            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95em' }}>
                                                                                {item.text}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            })()
                                        }
                                    </Box>
                                )
                            })}
                        </Box>
                    </Box >
                </Box >
            </Box >
        </div >
    );
}

interface InteractionZone {
    name?: string;
    top: string;
    bottom: string;
    left: string;
    right: string;
    width: string;
    height: string;
    inputOnPress?: string;
    inputOnRelease?: string;
}

interface RivePlayerProps {
    src: string;
    artboard?: string;
    stateMachines?: string | string[];
    inputOnPress?: string;
    inputOnRelease?: string;
    interactionZones?: InteractionZone[];
    autoplay?: boolean;
}

const RivePlayer = ({ src, artboard, stateMachines, inputOnPress, inputOnRelease, interactionZones, autoplay = true }: RivePlayerProps) => {
    const { rive, RiveComponent } = useRive({
        src: src,
        artboard: artboard,
        layout: new Layout({
            fit: Fit.Cover,
            alignment: Alignment.Center,
        }),
        autoplay: autoplay,
        stateMachines: stateMachines,
        // onLoad: () => { }, // Removed unused onLoad
    });

    const triggerInput = (inputName: string | undefined) => {
        if (!rive || !inputName) {
            console.log('triggerInput: rive instance or inputName missing', { rive: !!rive, inputName });
            return;
        }

        console.log(`Attempting to trigger input: "${inputName}"`);

        // Debug available properties on rive instance to help diagnosis
        // console.log('Rive instance keys:', Object.keys(rive));
        // console.log('Rive stateMachineNames:', rive.stateMachineNames);

        // Use rive.stateMachineNames directly as it is the standard API
        const availableStateMachines = rive.stateMachineNames || [];

        if (availableStateMachines.length > 0) {
            const stateMachineNames = Array.isArray(stateMachines) ? stateMachines : (stateMachines ? [stateMachines] : []);

            // If no state machines specified in props, search ALL available state machines
            if (stateMachineNames.length === 0) {
                stateMachineNames.push(...availableStateMachines);
            }

            console.log('Searching in State Machines:', stateMachineNames);

            let inputFound = false;
            stateMachineNames.forEach(smName => {
                // Check if this state machine is actually available/playing
                if (!availableStateMachines.includes(smName)) {
                    console.warn(`WARNING: Configured State Machine "${smName}" is not found in the Rive file. Available:`, availableStateMachines);
                    return;
                }

                const inputs = rive.stateMachineInputs(smName);
                if (inputs) {
                    const input = inputs.find(i => i.name === inputName);
                    if (input) {
                        inputFound = true;
                        if (input.type === 58) { // Trigger
                            input.fire();
                            console.log(`SUCCESS: Fired trigger: "${inputName}" on SM: "${smName}"`);
                        } else if (input.type === 59) { // Boolean
                            input.value = true; // Use boolean as trigger-like if needed, or toggle
                            console.log(`SUCCESS: Set boolean true: "${inputName}" on SM: "${smName}"`);
                        } else if (input.type === 56) { // Number
                            console.log(`INFO: Found number input "${inputName}" on SM: "${smName}", but cannot "trigger" it.`);
                        }
                    } else {
                        console.log(`Input "${inputName}" NOT FOUND in SM "${smName}". Available inputs:`, inputs.map(i => i.name));
                    }
                } else {
                    console.log(`No inputs found for SM "${smName}".`);
                }
            });

            if (!inputFound) {
                console.warn(`WARNING: Input "${inputName}" was not found in checked State Machines: ${stateMachineNames.join(', ')}`);
            }
        } else {
            console.error('No state machines found in Rive file (rive.stateMachineNames is empty).');
            // Fallback debug to see what IS there
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contents = rive.contents as any;
            if (contents) {
                console.log('Rive contents debug:', contents);
            }
        }
    };

    // handlePress and handleRelease removed - using Rive native Listeners instead

    // Log debug info when rive instance is ready
    React.useEffect(() => {
        if (rive) {
            console.log('>>> RIVE LOADED DEBUG INFO (SAFE MODE) <<<');
            console.log('File:', src);

            // Log available State Machines
            const smNames = rive.stateMachineNames;
            console.log('Available State Machines:', smNames);

            // Attempt to log raw contents 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contents = rive.contents as any;
            if (contents) {
                console.log('Raw Contents:', contents);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).riveInstance = rive; // Expose to window for easier debugging

            // Force play to ensure State Machine is activated
            const smToPlay = Array.isArray(stateMachines) ? stateMachines : (stateMachines ? [stateMachines] : []);
            if (smToPlay.length > 0) {
                console.log('Force playing state machines:', smToPlay);
                rive.play(smToPlay);
            } else if (smNames && smNames.length > 0) {
                console.log('Force playing first available state machine:', smNames[0]);
                rive.play([smNames[0]]);
            } else {
                console.log('Force playing default');
                rive.play();
            }

            // Delay input logging to give SM time to fully initialize
            setTimeout(() => {
                console.log('>>> DELAYED INPUT CHECK <<<');
                const currentSmNames = rive.stateMachineNames || [];
                currentSmNames.forEach((name: string) => {
                    const inputs = rive.stateMachineInputs(name);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    console.log(`  > State Machine "${name}" Inputs:`, inputs ? inputs.map((i: any) => `${i.name} (type: ${i.type})`) : 'None (SM may not be active)');
                });
            }, 500);
        }
    }, [rive, src, stateMachines]);

    return (
        <div
            style={{ width: '100%', height: '100%', position: 'relative' }}
        >
            {/* RiveComponent handles native Listeners automatically */}
            <RiveComponent />

            {/* Render interaction zones */}
            {interactionZones && interactionZones.map((zone, index) => (
                <div
                    key={index}
                    style={{
                        position: 'absolute',
                        top: zone.top ? zone.top : 'unset',
                        bottom: zone.bottom ? zone.bottom : 'unset',
                        left: zone.left ? zone.left : 'unset',
                        right: zone.right ? zone.right : 'unset',
                        width: zone.width ? zone.width : 'unset',
                        height: zone.height ? zone.height : 'unset',
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        cursor: 'pointer',
                        // Add a subtle debug background if key 'Shift' is pressed? No, just keep transparent for now.
                        // Or maybe adding a tiny border or color if needed for debugging.
                        // backgroundColor: 'rgba(255, 0, 0, 0.2)', // Uncomment for debug
                        zIndex: 10
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        if (zone.inputOnPress) triggerInput(zone.inputOnPress);
                    }}
                    onMouseUp={(e) => {
                        e.stopPropagation();
                        if (zone.inputOnRelease) triggerInput(zone.inputOnRelease);
                    }}
                    onMouseLeave={(e) => {
                        e.stopPropagation();
                        if (zone.inputOnRelease) triggerInput(zone.inputOnRelease);
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        if (zone.inputOnPress) triggerInput(zone.inputOnPress);
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (zone.inputOnRelease) triggerInput(zone.inputOnRelease);
                    }}
                    title={zone.name}
                />
            ))}
        </div>
    );
};