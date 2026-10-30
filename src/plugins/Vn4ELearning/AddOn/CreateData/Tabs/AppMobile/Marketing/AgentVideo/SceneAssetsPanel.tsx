import React from 'react';
import CharacterWardrobeEditor from '../CharacterWardrobeEditor';
import Model3dPreview from '../Model3dPreview';
import ShortVideoModel3dManageDrawer from '../ShortVideoModel3dManageDrawer';
import Model3dLibraryPickerDrawer from './Model3dLibraryPickerDrawer';
import {listShortVideoModel3ds, ShortVideoModel3d, CharacterConfig, buildModel3dPreviewUrl, dispatchBeatAssetChanged} from 'helpers/marketingShortVideoModel3dApi';
import SceneAssetPreviewDialog from './SceneAssetPreviewDialog';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CottageOutlinedIcon from '@mui/icons-material/CottageOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CodeIcon from '@mui/icons-material/Code';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReplayIcon from '@mui/icons-material/Replay';

import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { SceneAsset, SceneAssetRegistry, sceneAssetMessage, sceneAssetsManifest, sceneAssetsRequest } from 'helpers/shortVideoSceneAssets';

type Props = { shortVideoId: number };

/** Nút hành động gọn, cùng chiều cao để toolbar không bị so le khi wrap. */
const compactButtonSx = {
    minHeight: 30,
    height: 30,
    px: 1.25,
    py: 0,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'none',
    whiteSpace: 'nowrap',
    '& .MuiButton-startIcon': {mr: 0.5, '& svg': {fontSize: 16}},
};
const compactUtilitySx = {
    ...compactButtonSx,
    px: 0.75,
    fontWeight: 500,
    '&.MuiButton-root': {color: 'text.secondary'},
    '&.MuiButton-root:hover': {color: 'text.primary', bgcolor: 'background.paper'},
    '& .MuiButton-startIcon': {mr: 0.5, '& svg': {fontSize: 14}},
};

/** Một video-html có thể có hơn 100 beat. Chỉ mount dần phần gán hồ sơ để lần mở đầu không chặn UI. */
const BEAT_RENDER_BATCH = 20;
const REGISTRY_POLL_MS = 5000;

/**
 * React 18 runtime có startTransition nhưng @types/react của project vẫn là 17.
 * Fallback chạy đồng bộ để test/legacy bundle không phụ thuộc vào type mới.
 */
const startTransition: (callback: () => void) => void = (
    React as unknown as { startTransition?: (callback: () => void) => void }
).startTransition || ((callback: () => void) => callback());

/** One row per reusable asset. Background polling observes saves made in the headless overlay. */
export default function SceneAssetsPanel({shortVideoId}: Props) {
    const [wardrobeAsset,setWardrobeAsset]=React.useState<SceneAsset | null>(null);
    const [wardrobeConfig,setWardrobeConfig]=React.useState<CharacterConfig>({});
    const [switchHtml,setSwitchHtml]=React.useState<SceneAsset | null>(null);
    const [libraryOpen,setLibraryOpen]=React.useState(false);
    const [addingModel,setAddingModel]=React.useState(false);
    const [pickAsset,setPickAsset]=React.useState<SceneAsset | null>(null);
    const [models,setModels]=React.useState<ShortVideoModel3d[]>([]);
    const [modelsLoading,setModelsLoading]=React.useState(false);
    const pickCharacter=async (asset: SceneAsset | null) => {
        setPickAsset(asset); setAddingModel(!asset); setModels([]); setModelsLoading(true);
        try {const res=await listShortVideoModel3ds(); if(res.success===false) throw new Error('Không tải được thư viện'); setModels((res.models || []).filter(m=>m.kind==='person' && m.character?.enabled));}
        catch(e) {setError(e instanceof Error?e.message:'Không tải được thư viện');} finally {setModelsLoading(false);}
    };
    const [registry, setRegistry] = React.useState<SceneAssetRegistry>({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [regenerate, setRegenerate] = React.useState(false);
    const [notice, setNotice] = React.useState('');
    const [busy, setBusy] = React.useState('');
    const [importText, setImportText] = React.useState('');
    const [importOpen, setImportOpen] = React.useState(false);
    const [preview, setPreview] = React.useState<SceneAsset | null>(null);
    const [edit, setEdit] = React.useState<SceneAsset | null>(null);
    const [html, setHtml] = React.useState('');
    const [profile, setProfile] = React.useState<SceneAsset | null>(null);
    const profileBase = React.useRef<SceneAssetRegistry>({});
    const [draft, setDraft] = React.useState<SceneAssetRegistry | null>(null);
    const [mappingOpen, setMappingOpen] = React.useState(false);
    const [mappingCount, setMappingCount] = React.useState(BEAT_RENDER_BATCH);
    const requestSerial = React.useRef(0);
    const mounted = React.useRef(true);
    const currentVideo = React.useRef(shortVideoId);
    const registrySignature = React.useRef('{}');
    currentVideo.current = shortVideoId;
    const importRevision = React.useRef('');

    /**
     * Áp registry bằng transition: danh sách có thể rất lớn (hàng trăm beat) nên render nặng
     * không được chặn input/scroll. Poll trả về cùng dữ liệu thì bỏ qua để không re-render 5 giây/lần.
     */
    const applyRegistry = React.useCallback((next: SceneAssetRegistry | null, doneLoading = false) => {
        // Lỗi mạng/poll lỗi không được xoá danh sách đang hiển thị; chỉ tắt trạng thái loading.
        if (!next || Array.isArray(next)) {
            if (doneLoading) {
                startTransition(() => setLoading(false));
            }
            return false;
        }
        const signature = JSON.stringify(next);
        const changed = signature !== registrySignature.current;
        if (changed) {
            registrySignature.current = signature;
        }
        if (!changed && !doneLoading) {
            return false;
        }
        startTransition(() => {
            if (changed) {
                setRegistry(next);
            }
            if (doneLoading) {
                setLoading(false);
            }
        });
        return changed;
    }, []);

    React.useEffect(() => {
        mounted.current = true;
        let cancelled = false;
        let pending = false;
        registrySignature.current = '{}';
        const load = async () => {
            if (pending) return;
            // Tab ẩn không cần poll; tránh đánh thức main thread khi user đang làm việc ở tab khác.
            if (typeof document !== 'undefined' && document.hidden) return;
            pending = true;
            const serial = ++requestSerial.current;
            try {
                const res = await sceneAssetsRequest(shortVideoId, 'get');
                if (cancelled || serial !== requestSerial.current) return;
                if (res.success) applyRegistry(res.registry || {}, true);
                else {
                    setError(sceneAssetMessage(res));
                    applyRegistry(null, true);
                }
            } catch (e) {
                if (!cancelled) {
                    setError('Không tải được hồ sơ Three.js.');
                    applyRegistry(null, true);
                }
            } finally {
                pending = false;
            }
        };
        setRegistry({}); setLoading(true); setError(''); setDraft(null); setEdit(null); setProfile(null); setPreview(null); setImportOpen(false);
        setBusy(''); setNotice(''); setMappingOpen(false); setMappingCount(BEAT_RENDER_BATCH);
        void load();
        const timer = setInterval(load, REGISTRY_POLL_MS);
        return () => { cancelled = true; mounted.current = false; clearInterval(timer); ++requestSerial.current; };
    }, [shortVideoId, applyRegistry]);

    /** Mount từng đợt beat khi mở bảng gán hồ sơ, để danh sách 100+ beat vẫn cuộn/click được ngay. */
    const beatCount = Object.keys((draft || registry).beats || {}).length;
    React.useEffect(() => {
        if (!mappingOpen || mappingCount >= beatCount) return undefined;
        const timer = window.setTimeout(() => {
            startTransition(() => {
                setMappingCount(count => Math.min(count + BEAT_RENDER_BATCH, beatCount));
            });
        }, 0);
        return () => window.clearTimeout(timer);
    }, [mappingOpen, mappingCount, beatCount]);

    const run = async (key: string, operation: string, data: Record<string, unknown>) => {
        if (busy || loading) return false;
        setBusy(key); setError(''); setNotice(''); ++requestSerial.current;
        try {
            const res = await sceneAssetsRequest(shortVideoId, operation, data);
            if (!mounted.current || currentVideo.current !== shortVideoId) return false;
            if (!res.success) { setError(sceneAssetMessage(res)); return false; }
            if (res.registry) applyRegistry(res.registry);
            // Character source changes alter the asset-config consumed by every
            // saved beat that still references its prior library GLB.
            if (operation === 'unbind_model') dispatchBeatAssetChanged(shortVideoId, '');
            setNotice(operation === 'open' ? 'Đã mở DeepSeek. Gửi prompt, copy HTML rồi lưu ngay trong overlay.' : operation === 'enqueue' || operation === 'html' || operation === 'repair' ? sceneAssetMessage(res) : 'Đã lưu.');
            return true;
        } catch (e) { if (mounted.current) setError('Không kết nối được CMS.'); return false; }
        finally { if (mounted.current && currentVideo.current === shortVideoId) setBusy(''); }
    };
    const loadAsset = async (asset: SceneAsset) => {
        if (busy || loading) return;
        setBusy('load:' + asset.id); setError('');
        try {
            const res = await sceneAssetsRequest(shortVideoId, 'preview', {asset_id: asset.id});
            if (!mounted.current || currentVideo.current !== shortVideoId) return;
            if (!res.success || !res.asset) { setError(sceneAssetMessage(res)); return; }
            setEdit(res.asset); setHtml(res.asset.html || '');
        } catch (e) { if (mounted.current) setError('Không tải được HTML hồ sơ.'); }
        finally { if (mounted.current && currentVideo.current === shortVideoId) setBusy(''); }
    };
    const assets = Object.values(registry.assets || {});
    const environments = assets.filter(a => a.kind === 'environment');
    const characters = assets.filter(a => a.kind === 'character');
    const working = draft || registry;
    const locked = Boolean(busy) || loading;
    const patchBeat = (id: string, patch: Record<string, unknown>) => setDraft(prev => {
        const base = prev || registry;
        const current = base.beats?.[id];
        if (!current) return prev;
        return {...base, beats: {...base.beats, [id]: {...current, ...patch}}};
    });
    return <Stack spacing={1.25} sx={{mt: 1.5}} aria-busy={loading}>
        <ShortVideoModel3dManageDrawer open={libraryOpen} onClose={()=>setLibraryOpen(false)}/>
        <Model3dLibraryPickerDrawer open={!!pickAsset || addingModel} onClose={()=>{setPickAsset(null);setAddingModel(false);}} models={models} loading={modelsLoading} kind="person" title="Chọn nhân vật cartoon đã lưu" onPick={modelId=>{if(pickAsset) void run('bind:'+pickAsset.id,'bind_model',{asset_id:pickAsset.id,model_id:modelId}); else if(addingModel) void run('add-model','add_model',{model_id:modelId});}}/>
        <Button variant="contained" disabled={locked} onClick={()=>void pickCharacter(null)} sx={{alignSelf:'flex-start'}}>Thêm nhân vật từ thư viện</Button>
        <Button variant="outlined" onClick={()=>setLibraryOpen(true)} sx={{alignSelf:'flex-start'}}>Thư viện nhân vật & tủ đồ · Tạo Xbot / thêm asset</Button>
        <Alert severity="info">Bấm “Thêm nhân vật từ thư viện” để dùng Aster hoặc Xbot ngay. Nếu đã có hồ sơ, dùng “Chọn nhân vật thư viện” ở dòng tương ứng để thay thế. Lựa chọn được chốt riêng cho video; chỉnh tủ đồ về sau không đổi video cũ.</Alert>
        <Alert severity="info">Lập danh sách → tạo HTML từng hồ sơ → kiểm tra gán beat → tạo visual/HTML beat. Các beat cùng cảnh dùng chung bối cảnh, đồ vật và mã nhân vật.</Alert>
        {loading && <Box role="status" aria-live="polite" sx={{display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 2}}>
            <CircularProgress size={18}/>
            <Box>
                <Typography variant="body2" fontWeight={600}>Đang tải danh sách nhân vật và bối cảnh…</Typography>
                <Typography variant="caption" color="text.secondary">Đang đọc hồ sơ dùng chung của video này.</Typography>
            </Box>
        </Box>}
        {!loading && busy && <LinearProgress sx={{borderRadius: 1}}/>}
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Box><Button size="small" sx={compactButtonSx} disabled={locked} onClick={() => {setImportText(assets.length ? sceneAssetsManifest(registry) : ''); importRevision.current = registry.revision || ''; setImportOpen(true);}}>Nhập / sửa danh sách JSON</Button></Box>
        {!loading && !assets.length && <Typography variant="body2" color="text.secondary">Mở DeepSeek của bước này để lập danh sách. Lưu JSON trong headless hoặc nhập tại đây; mỗi nhân vật/bối cảnh sẽ hiện thành một dòng.</Typography>}
        {!loading && assets.length > 0 && <Stack direction="row" flexWrap="wrap" gap={1}>
            <Button size="small" sx={compactButtonSx} variant="contained" color="primary" startIcon={<PlayArrowIcon/>} disabled={locked} onClick={() => void run('queue-all', 'enqueue', {kind: 'all'})}>Tạo HTML còn thiếu · tất cả</Button>
            <Button size="small" sx={compactButtonSx} variant="outlined" color="warning" startIcon={<ReplayIcon/>} disabled={locked || assets.some(a => ['queued', 'processing'].includes(a.generation?.status || ''))} onClick={() => setRegenerate(true)}>Tạo lại tất cả HTML</Button>
        </Stack>}
        {!loading && (['character', 'environment'] as const).map(kind => {
            const isCharacter = kind === 'character';
            const color = isCharacter ? 'primary' as const : 'secondary' as const;
            const rows = assets.filter(a => a.kind === kind);
            const active = rows.filter(a => ['queued', 'processing'].includes(a.generation?.status || '')).length;
            const done = rows.filter(a => a.ready).length;
            return <Box component="section" aria-label={isCharacter ? 'Hồ sơ nhân vật' : 'Hồ sơ bối cảnh'} key={kind} sx={{border: '1px solid', borderColor: isCharacter ? 'primary.light' : 'secondary.light', borderRadius: 2, overflow: 'hidden'}}>
                <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{p: 1.5, bgcolor: isCharacter ? 'rgba(25,118,210,.07)' : 'rgba(156,39,176,.07)'}}>
                    {isCharacter ? <PersonOutlineIcon color="primary"/> : <CottageOutlinedIcon color="secondary"/>}
                    <Box sx={{flex: 1, minWidth: 160}}><Typography variant="subtitle1" fontWeight={700}>{isCharacter ? 'Nhân vật' : 'Bối cảnh'}</Typography><Typography variant="caption" color="text.secondary">{isCharacter ? 'Ngoại hình, rig và biểu cảm dùng chung' : 'Không gian, đồ vật cố định và vị trí staging'} · {done}/{rows.length} có HTML{active ? ` · ${active} đang chờ/chạy` : ''}</Typography></Box>
                    <Button size="small" sx={compactButtonSx} variant="contained" color={color} startIcon={<PlayArrowIcon/>} disabled={locked || !rows.some(a => !a.ready && !['queued', 'processing'].includes(a.generation?.status || ''))} onClick={() => void run('queue:' + kind, 'enqueue', {kind})}>{isCharacter ? 'Tạo nhân vật còn thiếu' : 'Tạo bối cảnh còn thiếu'}</Button>
                </Stack>
                <Stack spacing={1} sx={{p: 1.25}}>
                    {!rows.length && <Typography variant="body2" color="text.secondary">Chưa có {isCharacter ? 'nhân vật' : 'bối cảnh'}.</Typography>}
                    {rows.map(asset => {
                        const generation = asset.generation;
                        const running = ['queued', 'processing'].includes(generation?.status || '');
                        const label = generation?.status === 'queued' ? 'Đang chờ queue' : generation?.status === 'processing' ? generation.phase === 'repairing' ? `Đang tự sửa (${generation.repair_attempt || 0}/3)` : 'Đang tạo / chạy kiểm tra…' : generation?.status === 'failed' ? 'Tạo HTML lỗi' : generation?.status === 'cancelled' ? 'Job queue đã dừng' : asset.model_snapshot ? 'Nhân vật thư viện' : asset.ready ? 'Đã có HTML' : asset.has_html ? 'Cần cập nhật' : 'Chưa có HTML';
                        return <Box key={asset.id} data-testid={'scene-asset-' + asset.id} sx={{p: 1.5, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: isCharacter ? 'primary.main' : 'secondary.main', borderRadius: isCharacter ? 3 : 1, bgcolor: 'background.paper', contentVisibility: 'auto', containIntrinsicSize: 'auto 180px'}}>
                            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                                <Box sx={{width: 36, height: 36, borderRadius: isCharacter ? '50%' : 1, display: 'grid', placeItems: 'center', bgcolor: isCharacter ? 'rgba(25,118,210,.1)' : 'rgba(156,39,176,.1)'}}>{isCharacter ? <PersonOutlineIcon color="primary"/> : <CottageOutlinedIcon color="secondary"/>}</Box>
                                <Box sx={{flex: 1, minWidth: 130}}><Typography variant="body2" fontWeight={700}>{asset.name}</Typography><Typography variant="caption" color="text.secondary">{asset.id}{generation?.job_id ? ` · Job #${generation.job_id}` : ''}</Typography></Box>
                                <Chip size="small" color={running ? 'info' : generation?.status === 'failed' ? 'error' : asset.ready ? 'success' : 'warning'} label={label}/>
                            </Stack>
                            {generation?.error && ['failed', 'superseded', 'cancelled'].includes(generation.status) && <Alert severity={generation.status === 'failed' ? 'error' : 'info'} sx={{mt: 1}}>{generation.error}</Alert>}
                            {generation?.status === 'completed' && <Typography variant="caption" color="text.secondary">{generation.preview_checked ? 'Đã chạy preview và lưu HTML' : 'HTML cũ chưa kiểm tra preview đầy đủ'}{generation.repair_attempt ? ` · ${generation.repair_attempt} lần tự sửa` : ''}{generation.continue_clicks ? ` · ${generation.continue_clicks} lần Continue` : ''}</Typography>}
                            <Box sx={{mt: 1.25, pt: 1.25, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75}}>
                                {isCharacter && <Button size="small" sx={compactButtonSx} variant="contained" disabled={locked || running} onClick={()=>void pickCharacter(asset)}>Thư viện</Button>}
                                {asset.model_snapshot ? <>
                                    <Button size="small" sx={compactButtonSx} variant="outlined" onClick={()=>setPreview(asset)}>Xem nhân vật đã chọn</Button>
                                    <Button size="small" sx={compactButtonSx} variant="contained" disabled={locked} onClick={()=>{setError('');setWardrobeAsset(asset);setWardrobeConfig(JSON.parse(JSON.stringify(asset.model_snapshot?.character || {})));}}>Trang phục</Button>
                                    <Button size="small" sx={compactButtonSx} variant="outlined" disabled={locked} onClick={()=>setSwitchHtml(asset)}>Dùng HTML</Button>
                                </> : <>
                                {asset.has_html ? <>
                                    <Button size="small" sx={compactButtonSx} variant="contained" color="success" startIcon={<VisibilityOutlinedIcon/>} disabled={locked || !asset.has_html} onClick={() => setPreview(asset)}>Xem HTML</Button>
                                    <Button size="small" sx={compactButtonSx} variant="outlined" color="primary" startIcon={<PlayArrowIcon/>} disabled={locked || running} onClick={() => void run('queue:' + asset.id, 'enqueue', {asset_id: asset.id, force: true})}>{generation?.status === 'failed' || generation?.status === 'cancelled' ? 'Chạy lại queue' : 'Tạo bằng queue'}</Button>
                                </> : <>
                                    <Button size="small" sx={compactButtonSx} variant="contained" color="primary" startIcon={<PlayArrowIcon/>} disabled={locked || running} onClick={() => void run('queue:' + asset.id, 'enqueue', {asset_id: asset.id, force: true})}>{generation?.status === 'failed' || generation?.status === 'cancelled' ? 'Chạy lại queue' : 'Tạo bằng queue'}</Button>
                                    <Button size="small" sx={compactButtonSx} variant="outlined" color="success" startIcon={<VisibilityOutlinedIcon/>} disabled={locked} onClick={() => setPreview(asset)}>Xem HTML</Button>
                                </>}
                                <Button size="small" sx={compactButtonSx} variant="outlined" color="primary" startIcon={<ChatOutlinedIcon/>} disabled={locked || running} onClick={() => void run(asset.id, 'open', {asset_id: asset.id})}>{busy === asset.id ? 'Đang mở…' : 'Mở DeepSeek'}</Button>
                                {asset.chat_url && <Button size="small" sx={compactButtonSx} variant="text" color="primary" disabled={locked || running} onClick={() => void run(`chat:${asset.id}`, 'open', {asset_id: asset.id, mode: 'reopen'})}>Chat đã tạo</Button>}
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25, ml: 'auto', p: 0.25, borderRadius: 1.5, bgcolor: 'action.hover'}}>
                                    <Button size="small" sx={compactUtilitySx} variant="text" color="inherit" startIcon={<ReplayIcon/>} disabled={locked || running || !asset.has_html} onClick={() => void run('repair:' + asset.id, 'repair', {asset_id: asset.id})}>Kiểm tra / tự sửa</Button>
                                    <Button size="small" sx={compactUtilitySx} variant="text" color="inherit" startIcon={<CodeIcon/>} disabled={locked} onClick={() => void loadAsset(asset)}>Cập nhật HTML</Button>
                                    <Button size="small" sx={compactUtilitySx} variant="text" color="inherit" startIcon={<EditOutlinedIcon/>} disabled={locked} onClick={() => {profileBase.current = registry; setProfile({...asset});}}>Sửa hồ sơ</Button>
                                </Box>
                                </>}
                            </Box>
                            <Box component="details" sx={{fontSize: 12, color: 'text.secondary', mt: 1}}><summary>Đặc tả cố định</summary><Box sx={{whiteSpace: 'pre-wrap', mt: 0.5}}>{asset.spec}</Box></Box>
                        </Box>;
                    })}
                </Stack>
            </Box>;
        })}
        {!loading && beatCount > 0 && <Box>
            <Button size="small" sx={compactButtonSx} variant="outlined" aria-expanded={mappingOpen} aria-controls="scene-asset-beat-map" onClick={() => {
                if (mappingOpen) { setMappingOpen(false); return; }
                setMappingCount(BEAT_RENDER_BATCH);
                setMappingOpen(true);
            }}>Gán hồ sơ cho từng beat ({beatCount})</Button>
            {mappingOpen && <Box id="scene-asset-beat-map" sx={{mt: 1}}>
                <Typography variant="caption" color="text.secondary">Sửa lựa chọn nếu cần. “Cần dựng lại” nghĩa là HTML beat chưa dùng phiên bản hồ sơ hiện tại; không tự ghi đè beat đã duyệt.</Typography>
                <Stack spacing={1} sx={{mt: 1}}>{Object.values(working.beats || {}).slice(0, mappingCount).map(beat => <Box key={beat.id} sx={{p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, contentVisibility: 'auto', containIntrinsicSize: 'auto 190px'}}>
                    <Stack direction="row" gap={1} alignItems="center" sx={{mb: 1}}><Typography variant="body2">{beat.id}</Typography><Chip size="small" color={beat.status === 'ready' ? 'success' : 'default'} label={beat.status === 'ready' ? 'Đồng bộ' : beat.status === 'stale' ? 'Cần dựng lại' : 'Chưa có HTML beat'}/></Stack>
                    <FormControl size="small" fullWidth sx={{mb: 1}}><InputLabel>Bối cảnh</InputLabel><Select label="Bối cảnh" value={beat.environment_id} onChange={e => patchBeat(beat.id, {environment_id: e.target.value, additional_environment_ids: (beat.additional_environment_ids || []).filter(id => id !== e.target.value)})}><MenuItem value="">Không dùng</MenuItem>{environments.map(a => <MenuItem key={a.id} value={a.id}>{a.name}{a.ready ? '' : ' — chưa có HTML'}</MenuItem>)}</Select></FormControl>
                    <FormControl size="small" fullWidth sx={{mb: 1}}><InputLabel>Bối cảnh bổ sung trong beat</InputLabel><Select multiple label="Bối cảnh bổ sung trong beat" value={beat.additional_environment_ids || []} onChange={e => patchBeat(beat.id, {additional_environment_ids: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value})}>{environments.filter(a => a.id !== beat.environment_id).map(a => <MenuItem key={a.id} value={a.id}>{a.name}{a.ready ? '' : ' — chưa có HTML'}</MenuItem>)}</Select></FormControl>
                    <FormControl size="small" fullWidth sx={{mb: 1}}><InputLabel>Nhân vật</InputLabel><Select multiple label="Nhân vật" value={beat.character_ids} onChange={e => patchBeat(beat.id, {character_ids: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value})}>{characters.map(a => <MenuItem key={a.id} value={a.id}>{a.name}{a.ready ? '' : ' — chưa có HTML'}</MenuItem>)}</Select></FormControl>
                    <TextField fullWidth multiline size="small" label="Hành động / trạng thái nối cảnh" value={beat.continuity} onChange={e => patchBeat(beat.id, {continuity: e.target.value})}/>
                </Box>)}</Stack>
                {mappingCount < beatCount && <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>Đang hiện {mappingCount}/{beatCount} beat…</Typography>}
                {draft && <Stack direction="row" gap={1} sx={{mt: 1}}><Button disabled={Boolean(busy)} onClick={async () => {if (await run('mapping', 'manifest', {text: sceneAssetsManifest(draft), expected_revision: draft.revision || ''})) setDraft(null);}}>Lưu gán beat</Button><Button onClick={() => setDraft(null)}>Hủy chỉnh sửa</Button></Stack>}
            </Box>}
        </Box>}
        <Dialog open={!!wardrobeAsset} onClose={()=>!busy && setWardrobeAsset(null)} fullWidth maxWidth="lg">
            <DialogTitle>Trang phục riêng · {wardrobeAsset?.name}</DialogTitle>
            <DialogContent><Alert severity="info" sx={{mb:2}}>Chỉ áp dụng cho vai này trong video. Hai vai dùng cùng model có thể có trang phục, tóc và biểu cảm riêng; mẫu trong thư viện giữ nguyên.</Alert>
                {error && <Alert severity="error">{error}</Alert>}
                <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'1fr 1fr'},gap:2}}>
                    <CharacterWardrobeEditor value={wardrobeConfig} onChange={setWardrobeConfig} modelId={0} library={wardrobeConfig.library || []} disabled={!!busy} allowGeneration={false}/>
                    {wardrobeAsset?.model_snapshot && <Model3dPreview url={buildModel3dPreviewUrl(wardrobeAsset.model_snapshot.model_url)} character={wardrobeConfig}/>}
                </Box>
            </DialogContent>
            <DialogActions><Button disabled={!!busy} onClick={()=>setWardrobeAsset(null)}>Hủy</Button><Button variant="contained" disabled={!!busy} onClick={async()=>{if(wardrobeAsset && await run('wardrobe:'+wardrobeAsset.id,'character_config',{asset_id:wardrobeAsset.id,expected_module_hash:wardrobeAsset.module_hash,character:wardrobeConfig}))setWardrobeAsset(null);}}>Lưu trang phục cho vai này</Button></DialogActions>
        </Dialog>
        <Dialog open={!!switchHtml} onClose={()=>!busy && setSwitchHtml(null)}><DialogTitle>Dùng nhân vật HTML · {switchHtml?.name}</DialogTitle><DialogContent>
            {switchHtml?.has_html_backup ? 'Bản HTML trước khi chọn thư viện sẽ được khôi phục. Trang phục của mẫu thư viện giữ nguyên.' : 'Hồ sơ này chưa có bản HTML cũ được lưu dự phòng. Chuyển sang chế độ HTML rồi dán HTML hoặc tạo lại bằng DeepSeek.'}
            {switchHtml?.has_html_backup && switchHtml.html_backup_ready===false && <Alert severity="warning" sx={{mt:1}}>Bản HTML cũ cần kiểm tra hoặc cập nhật theo đặc tả hiện tại trước khi dựng beat.</Alert>}
            <Typography variant="body2" sx={{mt:1}}>Các beat dùng hồ sơ này sẽ cần dựng lại để nhận thay đổi.</Typography>{error && <Alert severity="error">{error}</Alert>}
        </DialogContent><DialogActions><Button disabled={!!busy} onClick={()=>setSwitchHtml(null)}>Hủy</Button><Button variant="contained" disabled={!!busy} onClick={async()=>{if(switchHtml && await run('html-mode:'+switchHtml.id,'unbind_model',{asset_id:switchHtml.id,expected_module_hash:switchHtml.module_hash}))setSwitchHtml(null);}}>Chuyển sang HTML</Button></DialogActions></Dialog>
        <Dialog open={regenerate} onClose={() => !busy && setRegenerate(false)}><DialogTitle>Tạo lại toàn bộ HTML hồ sơ?</DialogTitle><DialogContent>DeepSeek sẽ tạo lại các nhân vật và bối cảnh qua queue. Bản HTML hiện tại chỉ được thay khi bản mới đã hoàn chỉnh, kiểm tra chạy được và lưu đúng vào DB. Các beat dùng phiên bản cũ sẽ được báo cần dựng lại.</DialogContent><DialogActions><Button onClick={() => setRegenerate(false)}>Hủy</Button><Button variant="contained" color="warning" disabled={Boolean(busy)} onClick={async () => {if (await run('queue-all', 'enqueue', {kind: 'all', force: true})) setRegenerate(false);}}>Tạo lại tất cả</Button></DialogActions></Dialog>
        <Dialog open={importOpen} onClose={() => !busy && setImportOpen(false)} fullWidth maxWidth="md"><DialogTitle>Danh sách nhân vật và bối cảnh</DialogTitle><DialogContent><Typography variant="body2" sx={{mb: 1}}>Dán JSON chatbot trả về. Giữ nguyên ID để bảo toàn HTML đã tạo. Thay đổi đặc tả sẽ yêu cầu tạo lại HTML tương ứng.</Typography><TextField fullWidth multiline minRows={12} value={importText} onChange={e => setImportText(e.target.value)} inputProps={{'aria-label': 'JSON hồ sơ'}}/></DialogContent><DialogActions><Button disabled={Boolean(busy)} onClick={() => setImportOpen(false)}>Đóng</Button><Button disabled={Boolean(busy) || !importText.trim()} onClick={async () => {if (await run('manifest', 'manifest', {text: importText, expected_revision: importRevision.current})) {setImportOpen(false); setDraft(null);}}}>Lưu danh sách</Button></DialogActions></Dialog>
        <Dialog open={Boolean(edit)} onClose={() => !busy && setEdit(null)} fullWidth maxWidth="md"><DialogTitle>Cập nhật HTML · {edit?.name}</DialogTitle><DialogContent><Alert severity="info" sx={{mb: 1}}>HTML được chạy kiểm tra preview trước khi lưu. Nếu có lỗi, queue sẽ gửi chẩn đoán về DeepSeek và tự kiểm tra lại bản sửa; bản hiện tại được giữ trong lúc xử lý.</Alert><TextField fullWidth multiline minRows={14} value={html} onChange={e => setHtml(e.target.value)} inputProps={{'aria-label': 'HTML hồ sơ'}}/></DialogContent><DialogActions><Button disabled={Boolean(busy)} onClick={() => setEdit(null)}>Đóng</Button><Button disabled={Boolean(busy) || !html.trim()} onClick={async () => {if (edit && await run('html', 'html', {asset_id: edit.id, spec_hash: edit.spec_hash, text: html})) setEdit(null);}}>Lưu HTML</Button></DialogActions></Dialog>
        <Dialog open={Boolean(profile)} onClose={() => !busy && setProfile(null)} fullWidth maxWidth="md"><DialogTitle>Sửa hồ sơ · {profile?.id}</DialogTitle><DialogContent><Alert severity="info" sx={{mb: 2}}>Đổi đặc tả sẽ yêu cầu tạo lại HTML hồ sơ. Những beat đã dùng hồ sơ này sẽ được báo cần dựng lại.</Alert><TextField fullWidth label="Tên hiển thị" value={profile?.name || ''} onChange={e => setProfile(p => p ? {...p, name: e.target.value} : p)} sx={{mb: 2}}/><TextField fullWidth multiline minRows={8} label="Đặc tả cố định" value={profile?.spec || ''} onChange={e => setProfile(p => p ? {...p, spec: e.target.value} : p)}/></DialogContent><DialogActions><Button disabled={Boolean(busy)} onClick={() => setProfile(null)}>Đóng</Button><Button disabled={Boolean(busy) || !profile?.name.trim() || !profile?.spec.trim()} onClick={async () => {
            if (!profile) return;
            const base = profileBase.current;
            const next = {...base, assets: {...base.assets, [profile.id]: profile}};
            if (await run('profile', 'manifest', {text: sceneAssetsManifest(next), expected_revision: base.revision || ''})) setProfile(null);
        }}>Lưu hồ sơ</Button></DialogActions></Dialog>
        <SceneAssetPreviewDialog shortVideoId={shortVideoId} asset={preview} onClose={() => setPreview(null)} onRegistryChange={applyRegistry} previewTitle={`Preview ${preview?.name || ''}`}/>
    </Stack>;
}
