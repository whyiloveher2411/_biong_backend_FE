import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {writePromptTextToClipboard} from 'helpers/marketingShortVideoAgentPrompt';
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReplayIcon from '@mui/icons-material/Replay';

import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, Tooltip, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { SceneAsset, SceneAssetRegistry, SceneAssetResponse, sceneAssetMessage, sceneAssetsManifest, sceneAssetsRequest } from 'helpers/shortVideoSceneAssets';
import SceneAssetHtmlPreview from './SceneAssetHtmlPreview';
import CharacterDesignDialog from './CharacterDesignDialog';
import { SeriesCastMember, seriesCastMessage, seriesCastRequest, seriesCastSuggestId } from 'helpers/shortVideoSeriesCast';

type Props = { shortVideoId: number };
type AssetProvider = 'deepseek' | 'claude';
const providerStorageKey = (videoId: number) => `scene-assets-provider:${videoId}`;
function readAssetProvider(videoId: number): AssetProvider {
    try { return localStorage.getItem(providerStorageKey(videoId)) === 'claude' ? 'claude' : 'deepseek'; }
    catch { return 'deepseek'; }
}

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
/** Một video-html có thể có hơn 100 beat. Chỉ mount dần phần gán hồ sơ để lần mở đầu không chặn UI. */
const BEAT_RENDER_BATCH = 20;
const REGISTRY_POLL_MS = 5000;

/**
 * Kiểm tra nhanh trước khi gửi: server vẫn là nơi quyết định (module, API Three.js r186,
 * phần preview ngoài module). Ở đây chỉ chặn các lỗi cấu trúc tốn một vòng request.
 */
function assetHtmlIssue(html: string): string {
    const text = html.trim();
    if (!text) return 'HTML đang trống. Dán HTML preview hoàn chỉnh hoặc bấm “Tải lại HTML” để giữ bản đang lưu.';
    if (text.length > 800000) return 'HTML vượt quá 800KB.';
    if (!/^<!doctype\s+html/i.test(text)) return 'HTML cần bắt đầu bằng <!doctype html>.';
    if (!/<\/html>$/i.test(text)) return 'HTML cần kết thúc bằng </html>.';
    if ((text.match(/<!doctype\s+html/gi) || []).length !== 1) return 'Chỉ được có một <!doctype html>.';
    const modules = text.match(/<script\b[^>]*\bid\s*=\s*(["'])sv-asset-module\1[^>]*>/gi) || [];
    if (modules.length !== 1) return `HTML cần đúng một <script id="sv-asset-module"> (đang có ${modules.length}).`;
    if (/\bsrc\s*=/i.test(modules[0])) return 'Module phải inline: bỏ src khỏi <script id="sv-asset-module">.';
    if (!/window\.SVAssetFactory\s*=\s*function\s*\(\s*THREE\s*,\s*kit\s*\)\s*\{/.test(text)) {
        return 'Module phải có dạng window.SVAssetFactory = function(THREE, kit) { … };';
    }
    return '';
}

/**
 * React 18 runtime có startTransition nhưng @types/react của project vẫn là 17.
 * Fallback chạy đồng bộ để test/legacy bundle không phụ thuộc vào type mới.
 */
const startTransition: (callback: () => void) => void = (
    React as unknown as { startTransition?: (callback: () => void) => void }
).startTransition || ((callback: () => void) => callback());

/** One row per reusable asset. Background polling observes saves made in the headless overlay. */
export default function SceneAssetsPanel({shortVideoId}: Props) {
    const [designAsset, setDesignAsset] = React.useState<SceneAsset | null>(null);
    const [castPick, setCastPick] = React.useState<SceneAsset | null>(null);
    const [castList, setCastList] = React.useState<SeriesCastMember[] | null>(null);
    const [promote, setPromote] = React.useState<{asset: SceneAsset; id: string; name: string} | null>(null);
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
    const [provider,setProvider]=React.useState<AssetProvider>(()=>readAssetProvider(shortVideoId));
    React.useEffect(()=>{setProvider(readAssetProvider(shortVideoId));},[shortVideoId]);
    const selectProvider = (value: AssetProvider) => {
        setProvider(value);
        try { localStorage.setItem(providerStorageKey(shortVideoId),value); } catch { /* Keep selection usable when browser storage is unavailable. */ }
    };
    const providerLabel=provider==='claude'?'Claude':'DeepSeek';
    const [notice, setNotice] = React.useState('');
    const [busy, setBusy] = React.useState('');
    const [importText, setImportText] = React.useState('');
    const [importOpen, setImportOpen] = React.useState(false);
    const [preview, setPreview] = React.useState<SceneAsset | null>(null);
    const [profile, setProfile] = React.useState<SceneAsset | null>(null);
    const [profileHtml, setProfileHtml] = React.useState('');
    const [profileMaterialPreview, setProfileMaterialPreview] = React.useState('');
    const [profileHtmlBase, setProfileHtmlBase] = React.useState('');
    const [profileHtmlState, setProfileHtmlState] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [profileHtmlError, setProfileHtmlError] = React.useState('');
    const [profilePreview, setProfilePreview] = React.useState(false);
    const profileHtmlRequest = React.useRef(0);
    const profileSpecHash = React.useRef('');
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
        setDesignAsset(null); setCastPick(null); setPromote(null); setRegistry({}); setLoading(true); setError(''); setDraft(null); setProfile(null); setPreview(null); setImportOpen(false);
        setBusy(''); setNotice(''); setMappingOpen(false); setMappingCount(BEAT_RENDER_BATCH); ++profileHtmlRequest.current;
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

    const run = async (key: string, operation: string, data: Record<string, unknown>): Promise<SceneAssetResponse | null> => {
        if (busy || loading) return null;
        setBusy(key); setError(''); setNotice(''); ++requestSerial.current;
        try {
            const res = await sceneAssetsRequest(shortVideoId, operation, data);
            if (!mounted.current || currentVideo.current !== shortVideoId) return null;
            if (!res.success) { setError(sceneAssetMessage(res)); return null; }
            if (res.registry) applyRegistry(res.registry);
            // Character source changes alter the asset-config consumed by every
            // saved beat that still references its prior library GLB.
            if (operation === 'unbind_model' || operation === 'character_design' || operation === 'series_cast_link' || operation === 'series_cast_sync') dispatchBeatAssetChanged(shortVideoId, '');
            setNotice(operation === 'open' ? `Đã mở ${data.provider === 'claude' ? 'Claude' : 'DeepSeek'}. Lưu HTML trong overlay sau khi tạo xong.` : operation === 'enqueue' || operation === 'html' || operation === 'repair' ? sceneAssetMessage(res) : 'Đã lưu.');
            return res;
        } catch (e) { if (mounted.current) setError('Không kết nối được CMS.'); return null; }
        finally { if (mounted.current && currentVideo.current === shortVideoId) setBusy(''); }
    };

    /** Danh sách get chỉ trả hash, nên HTML phải nạp riêng khi mở dialog sửa hồ sơ. */
    const loadProfileHtml = async (assetId: string) => {
        const request = ++profileHtmlRequest.current;
        setProfileHtmlState('loading'); setProfileHtmlError('');
        try {
            const res = await sceneAssetsRequest(shortVideoId, 'preview', {asset_id: assetId});
            if (request !== profileHtmlRequest.current || !mounted.current) return;
            if (!res.success || !res.asset) throw new Error(sceneAssetMessage(res));
            const html = res.asset.html || '';
            setProfileHtml(html); setProfileHtmlBase(html); setProfileMaterialPreview(res.asset.preview_html || ''); setProfileHtmlState('ready');
            // Preview là bản mới nhất; lưu HTML phải dùng đúng hash này.
            profileSpecHash.current = res.asset.spec_hash || profileSpecHash.current;
        } catch (e) {
            if (request === profileHtmlRequest.current && mounted.current) {
                setProfileHtmlState('error');
                setProfileHtmlError(e instanceof Error ? e.message : 'Không tải được HTML đang lưu.');
            }
        }
    };
    const openProfile = (asset: SceneAsset) => {
        profileSpecHash.current = asset.spec_hash || '';
        setProfile({...asset}); setProfileMaterialPreview(''); setProfileHtml(''); setProfileHtmlBase('');
        setProfileHtmlError(''); setProfilePreview(false); setError('');
        setProfileHtmlState(asset.model_snapshot ? 'idle' : 'loading');
        if (!asset.model_snapshot) void loadProfileHtml(asset.id);
    };
    const closeProfile = () => { ++profileHtmlRequest.current; setProfile(null); setProfilePreview(false); };
    /** Lưu đặc tả trước (đổi spec_hash), rồi lưu HTML với hash vừa cập nhật. */
    const saveProfile = async () => {
        if (!profile || busy) return;
        const htmlChanged = !profile.model_snapshot && profileHtml !== profileHtmlBase;
        const issue = htmlChanged ? assetHtmlIssue(profileHtml) : '';
        if (issue) { setError(issue); return; }
        // Dùng registry mới nhất (poll cập nhật) để giữ thay đổi của phiên khác và revision khớp server.
        const base = registry;
        const saved = base.assets?.[profile.id];
        const specChanged = !saved || profile.name !== saved.name || profile.spec !== saved.spec;
        if (!specChanged && !htmlChanged) { closeProfile(); return; }
        let done = '';
        let specHash = profileSpecHash.current;
        if (specChanged) {
            const next = {...base, assets: {...base.assets, [profile.id]: profile}};
            const res = await run('profile', 'manifest', {text: sceneAssetsManifest(next), expected_revision: base.revision || ''});
            if (!res) return;
            specHash = res.registry?.assets?.[profile.id]?.spec_hash || specHash;
            profileSpecHash.current = specHash;
            done = 'Đã lưu hồ sơ';
        }
        if (htmlChanged) {
            const res = await run('profile-html', 'html', {asset_id: profile.id, spec_hash: specHash, text: profileHtml});
            if (!res) return;
            setProfileHtmlBase(profileHtml);
            // Server đưa HTML thủ công vào queue: chạy preview, tự sửa nếu lỗi, chỉ lưu bản đạt.
            done = (done ? done + ' · ' : '') + sceneAssetMessage(res);
        }
        setNotice(done || 'Đã lưu.');
        closeProfile();
    };
    const profileHtmlIssue = React.useMemo(() => profileHtml !== profileHtmlBase ? assetHtmlIssue(profileHtml) : '', [profileHtml, profileHtmlBase]);
    const profileSaved = profile ? registry.assets?.[profile.id] : undefined;
    const profileDirty = Boolean(profile && (
        (profileSaved !== undefined && (profile.name !== profileSaved.name || profile.spec !== profileSaved.spec))
        || (!profile.model_snapshot && profileHtml !== profileHtmlBase)
    ));
    /** HTML có thể dài; đóng nhầm không được xoá mất phần đang sửa. */
    const requestCloseProfile = () => {
        if (busy) return;
        if (profileDirty && !window.confirm('Bỏ thay đổi chưa lưu của hồ sơ này?')) return;
        closeProfile();
    };

    const copyAssetPrompt = async (asset: SceneAsset) => {
        if (busy || loading) return;
        setBusy('copy:'+asset.id); setError(''); setNotice('');
        try {
            const res = await sceneAssetsRequest(shortVideoId, 'prompt', {asset_id:asset.id,provider});
            if (!mounted.current || currentVideo.current !== shortVideoId) return;
            if (!res.success || !res.prompt?.trim()) throw new Error(sceneAssetMessage(res));
            if (!await writePromptTextToClipboard(res.prompt)) throw new Error('Không copy được prompt vào clipboard.');
            if (mounted.current && currentVideo.current === shortVideoId) setNotice('Đã copy prompt · '+asset.name);
        } catch(e) {
            if (mounted.current && currentVideo.current === shortVideoId) setError(e instanceof Error ? e.message : 'Không copy được prompt.');
        } finally {
            if (mounted.current && currentVideo.current === shortVideoId) setBusy('');
        }
    };
    const assets = Object.values(registry.assets || {});
    const environments = assets.filter(a => a.kind === 'environment');
    const characters = assets.filter(a => a.kind === 'character');
    const working = draft || registry;
    const locked = Boolean(busy) || loading;
    const openCastPick = async (asset: SceneAsset) => {
        setError(''); setCastPick(asset); setCastList(null);
        try {
            const res = await seriesCastRequest('list');
            if (!res.success) throw new Error(seriesCastMessage(res));
            setCastList(res.cast || []);
        } catch (e) { setCastPick(null); setError(e instanceof Error ? e.message : 'Không tải được dàn nhân vật cố định.'); }
    };
    const promoteToCast = async () => {
        if (!promote || busy) return;
        setBusy('promote:' + promote.asset.id); setError(''); setNotice('');
        try {
            const res = await seriesCastRequest('promote', {short_video_id: shortVideoId, asset_id: promote.asset.id, id: promote.id, name: promote.name});
            if (!res.success) throw new Error(seriesCastMessage(res));
            const registry = (res as {registry?: SceneAssetRegistry}).registry;
            if (registry) applyRegistry(registry);
            setNotice(`Đã thêm ${promote.name} vào dàn nhân vật cố định và gắn vai này.`); setPromote(null);
        } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được vào dàn cố định.'); }
        finally { setBusy(''); }
    };
    /** Linked roles are edited on the cast member, then this video syncs to the new design. */
    const saveCastDesign = async (asset: SceneAsset, design: unknown): Promise<boolean> => {
        const castId = asset.series_cast?.id || '';
        const got = await seriesCastRequest('get', {id: castId});
        if (!got.success || !got.member) { setError(seriesCastMessage(got)); return false; }
        const m = got.member;
        const saved = await seriesCastRequest('save', {id: m.id, name: m.name, profile: m.profile, sort: m.sort, expected_revision: m.revision, design});
        if (!saved.success) { setError(seriesCastMessage(saved)); return false; }
        return !!(await run('cast-sync:' + asset.id, 'series_cast_sync', {asset_id: asset.id, expected_module_hash: asset.module_hash || '', expected_spec_hash: asset.spec_hash}));
    };
    const patchBeat = (id: string, patch: Record<string, unknown>) => setDraft(prev => {
        const base = prev || registry;
        const current = base.beats?.[id];
        if (!current) return prev;
        return {...base, beats: {...base.beats, [id]: {...current, ...patch}}};
    });
    return <Stack spacing={1.25} sx={{mt: 1.5}} aria-busy={loading}>
        <ShortVideoModel3dManageDrawer open={libraryOpen} onClose={()=>setLibraryOpen(false)}/>
        <Model3dLibraryPickerDrawer open={!!pickAsset || addingModel} onClose={()=>{setPickAsset(null);setAddingModel(false);}} models={models} loading={modelsLoading} kind="person" title="Chọn nhân vật cartoon đã lưu" onPick={modelId=>{if(pickAsset) void run('bind:'+pickAsset.id,'bind_model',{asset_id:pickAsset.id,model_id:modelId}); else if(addingModel) void run('add-model','add_model',{model_id:modelId});}}/>
        <Stack direction="row" gap={1} flexWrap="wrap">
            <Button size="small" sx={compactButtonSx} variant="outlined" disabled={locked} onClick={()=>void pickCharacter(null)}>Thêm nhân vật thư viện</Button>
            <Button size="small" sx={compactButtonSx} onClick={()=>setLibraryOpen(true)}>Thư viện & trang phục</Button>
            <Button size="small" sx={compactButtonSx} disabled={locked} onClick={() => {setImportText(assets.length ? sceneAssetsManifest(registry) : ''); importRevision.current = registry.revision || ''; setImportOpen(true);}}>Nhập / sửa danh sách JSON</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">Bấm hình đại diện để xem preview; bấm biểu tượng bút để sửa hồ sơ và HTML trực tiếp. Chọn DeepSeek hoặc Claude bên dưới để tạo HTML qua queue.</Typography>
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
        {!loading && !assets.length && <Typography variant="body2" color="text.secondary">Mở DeepSeek hoặc Claude của bước này để lập danh sách. Lưu JSON trong headless hoặc nhập tại đây; mỗi nhân vật/bối cảnh sẽ hiện thành một dòng.</Typography>}
        {!loading && assets.length > 0 && <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
            <FormControl size="small" sx={{minWidth:155}}><InputLabel>Tạo HTML bằng</InputLabel><Select inputProps={{'aria-label':'Tạo HTML bằng'}} label="Tạo HTML bằng" value={provider} disabled={locked} onChange={e=>selectProvider(e.target.value as AssetProvider)}><MenuItem value="deepseek">DeepSeek</MenuItem><MenuItem value="claude">Claude</MenuItem></Select></FormControl>
            <Button size="small" sx={compactButtonSx} variant="contained" color="primary" startIcon={<PlayArrowIcon/>} disabled={locked} onClick={() => void run('queue-all', 'enqueue', {kind: 'all',provider})}>Tạo HTML còn thiếu</Button>
            <Button size="small" sx={compactButtonSx} variant="outlined" color="warning" startIcon={<ReplayIcon/>} disabled={locked || assets.some(a => ['queued', 'processing'].includes(a.generation?.status || ''))} onClick={() => setRegenerate(true)}>Tạo lại tất cả</Button>
        </Stack>}
        {!loading && (['character', 'environment'] as const).map(kind => {
            const isCharacter = kind === 'character';
            const color = isCharacter ? 'primary' as const : 'secondary' as const;
            const rows = assets.filter(a => a.kind === kind);
            const active = rows.filter(a => ['queued', 'processing'].includes(a.generation?.status || '')).length;
            const done = rows.filter(a => a.ready).length;
            return <Box component="section" aria-label={isCharacter ? 'Hồ sơ nhân vật' : 'Hồ sơ bối cảnh'} key={kind} sx={{border: '1px solid', borderColor: isCharacter ? 'primary.light' : 'secondary.light', borderRadius: 2, overflow: 'hidden'}}>
                <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{p: 1, bgcolor: isCharacter ? 'rgba(25,118,210,.07)' : 'rgba(156,39,176,.07)'}}>
                    {isCharacter ? <PersonOutlineIcon color="primary"/> : <CottageOutlinedIcon color="secondary"/>}
                    <Box sx={{flex: 1, minWidth: 160}}><Typography variant="subtitle1" fontWeight={700}>{isCharacter ? 'Nhân vật' : 'Bối cảnh'}</Typography><Typography variant="caption" color="text.secondary">{isCharacter ? 'Ngoại hình, rig và biểu cảm dùng chung' : 'Không gian, đồ vật cố định và vị trí staging'} · {done}/{rows.length} có HTML{active ? ` · ${active} đang chờ/chạy` : ''}</Typography></Box>
                    <Button size="small" sx={compactButtonSx} variant="contained" color={color} startIcon={<PlayArrowIcon/>} disabled={locked || !rows.some(a => !a.ready && !a.character_design && !['queued', 'processing'].includes(a.generation?.status || ''))} onClick={() => void run('queue:' + kind, 'enqueue', {kind,provider})}>{isCharacter ? 'Tạo nhân vật còn thiếu' : 'Tạo bối cảnh còn thiếu'}</Button>
                </Stack>
                <Stack spacing={1} sx={{p: 1.25}}>
                    {!rows.length && <Typography variant="body2" color="text.secondary">Chưa có {isCharacter ? 'nhân vật' : 'bối cảnh'}.</Typography>}
                    {rows.map(asset => {
                        const generation = asset.generation;
                        const running = ['queued', 'processing'].includes(generation?.status || '');
                        const label = generation?.status === 'queued' ? 'Đang chờ queue' : generation?.status === 'processing' ? generation.phase === 'repairing' ? `Đang tự sửa (${generation.repair_attempt || 0}/3)` : 'Đang tạo / chạy kiểm tra…' : generation?.status === 'failed' ? 'Tạo HTML lỗi' : generation?.status === 'cancelled' ? 'Job queue đã dừng' : asset.model_snapshot ? 'Nhân vật thư viện' : asset.character_design ? (asset.ready ? 'Nhân vật thiết kế' : 'Cần cập nhật thiết kế') : asset.ready ? 'Đã có HTML' : asset.has_html ? 'Cần cập nhật' : 'Chưa có HTML';
                        return <Box key={asset.id} data-testid={'scene-asset-' + asset.id} sx={{p: 1, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: isCharacter ? 'primary.main' : 'secondary.main', borderRadius: 1.5, bgcolor: 'background.paper', contentVisibility: 'auto', containIntrinsicSize: 'auto 130px'}}>
                            <Stack gap={1} sx={{display:'grid',gridTemplateColumns:{xs:'68px minmax(0,1fr)',sm:'68px minmax(0,1fr) auto'},alignItems:'start'}}>
                                <Stack alignItems="center" spacing={.75} sx={{width:68,gridColumn:1,gridRow:{xs:'1 / span 2',sm:1}}}>
                                    <Box sx={{position:'relative',width:48,height:48}}>
                                        <Tooltip title="Xem preview"><IconButton aria-label={`Xem preview ${asset.name}`} onClick={()=>setPreview(asset)} sx={{width:48,height:48,bgcolor:'action.hover',borderRadius:isCharacter?'50%':1.5}}>
                                            {asset.model_snapshot?.thumbnail_url?<Box component="img" src={asset.model_snapshot.thumbnail_url} alt="" sx={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>:isCharacter?<PersonOutlineIcon color="primary"/>:<CottageOutlinedIcon color="secondary"/>}
                                        </IconButton></Tooltip>
                                        <Tooltip title="Sửa hồ sơ"><IconButton size="small" aria-label={`Sửa hồ sơ ${asset.name}`} disabled={locked||running} onClick={()=>openProfile(asset)} sx={{position:'absolute',right:-4,bottom:-4,width:22,height:22,bgcolor:'background.paper',border:'1px solid',borderColor:'divider','&:hover':{bgcolor:'action.selected'}}}><EditOutlinedIcon sx={{fontSize:14}}/></IconButton></Tooltip>
                                    </Box>
                                    {asset.model_snapshot&&<Button size="small" sx={{...compactButtonSx,px:.5,fontSize:11}} variant="outlined" disabled={locked} onClick={()=>{setError('');setWardrobeAsset(asset);setWardrobeConfig(JSON.parse(JSON.stringify(asset.model_snapshot?.character||{})));}}>Trang phục</Button>}
                                </Stack>
                                <Box sx={{minWidth:0,gridColumn:2,gridRow:1}}>
                                    <Stack direction="row" alignItems="center" gap={.75} flexWrap="wrap">
                                        {asset.chat_url?<Button size="small" variant="text" disabled={locked||running} onClick={()=>void run('chat:'+asset.id,'open',{asset_id:asset.id,mode:'reopen',provider:asset.chat_url?.includes('claude.ai')?'claude':'deepseek'})} sx={{minWidth:0,p:0,color:'primary.main',fontSize:14,fontWeight:700,textAlign:'left',textTransform:'none',overflowWrap:'anywhere'}}>{asset.name}</Button>:<Typography variant="body2" fontWeight={700} sx={{overflowWrap:'anywhere'}}>{asset.name}</Typography>}
                                        <Typography variant="caption" color="text.secondary" sx={{fontFamily:'monospace'}}>{asset.id}{generation?.job_id ? ` · Job #${generation.job_id}` : ''}</Typography>
                                    </Stack>
                                    {isCharacter&&<Stack direction="row" gap={.75} flexWrap="wrap" alignItems="center" sx={{mt:.75}}>
                                        <Tooltip describeChild title={asset.series_cast?'Sửa nhân vật cố định (áp dụng cho mọi video đã gắn)':'Phối ngoại hình bằng bộ Thiết kế'}><span><Button size="small" sx={compactButtonSx} variant="contained" disabled={locked||running} onClick={()=>setDesignAsset(asset)}>Thiết kế</Button></span></Tooltip>
                                        {!asset.model_snapshot&&<Tooltip describeChild title="Gắn hoặc lưu vào dàn nhân vật dùng lại qua nhiều video"><span><Button size="small" sx={compactButtonSx} variant="outlined" disabled={locked||running} onClick={()=>void openCastPick(asset)}>Dàn cố định</Button></span></Tooltip>}
                                        <Tooltip describeChild title="Dùng nhân vật GLB từ thư viện 3D"><span><Button size="small" sx={compactButtonSx} variant="text" disabled={locked||running} onClick={()=>void pickCharacter(asset)}>GLB</Button></span></Tooltip>
                                    </Stack>}
                                    {asset.series_cast&&<Stack direction="row" gap={.75} alignItems="center" flexWrap="wrap" sx={{mt:.5}}>
                                        <Chip size="small" color="secondary" variant="outlined" label={`Dàn cố định: ${asset.series_cast.latest_name||asset.series_cast.name}`}/>
                                        {asset.series_cast.exists===false&&<Chip size="small" color="error" label="Nhân vật cố định đã bị xoá"/>}
                                        {asset.series_cast.stale&&<><Chip size="small" color="warning" label="Có bản thiết kế mới"/>
                                            <Button size="small" sx={compactButtonSx} variant="contained" color="warning" disabled={locked||running} onClick={()=>void run('cast-sync:'+asset.id,'series_cast_sync',{asset_id:asset.id,expected_module_hash:asset.module_hash||'',expected_spec_hash:asset.spec_hash})}>Đồng bộ</Button></>}
                                    </Stack>}
                                    {!asset.model_snapshot&&!asset.character_design&&<Stack direction="row" gap={.75} flexWrap="wrap" alignItems="center" sx={{mt:1}}>
                                        {(['deepseek','claude'] as const).map(target=><Button key={target} size="small" sx={compactButtonSx} variant="outlined" startIcon={<img src={`${process.env.PUBLIC_URL||''}/images/workflow/${target}.svg`} width={18} height={18} alt=""/>} disabled={locked||running} onClick={()=>void run(asset.id,'open',{asset_id:asset.id,provider:target})}>{target==='claude'?'Claude':'DeepSeek'}</Button>)}
                                    </Stack>}
                                </Box>
                                <Stack alignItems="flex-end" spacing={.75} sx={{minWidth:0,gridColumn:{xs:2,sm:3},gridRow:{xs:2,sm:1},alignItems:{xs:'flex-start',sm:'flex-end'}}}>
                                    <Chip size="small" sx={{maxWidth:'100%'}} color={running?'info':generation?.status==='failed'?'error':asset.ready?'success':'warning'} label={generation?.provider&&!asset.model_snapshot?`${generation.provider==='claude'?'Claude':'DeepSeek'} · ${label}`:label}/>
                                    {asset.model_snapshot&&<Button size="small" sx={compactButtonSx} variant="outlined" disabled={locked} onClick={()=>setSwitchHtml(asset)}>Dùng HTML</Button>}
                                    {!asset.model_snapshot&&!asset.character_design&&<Button size="small" sx={compactButtonSx} variant="outlined" startIcon={<PlayArrowIcon/>} disabled={locked||running} onClick={()=>void run('queue:'+asset.id,'enqueue',{asset_id:asset.id,force:true,provider})}>Tạo</Button>}
                                    {!asset.model_snapshot&&!asset.character_design&&<Button size="small" sx={compactButtonSx} startIcon={busy==='copy:'+asset.id?<CircularProgress size={12}/>:<ContentCopyIcon/>} disabled={locked} onClick={()=>void copyAssetPrompt(asset)}>Copy prompt</Button>}
                                </Stack>
                            </Stack>
                            {generation?.error && ['failed', 'superseded', 'cancelled'].includes(generation.status) && <Alert severity={generation.status === 'failed' ? 'error' : 'info'} sx={{mt: 1}}>{generation.error}</Alert>}
                            {generation?.status === 'completed' && <Typography variant="caption" color="text.secondary">{generation.preview_checked ? 'Đã chạy preview và lưu HTML' : 'HTML cũ chưa kiểm tra preview đầy đủ'}{generation.repair_attempt ? ` · ${generation.repair_attempt} lần tự sửa` : ''}{generation.continue_clicks ? ` · ${generation.continue_clicks} lần Continue` : ''}</Typography>}
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
        <Dialog open={regenerate} onClose={() => !busy && setRegenerate(false)}><DialogTitle>Tạo lại toàn bộ HTML hồ sơ?</DialogTitle><DialogContent>{providerLabel} sẽ tạo lại các nhân vật và bối cảnh qua queue. Bản HTML hiện tại chỉ được thay khi bản mới đã hoàn chỉnh, kiểm tra chạy được và lưu đúng vào DB. Các beat dùng phiên bản cũ sẽ được báo cần dựng lại.</DialogContent><DialogActions><Button onClick={() => setRegenerate(false)}>Hủy</Button><Button variant="contained" color="warning" disabled={Boolean(busy)} onClick={async () => {if (await run('queue-all', 'enqueue', {kind: 'all', force: true, provider})) setRegenerate(false);}}>Tạo lại tất cả</Button></DialogActions></Dialog>
        <Dialog open={importOpen} onClose={() => !busy && setImportOpen(false)} fullWidth maxWidth="md"><DialogTitle>Danh sách nhân vật và bối cảnh</DialogTitle><DialogContent><Typography variant="body2" sx={{mb: 1}}>Dán JSON chatbot trả về. Giữ nguyên ID để bảo toàn HTML đã tạo. Thay đổi đặc tả sẽ yêu cầu tạo lại HTML tương ứng.</Typography><TextField fullWidth multiline minRows={12} value={importText} onChange={e => setImportText(e.target.value)} inputProps={{'aria-label': 'JSON hồ sơ'}}/></DialogContent><DialogActions><Button disabled={Boolean(busy)} onClick={() => setImportOpen(false)}>Đóng</Button><Button disabled={Boolean(busy) || !importText.trim()} onClick={async () => {if (await run('manifest', 'manifest', {text: importText, expected_revision: importRevision.current})) {setImportOpen(false); setDraft(null);}}}>Lưu danh sách</Button></DialogActions></Dialog>
        <Dialog open={Boolean(profile)} onClose={() => !busy && requestCloseProfile()} fullWidth maxWidth="md">
            <DialogTitle>Sửa hồ sơ · {profile?.id}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" onClose={() => setError('')} sx={{mb: 2}}>{error}</Alert>}
                {profile?.character_design ? <Alert severity="info" sx={{mb:2}}>Đổi đặc tả sẽ yêu cầu mở “Thiết kế” và lưu lại nhân vật. Những beat đã dùng vai này cần dựng lại.</Alert> : <Alert severity="info" sx={{mb: 2}}>Đổi đặc tả sẽ yêu cầu tạo lại HTML hồ sơ. Sửa HTML trực tiếp sẽ đưa bản mới vào queue: chạy preview trong trình duyệt, tự sửa nếu lỗi và chỉ lưu bản kiểm tra đạt. Những beat đã dùng hồ sơ này sẽ được báo cần dựng lại.</Alert>}
                <TextField fullWidth label="Tên hiển thị" value={profile?.name || ''} onChange={e => setProfile(p => p ? {...p, name: e.target.value} : p)} disabled={Boolean(busy)} sx={{mb: 2}}/>
                <TextField fullWidth multiline minRows={8} label="Đặc tả cố định" value={profile?.spec || ''} onChange={e => setProfile(p => p ? {...p, spec: e.target.value} : p)} disabled={Boolean(busy)}/>
                {profile?.character_design ? <Alert severity="info" sx={{mt:2}}>Nhân vật này dùng bộ asset default. Đóng hồ sơ và bấm “Thiết kế” để chỉnh ngoại hình.</Alert> : profile?.model_snapshot
                    ? <Alert severity="info" sx={{mt: 2}}>Nhân vật thư viện dùng HTML sinh tự động từ GLB nên không sửa HTML tại đây. Chỉnh ngoại hình trong “Trang phục”, hoặc bấm “Dùng HTML” ở dòng hồ sơ để quay lại HTML tự tạo.</Alert>
                    : <Box sx={{mt: 2}}>
                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{mb: 1}}>
                            <Typography variant="subtitle2">HTML hồ sơ</Typography>
                            <Chip size="small" variant="outlined" color={profileHtml !== profileHtmlBase ? 'warning' : 'default'} label={
                                profileHtmlState === 'loading' ? 'Đang tải HTML'
                                    : profileHtmlState === 'error' ? 'Không tải được HTML đang lưu'
                                    : profileHtml !== profileHtmlBase ? 'Có thay đổi chưa lưu'
                                    : profileHtmlBase ? 'Đang dùng bản đã lưu' : 'Chưa có HTML'}/>
                            <Box sx={{flex: 1}}/>
                            <Button size="small" sx={compactButtonSx} variant="outlined" disabled={Boolean(busy) || profileHtmlState === 'loading' || !profile} onClick={() => {
                                if (!profile) return;
                                if (profileHtml !== profileHtmlBase && !window.confirm('Bỏ HTML đang sửa và tải lại bản đã lưu?')) return;
                                void loadProfileHtml(profile.id);
                            }}>Tải lại HTML</Button>
                            <Button size="small" sx={compactButtonSx} disabled={Boolean(busy) || !profileHtml.trim()} aria-expanded={profilePreview} onClick={() => setProfilePreview(value => !value)}>{profilePreview ? 'Ẩn xem trước' : 'Xem trước'}</Button>
                        </Stack>
                        {profileHtmlState === 'loading' && <LinearProgress sx={{mb: 1, borderRadius: 1}}/>}
                        {profileHtmlError && <Alert severity="warning" sx={{mb: 1}}>{profileHtmlError} Bạn vẫn có thể dán HTML mới rồi lưu.</Alert>}
                        <TextField fullWidth multiline minRows={14} label="HTML preview (doctype + sv-asset-module)" value={profileHtml} disabled={Boolean(busy) || profileHtmlState === 'loading'}
                            onChange={e => setProfileHtml(e.target.value)}
                            error={Boolean(profileHtmlIssue)}
                            helperText={profileHtmlIssue || `${profileHtml.length.toLocaleString('vi-VN')} ký tự · “Lưu hồ sơ” sẽ chạy preview qua queue trước khi ghi đè bản đang lưu`}
                            inputProps={{'aria-label': 'HTML hồ sơ', spellCheck: false, style: {fontFamily: 'monospace', fontSize: 12, lineHeight: 1.45}}}/>
                        {profilePreview && profileHtml.trim() && <Box sx={{mt: 1.5}}>
                            {profileHtmlIssue ? <Alert severity="warning">Sửa lỗi cấu trúc ở trên trước khi xem trước.</Alert>
                                : <SceneAssetHtmlPreview html={profileHtml === profileHtmlBase && profileMaterialPreview ? profileMaterialPreview : profileHtml} title={`Xem trước ${profile?.name || ''}`} kind={profile?.kind} height="45vh"/>}
                        </Box>}
                    </Box>}
            </DialogContent>
            <DialogActions>
                <Button disabled={Boolean(busy)} onClick={requestCloseProfile}>Đóng</Button>
                <Button variant="contained" disabled={Boolean(busy) || profileHtmlState === 'loading' || !profile?.name.trim() || !profile?.spec.trim() || Boolean(profileHtmlIssue)} onClick={() => void saveProfile()}>Lưu hồ sơ</Button>
            </DialogActions>
        </Dialog>
        {designAsset && (designAsset.series_cast?.exists !== false && designAsset.series_cast
            ? <CharacterDesignDialog key={`cast:${shortVideoId}:${designAsset.id}`} shortVideoId={shortVideoId} asset={{id: designAsset.id, name: designAsset.series_cast.latest_name || designAsset.series_cast.name}} busy={!!busy}
                title="Thiết kế nhân vật cố định"
                replacingNote="Vai này thuộc dàn nhân vật cố định: lưu sẽ cập nhật nhân vật cho mọi video và đồng bộ ngay video này. Video khác sẽ báo “Có bản thiết kế mới”. Muốn chỉ đổi riêng video này, bấm “Dàn cố định” → Bỏ gắn rồi Thiết kế."
                loadDesigner={async()=>{const res=await seriesCastRequest('designer',{id:designAsset.series_cast?.id});if(!res.success||!res.designer)throw new Error(seriesCastMessage(res));return res.designer;}}
                onClose={()=>setDesignAsset(null)} onSave={async data=>saveCastDesign(designAsset, data.design)}/>
            : <CharacterDesignDialog key={`${shortVideoId}:${designAsset.id}`} shortVideoId={shortVideoId} asset={designAsset} busy={!!busy}
                onClose={()=>setDesignAsset(null)} onSave={async data=>!!(await run('design:'+designAsset.id, 'character_design', data))}/>)}
        <Dialog open={!!castPick} onClose={()=>!busy&&setCastPick(null)} fullWidth maxWidth="sm">
            <DialogTitle>Gắn dàn nhân vật cố định · {castPick?.name}</DialogTitle>
            <DialogContent>
                {castPick?.character_design&&!castPick.series_cast&&<Alert severity="success" sx={{mb:2}} action={<Button color="inherit" size="small" disabled={!!busy} onClick={()=>{const asset=castPick;setCastPick(null);setPromote({asset,id:seriesCastSuggestId(asset.name)||asset.id,name:asset.name});}}>Lưu vai này</Button>}>Vai này đã có thiết kế đẹp? Lưu thành nhân vật cố định để dùng lại ở video sau.</Alert>}
                <Typography variant="body2" sx={{mb:1.5}}>Hoặc chọn một nhân vật cố định cho vai này. Khi nhân vật cố định được sửa, video sẽ báo “Có bản thiết kế mới” để đồng bộ; beat đã dựng dùng vai này cần dựng lại.</Typography>
                {castList===null?<Box sx={{display:'grid',placeItems:'center',py:4}}><CircularProgress size={24}/></Box>
                    :castList.length===0?<Alert severity="info">Chưa có nhân vật cố định nào. Tạo mới ở nút “Dàn nhân vật cố định” trên trang Short Video{castPick?.character_design&&!castPick.series_cast?', hoặc bấm “Lưu vai này” ở trên':''}.</Alert>
                    :<Stack spacing={1}>{castList.map(member=><Button key={member.id} variant={castPick?.series_cast?.id===member.id?'contained':'outlined'} disabled={!!busy}
                        sx={{justifyContent:'flex-start',textTransform:'none',textAlign:'left'}}
                        onClick={async()=>{if(castPick&&await run('cast:'+castPick.id,'series_cast_link',{asset_id:castPick.id,cast_id:member.id,expected_module_hash:castPick.module_hash||'',expected_spec_hash:castPick.spec_hash}))setCastPick(null);}}>
                        <Box><Typography variant="body2" fontWeight={700}>{member.name} <Typography component="span" variant="caption">· {member.id} · {member.design?.selections?.gender==='male'?'Nam':'Nữ'}</Typography></Typography>
                        {member.profile.role&&<Typography variant="caption" component="div">{member.profile.role}</Typography>}</Box>
                    </Button>)}</Stack>}
            </DialogContent>
            <DialogActions>
                {castPick?.series_cast&&<Button color="warning" disabled={!!busy} onClick={async()=>{if(castPick&&await run('cast-unlink:'+castPick.id,'series_cast_unlink',{asset_id:castPick.id}))setCastPick(null);}}>Bỏ gắn (giữ ngoại hình hiện tại)</Button>}
                <Button disabled={!!busy} onClick={()=>setCastPick(null)}>Đóng</Button>
            </DialogActions>
        </Dialog>
        <Dialog open={!!promote} onClose={()=>!busy&&setPromote(null)} fullWidth maxWidth="xs">
            <DialogTitle>Lưu vào dàn nhân vật cố định</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{mb:2}}>Thiết kế hiện tại của vai này trở thành nhân vật cố định dùng cho video sau. Chỉ lưu nhân vật đã đẹp và đã kiểm tra toàn thân, cận mặt, biểu cảm.</Typography>
                {promote&&<Stack spacing={2}>
                    <TextField size="small" label="Tên nhân vật" value={promote.name} onChange={e=>setPromote({...promote,name:e.target.value})}/>
                    <TextField size="small" label="ID" helperText="Chữ thường, số, gạch dưới; dùng làm asset id ở video sau." value={promote.id} onChange={e=>setPromote({...promote,id:e.target.value.toLowerCase()})}/>
                </Stack>}
            </DialogContent>
            <DialogActions><Button disabled={!!busy} onClick={()=>setPromote(null)}>Hủy</Button><Button variant="contained" disabled={!!busy||!promote?.name.trim()||!/^[a-z][a-z0-9_]{1,40}$/.test(promote?.id||'')} onClick={()=>void promoteToCast()}>{busy.startsWith('promote:')?'Đang lưu…':'Lưu'}</Button></DialogActions>
        </Dialog>
        <SceneAssetPreviewDialog shortVideoId={shortVideoId} asset={preview} defaultProvider={provider} onClose={() => setPreview(null)} onRegistryChange={applyRegistry} previewTitle={`Preview ${preview?.name || ''}`}/>
    </Stack>;
}
