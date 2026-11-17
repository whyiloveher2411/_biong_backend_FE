import React from 'react';
import {Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography} from '@mui/material';
import {ajax} from 'hook/useApi';

const PREVIEW_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/cast-design-preview';

type PreviewResponse = {
    success?: boolean;
    html?: string;
    style?: string;
    video_style?: string;
    styles?: Record<string, string>;
    characters?: Array<{id: string; name: string}>;
    code?: string;
    message?: string | {content?: string};
};

/**
 * Xem trước dàn nhân vật của video ở style nhân vật: thiết kế Character Designer đã duyệt được dựng bằng
 * THREE.SVCast C.fromDesign — đúng như beat sẽ dựng (backend: marketing_sv_cast_preview_html).
 */
export default function CastDesignPreviewDialog({open, onClose, shortVideoId}: {open: boolean; onClose: () => void; shortVideoId: number}) {
    const [style, setStyle] = React.useState('');
    const [state, setState] = React.useState<{loading: boolean; data: PreviewResponse | null; error: string}>({loading: false, data: null, error: ''});

    React.useEffect(() => {
        if (!open || !shortVideoId) return;
        let alive = true;
        setState((s) => ({...s, loading: true, error: ''}));
        (async () => {
            try {
                const res = (await ajax({url: PREVIEW_PATH, method: 'POST', data: {short_video_id: shortVideoId, id: shortVideoId, style}})) as PreviewResponse;
                if (!alive) return;
                if (!res?.success || !res.html) {
                    const m = res?.message;
                    setState({loading: false, data: res || null, error: (typeof m === 'string' ? m : m?.content) || 'Không tải được xem trước.'});
                } else setState({loading: false, data: res, error: ''});
            } catch (e) {
                if (alive) setState({loading: false, data: null, error: String((e as Error)?.message || e)});
            }
        })();
        return () => { alive = false; };
    }, [open, shortVideoId, style]);

    const data = state.data;
    const styles = data?.styles || {};
    const current = style || data?.style || '';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Xem trước dàn nhân vật theo style</DialogTitle>
            <DialogContent>
                <Stack direction={{xs: 'column', sm: 'row'}} gap={2} alignItems={{xs: 'stretch', sm: 'center'}} sx={{mb: 1.5, mt: 0.5}}>
                    <TextField select size="small" label="Style" value={current} onChange={(e) => setStyle(e.target.value)} sx={{minWidth: 220}} disabled={!Object.keys(styles).length}>
                        {Object.entries(styles).map(([id, name]) => (
                            <MenuItem key={id} value={id}>{name}{id === data?.video_style ? ' (của video)' : ''}</MenuItem>
                        ))}
                    </TextField>
                    <Typography variant="caption" color="text.secondary">
                        Dựng từ thiết kế đã duyệt (màu, áo, quần/váy, giày, tóc, phụ kiện) đúng như các beat sẽ dựng. Kéo để xoay; nút Trước / Bên / Sau ở góc trái.
                        {data?.characters?.length ? ` ${data.characters.length} nhân vật.` : ''}
                    </Typography>
                </Stack>
                {state.error && <Alert severity={data?.code === 'no_designs' ? 'info' : 'error'} sx={{mb: 1.5}}>{state.error}</Alert>}
                <Box sx={{position: 'relative', width: '100%', aspectRatio: '16 / 9', bgcolor: '#cfd6de', borderRadius: 1, overflow: 'hidden'}}>
                    {data?.html && !state.error && (
                        <iframe key={current} title="Xem trước dàn nhân vật" srcDoc={data.html} style={{border: 0, width: '100%', height: '100%', display: 'block'}} />
                    )}
                    {state.loading && (
                        <Box sx={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.4)'}}>
                            <CircularProgress size={32} />
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
}
