import React from 'react';
import {Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    DRESS_ITEMS, DressItem, LibraryMaterial, PixelFxEffect, VisualLibraryData,
    dressPreviewDocument, dressWorkerDocument, fetchSource, loadVisualLibrary, materialPreviewDocument, materialRuntimeSource,
    pixelFxPreviewDocument, pixelFxWorkerDocument, readThumb, textFingerprint, threeRuntimeSource, writeThumb,
} from 'helpers/visualLibrary';

type Kind = 'dress' | 'pixelfx' | 'material';
type Card = {kind: Kind; id: string; name: string; group: string; thumb: string; dark?: boolean; search: string; dress?: DressItem; effect?: PixelFxEffect; material?: LibraryMaterial};

type ThumbKind = 'dress' | 'pixelfx';
/** Ảnh thu nhỏ đã có trong phiên (bản lâu dài nằm trong IndexedDB): mở lại ngăn kéo không phải dựng lại. */
const thumbCache: Record<ThumbKind, Record<string, string>> = {dress: {}, pixelfx: {}};
const isThumbKind = (k: Kind): k is ThumbKind => k === 'dress' || k === 'pixelfx';

const TABS: Array<{kind: Kind; label: string; hint: string}> = [
    {kind: 'dress', label: 'Đồ vật 3D', hint: 'Bộ đồ vật dựng sẵn THREE.SVDress cho bối cảnh và beat: nội thất, bếp, điện tử, đèn, kiến trúc, đồ mềm, đồ ăn, dụng cụ, đường phố, xe, cây cỏ. Chất liệu (vân gỗ, vải dệt, kim loại, đá, da, cao su…) sinh bằng code, không tải file. Vật ngoài danh sách do agent tự dựng trong từng bối cảnh.'},
    {kind: 'pixelfx', label: 'Hiệu ứng pixel', hint: 'Hiệu ứng pixel art THREE.SVPixelFx trên thẻ 2D luôn quay về máy quay: dùng cho bối cảnh sống (lửa, nước, chim, bướm) và hành động trong beat.'},
    {kind: 'material', label: 'Vật liệu', hint: 'Gói texture PBR ambientCG (CC0) đã tải về máy chủ cho bề mặt bối cảnh. Gói mới được tải thêm khi một bối cảnh cần loại bề mặt chưa có.'},
];

function Detail({card, unit, onClose}: {card: Card | null; unit: number; onClose: () => void}) {
    const [previewHtml, setPreviewHtml] = React.useState(''), [error, setError] = React.useState('');
    const [state, setState] = React.useState(''), [states, setStates] = React.useState<string[]>([]), frame = React.useRef<HTMLIFrameElement | null>(null);
    React.useEffect(() => { setState(''); setStates([]); }, [card]);
    React.useEffect(() => {
        const receive = (event: MessageEvent) => { const m = event.data; if (!m || m.type !== 'sv-preview-states' || event.source !== frame.current?.contentWindow) return; setStates(Array.isArray(m.states) ? m.states.filter((x: unknown) => typeof x === 'string') : []); if (typeof m.current === 'string') setState((cur) => cur || m.current); };
        window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
    }, []);
    React.useEffect(() => {
        setPreviewHtml(''); setError('');
        if (!card) return;
        let active = true;
        (async () => {
            const runtime = await threeRuntimeSource();
            if (card.dress) return dressPreviewDocument(runtime, card.dress, state || undefined);
            if (card.effect) return pixelFxPreviewDocument(runtime, card.effect, unit);
            if (card.material) return materialPreviewDocument(runtime, await materialRuntimeSource(), await fetchSource(card.material.file), card.material);
            return '';
        })().then((html) => { if (active) setPreviewHtml(html); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không mở được bản xem trước.'); });
        return () => { active = false; };
    }, [card, unit, state]);
    const effect = card?.effect, material = card?.material, dress = card?.dress;
    const usage = dress ? `var D = THREE.SVDress.create({seed: <số>, prefix: '<bối cảnh>'});\nvar obj = ${dress.call};\nroot.add(D.place(obj, x, 0, z, ry));${states.length ? `\nD.setState(obj, '${state || states[0]}');   // trạng thái: ${states.join(' | ')}` : ''}\nfunction update(t, state) { D.animate(t, state.wind); }`
        : effect ? `const PX = THREE.SVPixelFx.create({scene, seed: <số>});\nPX.add('${effect.id}', ${effect.screen ? '{start: 0, end: <giây>}' : effect.loop ? '{at: [x, y, z], scale: 1}' : '{at: [x, y, z], hit: <giây sự kiện>, scale: 1}'});\nfunction stage(t) { PX.update(t); }`
            : material ? `Bối cảnh shared: scene_assets → material_catalog / material_search, gán ${material.assetId} cho một slot vật liệu.` : '';
    return <Dialog open={!!card} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{card?.name}<Typography component="span" variant="body2" sx={{ml: 1, color: 'inherit', opacity: 0.75}}>{card?.group}</Typography></DialogTitle>
        <DialogContent dividers>
            <Stack spacing={1.5}>
                {error && <Alert severity="error">{error}</Alert>}
                <Box sx={{height: 420, borderRadius: 1, overflow: 'hidden', bgcolor: card?.dark ? '#15131d' : '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {previewHtml ? <iframe ref={frame} title={`Xem trước ${card?.name || ''}`} sandbox="allow-scripts" srcDoc={previewHtml} style={{width: '100%', height: '100%', border: 0, display: 'block'}}/> : !error && <CircularProgress size={28}/>}
                </Box>
                {states.length > 0 && <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={600}>Trạng thái:</Typography>
                    {states.map((name) => <Chip key={name} size="small" label={name} color={name === state ? 'primary' : 'default'} variant={name === state ? 'filled' : 'outlined'} onClick={() => setState(name)}/>)}
                </Stack>}
                {(dress || material) && <Typography variant="caption" sx={{color: 'text.secondary'}}>Kéo để xoay, lăn chuột để phóng to hoặc thu nhỏ.</Typography>}
                {effect?.desc && <Typography variant="body2">{effect.desc}</Typography>}
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {dress && <Chip size="small" label={dress.call}/>}
                    {effect && <>
                        <Chip size="small" color="primary" label={effect.id}/>
                        <Chip size="small" label={effect.loop ? 'Lặp liên tục' : `Một lần · ${effect.duration} s`}/>
                        {!effect.loop && !!effect.impact && <Chip size="small" label={`Mốc sự kiện ${effect.impact} s`}/>}
                        <Chip size="small" label={`${effect.size[0]}×${effect.size[1]} px`}/>
                        {effect.metres && <Chip size="small" label={`${effect.metres[0]} × ${effect.metres[1]} m`}/>}
                        {effect.screen && <Chip size="small" color="info" label="Phủ toàn khung hình"/>}
                        {effect.actor && <Chip size="small" color="warning" label="Có hình người mẫu"/>}
                        {effect.simulated && <Chip size="small" variant="outlined" label="Mô phỏng hạt"/>}
                        {(effect.tags || []).map((tag) => <Chip key={tag} size="small" variant="outlined" label={tag}/>)}
                    </>}
                    {material && <>
                        <Chip size="small" color="primary" label={material.assetId}/>
                        <Chip size="small" label={material.license || 'Không rõ giấy phép'}/>
                        <Chip size="small" label={`${material.width}×${material.height} px`}/>
                        {!!material.dimensions?.width && <Chip size="small" label={`Ô lặp ${material.dimensions.width} × ${material.dimensions.height || material.dimensions.width} cm`}/>}
                        {material.maps.map((map) => <Chip key={map} size="small" variant="outlined" label={map}/>)}
                    </>}
                </Stack>
                {dress?.note && <Typography variant="body2"><b>Tham số:</b> {dress.note}</Typography>}
                {usage && <Box component="pre" sx={{m: 0, p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{usage}</Box>}
            </Stack>
        </DialogContent>
        <DialogActions>
            {material?.source && <Button href={material.source} target="_blank" rel="noopener noreferrer">Mở trên ambientCG</Button>}
            <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
    </Dialog>;
}

/** Một ô của lưới: chỉ khi ô đã vào khung nhìn mới gắn ảnh và mới xin dựng ảnh (ô ngoài khung nhìn chỉ là khung trống). */
function LibraryCard({card, onOpen, onVisible}: {card: Card; onOpen: (card: Card) => void; onVisible: (card: Card, visible: boolean) => void}) {
    const ref = React.useRef<HTMLDivElement | null>(null), [seen, setSeen] = React.useState(false);
    React.useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); onVisible(card, true); return undefined; }
        const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setSeen(true); onVisible(card, entry.isIntersecting); }, {rootMargin: '160px 0px'});
        io.observe(el);
        return () => { io.disconnect(); onVisible(card, false); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [card.kind, card.id, onVisible]);
    return <Box ref={ref} role="listitem">
        <Box component="button" type="button" onClick={() => onOpen(card)} title={card.id}
            sx={{all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'block', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.paper', transition: 'border-color .15s, box-shadow .15s', '&:hover, &:focus-visible': {borderColor: 'primary.main', boxShadow: 2}}}>
            <Box sx={{aspectRatio: card.kind === 'pixelfx' ? '132 / 96' : '1 / 1', bgcolor: card.dark ? '#15131d' : '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {seen && card.thumb
                    ? <Box component="img" src={card.thumb} alt="" decoding="async" sx={{width: '100%', height: '100%', objectFit: 'cover', display: 'block', imageRendering: card.kind === 'pixelfx' ? 'pixelated' : 'auto'}}/>
                    : seen ? <CircularProgress size={18} sx={{opacity: 0.5}}/> : null}
            </Box>
            <Box sx={{px: 1, py: 0.75}}>
                <Typography variant="body2" fontWeight={600} noWrap>{card.name}</Typography>
                <Typography variant="caption" noWrap sx={{display: 'block', color: 'text.secondary'}}>{card.group}</Typography>
            </Box>
        </Box>
    </Box>;
}

export default function VisualLibraryDrawer({open, onClose}: {open: boolean; onClose: () => void}) {
    const [tab, setTab] = React.useState<Kind>('dress'), [query, setQuery] = React.useState(''), [group, setGroup] = React.useState('all');
    const [data, setData] = React.useState<VisualLibraryData | null>(null), [error, setError] = React.useState(''), [selected, setSelected] = React.useState<Card | null>(null);
    const [runtime, setRuntime] = React.useState(''), [, setThumbTick] = React.useState(0), [workers, setWorkers] = React.useState<Record<ThumbKind, boolean>>({dress: false, pixelfx: false});
    const frames = React.useRef<Partial<Record<ThumbKind, HTMLIFrameElement | null>>>({});
    // Hàng đợi dựng ảnh: chỉ món đang thấy được gửi cho worker, mỗi lần một món.
    const visibleIds = React.useRef<Record<ThumbKind, Set<string>>>({dress: new Set(), pixelfx: new Set()});
    const requested = React.useRef<Record<ThumbKind, Set<string>>>({dress: new Set(), pixelfx: new Set()});
    const queue = React.useRef<Record<ThumbKind, string[]>>({dress: [], pixelfx: []});
    const busy = React.useRef<Record<ThumbKind, string | null>>({dress: null, pixelfx: null});
    const ready = React.useRef<Record<ThumbKind, boolean>>({dress: false, pixelfx: false});
    const callOf = React.useMemo(() => new Map(DRESS_ITEMS.map((item) => [item.id, item.call])), []);
    const fingerprint = React.useMemo(() => (runtime ? textFingerprint(runtime) : ''), [runtime]);
    const fpRef = React.useRef(''); fpRef.current = fingerprint;
    const keyOf = React.useCallback((kind: ThumbKind, id: string) => `${kind}|${fpRef.current}|${id}${kind === 'dress' ? '|' + textFingerprint(callOf.get(id) || '') : ''}`, [callOf]);

    React.useEffect(() => {
        if (!open) return;
        let active = true;
        if (!data) loadVisualLibrary().then((r) => { if (!active) return; if (!r.success) throw new Error(r.message || 'Không tải được thư viện.'); setData(r); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không tải được thư viện.'); });
        if (!runtime) threeRuntimeSource().then((source) => { if (active) setRuntime(source); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không tải được Three.js.'); });
        return () => { active = false; };
    }, [open, data, runtime]);

    // Ngăn kéo đóng thì iframe worker bị gỡ: xoá trạng thái hàng đợi, giữ ảnh đã có.
    React.useEffect(() => {
        if (open) return;
        (['dress', 'pixelfx'] as ThumbKind[]).forEach((k) => { visibleIds.current[k].clear(); requested.current[k].clear(); queue.current[k] = []; busy.current[k] = null; ready.current[k] = false; });
        setWorkers({dress: false, pixelfx: false});
    }, [open]);

    const pump = React.useCallback((kind: ThumbKind) => {
        const win = frames.current[kind]?.contentWindow;
        if (!ready.current[kind] || busy.current[kind] || !win) return;
        const q = queue.current[kind];
        for (;;) {
            const at = q.findIndex((id) => visibleIds.current[kind].has(id));
            if (at < 0) return;                           // chỉ dựng món đang trong khung nhìn
            const [id] = q.splice(at, 1);
            if (thumbCache[kind][id]) continue;
            busy.current[kind] = id;
            win.postMessage(kind === 'dress' ? {type: 'sv-thumb-request', id, call: callOf.get(id)} : {type: 'sv-thumb-request', id}, '*');
            return;
        }
    }, [callOf]);

    const request = React.useCallback((kind: ThumbKind, id: string) => {
        if (!fpRef.current || thumbCache[kind][id] || requested.current[kind].has(id)) { pump(kind); return; }
        requested.current[kind].add(id);
        void readThumb(keyOf(kind, id)).then((url) => {
            if (url) { thumbCache[kind][id] = url; setThumbTick((n) => n + 1); return; }
            queue.current[kind].push(id);
            setWorkers((w) => (w[kind] ? w : {...w, [kind]: true}));
            pump(kind);
        });
    }, [keyOf, pump]);

    const onVisible = React.useCallback((card: Card, isVisible: boolean) => {
        if (!isThumbKind(card.kind)) return;
        if (isVisible) { visibleIds.current[card.kind].add(card.id); request(card.kind, card.id); } else visibleIds.current[card.kind].delete(card.id);
    }, [request]);

    // Runtime vừa tải xong: xin ảnh cho các ô đã thấy trước đó.
    React.useEffect(() => { if (fingerprint) (['dress', 'pixelfx'] as ThumbKind[]).forEach((k) => visibleIds.current[k].forEach((id) => request(k, id))); }, [fingerprint, request]);

    React.useEffect(() => {
        if (!open) return undefined;
        const receive = (event: MessageEvent) => {
            const message = event.data, kind = message && message.kind;
            if (!message || (kind !== 'dress' && kind !== 'pixelfx') || event.source !== frames.current[kind as ThumbKind]?.contentWindow) return;
            const k = kind as ThumbKind;
            if (message.type === 'sv-thumb-ready') { ready.current[k] = true; pump(k); return; }
            if (message.type !== 'sv-library-thumbs' || message.id !== busy.current[k]) return;
            busy.current[k] = null;
            if (typeof message.url === 'string' && /^data:image\/(png|jpeg);base64,/.test(message.url)) { thumbCache[k][message.id] = message.url; void writeThumb(keyOf(k, message.id), message.url); setThumbTick((n) => n + 1); }
            pump(k);
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [open, pump, keyOf]);

    const dressWorker = React.useMemo(() => (open && runtime && workers.dress ? dressWorkerDocument(runtime) : ''), [open, runtime, workers.dress]);
    const pixelWorker = React.useMemo(() => (open && runtime && workers.pixelfx ? pixelFxWorkerDocument(runtime) : ''), [open, runtime, workers.pixelfx]);

    const cards: Card[] = tab === 'dress'
        ? DRESS_ITEMS.map((item) => ({kind: 'dress', id: item.id, name: item.name, group: item.group, thumb: thumbCache.dress[item.id] || '', dress: item, search: `${item.name} ${item.group} ${item.call}`.toLowerCase()}))
        : tab === 'pixelfx'
            ? (data?.pixelfx?.effects || []).map((effect) => ({kind: 'pixelfx', id: effect.id, name: effect.name, group: effect.category, thumb: thumbCache.pixelfx[effect.id] || '', dark: true, effect, search: `${effect.id} ${effect.name} ${effect.desc || ''} ${(effect.tags || []).join(' ')}`.toLowerCase()}))
            : (data?.materials || []).map((material) => ({kind: 'material', id: material.key, name: material.assetId, group: material.category, thumb: material.thumb, material, search: `${material.assetId} ${material.category}`.toLowerCase()}));
    const groups = Array.from(new Set(cards.map((card) => card.group)));
    const visible = cards.filter((card) => (group === 'all' || card.group === group) && card.search.includes(query.trim().toLowerCase()));
    const info = TABS.find((item) => item.kind === tab);
    const loading = tab !== 'dress' && !data && !error;

    return <DrawerCustom open={open} onClose={onClose} title="Thư viện hình ảnh" width={1100} activeOnClose>
        <Stack spacing={1.5}>
            <Typography variant="body2">Những hình có sẵn mà workflow video-html 3D (engine Three.js) dùng được khi dựng bối cảnh và beat. Bấm vào một hình để xem chi tiết.</Typography>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            <Tabs value={tab} onChange={(_, value: Kind) => { setTab(value); setGroup('all'); setQuery(''); }} aria-label="Loại thư viện hình ảnh">
                {TABS.map((item) => <Tab key={item.kind} value={item.kind} sx={{textTransform: 'none', fontWeight: 600}}
                    label={`${item.label} (${item.kind === 'dress' ? DRESS_ITEMS.length : item.kind === 'pixelfx' ? (data?.pixelfx?.effects.length ?? '…') : (data?.materials?.length ?? '…')})`}/>)}
            </Tabs>
            <Typography variant="caption" sx={{color: 'text.secondary'}}>{info?.hint}</Typography>
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} alignItems={{sm: 'center'}}>
                <TextField size="small" label="Tìm trong thư viện" value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: 1}}/>
                <TextField select size="small" label="Nhóm" value={group} onChange={(e) => setGroup(e.target.value)} sx={{minWidth: 200}}>
                    <MenuItem value="all">Tất cả nhóm</MenuItem>
                    {groups.map((name) => <MenuItem key={name} value={name}>{name} ({cards.filter((card) => card.group === name).length})</MenuItem>)}
                </TextField>
                <Chip label={`${visible.length} hình`}/>
            </Stack>
            {loading && <Stack alignItems="center" sx={{py: 4}}><CircularProgress size={28}/></Stack>}
            {!loading && !visible.length && <Typography variant="body2" sx={{py: 3, textAlign: 'center', color: 'text.secondary'}}>Không có hình nào khớp.</Typography>}
            <Box role="list" aria-label="Danh sách hình ảnh" sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 1.25}}>
                {visible.map((card) => <LibraryCard key={card.kind + card.id} card={card} onOpen={setSelected} onVisible={onVisible}/>)}
            </Box>
        </Stack>
        {/* worker ẩn dựng ảnh thu nhỏ bằng đúng runtime Three.js của beat, chỉ mount khi có ảnh chưa lưu cần dựng */}
        {dressWorker && <iframe ref={(node) => { frames.current.dress = node; }} title="Dựng ảnh thu nhỏ đồ vật" aria-hidden tabIndex={-1} sandbox="allow-scripts" srcDoc={dressWorker} style={{position: 'fixed', left: -4000, top: 0, width: 180, height: 180, border: 0}}/>}
        {pixelWorker && <iframe ref={(node) => { frames.current.pixelfx = node; }} title="Dựng ảnh thu nhỏ hiệu ứng pixel" aria-hidden tabIndex={-1} sandbox="allow-scripts" srcDoc={pixelWorker} style={{position: 'fixed', left: -4000, top: 0, width: 180, height: 180, border: 0}}/>}
        <Detail card={selected} unit={data?.pixelfx?.unit || 0.045} onClose={() => setSelected(null)}/>
    </DrawerCustom>;
}
