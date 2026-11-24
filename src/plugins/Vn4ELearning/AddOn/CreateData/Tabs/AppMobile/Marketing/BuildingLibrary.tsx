import React from 'react';
import {Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography} from '@mui/material';
import {buildingPreviewDocument, fetchSource, threeRuntimeSource} from 'helpers/visualLibrary';

export type LibraryBuilding = {
    code: string; name: string; group: string; group_name: string; note?: string; source?: string; thumb: string; pack?: string; usage: string; archived?: boolean; error?: string;
    tags?: Record<string, string[]>;
    size: {width: number; depth: number; eave: number; ridge: number}; ppm: number; parts: number; doors?: string[]; pack_bytes?: number; updated?: string;
};
export type BuildingLibraryData = {groups: Record<string, string>; facets?: Record<string, string>; items: LibraryBuilding[]};

const TINTS: Array<{label: string; value: string}> = [
    {label: 'Màu gốc', value: ''}, {label: 'Kem', value: '#f6ead2'}, {label: 'Cam nhạt', value: '#ffe6c2'}, {label: 'Hồng xám', value: '#ecdcd2'}, {label: 'Xanh nhạt', value: '#dfe9e2'},
];
/** So khớp không phân biệt dấu, để gõ "viet nam" vẫn ra "Việt Nam". */
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function Viewer({item, facets, onClose}: {item: LibraryBuilding | null; facets: Record<string, string>; onClose: () => void}) {
    const [html, setHtml] = React.useState(''), [error, setError] = React.useState(''), [tint, setTint] = React.useState(''), [mirror, setMirror] = React.useState(false), [copied, setCopied] = React.useState(false);
    React.useEffect(() => { setTint(''); setMirror(false); setCopied(false); }, [item?.code]);
    React.useEffect(() => {
        setHtml(''); setError('');
        if (!item) return;
        if (!item.pack) { setError(item.error || 'Nhà này chưa có gói 3D đã phát hành.'); return; }
        let active = true;
        Promise.all([threeRuntimeSource(), fetchSource(item.pack)])
            .then(([runtime, pack]) => { if (active) setHtml(buildingPreviewDocument(runtime, pack, item.code, {tint, mirror})); })
            .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không mở được bản xem 3D.'); });
        return () => { active = false; };
    }, [item, tint, mirror]);
    const options = [tint && `tint: '${tint}'`, mirror && 'mirror: true'].filter(Boolean).join(', ');
    const usage = item ? `var nha = THREE.SVBuildings.create('${item.code}'${options ? `, {${options}}` : ''});\nnha.position.set(x, 0, z); nha.rotation.y = ry;   // gốc ở tâm đáy, mặt trước quay về +Z\nroot.add(nha);` : '';
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
                    <Typography variant="body2" fontWeight={600}>Màu phủ:</Typography>
                    {TINTS.map((t) => <Chip key={t.label} size="small" label={t.label} color={t.value === tint ? 'primary' : 'default'} variant={t.value === tint ? 'filled' : 'outlined'} onClick={() => setTint(t.value)}/>)}
                    <Chip size="small" label="Lật gương" color={mirror ? 'primary' : 'default'} variant={mirror ? 'filled' : 'outlined'} onClick={() => setMirror((v) => !v)}/>
                </Stack>
                {item && <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`${item.size.width} × ${item.size.depth} m`}/>
                    <Chip size="small" label={`Nóc ${item.size.ridge} m`}/>
                    <Chip size="small" label={`${item.ppm} px/m`}/>
                    <Chip size="small" label={`${item.parts} khối`}/>
                    {(item.doors || []).map((door) => <Chip key={door} size="small" variant="outlined" label={`Cửa mở được: ${door}`}/>)}
                </Stack>}
                {item?.tags && <Stack spacing={0.5}>
                    {Object.entries(facets).filter(([facet]) => item.tags?.[facet]?.length).map(([facet, label]) => <Stack key={facet} direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" sx={{color: 'text.secondary', minWidth: 120}}>{label}</Typography>
                        {(item.tags?.[facet] || []).map((value) => <Chip key={value} size="small" variant="outlined" label={value}/>)}
                    </Stack>)}
                </Stack>}
                {item?.note && <Typography variant="body2">{item.note}</Typography>}
                {item?.source && <Typography variant="caption" sx={{color: 'text.secondary'}}>Nguồn ảnh: {item.source}</Typography>}
                {usage && <Box component="pre" sx={{m: 0, p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{usage}</Box>}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => { void navigator.clipboard?.writeText(usage); setCopied(true); }}>{copied ? 'Đã chép lệnh gọi' : 'Chép lệnh gọi'}</Button>
            <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
    </Dialog>;
}

/** Tab "Nhà (từ ảnh)": nhà dựng sẵn từ ảnh tham chiếu, bối cảnh gọi bằng mã qua THREE.SVBuildings. Bấm vào một nhà để xem 3D. */
export default function BuildingLibrary({data}: {data: BuildingLibraryData | null | undefined}) {
    const [query, setQuery] = React.useState(''), [picked, setPicked] = React.useState<Record<string, string>>({}), [viewing, setViewing] = React.useState<LibraryBuilding | null>(null);
    const items = data?.items || [], facets = data?.facets || {};
    // Chỉ hiện ô lọc cho nhóm tag đang có giá trị; mỗi giá trị kèm số nhà.
    const facetValues = React.useMemo(() => Object.keys(facets).map((facet) => {
        const count = new Map<string, number>();
        items.forEach((item) => (item.tags?.[facet] || []).forEach((value) => count.set(value, (count.get(value) || 0) + 1)));
        return {facet, values: [...count.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'))};
    }).filter((f) => f.values.length > 0), [items, facets]);
    const q = plain(query.trim());
    const visible = items.filter((item) => Object.entries(picked).every(([facet, value]) => !value || (item.tags?.[facet] || []).includes(value))
        && (!q || plain(`${item.code} ${item.name} ${item.note || ''} ${item.group_name} ${Object.values(item.tags || {}).flat().join(' ')}`).includes(q)));
    const filtered = Object.values(picked).some(Boolean) || !!q;
    return <>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Tìm nhà" value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: '1 1 220px'}}/>
            {facetValues.map(({facet, values}) => <TextField key={facet} select size="small" label={facets[facet]} value={picked[facet] || ''} onChange={(e) => setPicked((cur) => ({...cur, [facet]: e.target.value}))} sx={{minWidth: 150}}>
                <MenuItem value="">Tất cả</MenuItem>
                {values.map(([value, count]) => <MenuItem key={value} value={value}>{value} ({count})</MenuItem>)}
            </TextField>)}
            {filtered && <Button size="small" onClick={() => { setPicked({}); setQuery(''); }}>Bỏ lọc</Button>}
            <Chip label={`${visible.length} nhà`}/>
        </Stack>
        {!visible.length && <Typography variant="body2" sx={{py: 3, textAlign: 'center', color: 'text.secondary'}}>
            {items.length ? 'Không có nhà nào khớp bộ lọc.' : 'Thư viện chưa có nhà. Thêm nhà bằng: node scripts/beat-html/building-library.mjs add'}
        </Typography>}
        <Box role="list" aria-label="Danh sách nhà" sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.5}}>
            {visible.map((item) => <Box key={item.code} role="listitem" sx={{border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', opacity: item.archived ? 0.55 : 1}}>
                <ButtonBase onClick={() => setViewing(item)} aria-label={`Xem 3D ${item.name}`} sx={{display: 'block', width: '100%', textAlign: 'left', position: 'relative'}}>
                    {item.thumb
                        ? <Box component="img" src={item.thumb} alt="" sx={{display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', bgcolor: 'action.hover'}}/>
                        : <Box sx={{width: '100%', aspectRatio: '16 / 9', bgcolor: 'action.hover'}}/>}
                    <Chip size="small" color="primary" label="Xem 3D" sx={{position: 'absolute', right: 8, bottom: 8, pointerEvents: 'none'}}/>
                </ButtonBase>
                <Stack spacing={0.5} sx={{p: 1.25}}>
                    <Typography variant="subtitle2">{item.name}</Typography>
                    <Typography variant="caption" sx={{fontFamily: 'monospace'}}>{item.code}{item.archived ? ' · đã lưu trữ' : ''}</Typography>
                    <Typography variant="caption" sx={{color: 'text.secondary'}}>
                        {item.size.width} × {item.size.depth} m · nóc {item.size.ridge} m · {item.ppm} px/m
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {Object.keys(facets).flatMap((facet) => (item.tags?.[facet] || []).map((value) => <Chip key={`${facet}:${value}`} size="small" variant={picked[facet] === value ? 'filled' : 'outlined'} color={picked[facet] === value ? 'primary' : 'default'}
                            label={value} title={`${facets[facet]}: bấm để lọc`} onClick={() => setPicked((cur) => ({...cur, [facet]: cur[facet] === value ? '' : value}))}/>))}
                    </Stack>
                    {item.error && <Typography variant="caption" color="error">{item.error}</Typography>}
                </Stack>
            </Box>)}
        </Box>
        <Viewer item={viewing} facets={facets} onClose={() => setViewing(null)}/>
    </>;
}
