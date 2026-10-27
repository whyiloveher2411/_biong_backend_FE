import React from 'react';
import {Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography} from '@mui/material';
import {SceneAsset, SceneAssetRegistry, sceneAssetMessage, sceneAssetsRequest} from 'helpers/shortVideoSceneAssets';
import Model3dPreview from '../Model3dPreview';
import {buildModel3dPreviewUrl} from 'helpers/marketingShortVideoModel3dApi';
import SceneAssetHtmlPreview from './SceneAssetHtmlPreview';

type Props = {shortVideoId: number; asset: SceneAsset | null; onClose: () => void; onRegistryChange?: (registry: SceneAssetRegistry) => void; previewTitle?: string};
/** One preview/creation entry point for workflow rows and beat asset shortcuts. */
export default function SceneAssetPreviewDialog({shortVideoId, asset, onClose, onRegistryChange, previewTitle}: Props) {
    const [current, setCurrent] = React.useState<SceneAsset | null>(asset);
    const [loading, setLoading] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const serial = React.useRef(0);
    const callback = React.useRef(onRegistryChange); callback.current = onRegistryChange;
    const assetId = asset?.id;
    React.useEffect(() => {
        const request = ++serial.current;
        setCurrent(asset); setLoading(Boolean(assetId)); setError(''); setNotice(''); setBusy(false);
        if (assetId) void sceneAssetsRequest(shortVideoId, 'preview', {asset_id: assetId}).then(res => {
            if (serial.current !== request) return;
            if (!res.success || !res.asset) throw new Error(sceneAssetMessage(res));
            setCurrent(previous => ({...previous, ...res.asset, has_html: Boolean(res.asset?.html)} as SceneAsset));
        }).catch(e => {if (serial.current === request) setError(e instanceof Error ? e.message : 'Không tải được preview.');})
            .finally(() => {if (serial.current === request) setLoading(false);});
        return () => {++serial.current;};
        // A new registry object must not restart the preview request while polling.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shortVideoId, assetId]);
    const running = ['queued', 'processing'].includes(current?.generation?.status || '');
    React.useEffect(() => {
        if (!assetId || !running) return;
        const request = serial.current;
        let alive = true, pending = false;
        const timer = window.setInterval(() => {
            if (pending) return; pending = true;
            void (async () => {
                try {
                    const res = await sceneAssetsRequest(shortVideoId, 'get');
                    if (!alive || serial.current !== request) return;
                    if (!res.success) throw new Error(sceneAssetMessage(res));
                    const next = res.registry?.assets?.[assetId];
                    if (!next) return;
                    let html: string | undefined;
                    if (next.has_html && !['queued','processing'].includes(next.generation?.status || '')) {
                        const loaded = await sceneAssetsRequest(shortVideoId, 'preview', {asset_id: assetId});
                        if (!alive || serial.current !== request) return;
                        if (!loaded.success || !loaded.asset) throw new Error(sceneAssetMessage(loaded));
                        html = loaded.asset.html;
                    }
                    setCurrent(previous => ({...previous, ...next, ...(html !== undefined ? {html} : {})}));
                    if (res.registry) callback.current?.(res.registry);
                } catch(e) {if (alive && serial.current === request) setError(e instanceof Error ? e.message : 'Không cập nhật được queue.');}
                finally {pending = false;}
            })();
        }, 4000);
        return () => {alive = false; window.clearInterval(timer);};
    }, [shortVideoId, assetId, running]);
    const act = async (operation: 'enqueue' | 'open') => {
        if (!current || current.id !== assetId || busy || running) return;
        const request = serial.current;
        setBusy(true); setError(''); setNotice('');
        try {
            const res = await sceneAssetsRequest(shortVideoId, operation, {asset_id: current.id, ...(operation === 'enqueue' ? {force: true} : {})});
            if (serial.current !== request) return;
            if (!res.success) throw new Error(sceneAssetMessage(res));
            if (res.registry) {
                const next = res.registry.assets?.[current.id];
                if (next) setCurrent(previous => ({...previous, ...next}));
                callback.current?.(res.registry);
            }
            setNotice(operation === 'enqueue' ? 'Đã thêm vào queue tạo HTML. Preview sẽ tự cập nhật khi hoàn tất.' : 'Đã mở DeepSeek với prompt của hồ sơ này.');
        } catch(e) {if (serial.current === request) setError(e instanceof Error ? e.message : 'Không thực hiện được thao tác.');}
        finally {if (serial.current === request) setBusy(false);}
    };
    const visible = current?.id === assetId ? current : asset;
    return <Dialog open={Boolean(asset)} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Preview · {visible?.name}</DialogTitle>
        <DialogContent>
            <Stack spacing={1.5}>
                {loading && <CircularProgress size={24} aria-label="Đang tải preview"/>}
                {error && <Alert severity="error">{error}</Alert>}
                {notice && <Alert severity="success">{notice}</Alert>}
                {running && <Alert severity="info">{current?.generation?.status === 'queued' ? 'Đang chờ queue tạo HTML' : 'Đang tạo và kiểm tra HTML'}{current?.generation?.job_id ? ` · Job ${current.generation.job_id}` : ''}</Alert>}
                {current?.generation?.error && !running && <Alert severity="warning">{current.generation.error}</Alert>}
                {visible?.html && visible.ready === false && !running && <Alert severity="warning">HTML hiện tại cần cập nhật theo hồ sơ mới. Bạn có thể tạo lại bằng queue bên dưới.</Alert>}
                {!loading && (visible?.model_snapshot ? <Model3dPreview url={buildModel3dPreviewUrl(visible.model_snapshot.model_url)} character={visible.model_snapshot.character}/> : visible?.html ? <SceneAssetHtmlPreview kind={visible.kind} title={previewTitle || `Asset ${visible.id}`} html={visible.html}/> : <Alert severity="info">Chưa có HTML {visible?.kind === 'character' ? 'nhân vật' : 'bối cảnh'}. Bạn có thể tạo bằng queue hoặc mở DeepSeek bên dưới.</Alert>)}
                {visible?.spec && !visible.html && <Typography variant="body2" sx={{whiteSpace:'pre-wrap'}}>{visible.spec}</Typography>}
            </Stack>
        </DialogContent>
        <DialogActions sx={{flexWrap:'wrap', gap:1}}>
            <Button variant="contained" sx={{display:visible?.model_snapshot?'none':undefined}} disabled={loading || busy || running} onClick={() => void act('enqueue')}>{current?.generation?.status === 'failed' || current?.generation?.status === 'cancelled' ? 'Chạy lại queue' : visible?.html ? 'Tạo lại HTML bằng queue' : 'Tạo HTML bằng queue'}</Button>
            <Button sx={{display:visible?.model_snapshot?'none':undefined}} disabled={loading || busy || running} onClick={() => void act('open')}>Mở DeepSeek</Button>
            <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
    </Dialog>;
}
