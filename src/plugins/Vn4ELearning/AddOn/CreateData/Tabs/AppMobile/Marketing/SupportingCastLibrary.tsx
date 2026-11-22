import React from 'react';
import {Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import type {CharacterDesignCatalog} from 'helpers/shortVideoSceneAssets';
import {readThumb, textFingerprint, writeThumb} from 'helpers/visualLibrary';
import {
    SOURCE_LABEL, SupportingCastGroup, SupportingCharacter, designerFactorySource, supportingCastGroupId, supportingCastMessage,
    supportingCastPreviewDocument, supportingCastRequest, supportingCastWorkerDocument,
} from 'helpers/supportingCast';
import CharacterDesignDialog from './AgentVideo/CharacterDesignDialog';

/** Ảnh thu nhỏ trong phiên, khoá theo mã + bản thiết kế (bản lâu dài nằm trong IndexedDB). */
const thumbCache: Record<string, string> = {};
const thumbKey = (c: SupportingCharacter) => `${c.code}|${c.design_revision}|${c.scale}`;

type InfoForm = {code: string; group: string; group_name: string; newGroup: boolean; name: string; note: string; scale: number; gender: 'male' | 'female'; from: string; expected_revision: string; isNew: boolean};

async function loadDesigner(code: string, gender: string, from: string): Promise<CharacterDesignCatalog> {
    const res = await supportingCastRequest('designer', code ? {code} : {gender, from});
    if (!res.success || !res.designer) throw new Error(supportingCastMessage(res));
    return res.designer;
}

function usage(code: string) {
    return `// Style Bình thường / Đầu tròn (một lần trong init):\nconst p = SVExtras.create('${code}', THREE, {}); scene.add(p.root);\n// mỗi frame: p.update(t, {action: 'walk', actionTime: t, emotion: 'neutral'}); đặt p.root.position / rotation\n\n// Style nhân vật THREE.SVCast (ink-toon, soft-clay…):\nconst p = SVExtras.cast(C, '${code}'); scene.add(p.root);\n\n// Visual của beat: EXTRAS: ${code}`;
}

function Card({c, thumb, onOpen, onVisible}: {c: SupportingCharacter; thumb: string; onOpen: (c: SupportingCharacter) => void; onVisible: (c: SupportingCharacter, v: boolean) => void}) {
    const ref = React.useRef<HTMLDivElement | null>(null), [seen, setSeen] = React.useState(false);
    React.useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); onVisible(c, true); return undefined; }
        const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setSeen(true); onVisible(c, entry.isIntersecting); }, {rootMargin: '160px 0px'});
        io.observe(el);
        return () => { io.disconnect(); onVisible(c, false); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c.code, c.design_revision, onVisible]);
    return <Box ref={ref} role="listitem">
        <Box component="button" type="button" onClick={() => onOpen(c)} title={c.code}
            sx={{all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'block', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.paper', opacity: c.status === 'archived' ? 0.55 : 1, '&:hover, &:focus-visible': {borderColor: 'primary.main', boxShadow: 2}}}>
            <Box sx={{position: 'relative', aspectRatio: '168 / 220', bgcolor: '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Chip size="small" label={c.gender === 'male' ? 'Nam' : 'Nữ'} sx={{position: 'absolute', top: 6, left: 6, height: 20, fontSize: 11, bgcolor: 'rgba(255,255,255,.85)', pointerEvents: 'none'}}/>
                {c.status === 'archived' && <Chip size="small" color="warning" label="Lưu trữ" sx={{position: 'absolute', top: 6, right: 6, height: 20, fontSize: 11, pointerEvents: 'none'}}/>}
                {seen && thumb ? <Box component="img" src={thumb} alt="" decoding="async" sx={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}/> : seen ? <CircularProgress size={18} sx={{opacity: 0.5}}/> : null}
            </Box>
            <Box sx={{px: 1, py: 0.75}}>
                <Typography variant="body2" fontWeight={600} noWrap>{c.name}</Typography>
                <Typography variant="caption" noWrap sx={{display: 'block', color: 'text.secondary', fontFamily: 'monospace'}}>{c.code}</Typography>
            </Box>
        </Box>
    </Box>;
}

/**
 * Tab "Nhân vật phụ" của Thư viện hình ảnh: mọi hình người không phải nhân vật chính trong video-html lấy từ đây bằng mã.
 * Xem, thiết kế lại (Character Designer), sửa thông tin, lưu trữ và thêm nhân vật phụ mới.
 */
export default function SupportingCastLibrary({open, runtime, onCount}: {open: boolean; runtime: string; onCount?: (n: number) => void}) {
    const [characters, setCharacters] = React.useState<SupportingCharacter[] | null>(null), [groups, setGroups] = React.useState<SupportingCastGroup[]>([]);
    const [error, setError] = React.useState(''), [notice, setNotice] = React.useState(''), [busy, setBusy] = React.useState(false);
    const [query, setQuery] = React.useState(''), [group, setGroup] = React.useState('all'), [showArchived, setShowArchived] = React.useState(false);
    const [factory, setFactory] = React.useState(''), [selected, setSelected] = React.useState<SupportingCharacter | null>(null);
    const [form, setForm] = React.useState<InfoForm | null>(null), [designing, setDesigning] = React.useState<InfoForm | null>(null);
    const [head, setHead] = React.useState('design'), [action, setAction] = React.useState('idle'), [previewHtml, setPreviewHtml] = React.useState('');
    const [, setTick] = React.useState(0), [workerOn, setWorkerOn] = React.useState(false);
    const frame = React.useRef<HTMLIFrameElement | null>(null), ready = React.useRef(false), busyId = React.useRef<string | null>(null);
    const queue = React.useRef<string[]>([]), visible = React.useRef(new Set<string>()), requested = React.useRef(new Set<string>());
    const byCode = React.useRef(new Map<string, SupportingCharacter>());
    const fp = React.useMemo(() => (runtime && factory ? textFingerprint(runtime) + textFingerprint(factory) : ''), [runtime, factory]);
    const fpRef = React.useRef(''); fpRef.current = fp;

    const reload = React.useCallback(async () => {
        try {
            const res = await supportingCastRequest('list', {include_archived: true});
            if (!res.success) throw new Error(supportingCastMessage(res));
            setCharacters(res.characters || []); setGroups(res.groups || []);
        } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được thư viện nhân vật phụ.'); }
    }, []);
    React.useEffect(() => { if (open && !characters) void reload(); }, [open, characters, reload]);
    React.useEffect(() => {
        if (!open || factory) return;
        loadDesigner('', 'female', '').then((d) => setFactory(designerFactorySource(d.template_html))).catch((e) => setError(e instanceof Error ? e.message : 'Không tải được bộ thiết kế.'));
    }, [open, factory]);
    React.useEffect(() => { byCode.current = new Map((characters || []).map((c) => [c.code, c])); onCount?.((characters || []).filter((c) => c.status === 'active').length); }, [characters, onCount]);

    // Hàng đợi ảnh thu nhỏ: chỉ dựng nhân vật đang thấy, từng nhân vật một.
    const pump = React.useCallback(() => {
        const win = frame.current?.contentWindow;
        if (!ready.current || busyId.current || !win) return;
        for (;;) {
            const at = queue.current.findIndex((code) => visible.current.has(code));
            if (at < 0) return;
            const [code] = queue.current.splice(at, 1), c = byCode.current.get(code);
            if (!c || thumbCache[thumbKey(c)]) continue;
            busyId.current = code;
            win.postMessage({type: 'sv-thumb-request', id: code, design: c.design, scale: c.scale, head: ''}, '*');
            return;
        }
    }, []);
    const request = React.useCallback((c: SupportingCharacter) => {
        const key = thumbKey(c);
        if (!fpRef.current || thumbCache[key] || requested.current.has(key)) { pump(); return; }
        requested.current.add(key);
        void readThumb(`cast2|${fpRef.current}|${key}`).then((url) => {
            if (url) { thumbCache[key] = url; setTick((n) => n + 1); return; }
            queue.current.push(c.code); setWorkerOn(true); pump();
        });
    }, [pump]);
    const onVisible = React.useCallback((c: SupportingCharacter, isVisible: boolean) => {
        if (isVisible) { visible.current.add(c.code); request(c); } else visible.current.delete(c.code);
    }, [request]);
    React.useEffect(() => { if (fp) visible.current.forEach((code) => { const c = byCode.current.get(code); if (c) request(c); }); }, [fp, request]);
    React.useEffect(() => {
        if (open) return;
        ready.current = false; busyId.current = null; queue.current = []; requested.current.clear(); visible.current.clear(); setWorkerOn(false);
    }, [open]);
    React.useEffect(() => {
        if (!open) return undefined;
        const receive = (event: MessageEvent) => {
            const m = event.data;
            if (!m || m.kind !== 'cast' || event.source !== frame.current?.contentWindow) return;
            if (m.type === 'sv-thumb-ready') { ready.current = true; pump(); return; }
            if (m.type !== 'sv-library-thumbs' || m.id !== busyId.current) return;
            busyId.current = null;
            const c = byCode.current.get(m.id);
            if (c && typeof m.url === 'string' && /^data:image\/(png|jpeg);base64,/.test(m.url)) { thumbCache[thumbKey(c)] = m.url; void writeThumb(`cast2|${fpRef.current}|${thumbKey(c)}`, m.url); setTick((n) => n + 1); }
            pump();
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [open, pump]);
    const worker = React.useMemo(() => (open && runtime && factory && workerOn ? supportingCastWorkerDocument(runtime, factory) : ''), [open, runtime, factory, workerOn]);

    React.useEffect(() => {
        setPreviewHtml('');
        if (!selected || !runtime || !factory) return;
        setPreviewHtml(supportingCastPreviewDocument(runtime, factory, selected, {head: head === 'stick' ? 'stick-head' : '', action, emotion: action === 'talk' ? 'happy' : 'neutral'}));
    }, [selected, runtime, factory, head, action]);

    const save = async (target: InfoForm, design?: unknown): Promise<boolean> => {
        setBusy(true); setError(''); setNotice('');
        try {
            const res = await supportingCastRequest('save', {code: target.isNew ? '' : target.code, group: target.group, group_name: target.group_name, name: target.name,
                note: target.note, scale: target.scale, expected_revision: target.expected_revision, ...(design !== undefined ? {design} : {})});
            if (!res.success || !res.character) throw new Error(supportingCastMessage(res));
            setNotice(design !== undefined && !target.isNew
                ? `Đã lưu ${res.character.name} (${res.character.code}). Beat đã dùng mã này sẽ đổi theo khi lưu lại hoặc render.`
                : `Đã lưu ${res.character.name} — mã ${res.character.code}.`);
            await reload();
            setForm(null); setSelected(null);
            return true;
        } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được.'); return false; }
        finally { setBusy(false); }
    };
    const setStatus = async (c: SupportingCharacter) => {
        setBusy(true); setError('');
        try {
            const res = await supportingCastRequest(c.status === 'archived' ? 'restore' : 'archive', {code: c.code, expected_revision: c.revision});
            if (!res.success) throw new Error(supportingCastMessage(res));
            await reload(); setSelected(null);
        } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được.'); }
        finally { setBusy(false); }
    };

    const list = (characters || []).filter((c) => (showArchived || c.status === 'active') && (group === 'all' || c.group === group)
        && `${c.code} ${c.name} ${c.note} ${c.group_name}`.toLowerCase().includes(query.trim().toLowerCase()));
    const formValid = !!form && form.name.trim() !== '' && /^[a-z][a-z0-9_]{1,40}$/.test(form.group) && (!form.newGroup || form.group_name.trim() !== '');
    const groupOf = (id: string) => groups.find((g) => g.id === id);

    return <Stack spacing={1.5}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} alignItems={{sm: 'center'}}>
            <TextField size="small" label="Tìm nhân vật phụ (mã, vai, áo…)" value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: 1}}/>
            <TextField select size="small" label="Nhóm" value={group} onChange={(e) => setGroup(e.target.value)} sx={{minWidth: 220}}>
                <MenuItem value="all">Tất cả nhóm</MenuItem>
                {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name} ({g.count})</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)}/>} label="Đã lưu trữ"/>
            <Chip label={`${list.length} nhân vật`}/>
            <Button size="small" variant="contained" startIcon={<AddOutlinedIcon/>} disabled={busy || !characters}
                onClick={() => setForm({code: '', group: group !== 'all' ? group : '', group_name: '', newGroup: false, name: '', note: '', scale: 1, gender: 'female', from: '', expected_revision: '', isNew: true})}>Thêm nhân vật phụ</Button>
        </Stack>
        {group !== 'all' && groupOf(group)?.hint && <Typography variant="caption" sx={{color: 'text.secondary'}}>{groupOf(group)?.hint}</Typography>}
        {!characters && !error && <Stack alignItems="center" sx={{py: 4}}><CircularProgress size={28}/></Stack>}
        {characters && !list.length && <Typography variant="body2" sx={{py: 3, textAlign: 'center', color: 'text.secondary'}}>Không có nhân vật phụ nào khớp.</Typography>}
        <Box role="list" aria-label="Danh sách nhân vật phụ" sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 1.25}}>
            {list.map((c) => <Card key={c.code} c={c} thumb={thumbCache[thumbKey(c)] || ''} onOpen={setSelected} onVisible={onVisible}/>)}
        </Box>
        {worker && <iframe ref={frame} title="Dựng ảnh thu nhỏ nhân vật phụ" aria-hidden tabIndex={-1} sandbox="allow-scripts" srcDoc={worker} style={{position: 'fixed', left: -4000, top: 0, width: 180, height: 230, border: 0}}/>}

        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
            <DialogTitle>{selected?.name}<Typography component="span" variant="body2" sx={{ml: 1, opacity: 0.75}}>{selected?.group_name}</Typography></DialogTitle>
            <DialogContent dividers>
                <Stack spacing={1.5}>
                    <Box sx={{height: 420, borderRadius: 1, overflow: 'hidden', bgcolor: '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        {previewHtml ? <iframe title={`Xem trước ${selected?.name || ''}`} sandbox="allow-scripts" srcDoc={previewHtml} style={{width: '100%', height: '100%', border: 0, display: 'block'}}/> : <CircularProgress size={28}/>}
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                        <ToggleButtonGroup size="small" exclusive value={action} onChange={(_, v) => v && setAction(v)}>
                            <ToggleButton value="idle">Đứng</ToggleButton><ToggleButton value="walk">Đi bộ</ToggleButton><ToggleButton value="talk">Nói</ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup size="small" exclusive value={head} onChange={(_, v) => v && setHead(v)}>
                            <ToggleButton value="design">Theo thiết kế</ToggleButton><ToggleButton value="stick">Đầu tròn</ToggleButton>
                        </ToggleButtonGroup>
                        <Typography variant="caption" sx={{color: 'text.secondary'}}>Kéo để xoay. Trong video, nhân vật phụ tự theo style nhân vật của video.</Typography>
                    </Stack>
                    {selected?.note && <Typography variant="body2">{selected.note}</Typography>}
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip size="small" color="primary" label={selected?.code}/>
                        <Chip size="small" label={selected?.gender === 'male' ? 'Nam' : 'Nữ'}/>
                        <Chip size="small" label={`Chiều cao ×${(selected?.scale || 1).toFixed(2)}`}/>
                        {selected && <Chip size="small" variant="outlined" label={SOURCE_LABEL[selected.source]}/>}
                        {selected?.status === 'archived' && <Chip size="small" color="warning" label="Đã lưu trữ"/>}
                    </Stack>
                    {selected && <Box component="pre" sx={{m: 0, p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{usage(selected.code)}</Box>}
                    <Alert severity="info" variant="outlined">Beat gọi nhân vật bằng mã và không được đổi màu, tỉ lệ hay bộ phận. Sửa thiết kế ở đây sẽ đổi mọi beat dùng mã này khi beat được lưu lại hoặc render; muốn một người khác thì thêm nhân vật mới.</Alert>
                </Stack>
            </DialogContent>
            <DialogActions>
                {selected && <Button disabled={busy} onClick={() => void setStatus(selected)}>{selected.status === 'archived' ? 'Khôi phục' : 'Lưu trữ'}</Button>}
                {selected && <Button disabled={busy} onClick={() => setForm({code: selected.code, group: selected.group, group_name: selected.group_name, newGroup: false, name: selected.name, note: selected.note, scale: selected.scale, gender: selected.gender, from: '', expected_revision: selected.revision, isNew: false})}>Sửa thông tin</Button>}
                {selected && <Button disabled={busy} onClick={() => setForm({code: '', group: selected.group, group_name: '', newGroup: false, name: '', note: '', scale: selected.scale, gender: selected.gender, from: selected.code, expected_revision: '', isNew: true})}>Tạo biến thể</Button>}
                {selected && <Button variant="contained" disabled={busy} onClick={() => setDesigning({code: selected.code, group: selected.group, group_name: selected.group_name, newGroup: false, name: selected.name, note: selected.note, scale: selected.scale, gender: selected.gender, from: '', expected_revision: selected.revision, isNew: false})}>Thiết kế</Button>}
                <Button onClick={() => setSelected(null)}>Đóng</Button>
            </DialogActions>
        </Dialog>

        <Dialog open={!!form} onClose={() => !busy && setForm(null)} maxWidth="sm" fullWidth>
            <DialogTitle>{form?.isNew ? (form.from ? `Biến thể của ${form.from}` : 'Thêm nhân vật phụ') : `Sửa ${form?.code}`}</DialogTitle>
            <DialogContent dividers>
                {form && <Stack spacing={2}>
                    {form.isNew && <TextField select size="small" label="Nhóm *" value={form.newGroup ? '__new' : form.group} disabled={busy}
                        onChange={(e) => setForm(e.target.value === '__new' ? {...form, newGroup: true, group: '', group_name: ''} : {...form, newGroup: false, group: e.target.value, group_name: ''})}>
                        {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                        <MenuItem value="__new">+ Nhóm mới…</MenuItem>
                    </TextField>}
                    {form.isNew && form.newGroup && <TextField size="small" label="Tên nhóm mới *" placeholder="VD: Thợ may" value={form.group_name} disabled={busy}
                        helperText={form.group ? `Mã nhóm: ${form.group} → nhân vật đầu tiên: phu_${form.group}_01` : 'Mã nhóm tạo từ tên.'}
                        onChange={(e) => setForm({...form, group_name: e.target.value, group: supportingCastGroupId(e.target.value)})}/>}
                    <TextField size="small" label="Tên hiển thị *" placeholder={`VD: ${groupOf(form.group)?.name || 'Công nhân'} ${(groupOf(form.group)?.count || 0) + 1}`} value={form.name} disabled={busy} onChange={(e) => setForm({...form, name: e.target.value})}/>
                    <TextField size="small" label="Mô tả ngoại hình (agent đọc để chọn mã)" placeholder="VD: Nam, áo phản quang cam, mũ vàng, găng tay" value={form.note} disabled={busy} multiline minRows={2} onChange={(e) => setForm({...form, note: e.target.value})}/>
                    <Stack direction="row" spacing={2}>
                        {form.isNew && !form.from && <TextField select size="small" label="Giới tính" value={form.gender} disabled={busy} sx={{minWidth: 140}} onChange={(e) => setForm({...form, gender: e.target.value as InfoForm['gender']})}>
                            <MenuItem value="female">Nữ</MenuItem><MenuItem value="male">Nam</MenuItem>
                        </TextField>}
                        <TextField size="small" type="number" label="Chiều cao ×" value={form.scale} disabled={busy} inputProps={{step: 0.01, min: 0.85, max: 1.12}}
                            helperText="0,85–1,12 so với dáng chuẩn" onChange={(e) => setForm({...form, scale: Number(e.target.value) || 1})}/>
                    </Stack>
                    {form.isNew && <Alert severity="info">Mã được cấp tự động theo nhóm. Bước sau là thiết kế ngoại hình: khác các nhân vật cùng nhóm ít nhất ở kiểu tóc, áo hoặc màu.</Alert>}
                </Stack>}
            </DialogContent>
            <DialogActions>
                <Button disabled={busy} onClick={() => setForm(null)}>Hủy</Button>
                {form?.isNew
                    ? <Button variant="contained" disabled={busy || !formValid} onClick={() => { setDesigning(form); setForm(null); }}>Tiếp: thiết kế ngoại hình</Button>
                    : <Button variant="contained" disabled={busy || !formValid} onClick={() => form && void save(form)}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>}
            </DialogActions>
        </Dialog>

        {designing && <CharacterDesignDialog key={`extra:${designing.code || designing.group}`} shortVideoId={0} asset={{id: designing.code || `phu_${designing.group}_moi`, name: designing.name}} busy={busy}
            title={designing.isNew ? 'Thiết kế nhân vật phụ mới' : `Thiết kế ${designing.code}`} loadDesigner={() => loadDesigner(designing.isNew ? '' : designing.code, designing.gender, designing.from)}
            replacingNote={designing.isNew ? 'Nhân vật phụ mới cho thư viện: chọn trang phục đúng vai, khác các nhân vật cùng nhóm.' : 'Lưu sẽ đổi ngoại hình của mã này trong mọi beat dùng nó (khi beat được lưu lại hoặc render).'}
            onClose={() => setDesigning(null)}
            onSave={async (data) => { const ok = await save(designing, data.design); if (ok) setDesigning(null); return ok; }}/>}
    </Stack>;
}
