import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import React from 'react';
import BodyRenderer, { parseImgSrc } from './BodyRenderer';
import FlashcardInteractive from './FlashcardInteractive';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

interface QuestionPreviewProps {
    question: ANY;
    langCode?: string;
    languages?: ANY[];
    onUpdate?: (newQuestion: ANY) => void;
    postId?: number | string;
    cIndex?: number;
    lIndex?: number;
    /** ID app_mobile - dùng cho API download-image */
    appMobileId?: number | string;
    /** Gọi khi download-image thành công để refresh data */
    onRefresh?: () => void;
}

export default function QuestionPreview({ question, langCode = 'en', languages = [], onUpdate, postId, cIndex, lIndex, appMobileId, onRefresh }: QuestionPreviewProps) {
    if (!question) return null;

    const langCodes = languages.map(l => l.code);
    console.log('QuestionPreview render:', { question, langCode });

    let detail = question.question_detail;
    if (typeof detail === 'string') {
        const trimmed = detail.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                detail = JSON.parse(detail);
            } catch (e) {
                console.error("Failed to parse question_detail JSON", e);
            }
        }
    }

    // Function to parse if string
    const parseIfString = (data: ANY) => {
        if (!data) return data;
        if (typeof data === 'string') {
            const trimmed = data.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    return JSON.parse(trimmed);
                } catch (e) {
                    console.error("Failed to parse JSON string", e);
                    return data;
                }
            }
        }
        return data;
    };

    // Function to ensure we have an array
    const ensureArray = (data: ANY): ANY[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'object' && data !== null) {
            return Object.values(data);
        }
        return [];
    };

    // Normalize Body
    let body = question.body_post || question.body || detail?.body;
    if (!body && Array.isArray(detail)) body = detail; // detail might BE the body
    body = parseIfString(body);

    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
        const isLocalized = Object.keys(body).some(key => langCodes.includes(key));
        if (isLocalized) {
            let jsonStr = body[langCode] || body['en'] || Object.values(body)[0];
            body = parseIfString(jsonStr);
        }
    }

    // Normalize Content
    let content = question.content_post || question.content || detail?.content;
    if (!content && typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
        if (detail.type || detail.options || detail.items) content = detail;
    }
    content = parseIfString(content);

    if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
        const isLocalized = Object.keys(content).some(key => langCodes.includes(key));
        if (isLocalized) {
            let jsonStr = content[langCode] || content['en'] || Object.values(content)[0];
            content = parseIfString(jsonStr);
        }
    }

    const title = question.idea || question.title || detail?.title;

    // Further normalization: If content is an array, it's likely actually body components
    if (Array.isArray(content)) {
        if (Array.isArray(body)) {
            body = [...body, ...content];
        } else if (!body) {
            body = content;
        }
        content = null;
    }

    let flashcards = question.flashcards || detail?.flashcards || content?.flashcards || (Array.isArray(content) ? null : content?.flashcards);
    flashcards = parseIfString(flashcards);

    // CRITICAL: If body is an array of flashcards, move it to flashcards
    if (Array.isArray(body) && body.length > 0 && body[0] && typeof body[0] === 'object' && (body[0].front || body[0].back)) {
        if (!flashcards || flashcards.length === 0) {
            flashcards = body;
            body = [];
        }
    }

    const hasStructuredBody = Array.isArray(body) && body.length > 0;
    const hasStructuredContent = typeof content === 'object' && content !== null && !Array.isArray(content) && Object.keys(content).length > 0;
    const hasFlashcards = Array.isArray(flashcards) && flashcards.length > 0;

    const hasAnyStructured = hasStructuredBody || hasStructuredContent || hasFlashcards;

    console.log('QuestionPreview processed data:', {
        title,
        hasStructuredBody,
        bodyCount: Array.isArray(body) ? body.length : 0,
        hasStructuredContent,
        contentType: content?.type,
        hasFlashcards,
        flashcardCount: flashcards?.length,
        hasAnyStructured
    });

    return (
        <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1, border: '1px solid #e0e0e0', width: '100%' }}>
            {title && (
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1a237e', borderBottom: '2px solid #e8eaf6', pb: 1 }}>
                    {title}
                </Typography>
            )}

            {/* Body components */}
            {hasStructuredBody && ensureArray(body).map((component: ANY, compIndex: number) => (
                <BodyRenderer
                    key={compIndex}
                    component={component}
                    onUpdate={(newComponent) => {
                        if (onUpdate) {
                            const newBody = [...body];
                            newBody[compIndex] = newComponent;
                            onUpdate({ ...question, body_post: newBody }); // Using body_post to ensure it overrides
                        }
                    }}
                    context={{
                        postId,
                        cIndex,
                        lIndex,
                        compIndex,
                        appMobileId,
                        onRefresh,
                        questionId: question?.post_id ?? question?.id,
                    }}
                />
            ))}

            {/* Flashcards components */}
            {hasFlashcards && (
                <Box sx={{ mt: 3, mb: 3 }}>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2, display: 'block', fontSize: '0.75rem', letterSpacing: 1.2 }}>
                        FLASHCARDS ({flashcards.length})
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr',
                            md: '1fr 1fr 1fr 1fr'
                        },
                        gap: 2
                    }}>
                        {ensureArray(flashcards).map((fc: ANY, fcIndex: number) => (
                            <FlashcardInteractive
                                key={fcIndex}
                                flashcard={fc}
                                onUpdate={(newFc) => {
                                    if (onUpdate) {
                                        const newFlashcards = [...flashcards];
                                        newFlashcards[fcIndex] = newFc;
                                        onUpdate({ ...question, flashcards: newFlashcards });
                                    }
                                }}
                                postId={postId}
                                cIndex={cIndex}
                                lIndex={lIndex}
                                fcIndex={fcIndex}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Content field logic (select_answer, order_list) */}
            {hasStructuredContent && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #eee' }}>
                    {content.type === 'select_answer' && content.options && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ensureArray(content.options).map((option: ANY, optIndex: number) => (
                                <div key={optIndex} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    backgroundColor: option.isCorrect ? '#e8f5e9' : '#fff',
                                    border: `1px solid ${option.isCorrect ? '#a5d6a7' : '#eee'}`
                                }}>
                                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: option.isCorrect ? '#4caf50' : '#eee', color: option.isCorrect ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                                        {String.fromCharCode(65 + optIndex)}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        {option.imageUrl && <img src={parseImgSrc(option.imageUrl)} alt="" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', display: 'block', marginBottom: '4px' }} />}
                                        <span style={{ color: option.isCorrect ? '#2e7d32' : 'inherit', fontWeight: option.isCorrect ? '500' : 'normal' }}>{option.text}</span>
                                    </div>
                                    {option.isCorrect && <span style={{ fontSize: '0.85em', color: '#2e7d32', fontWeight: 'bold' }}>(Correct)</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {content.type === 'order_list' && content.items && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ensureArray(content.items).map((item: ANY, iIdx: number) => (
                                <div key={iIdx} style={{ padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e3f2fd', color: '#1976d2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>{iIdx + 1}</span>
                                    <span style={{ flex: 1, fontFamily: 'monospace' }}>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Fallback for raw content (Markdown) */}
            {!hasAnyStructured && (question.content || question.body || (typeof body === 'string' ? body : '') || (typeof content === 'string' ? content : '') || (typeof detail === 'string' ? detail : '')) ? (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fffde7', borderRadius: 1, border: '1px solid #fff59d', color: '#856404' }}>
                    <ReactMarkdown>
                        {String(question.content || question.body || (typeof body === 'string' ? body : '') || (typeof content === 'string' ? content : '') || (typeof detail === 'string' ? detail : ''))}
                    </ReactMarkdown>
                </Box>
            ) : null}
        </Box>
    );
}
