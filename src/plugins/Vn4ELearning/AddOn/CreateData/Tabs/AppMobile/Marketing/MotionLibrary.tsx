import React from 'react';
import {Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography} from '@mui/material';
import {fetchSource} from 'helpers/visualLibrary';
import {MOTION_SOURCE, MotionClip, SupportingCharacter, designerFactorySource, motionPreviewDocument, supportingCastMessage, supportingCastRequest} from 'helpers/supportingCast';

type MocapData = {clips: MotionClip[]; runtime: string};

function usage(c: MotionClip) {
    return `// mỗi frame, thay cho person.update(t, …)\nSVMocap.timeline(person, [{clip: 'mx_idle', at: 0}, {clip: '${c.id}', at: 1.2${c.loop ? ', fade: 0.35' : ''}}], t, {emotion: 'neutral'});\n\n// Visual của beat: MOTION: ${c.id}`;
}

/**
 * Tab "Động tác" của Thư viện hình ảnh: kho clip Mixamo (public/sv-mocap) mà mọi nhân vật Character Designer dùng.
 * Clip đã tải một lần được giữ và dùng lại; động tác chưa có thì tải thêm từ Mixamo (docs/short-video/mixamo-motions.md).
 */
export default function MotionLibrary({open, runtime, data}: {open: boolean; runtime: string; data: unknown}) {
    const mocap = (data as {mocap?: MocapData} | null)?.mocap;
    const [query, setQuery] = React.useState(''), [selected, setSelected] = React.useState<MotionClip | null>(null);
    const [cast, setCast] = React.useState<SupportingCharacter[]>([]), [actor, setActor] = React.useState('phu_nguoi_qua_duong_01');
    const [factory, setFactory] = React.useState(''), [head, setHead] = React.useState(''), [html, setHtml] = React.useState(''), [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!open || factory) return;
        Promise.all([supportingCastRequest('list', {include_archived: false}), supportingCastRequest('designer', {gender: 'male'})]).then(([list, designer]) => {
            if (!list.success || !designer.success || !designer.designer) throw new Error(supportingCastMessage(list.success ? designer : list));
            setCast(list.characters || []); setFactory(designerFactorySource(designer.designer.template_html));
        }).catch((e) => setError(e instanceof Error ? e.message : 'Không tải được nhân vật xem trước.'));
    }, [open, factory]);

    React.useEffect(() => {
        setHtml('');
        const c = cast.find((x) => x.code === actor);
        if (!selected || !runtime || !factory || !c || !mocap) return undefined;
        let active = true;
        fetchSource(`/sv-mocap/${selected.id}.json`).then((json) => { if (active) setHtml(motionPreviewDocument(runtime, factory, mocap.runtime, json, c, head)); })
            .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không tải được clip.'); });
        return () => { active = false; };
    }, [selected, runtime, factory, cast, actor, head, mocap]);

    if (!mocap) return <Stack alignItems="center" sx={{py: 4}}><CircularProgress size={28}/></Stack>;
    const q = query.trim().toLowerCase();
    const list = mocap.clips.filter((c) => !q || `${c.id} ${c.name} ${c.mixamo || ''} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q));

    return <Stack spacing={1.5}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <Alert severity="info" variant="outlined">
            Động tác chưa có: tải trên mixamo.com (FBX Binary, Without Skin, 30 fps; đi/chạy bật In Place), đặt vào <code>storage/app/mixamo-inbox/</code> với tên file là mã
            (vd. <code>mx_waving.fbx</code>) rồi chạy <code>node scripts/beat-html/mocap/convert.mjs --inbox</code>. Clip được giữ lại, video sau dùng lại không cần tải. Chỉ tự làm (mã <code>tu_…</code>) khi Mixamo không có.
        </Alert>
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} alignItems={{sm: 'center'}}>
            <TextField size="small" label="Tìm động tác (tên, mã, tag)" value={query} onChange={(e) => setQuery(e.target.value)} sx={{flex: 1}}/>
            <Chip label={`${list.length} động tác`}/>
        </Stack>
        <Box role="list" aria-label="Danh sách động tác" sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.25}}>
            {list.map((c) => <Box key={c.id} role="listitem">
                <Box component="button" type="button" onClick={() => setSelected(c)}
                    sx={{all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'block', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25, bgcolor: 'background.paper', '&:hover, &:focus-visible': {borderColor: 'primary.main', boxShadow: 2}}}>
                    <Typography variant="body2" fontWeight={600} noWrap>{c.name}</Typography>
                    <Typography variant="caption" noWrap sx={{display: 'block', color: 'text.secondary', fontFamily: 'monospace'}}>{c.id}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{mt: 0.75}} flexWrap="wrap" useFlexGap>
                        <Chip size="small" color={(MOTION_SOURCE[c.source] || MOTION_SOURCE.mixamo).color} label={(MOTION_SOURCE[c.source] || MOTION_SOURCE.mixamo).label} title={(MOTION_SOURCE[c.source] || MOTION_SOURCE.mixamo).hint}/>
                        <Chip size="small" variant="outlined" label={c.loop ? 'Lặp' : 'Một lần'}/>
                        <Chip size="small" variant="outlined" label={`${Number(c.duration).toFixed(1)} s`}/>
                    </Stack>
                </Box>
            </Box>)}
        </Box>
        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
            <DialogTitle>{selected?.name}<Typography component="span" variant="body2" sx={{ml: 1, opacity: 0.75, fontFamily: 'monospace'}}>{selected?.id}</Typography></DialogTitle>
            <DialogContent dividers>
                <Stack spacing={1.5}>
                    <Box sx={{height: 420, borderRadius: 1, overflow: 'hidden', bgcolor: '#E9EDF2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        {html ? <iframe title={`Xem trước ${selected?.name || ''}`} sandbox="allow-scripts" srcDoc={html} style={{width: '100%', height: '100%', border: 0, display: 'block'}}/> : <CircularProgress size={28}/>}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <TextField select size="small" label="Nhân vật xem thử" value={actor} onChange={(e) => setActor(e.target.value)} sx={{minWidth: 260}}>
                            {cast.map((c) => <MenuItem key={c.code} value={c.code}>{c.name} · {c.code}</MenuItem>)}
                        </TextField>
                        <ToggleButtonGroup size="small" exclusive value={head} onChange={(_, v) => v !== null && setHead(v)}>
                            <ToggleButton value="">Theo thiết kế</ToggleButton><ToggleButton value="stick-head">Đầu tròn</ToggleButton>
                        </ToggleButtonGroup>
                        <Typography variant="caption" sx={{color: 'text.secondary'}}>Kéo để xoay.</Typography>
                    </Stack>
                    {selected && <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip size="small" color={(MOTION_SOURCE[selected.source] || MOTION_SOURCE.mixamo).color} label={(MOTION_SOURCE[selected.source] || MOTION_SOURCE.mixamo).label} title={(MOTION_SOURCE[selected.source] || MOTION_SOURCE.mixamo).hint}/>
                        {selected.source === 'mixamo' && selected.mixamo && <Chip size="small" variant="outlined" label={`Trên Mixamo: ${selected.mixamo}`}/>}
                        {selected.source === 'xbot' && <Chip size="small" variant="outlined" label="Nguồn: Xbot.glb (ví dụ three.js)"/>}
                        <Chip size="small" variant="outlined" label={selected.loop ? 'Lặp' : 'Một lần (giữ khung cuối)'}/>
                        <Chip size="small" variant="outlined" label={`${Number(selected.duration).toFixed(2)} s · ${selected.frames} khung`}/>
                        {(selected.tags || []).map((t) => <Chip key={t} size="small" variant="outlined" label={t}/>)}
                    </Stack>}
                    {selected?.source === 'custom' && <Alert severity="warning">Tự làm vì: {selected.reason || '—'}. Đã tìm trên Mixamo: {(selected.searched || []).join(', ') || '—'}.</Alert>}
                    {selected && <Box component="pre" sx={{m: 0, p: 1.25, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12.5, whiteSpace: 'pre-wrap'}}>{usage(selected)}</Box>}
                </Stack>
            </DialogContent>
            <DialogActions><Button onClick={() => setSelected(null)}>Đóng</Button></DialogActions>
        </Dialog>
    </Stack>;
}
