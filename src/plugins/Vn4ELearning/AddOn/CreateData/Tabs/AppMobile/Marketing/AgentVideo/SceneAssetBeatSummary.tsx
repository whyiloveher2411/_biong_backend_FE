import React from 'react';
import SceneAssetPreviewDialog from './SceneAssetPreviewDialog';
import BeatVoiceSummary from './BeatVoiceSummary';
import CottageOutlinedIcon from '@mui/icons-material/CottageOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Alert, Box, Button, Chip, Stack, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { SceneAsset, SceneAssetRegistry, sceneAssetMessage, sceneAssetsRequest } from 'helpers/shortVideoSceneAssets';

/** Read saved mapping beside the beat direction; never infer asset IDs from prose. */
export default function SceneAssetBeatSummary({shortVideoId, beatId, variant = 'summary'}: {shortVideoId: number; beatId: string; variant?: 'summary' | 'toolbar'}) {
    const [registry, setRegistry] = React.useState<SceneAssetRegistry | null>(null);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [preview, setPreview] = React.useState<SceneAsset | null>(null);
    const request = React.useRef(0);
    React.useEffect(() => {
        const serial = ++request.current;
        setRegistry(null); setError(''); setLoading(true); setPreview(null);
        sceneAssetsRequest(shortVideoId, 'get').then(res => {
            if (request.current !== serial) return;
            if (res.success) setRegistry(res.registry || {});
            else setError(sceneAssetMessage(res));
        }).catch(() => {
            if (request.current === serial) setError('Không tải được asset của beat.');
        }).finally(() => { if (request.current === serial) setLoading(false); });
        return () => { ++request.current; };
    }, [shortVideoId, beatId]);
    const loadPreview = (assetId: string) => {
        const asset = registry?.assets?.[assetId];
        if (asset) setPreview(asset);
    };
    const mapping = registry?.beats?.[beatId];
    const ids = mapping ? [mapping.environment_id, ...mapping.character_ids].filter(Boolean) : [];
    const previewDialog = <SceneAssetPreviewDialog shortVideoId={shortVideoId} asset={preview} onClose={() => setPreview(null)} onRegistryChange={setRegistry}/>;
    if (variant === 'toolbar') {
        return <Stack role="group" aria-label="Asset dùng trong beat" direction="column" alignItems="center" spacing={0.75}
            onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
            sx={{maxHeight: 'min(35vh, 280px)', overflowY: 'auto', flexShrink: 0}}>
            {loading && <CircularProgress size={20} aria-label="Đang tải asset" sx={{color: 'common.white', m: 0.75}}/>}
            {error && <Tooltip placement="left" title={error}><ErrorOutlineIcon role="alert" aria-label={error} sx={{color: 'warning.light', m: 0.5}}/></Tooltip>}
            {ids.map(id => {
                const asset = registry?.assets?.[id];
                const environment = id === mapping?.environment_id;
                const label = `Mở ${environment ? 'bối cảnh' : 'nhân vật'}: ${asset?.name || id}`;
                return <Tooltip key={id} placement="left" title={`${label}${asset?.has_html ? '' : ' — chưa có HTML'}`}>
                    <span><IconButton size="small" aria-label={label} disabled={!asset} onClick={() => void loadPreview(id)}
                        sx={{width: 32, height: 32, borderRadius: 1, color: 'common.white',
                            bgcolor: environment ? 'rgba(123,31,162,0.88)' : 'rgba(0,105,92,0.88)',
                            '&:hover': {bgcolor: environment ? 'rgba(123,31,162,1)' : 'rgba(0,105,92,1)'},
                            '&.Mui-disabled': {color: 'rgba(255,255,255,0.38)', bgcolor: 'rgba(0,0,0,0.4)'}}}>
                        {environment ? <CottageOutlinedIcon fontSize="small"/> : <PersonOutlineIcon fontSize="small"/>}
                    </IconButton></span>
                </Tooltip>;
            })}
            <BeatVoiceSummary shortVideoId={shortVideoId} beatId={beatId} compact />
            {previewDialog}
        </Stack>;
    }
    return <Box component="section" aria-label="Asset dùng trong beat" sx={{p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', flexShrink: 0}}>
        <Typography variant="subtitle2" sx={{mb: 1}}>Asset dùng trong beat</Typography>
        {loading && <Typography variant="body2" color="text.secondary">Đang tải asset…</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && !mapping && <Alert severity="warning">Chưa có mapping asset cho beat này. Gán nhân vật và bối cảnh ở Bước 2 trước khi tạo HTML.</Alert>}
        {mapping && !mapping.action && <Alert severity="warning" sx={{mb: 1}}>Mapping hiện tại chưa có kế hoạch diễn biến. Lập lại hồ sơ ở Bước 2 để lưu trạng thái đầu, hành động và kết quả của từng beat; chỉ đổi góc máy sẽ không làm câu chuyện tiến triển.</Alert>}
        {mapping?.continuity_error && <Alert severity="warning" sx={{mb: 1}}>{mapping.continuity_error}</Alert>}
        {mapping?.continuity_from && <Alert severity="success" sx={{mb: 1}}>Đã nạp trạng thái frame cuối từ {mapping.continuity_from}.</Alert>}
        {!mapping && <BeatVoiceSummary shortVideoId={shortVideoId} beatId={beatId} />}
        {mapping && <Stack spacing={1}>
            {ids.map(id => {
                const asset = registry?.assets?.[id];
                return <Stack key={id} direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                    <Typography variant="body2">{asset?.kind === 'character' ? 'Nhân vật' : 'Bối cảnh'}: <b>{asset?.name || id}</b></Typography>
                    <Chip size="small" label={id}/>
                    <Chip size="small" color={asset?.ready ? 'success' : 'warning'} label={asset?.ready ? 'Sẵn sàng' : 'Cần cập nhật HTML'}/>
                    <Button size="small" disabled={!asset} onClick={() => void loadPreview(id)}>Xem asset</Button>
                </Stack>;
            })}
            {!mapping.character_ids.length && <Typography variant="body2" color="text.secondary">Không có nhân vật trong beat này.</Typography>}
            {!ids.length && <Typography variant="body2" color="text.secondary">Beat này không dùng asset chung.</Typography>}
            <BeatVoiceSummary shortVideoId={shortVideoId} beatId={beatId} />
            {mapping.action && <Box>
                <Typography variant="subtitle2">Diễn biến của beat{mapping.scene_id ? ` · ${mapping.scene_id}` : ''}</Typography>
                {mapping.start_state && <Typography variant="body2"><b>Bắt đầu:</b> {mapping.start_state}</Typography>}
                <Typography variant="body2"><b>Hành động:</b> {mapping.action}</Typography>
                {mapping.end_state && <Typography variant="body2"><b>Kết thúc:</b> {mapping.end_state}</Typography>}
                {mapping.new_information && <Typography variant="body2"><b>Thay đổi:</b> {mapping.new_information}</Typography>}
            </Box>}
            {mapping.continuity && <Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>{mapping.continuity}</Typography>}
            <Typography variant="caption" color="text.secondary">Dùng các asset này để giữ cùng hình dáng và bố trí giữa các beat. Beat cùng cảnh kế thừa trạng thái frame cuối; hành động tiếp tục từ điểm nối.</Typography>
        </Stack>}
        {previewDialog}
    </Box>;
}
