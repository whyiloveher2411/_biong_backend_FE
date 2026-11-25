import React from 'react';
import {
    Alert,
    Box,
    ButtonBase,
    CircularProgress,
    Link,
    Stack,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fetchWorkflowOutputs, saveWorkflowOutput } from 'helpers/marketingWorkflowPrompts';
import { useFloatingMessages } from 'hook/useFloatingMessages';

/**
 * Phong cách thumbnail YouTube. Danh mục + ảnh mẫu: backend public/thumbnail-styles/ (FE public trỏ symlink).
 * Lựa chọn lưu ở workflow_outputs.youtube.thumbnail_style; skill biong-social-publish
 * (scripts/social-publish/thumbnail-flow.php) đọc để dựng prompt gửi Google Flow.
 */
export const THUMBNAIL_STYLES_URL = '/thumbnail-styles/styles.json';

export type ThumbnailStyle = { id: string; name: string; description: string };
type Catalog = { default: string; styles: ThumbnailStyle[] };

function SampleImage({ id, name }: { id: string; name: string }) {
    const [failed, setFailed] = React.useState(false);
    if (failed) {
        return (
            <Box sx={{ aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">Chưa có ảnh mẫu</Typography>
            </Box>
        );
    }
    return (
        <Box
            component="img"
            src={`/thumbnail-styles/${id}.jpg`}
            alt={`Mẫu phong cách ${name}`}
            loading="lazy"
            onError={() => setFailed(true)}
            sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
        />
    );
}

export default function ShortVideoAgentThumbnailStylePicker({ shortVideoId }: { shortVideoId: number }) {
    const { showMessage } = useFloatingMessages();
    const [catalog, setCatalog] = React.useState<Catalog | null>(null);
    const [error, setError] = React.useState('');
    const [chosen, setChosen] = React.useState('');
    const [savedImages, setSavedImages] = React.useState<string[]>([]);
    const [savingId, setSavingId] = React.useState('');

    React.useEffect(() => {
        let active = true;
        fetch(THUMBNAIL_STYLES_URL)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = (await response.json()) as Catalog;
                if (active) {
                    setCatalog(data);
                }
            })
            .catch((reason: Error) => {
                if (active) {
                    setError(`Không tải được danh mục phong cách (${reason.message}).`);
                }
            });
        return () => { active = false; };
    }, []);

    React.useEffect(() => {
        let active = true;
        setChosen('');
        setSavedImages([]);
        if (shortVideoId > 0) {
            void fetchWorkflowOutputs(shortVideoId).then((outputs) => {
                if (!active) {
                    return;
                }
                const youtube = outputs.youtube ?? {};
                setChosen(String(youtube.thumbnail_style ?? ''));
                setSavedImages(Object.keys(youtube)
                    .filter((key) => /^thumbnail_image_\d+$/.test(key) && youtube[key])
                    .sort()
                    .map((key) => String(youtube[key])));
            });
        }
        return () => { active = false; };
    }, [shortVideoId]);

    const selected = chosen || catalog?.default || '';
    const selectedStyle = catalog?.styles.find((style) => style.id === selected);

    const choose = async (id: string) => {
        if (!shortVideoId || savingId) {
            return;
        }
        setSavingId(id);
        const result = await saveWorkflowOutput(shortVideoId, 'youtube', 'thumbnail_style', id);
        setSavingId('');
        if (result.ok) {
            setChosen(id);
            showMessage('Đã lưu phong cách thumbnail', 'success');
        } else {
            showMessage(result.message || 'Không lưu được phong cách', 'error');
        }
    };

    return (
        <Stack spacing={1.5}>
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Phong cách thumbnail YouTube</Typography>
                <Typography variant="body2" color="text.secondary">
                    Chọn một phong cách; skill dùng nó để viết prompt gửi Google Flow cho video này.
                </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}
            {!catalog && !error ? <CircularProgress size={20} /> : null}
            {selectedStyle ? (
                <Alert severity="success" sx={{ py: 0.25 }}>
                    Đang dùng: <strong>{selectedStyle.name}</strong>{chosen ? '' : ' (mặc định)'}
                </Alert>
            ) : null}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                {catalog?.styles.map((style) => {
                    const active = style.id === selected;
                    return (
                        <ButtonBase
                            key={style.id}
                            aria-pressed={active}
                            disabled={!shortVideoId || savingId !== ''}
                            onClick={() => { void choose(style.id); }}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                justifyContent: 'flex-start',
                                textAlign: 'left',
                                border: 2,
                                borderColor: active ? 'primary.main' : 'divider',
                                borderRadius: 1.5,
                                overflow: 'hidden',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ position: 'relative' }}>
                                <SampleImage id={style.id} name={style.name} />
                                {savingId === style.id ? (
                                    <CircularProgress size={18} sx={{ position: 'absolute', top: 6, right: 6 }} />
                                ) : null}
                                {active && !savingId ? (
                                    <CheckCircleIcon color="primary" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'common.white', borderRadius: '50%' }} />
                                ) : null}
                            </Box>
                            <Box sx={{ p: 0.75 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{style.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{style.description}</Typography>
                            </Box>
                        </ButtonBase>
                    );
                })}
            </Box>

            {savedImages.length > 0 ? (
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Thumbnail YouTube đã lưu</Typography>
                    <Stack spacing={1}>
                        {savedImages.map((url) => (
                            <Link key={url} href={url} target="_blank" rel="noopener noreferrer">
                                <Box component="img" src={url} alt="Thumbnail YouTube đã lưu" sx={{ display: 'block', width: '100%', borderRadius: 1 }} />
                            </Link>
                        ))}
                    </Stack>
                </Box>
            ) : null}
        </Stack>
    );
}
