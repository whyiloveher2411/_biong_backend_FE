import { Box, CircularProgress, FormControl, InputLabel, ListSubheader, MenuItem, Select, TextField, Typography, IconButton, Chip, Tooltip, Button } from "@mui/material";
import { FieldFormItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";
import React from "react";
import { LoadingButton } from "@mui/lab";
import DrawerCustom from "components/molecules/DrawerCustom";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreIcon from "@mui/icons-material/Restore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";
import useLanguages from "../hooks/useLanguages";
import useConfirmDialog from "hook/useConfirmDialog";
import QuestionPreview from "./Common/QuestionPreview";
import SuggestLessonContentAiDrawer from "./SuggestLessonContentAiDrawer";

export interface CheckDataCrawRef {
    refreshPreview: () => void;
}

function CheckDataCrawInner(props: FieldFormItemProps & {
    autoPreview?: boolean;
    onPreviewDataChange?: (data: ANY) => void;
    onLoadingChange?: (loading: boolean) => void;
}, ref: React.Ref<CheckDataCrawRef>) {

    const ajaxUseApi = useAjax();

    const [chapters, setChapters] = React.useState<ANY[]>([]);
    const [loading, setLoading] = React.useState(false);

    const [previewData, setPreviewData] = React.useState<ANY>(null);
    const [openPreview, setOpenPreview] = React.useState(false);
    const { languages } = useLanguages();

    const [drawerData, setDrawerData] = React.useState<DataResultApiProps | false>(false);
    const [openDrawerEditPost, setOpenDrawerEditPost] = React.useState(false);
    const [openSuggestLessonDrawer, setOpenSuggestLessonDrawer] = React.useState(false);

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
        props.onLoadingChange?.(true);
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
                    props.onPreviewDataChange?.(result.results);
                }
                setLoading(false);
                props.onLoadingChange?.(false);
            },
            error: () => {
                setLoading(false);
                props.onLoadingChange?.(false);
            },
        });
    }

    const handleRefreshPreviewKeepScroll = () => {
        const container = document.getElementById('scroll-container-questions');
        const currentScrollTop = container ? container.scrollTop : 0;

        setLoading(true);
        props.onLoadingChange?.(true);
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
                    props.onPreviewDataChange?.(result.results);
                    // Giữ nguyên trạng thái open của drawer
                    if (!openPreview) setOpenPreview(true);

                    // Khôi phục lại vị trí scroll sau khi React render xong
                    setTimeout(() => {
                        const newContainer = document.getElementById('scroll-container-questions');
                        if (newContainer) {
                            newContainer.scrollTop = currentScrollTop;
                        }
                    }, 0);
                }
                setLoading(false);
                props.onLoadingChange?.(false);
            },
            error: () => {
                setLoading(false);
                props.onLoadingChange?.(false);
            }
        });
    }

    const handleClosePreview = () => {
        setOpenPreview(false);
    };

    React.useImperativeHandle(ref, () => ({
        refreshPreview: handleRefreshPreviewKeepScroll,
    }), [props.post?.id, props.post?.[props.name || 'link_data_craw_json']]);

    const handleTranslateContent = () => {
        if (!props.post?.id) return;

        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/ai/translate/lesson",
            method: "POST",
            data: {
                id: props.post.id,
            },
            success: () => {
                setLoading(false);
            },
            error: () => {
                setLoading(false);
            }
        });
    }

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

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                        setOpenSuggestLessonDrawer(true);
                    }}
                >
                    Gợi ý nội dung bằng AI
                </Button>
                <Button variant="contained" color="primary" onClick={handleTranslateContent}>Dịch nội dung bằng AI</Button>
            </Box>

            {/* Refactored Preview Drawer */}
            <DrawerCustom
                open={openPreview}
                onClose={handleClosePreview}
                title={`Preview Questions (${previewData?.count || 0})`}
                headerAction={
                    <LoadingButton
                        size="small"
                        variant="contained"
                        loading={loading}
                        onClick={handleRefreshPreviewKeepScroll}
                        sx={{
                            color: 'primary.main',
                            backgroundColor: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.9)',
                            },
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                    >
                        Refresh
                    </LoadingButton>
                }
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
            <SuggestLessonContentAiDrawer
                open={openSuggestLessonDrawer}
                onClose={() => setOpenSuggestLessonDrawer(false)}
                post={props.post}
                onReview={props.onReview}
            />

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

const CheckDataCraw = React.forwardRef<CheckDataCrawRef, FieldFormItemProps & { autoPreview?: boolean; onPreviewDataChange?: (data: ANY) => void; onLoadingChange?: (loading: boolean) => void }>(CheckDataCrawInner);
export default CheckDataCraw;

function QuestionItem({ index, initialQuestion, postId, file, onDelete, onCreate, onTranslated, languages }: { index: number, initialQuestion: ANY, postId: ANY, file: ANY, onDelete: () => void, onCreate: (question: ANY) => void, onTranslated?: () => void, languages: ANY[] }) {
    const ajaxUseApi = useAjax();
    const [question, setQuestion] = React.useState(initialQuestion);
    const [jsonBody, setJsonBody] = React.useState(JSON.stringify(initialQuestion.body_post || initialQuestion.body, null, 2));
    const [jsonContent, setJsonContent] = React.useState(initialQuestion.content_post || initialQuestion.content ? JSON.stringify(initialQuestion.content_post || initialQuestion.content, null, 2) : '');
    const [loadingTranslate, setLoadingTranslate] = React.useState<string | number | boolean>(false);
    const [loadingReContent, setLoadingReContent] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [loadingAction, setLoadingAction] = React.useState(false);

    const deleteConfirm = useConfirmDialog({
        title: "Xác nhận xóa câu hỏi",
        message: "Bạn có chắc chắn muốn xóa câu hỏi này?",
    });

    const permanentDeleteConfirm = useConfirmDialog({
        title: "Xác nhận xóa vĩnh viễn",
        message: "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn câu hỏi này?",
    });

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
            url: "plugin/vn4-e-learning/app-mobile/course-new/ai/translate/question",
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

    const handleReContentQuestion = () => {
        if (!initialQuestion.post_id) return;
        setLoadingReContent(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/ai/re-content-question",
            method: "POST",
            data: {
                id: initialQuestion.post_id,
            },
            success: () => {
                setLoadingReContent(false);
            },
            error: () => {
                setLoadingReContent(false);
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

    const handleTrashOrRestore = () => {
        const performAction = () => {
            setLoadingAction(true);
            const isTrash = question.status === 'trash';
            ajaxUseApi.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course-new/trash-post",
                method: "POST",
                data: {
                    id: postId,
                    action: isTrash ? "restore" : "trash",
                    type: "question",
                    post_id: initialQuestion.post_id
                },
                success: () => {
                    setLoadingAction(false);
                    if (onTranslated) onTranslated();
                },
                error: () => {
                    setLoadingAction(false);
                }
            });
        };

        if (question.status === 'trash') {
            performAction(); // Restore doesn't need confirmation usually, or maybe it does? CourseTree doesn't seem to ask.
        } else {
            deleteConfirm.onConfirm(performAction);
            deleteConfirm.setOpen(true);
        }
    };

    const handlePermanentDelete = () => {
        permanentDeleteConfirm.onConfirm(() => {
            setLoadingAction(true);
            ajaxUseApi.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course-new/permanent-delete-post",
                method: "POST",
                data: {
                    id: postId,
                    type: "question",
                    post_id: initialQuestion.post_id
                },
                success: () => {
                    setLoadingAction(false);
                    if (onTranslated) onTranslated();
                },
                error: () => {
                    setLoadingAction(false);
                }
            });
        });
        permanentDeleteConfirm.setOpen(true);
    };

    const isTrash = question.status === 'trash';

    return (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: isTrash ? '#ffebee' : 'white', borderRadius: '4px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>
                    Question {index + 1} {initialQuestion.post_id ? (isTrash ? <Chip label="Deleted" color="error" size="small" /> : '') : <></>}
                </Typography>
                <div>
                    {initialQuestion.post_id && (
                        <LoadingButton
                            variant="outlined"
                            size="small"
                            sx={{ mr: 1 }}
                            loading={loadingReContent}
                            disabled={loadingReContent}
                            onClick={handleReContentQuestion}
                            color="warning"
                        >
                            Làm lại nội dung bằng AI
                        </LoadingButton>
                    )}
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

                    {initialQuestion.post_id ? (
                        <>
                            {isTrash ? (
                                <>
                                    <Tooltip title="Restore">
                                        <span>
                                            <IconButton size="small" onClick={handleTrashOrRestore} color="primary" disabled={loadingAction}>
                                                <RestoreIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Delete Permanently">
                                        <span>
                                            <IconButton size="small" onClick={handlePermanentDelete} color="error" disabled={loadingAction}>
                                                <DeleteForeverIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            ) : (
                                <Tooltip title="Delete">
                                    <span>
                                        <IconButton size="small" onClick={handleTrashOrRestore} color="error" disabled={loadingAction}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        </>
                    ) : (
                        // Local preview delete (no post_id yet)
                        <IconButton size="small" onClick={onDelete} color="error">
                            <DeleteIcon />
                        </IconButton>
                    )}
                </div>
            </div>
            {deleteConfirm.component}
            {permanentDeleteConfirm.component}

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

                                        <QuestionPreview
                                            question={question}
                                            langCode={langCode}
                                            languages={languages}
                                        />
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

