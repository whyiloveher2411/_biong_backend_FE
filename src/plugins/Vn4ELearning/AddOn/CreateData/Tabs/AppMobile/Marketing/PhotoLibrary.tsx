import React from 'react';
import {Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography} from '@mui/material';
import {fetchSource, photoSkyPreviewDocument, photoSurfacePreviewDocument, threeRuntimeSource} from 'helpers/visualLibrary';

export type LibraryPhoto = {
    code: string; kind: string; name: string; tags?: Record<string, string>; thumb: string; pack?: string; usage: string; error?: string; archived?: string;
    source?: string; credit?: string; license?: string; pack_bytes?: number; acg?: string; width?: number; height?: number;
    meta?: {tile?: number; tint?: string; sun?: {elevation_deg?: number}; fog?: string};
};
export type PhotoLibraryData = {skies: LibraryPhoto[]; surfaces: LibraryPhoto[]};

const KIND_LABEL: Record<string, string> = {sky: 'Bầu trời', asphalt: 'Nhựa đường', concrete: 'Bê tông', grass: 'Cỏ', soil: 'Đất', gravel: 'Sỏi', paving: 'Gạch lát', stone: 'Đá', ground: 'Mặt đất'};
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const tagText = (tags?: Record<string, string>) => Object.entries(tags || {}).map(([k, v]) => `${k}=${v}`).join('; ');

function Viewer({item, onClose}: {item: LibraryPhoto | null; onClose: () => void}) {
    const [html, setHtml] = React.useState(''), [error, setError] = React.useState(''), [copied, setCopied] = React.useState(false);
    const isSky = item?.code.startsWith('sky_');
    React.useEffect(() => {
        setHtml(''); setError(''); setCopied(false);
        if (!item) return;
        if (!item.pack) { setError(item.error || 'Mã này chưa có gói đã phát hành.'); return; }
        let active = true;
        Promise.all([threeRuntimeSource(), fetchSource(item.pack)])
            .then(([runtime, pack]) => { if (active) setHtml(item.code.startsWith('sky_') ? photoSkyPreviewDocument(runtime, pack, item.code) : photoSurfacePreviewDocument(runtime, pack, item.code)); })
            .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không mở được bản xem 3D.'); });
        return () => { active = false; };
    }, [item]);
    return <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{item?.name}<Typography component="span" variant="body2" sx={{ml: 1, color: 'inherit', opacity: 0.75, fontFamily: 'monospace'}}>{item?.code}</Typography></DialogTitle>
        <DialogContent dividers>
            <Stack spacing={1.5}>
                {error && <Alert severity="error">{error}</Alert>}
                <Box sx={{height: 440, borderRadius: 1, overflow: 'hidden', bgcolor: '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {html ? <iframe title={`Xem 3D ${item?.name || ''}`} sandbox="allow-scripts" srcDoc={html} style={{width: '100%', height: '100%', border: 0, display: 'block'}}/> : !error && <CircularProgress size={28}/>}
                </Box>
                <Typography variant="caption" sx={{color: 'text.secondary'}}>Kéo để xoay, lăn chuột để phóng to hoặc thu nhỏ.{isSky ? ' Mặt trời, bóng đổ, phản chiếu và sương xa lấy theo ảnh trời.' : ' Ảnh phủ theo toạ độ thật (mét), liền mạch qua các khối.'}</Typography>
                {item && <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={KIND_LABEL[item.kind] || item.kind}/>
                    {isSky && item.meta?.sun?.elevation_deg != null && <Chip size="small" label={`Mặt trời cao ${item.meta.sun.elevation_deg}°`}/>}
                    {isSky && item.width ? <Chip size="small" label={`${item.width} × ${item.height} px`}/> : null}
                    {!isSky && item.meta?.tile ? <Chip size="small" label={`${item.meta.tile} m mỗi ảnh`}/> : null}
                    {item.pack_bytes ? <Chip size="small" label={`Gói ${Math.round(item.pack_bytes / 1024)} KB`}/> : null}
                    {tagText(item.tags) && <Chip size="small" variant="outlined" label={tagText(item.tags)}/>}
                </Stack>}
                {item && <Typography variant="caption" sx={{color: 'text.secondary'}}>Nguồn: {item.source ? <a href={item.source} target="_blank" rel="noreferrer">{item.source}</a> : item.credit} · {item.license || 'CC0'}</Typography>}
                {item?.usage && <Box component="pre" sx={{m: 0, p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{item.usage}</Box>}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => { void navigator.clipboard?.writeText(item?.usage || ''); setCopied(true); }}>{copied ? 'Đã chép lệnh gọi' : 'Chép lệnh gọi'}</Button>
            <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
    </Dialog>;
}

function Grid({items, wide, onOpen}: {items: LibraryPhoto[]; wide: boolean; onOpen: (item: LibraryPhoto) => void}) {
    return <Box role="list" sx={{display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${wide ? 320 : 180}px, 1fr))`, gap: 1.5}}>
        {items.map((item) => <Box key={item.code} role="listitem" sx={{border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', opacity: item.archived ? 0.55 : 1}}>
            <ButtonBase onClick={() => onOpen(item)} aria-label={`Xem 3D ${item.name}`} sx={{display: 'block', width: '100%', textAlign: 'left', position: 'relative'}}>
                {item.thumb
                    ? <Box component="img" src={item.thumb} alt="" sx={{display: 'block', width: '100%', aspectRatio: wide ? '4 / 1' : '1 / 1', objectFit: 'cover', bgcolor: 'action.hover'}}/>
                    : <Box sx={{width: '100%', aspectRatio: wide ? '4 / 1' : '1 / 1', bgcolor: 'action.hover'}}/>}
                <Chip size="small" color="primary" label="Xem 3D" sx={{position: 'absolute', right: 8, bottom: 8, pointerEvents: 'none'}}/>
            </ButtonBase>
            <Stack spacing={0.5} sx={{p: 1.25}}>
                <Typography variant="subtitle2">{item.name}</Typography>
                <Typography variant="caption" sx={{fontFamily: 'monospace', wordBreak: 'break-all'}}>{item.code}{item.archived ? ' · đã lưu trữ' : ''}</Typography>
                <Typography variant="caption" sx={{color: 'text.secondary'}}>{KIND_LABEL[item.kind] || item.kind}{tagText(item.tags) ? ` · ${tagText(item.tags)}` : ''}</Typography>
                {item.error && <Typography variant="caption" color="error">{item.error}</Typography>}
            </Stack>
        </Box>)}
    </Box>;
}

/** Tab "Trời & mặt đất": bầu trời HDRI ảnh thật (THREE.SVSky) và bề mặt ảnh quét (THREE.SVSurfaces), gọi bằng mã. */
export default function PhotoLibrary({data}: {data: PhotoLibraryData | null | undefined}) {
    const [query, setQuery] = React.useState(''), [viewing, setViewing] = React.useState<LibraryPhoto | null>(null);
    const q = plain(query.trim()), match = (i: LibraryPhoto) => !q || plain(`${i.code} ${i.name} ${i.kind} ${tagText(i.tags)}`).includes(q);
    const skies = (data?.skies || []).filter(match), surfaces = (data?.surfaces || []).filter(match);
    return <>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Tìm trời hoặc bề mặt" value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: '1 1 240px'}}/>
            <Chip label={`${skies.length} trời · ${surfaces.length} bề mặt`}/>
        </Stack>
        <Typography variant="subtitle1" fontWeight={600} sx={{mt: 2, mb: 1}}>Bầu trời</Typography>
        {skies.length ? <Grid items={skies} wide onOpen={setViewing}/> : <Typography variant="body2" sx={{color: 'text.secondary'}}>Chưa có. Thêm: node scripts/beat-html/photo-library.mjs sky search &lt;từ&gt; rồi sky add --code=sky_… --polyhaven=&lt;id&gt;</Typography>}
        <Typography variant="subtitle1" fontWeight={600} sx={{mt: 2.5, mb: 1}}>Mặt đất</Typography>
        {surfaces.length ? <Grid items={surfaces} wide={false} onOpen={setViewing}/> : <Typography variant="body2" sx={{color: 'text.secondary'}}>Chưa có. Thêm: node scripts/beat-html/photo-library.mjs surface add --code=srf_… --acg=&lt;id ambientCG&gt;</Typography>}
        <Viewer item={viewing} onClose={() => setViewing(null)}/>
    </>;
}
