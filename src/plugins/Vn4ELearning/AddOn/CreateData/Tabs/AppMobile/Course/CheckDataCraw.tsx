import { Box, CircularProgress, FormControl, InputLabel, ListSubheader, MenuItem, Select, TextField, Typography, IconButton } from "@mui/material";
import { FieldFormItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";
import React from "react";
import { LoadingButton } from "@mui/lab";
import DrawerCustom from "components/molecules/DrawerCustom";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";

function CheckDataCraw(props: FieldFormItemProps) {

    const ajaxUseApi = useAjax();

    const [chapters, setChapters] = React.useState<ANY[]>([]);
    const [loading, setLoading] = React.useState(false);

    const [previewData, setPreviewData] = React.useState<ANY>(null);
    const [openPreview, setOpenPreview] = React.useState(false);

    const [drawerData, setDrawerData] = React.useState<DataResultApiProps | false>(false);
    const [openDrawerEditPost, setOpenDrawerEditPost] = React.useState(false);

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
                if (result.success && result.data && result.data.chapters) {
                    setChapters(result.data.chapters);
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

    const value = props.post?.[props.name || 'link_data_craw_json'] || '';

    const handleChange = (event: ANY) => {
        props.onReview(event.target.value, props.name || 'link_data_craw_json');
    };

    if (loading && chapters.length === 0) {
        return <CircularProgress size={20} />;
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
                width={1300} // Set a wider width for better editing experience
                restDialogContent={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        padding: '20px',
                    }
                }}
            >
                <div>
                    {previewData && previewData.questions.map((question: ANY, index: number) => {
                        // Initialize state for this question if not exists (handled by render logic usually, but here we can iterate)
                        // For simplicity in this functional component without creating sub-components yet, we'll verify if we can edit directly.
                        // However, to manage state for *each* question independently without easy sub-components in this large file,
                        // we might need a wrapper or just use uncontrolled inputs with refs, or better, extracted component.
                        // Given the constraints of a single file edit, I will create a small internal functional component if possible,
                        // OR, more simply, I will render the list and assume the user edits the JSON/Fields which updates a local state.

                        // Note: Since `previewData` is state, we can update it directly or distinct state. 
                        // Let's assume we use `previewData` for display and create a separate `editedQuestions` state map if needed, 
                        // or just clone `previewData` on edit.
                        // For now, I will implement a "QuestionEditor" component defined within this file or just inline logical block with local state?
                        // Inline state for list of items is hard.
                        // BEST APPROACH: Extract `QuestionItem` to a separate component definition OUTSIDE `CheckDataCraw` main function but in the same file for now.
                        return (
                            <QuestionItem
                                key={question.id || index}
                                index={index}
                                initialQuestion={question}
                                postId={props.post.id}
                                file={props.post[props.name || 'link_data_craw_json']}
                                onDelete={() => {
                                    // Handle local delete from preview if needed
                                    const newQuestions = [...previewData.questions];
                                    newQuestions.splice(index, 1);
                                    setPreviewData({ ...previewData, questions: newQuestions, count: newQuestions.length });
                                }}
                                onCreate={() => handleCreateQuestion(question, index)}
                            />
                        )
                    })}
                </div>
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
                />
            )}

        </Box>
    );
}

export default CheckDataCraw;

function QuestionItem({ index, initialQuestion, postId, file, onDelete, onCreate }: { index: number, initialQuestion: ANY, postId: ANY, file: ANY, onDelete: () => void, onCreate: (question: ANY) => void }) {
    // const ajaxUseApi = useAjax(); // No longer needed
    const [question, setQuestion] = React.useState(initialQuestion);
    const [jsonBody, setJsonBody] = React.useState(JSON.stringify(initialQuestion.body, null, 2));
    const [jsonContent, setJsonContent] = React.useState(initialQuestion.content ? JSON.stringify(initialQuestion.content, null, 2) : '');
    // const [loading, setLoading] = React.useState(false); // Managed by parent
    const [error, setError] = React.useState<string | null>(null);

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
                    Question {index + 1}
                </Typography>
                <div>
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
                            minRows={10}
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
                            minRows={10}
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
                    <Box sx={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', p: 2, bgcolor: '#fafafa', overflowY: 'auto', maxHeight: '430px' }}>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>Preview:</Typography>
                        {question.body?.map((component: ANY, compIndex: number) => {
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
                                case 'parts':
                                    return (
                                        <div key={compIndex} style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                                                {component.parts?.map((part: ANY, partIndex: number) => {
                                                    if (!part.isASecret) {
                                                        return <span key={partIndex}>{part.content}</span>;
                                                    } else {
                                                        return (
                                                            <span key={partIndex} style={{
                                                                display: 'inline-block',
                                                                minWidth: '30px',
                                                                padding: '2px 5px',
                                                                backgroundColor: '#e0e0e0',
                                                                borderBottom: '2px solid #999',
                                                                borderRadius: '2px',
                                                                textAlign: 'center',
                                                                color: '#555',
                                                                fontSize: '0.9em'
                                                            }}>
                                                                {part.content || '[...]'}
                                                            </span>
                                                        );
                                                    }
                                                })}
                                            </div>
                                            {/* Render Answers/Options */}
                                            {component.answer && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '10px' }}>
                                                    {component.answer.map((answer: ANY, ansIndex: number) => (
                                                        <div key={ansIndex} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            color: answer.index_correct !== -1 ? 'green' : (answer.index_correct === -1 ? 'red' : 'inherit'),
                                                            fontWeight: answer.index_correct !== -1 ? 'bold' : 'normal'
                                                        }}>
                                                            <span style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                border: `1px solid ${answer.index_correct !== -1 ? 'green' : '#ccc'}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '12px'
                                                            }}>
                                                                {String.fromCharCode(65 + ansIndex)}
                                                            </span>
                                                            <span>{answer.text}</span>
                                                            {answer.index_correct !== -1 && <span style={{ fontSize: '0.8em', color: 'green' }}>(Correct)</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
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
                                        </div>
                                    );
                                default:
                                    return (
                                        <div key={compIndex} style={{ marginBottom: '10px', color: '#888', fontStyle: 'italic' }}>
                                            [Unsupported component type: {component.type}]
                                        </div>
                                    );
                            }
                        })}

                        {/* Render content field if available (e.g. select_answer) */}
                        {question.content && !Array.isArray(question.content) && question.content.type === 'select_answer' && question.content.options && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #eee' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: '#444' }}>Select Answer Options:</Typography>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {question.content.options.map((option: ANY, optIndex: number) => (
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
                                                fontSize: '13px'
                                            }}>
                                                {String.fromCharCode(65 + optIndex)}
                                            </span>
                                            <span style={{ flex: 1, color: option.isCorrect ? '#2e7d32' : 'inherit', fontWeight: option.isCorrect ? '500' : 'normal' }}>
                                                {option.text}
                                            </span>
                                            {option.isCorrect && <span style={{ fontSize: '0.85em', color: '#2e7d32', fontWeight: 'bold' }}>(Correct)</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Box>
                </Box>
            </Box>
        </div>
    );
}