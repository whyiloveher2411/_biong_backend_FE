import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { LoadingButton } from "@mui/lab";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CourseEditImageDrawer from './CourseEditImageDrawer';
import { Layout, Fit, Alignment, useRive } from '@rive-app/react-canvas';
import useAjax from 'hook/useApi';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

interface RivePlayerProps {
    src: string;
    artboard?: string;
    stateMachines?: string | string[];
    inputOnPress?: string;
    inputOnRelease?: string;
    interactionZones?: ANY[];
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
    });

    const triggerInput = (inputName: string | undefined) => {
        if (!rive || !inputName) return;

        const availableStateMachines = (rive as ANY).stateMachineNames || [];

        if (availableStateMachines.length > 0) {
            const smNames = Array.isArray(stateMachines) ? stateMachines : (stateMachines ? [stateMachines] : []);
            if (smNames.length === 0) {
                smNames.push(...availableStateMachines);
            }

            smNames.forEach(smName => {
                if (!availableStateMachines.includes(smName)) return;
                const inputs = (rive as ANY).stateMachineInputs(smName);
                if (inputs) {
                    const input = inputs.find((i: ANY) => i.name === inputName);
                    if (input) {
                        if ('fire' in input) {
                            (input as ANY).fire();
                        } else if ('value' in input) {
                            (input as ANY).value = true;
                            setTimeout(() => { (input as ANY).value = false; }, 100);
                        }
                    }
                }
            });
        }
    };

    const handleMouseDown = () => triggerInput(inputOnPress);
    const handleMouseUp = () => triggerInput(inputOnRelease);

    return (
        <Box sx={{ width: '100%', height: '100%' }} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onTouchStart={handleMouseDown} onTouchEnd={handleMouseUp}>
            <RiveComponent />
        </Box>
    );
};

const stripBlockTags = (html: string) => {
    if (!html) return '';
    return html.replace(/<block>/g, '<span class="text-block">').replace(/<\/block>/g, '</span>');
};

interface BodyRendererProps {
    component: ANY;
    onUpdate?: (newComponent: ANY) => void;
    context?: {
        postId?: number | string;
        cIndex?: number;
        lIndex?: number;
        fcIndex?: number;
        side?: 'front' | 'back';
        compIndex?: number;
    };
}



export const parseImgSrc = (src: ANY): string => {
    if (!src) return '';
    if (typeof src === 'string') {
        const trimmed = src.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return parseImgSrc(parsed);
            } catch (e) {
                return src;
            }
        }
        return src;
    }
    if (typeof src === 'object' && src !== null) {
        const link = src.link || src.src || src.url || src.image_url;
        if (link) return parseImgSrc(link);
    }
    return typeof src === 'string' ? src : '';
};
const imageCache: Record<string | number, string> = {};
const fetchedIds = new Set<string | number>();

export const clearImageCache = () => {
    Object.keys(imageCache).forEach((k) => delete imageCache[k as keyof typeof imageCache]);
    fetchedIds.clear();
};

const BodyRenderer = ({ component: rawComponent, onUpdate, context }: BodyRendererProps) => {
    const { ajax } = useAjax();
    const [loading, setLoading] = React.useState(false);
    const [showPrompt, setShowPrompt] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const [openEditDrawer, setOpenEditDrawer] = React.useState(false);
    const [imageInJob, setImageInJob] = React.useState(false);

    const handleProcessImageResult = (imageUrl: string) => {
        const updateUiAndProceed = () => {
            if (onUpdate) {
                const newComponent = { ...rawComponent };
                if (typeof newComponent.image === 'object' && newComponent.image !== null) {
                    newComponent.image = { ...newComponent.image, link: imageUrl };
                } else if (newComponent.image_link !== undefined) {
                    newComponent.image_link = imageUrl;
                } else {
                    newComponent.image = imageUrl;
                }
                onUpdate(newComponent);
            }
            setLoading(false);
        };

        // if it's a flashcard, we need to call step5-2 to save to DB
        if (context?.fcIndex !== undefined && context?.postId) {
            ajax({
                url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/step5-2',
                method: 'POST',
                data: {
                    id: context.postId,
                    image_url: imageUrl,
                    chapter_index: context.cIndex,
                    lesson_index: context.lIndex,
                    flashcard_index: context.fcIndex,
                    side: context.side,
                    index: context.compIndex
                },
                success: (res52: ANY) => {
                    updateUiAndProceed();
                },
                error: () => {
                    // Even if step5-2 fails, we update UI for better UX
                    updateUiAndProceed();
                }
            });
        } else {
            updateUiAndProceed();
        }
    };

    const handleGenerateImage = (prompt: string, description: string, imageId?: number | string) => {
        setLoading(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/generate-image',
            method: 'POST',
            data: {
                prompt,
                description,
                image_id: imageId
            },
            success: (result: ANY) => {
                const imageUrl = result.image_url || result.src || result.data?.src || result.data?.image_url;
                if (result.success && imageUrl) {
                    if (imageId) imageCache[imageId] = imageUrl;
                    handleProcessImageResult(imageUrl);
                } else if (result.job_id != null) {
                    // API dùng queue: hiển thị overlay loading
                    setImageInJob(true);
                    setLoading(false);
                } else {
                    setLoading(false);
                }
            },
            error: () => {
                setLoading(false);
            }
        });
    };

    const handleGetImageAi = (imageId: number | string) => {
        if (imageCache[imageId]) return;
        if (fetchedIds.has(imageId)) return;
        fetchedIds.add(imageId);

        setLoading(true);
        ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/get-image-ai',
            method: 'POST',
            data: {
                image_id: imageId
            },
            success: (result: ANY) => {
                const imageUrl = result.data?.src || result.image_url || result.src || result.data?.image_url;
                if (imageUrl) {
                    imageCache[imageId] = imageUrl;
                    handleProcessImageResult(imageUrl);
                } else {
                    setLoading(false);
                }
            },
            error: () => {
                setLoading(false);
            }
        });
    };

    // Normalize component: Infer type if missing
    const component = { ...rawComponent };
    if (!component.type) {
        if (component.text) component.type = 'text';
        else if (component.code) component.type = 'code';
        else if (component.image || component.image_link || component.image_id) component.type = 'image';
        else if (component.parts) component.type = 'parts';
        else if (component.info) component.type = 'info';
    }

    const imgSrc = parseImgSrc(component.image) || parseImgSrc(component.image_link) || (component.image_id ? parseImgSrc(imageCache[component.image_id]) : '');

    const lastPolledSrcRef = React.useRef<string>('');

    React.useEffect(() => {
        if (component.type === 'image' && component.image_id && !imgSrc && !loading) {
            handleGetImageAi(component.image_id);
        }
    }, [component.image_id, component.type, imgSrc, loading]);

    // Poll khi hình ảnh đang trong job queue - chỉ dừng khi src mới khác src cũ
    React.useEffect(() => {
        if (!imageInJob || component.type !== 'image' || !component.image_id) return;
        lastPolledSrcRef.current = imgSrc; // Khởi tạo src cũ (parsed URL) khi bắt đầu poll
        const interval = setInterval(() => {
            ajax({
                url: 'plugin/vn4-e-learning/app-mobile/course-new/ai/get-image-ai',
                method: 'POST',
                data: { image_id: component.image_id },
                success: (result: ANY) => {
                    const newSrcRaw = result.data?.src || result.image_url || result.src || result.data?.image_url || '';
                    const newSrcNormalized = parseImgSrc(newSrcRaw);
                    const oldSrcNormalized = parseImgSrc(lastPolledSrcRef.current);
                    lastPolledSrcRef.current = newSrcRaw; // Lưu raw cho lần so sánh tiếp theo
                    // Chỉ cập nhật khi link thực tế khác nhau (hình đã được tạo mới xong)
                    if (newSrcNormalized && newSrcNormalized !== oldSrcNormalized) {
                        setImageInJob(false);
                        imageCache[component.image_id] = newSrcRaw;
                        handleProcessImageResult(newSrcNormalized);
                    }
                },
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [imageInJob, component.type, component.image_id, imgSrc]);

    switch (component.type) {
        case 'text':
            return (
                <div style={{ marginBottom: '10px' }} dangerouslySetInnerHTML={{ __html: stripBlockTags(component.text || component.content || '') }} />
            );
        case 'code':
            return (
                <div style={{ marginBottom: '10px', backgroundColor: '#282c34', color: '#abb2bf', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                    {component.code}
                </div>
            );
        case 'image': {
            const imgSrc = parseImgSrc(component.image) || parseImgSrc(component.image_link) || (component.image_id ? parseImgSrc(imageCache[component.image_id]) : '');

            if (!imgSrc && component.prompt) {
                return (
                    <Box sx={{
                        mb: 2,
                        p: 3,
                        border: '1px dashed #2196f3',
                        borderRadius: 2,
                        bgcolor: '#f0f7ff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        position: 'relative',
                        minHeight: 120
                    }}>
                        {imageInJob && (
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(255,255,255,0.9)',
                                borderRadius: 2,
                                zIndex: 10
                            }}>
                                <CircularProgress size={40} sx={{ mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">Đang xử lý trong hàng đợi...</Typography>
                            </Box>
                        )}
                        <Typography variant="body2" sx={{ mb: 2, color: '#1976d2', fontStyle: 'italic', maxWidth: '80%' }}>
                            <strong>Image Prompt:</strong> {component.prompt}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <LoadingButton
                                loading={loading}
                                variant="contained"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateImage(component.prompt || '', component.description || '', component.image_id);
                                }}
                                startIcon={<AutoFixHighIcon fontSize="small" />}
                                sx={{ textTransform: 'none' }}
                            >
                                Generate Image
                            </LoadingButton>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenEditDrawer(true);
                                }}
                                startIcon={<EditIcon fontSize="small" />}
                                sx={{ textTransform: 'none' }}
                            >
                                Edit
                            </Button>
                        </Box>
                        <CourseEditImageDrawer
                            open={openEditDrawer}
                            onClose={() => setOpenEditDrawer(false)}
                            onSuccess={(imageUrl) => handleProcessImageResult(imageUrl)}
                            onJobQueued={() => setImageInJob(true)}
                            initialPrompt={component.prompt || ''}
                            initialDescription={component.description || ''}
                            imageId={component.image_id}
                        />
                    </Box>
                );
            }

            return (
                <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: 400, borderRadius: '4px', overflow: 'hidden' }}>
                        {imageInJob && (
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(255,255,255,0.9)',
                                zIndex: 10
                            }}>
                                <CircularProgress size={40} sx={{ mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">Đang xử lý trong hàng đợi...</Typography>
                            </Box>
                        )}
                        <img src={imgSrc} alt={component.description || 'Question Image'} style={{ maxWidth: '100%', display: 'block' }} />

                        {showPrompt && component.prompt && (
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                bgcolor: 'rgba(0,0,0,0.7)',
                                borderRadius: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: 3,
                                boxSizing: 'border-box',
                                zIndex: 1,
                                color: 'white'
                            }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', display: 'block', mb: 1 }}>
                                    IMAGE PROMPT:
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'white', fontSize: '1rem', lineHeight: 1.6, textAlign: 'center', mb: 2 }}>
                                    {component.prompt}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={copied}
                                    startIcon={<ContentCopyIcon fontSize="small" />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(component.prompt || '');
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    sx={{
                                        color: 'white',
                                        borderColor: 'rgba(255,255,255,0.5)',
                                        textTransform: 'none',
                                        '&.Mui-disabled': {
                                            color: 'rgba(255,255,255,0.5)',
                                            borderColor: 'rgba(255,255,255,0.3)',
                                        },
                                        '&:hover': {
                                            borderColor: 'white',
                                            bgcolor: 'rgba(255,255,255,0.1)'
                                        }
                                    }}
                                >
                                    {copied ? 'Đã copy!' : 'Copy Prompt'}
                                </Button>
                            </Box>
                        )}

                        {component.prompt && (
                            <Box sx={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                display: 'flex',
                                gap: 1,
                                opacity: 0.8,
                                transition: 'opacity 0.2s',
                                zIndex: 2,
                                '&:hover': { opacity: 1 }
                            }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setShowPrompt(!showPrompt);
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.7rem',
                                        py: 0.2,
                                        px: 1,
                                        minWidth: 'auto',
                                        borderRadius: 5,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        bgcolor: showPrompt ? 'secondary.main' : 'rgba(0,0,0,0.8)',
                                        color: 'white',
                                        '&:hover': { bgcolor: showPrompt ? 'secondary.dark' : 'rgba(0,0,0,0.9)' }
                                    }}
                                >
                                    {showPrompt ? 'Hide Prompt' : 'Show Prompt'}
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenEditDrawer(true);
                                    }}
                                    startIcon={<EditIcon fontSize="small" />}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.7rem',
                                        py: 0.2,
                                        px: 1,
                                        minWidth: 'auto',
                                        borderRadius: 5,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        bgcolor: 'rgba(0,0,0,0.8)',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' }
                                    }}
                                >
                                    Edit
                                </Button>
                                <LoadingButton
                                    loading={loading}
                                    variant="contained"
                                    size="small"
                                    color="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (component.image_id) delete imageCache[component.image_id];
                                        handleGenerateImage(component.prompt || '', component.description || '', component.image_id);
                                    }}
                                    startIcon={<AutoFixHighIcon fontSize="small" />}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.7rem',
                                        py: 0.2,
                                        px: 1,
                                        minWidth: 'auto',
                                        borderRadius: 5,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        bgcolor: 'rgba(0,0,0,0.8)',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' }
                                    }}
                                >
                                    Re-generate
                                </LoadingButton>
                            </Box>
                        )}
                        <CourseEditImageDrawer
                            open={openEditDrawer}
                            onClose={() => setOpenEditDrawer(false)}
                            onSuccess={(imageUrl) => handleProcessImageResult(imageUrl)}
                            onJobQueued={() => setImageInJob(true)}
                            initialPrompt={component.prompt || ''}
                            initialDescription={component.description || ''}
                            imageId={component.image_id}
                        />
                    </div>
                    {component.description && <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }} dangerouslySetInnerHTML={{ __html: stripBlockTags(component.description) }} />}
                </div>
            );
        }
        case 'info':
            return (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: '4px', borderLeft: '4px solid #1976d2' }} dangerouslySetInnerHTML={{ __html: component.info }} />
            );
        case 'parts': {
            let secretIndexCounter = 0;
            const isKeyboard = component.input_method === 'keyboard';
            return (
                <div style={{ marginBottom: '10px' }}>
                    {isKeyboard && (
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#666', mb: 1, fontStyle: 'italic', bgcolor: '#f0f0f0', p: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                            <span style={{ fontSize: '14px' }}>⌨️</span> Keyboard Input
                        </Typography>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                        {component.parts?.map((part: ANY, partIndex: number) => {
                            if (!part.isASecret) {
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
                                            color: '#333',
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
                </div>
            );
        }
        case 'run_code':
            return (
                <div style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#f5f5f5', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                            {component.language || 'Code'} Playground
                        </Typography>
                        <LoadingButton size="small" variant="contained" color="success" startIcon={<PlayArrowIcon fontSize="small" />} sx={{ textTransform: 'none', py: 0.5, minWidth: 'auto', fontSize: '0.75rem', height: 24 }}>
                            Run
                        </LoadingButton>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#282c34', color: '#abb2bf', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                        {component.code}
                    </div>
                </div>
            );
        case 'ai_chat':
        case 'chat_suggestions':
            return (
                <div style={{ width: '100%', maxWidth: '600px', margin: '20px auto', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#e3f2fd', padding: '12px', textAlign: 'center', borderBottom: '2px solid #2196f3', color: '#1976d2', fontWeight: 'bold' }}>
                        AI CHAT
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#f0f4f8' }}>
                        {component.chatInstructions && <div style={{ marginBottom: '15px', color: '#546e7a' }} dangerouslySetInnerHTML={{ __html: component.chatInstructions }} />}
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>[AI Chat Preview]</Typography>
                    </div>
                </div>
            );
        case 'connect_block': {
            const connectContent = (component.content?.question_items || component.content?.left) ? component.content : component;
            const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1', '#7b1fa2'];

            return (
                <Box sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    {connectContent.question_title && (
                        <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                            <div
                                style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2c3e50' }}
                                dangerouslySetInnerHTML={{ __html: connectContent.question_title.replace(/<block>|<\/block>/g, '') }}
                            />
                        </Box>
                    )}
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {connectContent.question_items?.map((item: ANY, iIdx: number) => {
                            const pairColor = colors[iIdx % colors.length];
                            return (
                                <Box key={iIdx} sx={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
                                    <Box sx={{ flex: 1, p: 1.5, bgcolor: '#fcfdfe', border: `1px solid #eef2f6`, borderLeft: `4px solid ${pairColor}`, borderRadius: '8px 4px 4px 8px', display: 'flex', alignItems: 'center', minHeight: '60px' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#333', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: item.left?.replace(/<block>|<\/block>/g, '') || '' }} />
                                    </Box>
                                    <Box sx={{ width: 40, height: '2px', bgcolor: pairColor, opacity: 0.4, mx: -0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: pairColor }} />
                                    </Box>
                                    <Box sx={{ flex: 1, p: 1.5, bgcolor: '#fff', border: `1px solid #eee`, borderRight: `4px solid ${pairColor}`, borderRadius: '4px 8px 8px 4px', display: 'flex', alignItems: 'center', minHeight: '60px' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#2c3e50', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: item.right?.replace(/<block>|<\/block>/g, '') || '' }} />
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }
        case 'rive': {
            const assetUrl = component.webAssetUrl || component.mobileAssetUrl;
            return (
                <div style={{ width: '100%', maxWidth: '600px', margin: '20px auto' }}>
                    <div style={{ position: 'relative', width: '100%', paddingTop: `75%`, backgroundColor: '#f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                            {assetUrl ? (
                                <RivePlayer src={assetUrl} artboard={component.artboard} stateMachines={component.stateMachines} inputOnPress={component.inputOnPress} inputOnRelease={component.inputOnRelease} interactionZones={component.interactionZones} />
                            ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>No Rive asset</div>}
                        </div>
                    </div>
                </div>
            );
        }
        default:
            return <div style={{ marginBottom: '10px', color: '#888', fontStyle: 'italic' }}>[Unsupported component: {component.type}]</div>;
    }
};

export default BodyRenderer;
