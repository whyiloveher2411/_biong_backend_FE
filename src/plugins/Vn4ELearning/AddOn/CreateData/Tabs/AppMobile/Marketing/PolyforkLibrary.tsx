import React from 'react';
import {Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography} from '@mui/material';
import {fetchSource, polyforkPreviewDocument, threeRuntimeSource} from 'helpers/visualLibrary';

type Knob = {knob: string; type: string; default?: unknown; options?: string[]; min?: number; max?: number; label?: string};
export type LibraryPolyfork = {
    code: string; id: string; name: string; class: string; kit?: string | null; page: string; description?: string; thumb: string; pack?: string; usage: string; error?: string; archived?: string;
    size_m?: {x: number; y: number; z: number} | null; triangles: number; rig: string[]; colorways: string[]; knobs: Knob[]; pack_bytes?: number; credit?: string;
};
export type PolyforkLibraryData = {items: LibraryPolyfork[]};

const CLASS_LABEL: Record<string, string> = {prop: 'Đồ vật', vehicle: 'Xe cộ', building: 'Công trình', terrain: 'Mặt đất', animal: 'Động vật', character: 'Nhân vật', attachment: 'Phụ kiện'};
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function Viewer({item, onClose}: {item: LibraryPolyfork | null; onClose: () => void}) {
    const [html, setHtml] = React.useState(''), [error, setError] = React.useState(''), [colorway, setColorway] = React.useState(''), [restyle, setRestyle] = React.useState(true), [copied, setCopied] = React.useState(false);
    React.useEffect(() => { setColorway(''); setRestyle(true); setCopied(false); }, [item?.code]);
    React.useEffect(() => {
        setHtml(''); setError('');
        if (!item) return;
        if (!item.pack) { setError(item.error || 'Đồ vật này chưa có gói đã phát hành.'); return; }
        let active = true;
        const options: Record<string, unknown> = {}; if (colorway) options.colorway = colorway; if (!restyle) options.restyle = false;
        Promise.all([threeRuntimeSource(), fetchSource(item.pack)])
            .then(([runtime, pack]) => { if (active) setHtml(polyforkPreviewDocument(runtime, pack, item.code, options)); })
            .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không mở được bản xem 3D.'); });
        return () => { active = false; };
    }, [item, colorway, restyle]);
    const opts = [colorway && `colorway: '${colorway}'`, !restyle && 'restyle: false'].filter(Boolean).join(', ');
    const usage = item ? `var o = THREE.SVPolyfork.create('${item.code}'${opts ? `, {${opts}}` : ''});\no.position.set(x, 0, z); o.rotation.y = ry;   // gốc ở tâm đáy, mặt trước quay về +Z\nroot.add(o);${item.rig.length ? `\n// mỗi frame, theo t: THREE.SVPolyfork.pose(o, {'${item.rig[0]}': độ});` : ''}` : '';
    return <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{item?.name}<Typography component="span" variant="body2" sx={{ml: 1, color: 'inherit', opacity: 0.75, fontFamily: 'monospace'}}>{item?.code}</Typography></DialogTitle>
        <DialogContent dividers>
            <Stack spacing={1.5}>
                {error && <Alert severity="error">{error}</Alert>}
                <Box sx={{height: 440, borderRadius: 1, overflow: 'hidden', bgcolor: '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {html ? <iframe title={`Xem 3D ${item?.name || ''}`} sandbox="allow-scripts" srcDoc={html} style={{width: '100%', height: '100%', border: 0, display: 'block'}}/> : !error && <CircularProgress size={28}/>}
                </Box>
                <Typography variant="caption" sx={{color: 'text.secondary'}}>Kéo để xoay, lăn chuột để phóng to hoặc thu nhỏ.</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip size="small" label="Vật liệu D.mat (mặc định)" color={restyle ? 'primary' : 'default'} variant={restyle ? 'filled' : 'outlined'} onClick={() => setRestyle(true)}/>
                    <Chip size="small" label="Màu phẳng gốc Polyfork" color={!restyle ? 'primary' : 'default'} variant={!restyle ? 'filled' : 'outlined'} onClick={() => setRestyle(false)}/>
                </Stack>
                {!!item?.colorways.length && <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={600}>Colorway:</Typography>
                    <Chip size="small" label="Mặc định" color={!colorway ? 'primary' : 'default'} variant={!colorway ? 'filled' : 'outlined'} onClick={() => setColorway('')}/>
                    {item.colorways.map((c) => <Chip key={c} size="small" label={c} color={c === colorway ? 'primary' : 'default'} variant={c === colorway ? 'filled' : 'outlined'} onClick={() => setColorway(c)}/>)}
                </Stack>}
                {item && <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {item.size_m && <Chip size="small" label={`${item.size_m.x} × ${item.size_m.z} m, cao ${item.size_m.y} m`}/>}
                    <Chip size="small" label={`${item.triangles} tam giác`}/>
                    {item.pack_bytes ? <Chip size="small" label={`Gói ${Math.round(item.pack_bytes / 1024)} KB`}/> : null}
                    {item.rig.map((part) => <Chip key={part} size="small" variant="outlined" label={`Cử động: ${part}`}/>)}
                </Stack>}
                {!!item?.knobs.filter((k) => k.knob !== 'colorway').length && <Typography variant="caption" sx={{color: 'text.secondary'}}>
                    Tham số: {item.knobs.filter((k) => k.knob !== 'colorway').map((k) => `${k.knob}${k.options ? ` (${k.options.join(' | ')})` : k.type === 'toggle' ? ' (true | false)' : k.min !== undefined ? ` (${k.min}..${k.max})` : ''}`).join(', ')}
                </Typography>}
                {item?.description && <Typography variant="body2">{item.description}</Typography>}
                {item && <Typography variant="caption" sx={{color: 'text.secondary'}}>Nguồn: <a href={item.page} target="_blank" rel="noreferrer">{item.page}</a> · giấy phép Polyfork (dùng trong video, không phát tán lại file){item.kit ? ` · kit ${item.kit}` : ''}</Typography>}
                {usage && <Box component="pre" sx={{m: 0, p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{usage}</Box>}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => { void navigator.clipboard?.writeText(usage); setCopied(true); }}>{copied ? 'Đã chép lệnh gọi' : 'Chép lệnh gọi'}</Button>
            <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
    </Dialog>;
}

/** Tab "Đồ vật Polyfork": đồ đường phố, xe, mặt đất lát tải từ polyfork.dev, gọi bằng mã qua THREE.SVPolyfork. Bấm để xem 3D. */
export default function PolyforkLibrary({data}: {data: PolyforkLibraryData | null | undefined}) {
    const [query, setQuery] = React.useState(''), [cls, setCls] = React.useState(''), [viewing, setViewing] = React.useState<LibraryPolyfork | null>(null);
    const items = data?.items || [];
    const classes = React.useMemo(() => [...new Set(items.map((i) => i.class))].sort(), [items]);
    const q = plain(query.trim());
    const visible = items.filter((i) => (!cls || i.class === cls) && (!q || plain(`${i.code} ${i.name} ${i.description || ''} ${i.kit || ''}`).includes(q)));
    return <>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Tìm đồ vật" value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: '1 1 220px'}}/>
            <TextField select size="small" label="Loại" value={cls} onChange={(e) => setCls(e.target.value)} sx={{minWidth: 160}}>
                <MenuItem value="">Tất cả</MenuItem>
                {classes.map((c) => <MenuItem key={c} value={c}>{CLASS_LABEL[c] || c} ({items.filter((i) => i.class === c).length})</MenuItem>)}
            </TextField>
            <Chip label={`${visible.length} món`}/>
        </Stack>
        {!visible.length && <Typography variant="body2" sx={{py: 3, textAlign: 'center', color: 'text.secondary'}}>
            {items.length ? 'Không có món nào khớp.' : 'Chưa có đồ vật Polyfork. Thêm bằng: node scripts/beat-html/polyfork.mjs search <từ khoá> rồi add <id>'}
        </Typography>}
        <Box role="list" aria-label="Danh sách đồ vật Polyfork" sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5}}>
            {visible.map((item) => <Box key={item.code} role="listitem" sx={{border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', opacity: item.archived ? 0.55 : 1}}>
                <ButtonBase onClick={() => setViewing(item)} aria-label={`Xem 3D ${item.name}`} sx={{display: 'block', width: '100%', textAlign: 'left', position: 'relative'}}>
                    {item.thumb
                        ? <Box component="img" src={item.thumb} alt="" sx={{display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', bgcolor: 'action.hover'}}/>
                        : <Box sx={{width: '100%', aspectRatio: '1 / 1', bgcolor: 'action.hover'}}/>}
                    <Chip size="small" color="primary" label="Xem 3D" sx={{position: 'absolute', right: 8, bottom: 8, pointerEvents: 'none'}}/>
                </ButtonBase>
                <Stack spacing={0.5} sx={{p: 1.25}}>
                    <Typography variant="subtitle2">{item.name}</Typography>
                    <Typography variant="caption" sx={{fontFamily: 'monospace', wordBreak: 'break-all'}}>{item.code}{item.archived ? ' · đã lưu trữ' : ''}</Typography>
                    <Typography variant="caption" sx={{color: 'text.secondary'}}>{CLASS_LABEL[item.class] || item.class}{item.size_m ? ` · ${item.size_m.x} × ${item.size_m.z} m` : ''} · {item.triangles} tg{item.rig.length ? ` · cử động: ${item.rig.length}` : ''}</Typography>
                    {item.error && <Typography variant="caption" color="error">{item.error}</Typography>}
                </Stack>
            </Box>)}
        </Box>
        <Viewer item={viewing} onClose={() => setViewing(null)}/>
    </>;
}
