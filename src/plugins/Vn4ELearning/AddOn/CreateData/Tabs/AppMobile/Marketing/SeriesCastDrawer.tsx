import React from 'react';
import {Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Stack, Switch, TextField, Typography} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import type {CharacterDesignCatalog} from 'helpers/shortVideoSceneAssets';
import {
    SERIES_CAST_PROFILE_FIELDS, SeriesCastMember, SeriesCastProfile, seriesCastMessage, seriesCastRequest, seriesCastSuggestId,
} from 'helpers/shortVideoSeriesCast';
import CharacterDesignDialog, {characterDesignPreview} from './AgentVideo/CharacterDesignDialog';
import SceneAssetHtmlPreview from './AgentVideo/SceneAssetHtmlPreview';

type Form = {id: string; name: string; profile: SeriesCastProfile; sort: number; expected_revision: string; isNew: boolean};
const EMPTY_FORM: Form = {id: '', name: '', profile: {}, sort: 0, expected_revision: '', isNew: true};

async function loadDesigner(id: string): Promise<CharacterDesignCatalog> {
    const res = await seriesCastRequest('designer', id ? {id} : {});
    if (!res.success || !res.designer) throw new Error(seriesCastMessage(res));
    return res.designer;
}

/** Dàn nhân vật cố định: hồ sơ + thiết kế dùng chung cho mọi video video-html 3D. */
export default function SeriesCastDrawer({open, onClose}: {open: boolean; onClose: () => void}) {
    const [cast, setCast] = React.useState<SeriesCastMember[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [showArchived, setShowArchived] = React.useState(false);
    const [form, setForm] = React.useState<Form | null>(null);
    const [busy, setBusy] = React.useState(false);
    const [designing, setDesigning] = React.useState<Form | null>(null);
    const [template, setTemplate] = React.useState('');

    const reload = React.useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await seriesCastRequest('list', {include_archived: showArchived});
            if (!res.success) throw new Error(seriesCastMessage(res));
            setCast(res.cast || []);
        } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dàn nhân vật.'); }
        finally { setLoading(false); }
    }, [showArchived]);
    React.useEffect(() => { if (open) void reload(); }, [open, reload]);
    React.useEffect(() => {
        if (!open || template) return;
        void loadDesigner('').then(designer => setTemplate(designer.template_html)).catch(() => undefined);
    }, [open, template]);

    const editing = form && !form.isNew ? cast.find(member => member.id === form.id) : undefined;
    const previewHtml = React.useMemo(() => template && editing ? characterDesignPreview(template, editing.design, 'reset', 'idle', 'happy') : '', [template, editing]);

    const saveProfile = async (target: Form, design?: unknown): Promise<boolean> => {
        setBusy(true); setError(''); setNotice('');
        try {
            const res = await seriesCastRequest('save', {id: target.id, name: target.name, profile: target.profile, sort: target.sort,
                expected_revision: target.expected_revision, ...(design !== undefined ? {design} : {})});
            if (!res.success || !res.member) throw new Error(seriesCastMessage(res));
            setNotice(design !== undefined && !target.isNew
                ? `Đã lưu ${res.member.name}. Video đã gắn sẽ báo “Có bản mới” — bấm Đồng bộ trong hồ sơ nhân vật của video để áp dụng.`
                : `Đã lưu ${res.member.name}.`);
            await reload();
            setForm(null);
            return true;
        } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được.'); return false; }
        finally { setBusy(false); }
    };

    const setStatus = async (member: SeriesCastMember, operation: 'archive' | 'restore') => {
        setBusy(true); setError('');
        try {
            const res = await seriesCastRequest(operation, {id: member.id, expected_revision: member.revision});
            if (!res.success) throw new Error(seriesCastMessage(res));
            await reload();
        } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được.'); }
        finally { setBusy(false); }
    };

    const openForm = (member?: SeriesCastMember) => setForm(member
        ? {id: member.id, name: member.name, profile: {...member.profile}, sort: member.sort, expected_revision: member.revision, isNew: false}
        : {...EMPTY_FORM, profile: {}});

    const formValid = !!form && form.name.trim() !== '' && /^[a-z][a-z0-9_]{1,40}$/.test(form.id);

    return <DrawerCustom open={open} onClose={onClose} title="Dàn nhân vật cố định" width={960} activeOnClose
        headerAction={!form ? <Button size="small" variant="contained" color="inherit" sx={{color: '#222'}} startIcon={<AddOutlinedIcon/>} onClick={() => openForm()}>Thêm nhân vật</Button> : undefined}>
        <Stack spacing={2} sx={{p: 2}}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
            {!form ? <>
                <Typography variant="body2" color="text.secondary">
                    Nhân vật dùng lại qua nhiều video. Prompt tìm chủ đề và hồ sơ nhân vật ưu tiên dàn này làm vai chính.
                    Trong Bước 3 của video, bấm “Dàn cố định” ở dòng nhân vật để gắn. Sửa thiết kế ở đây bất kỳ lúc nào; video đã gắn sẽ báo có bản mới để đồng bộ.
                </Typography>
                <FormControlLabel control={<Switch size="small" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}/>} label="Hiện nhân vật đã lưu trữ"/>
                {loading ? <Box sx={{display: 'grid', placeItems: 'center', py: 6}}><CircularProgress size={28}/></Box>
                    : cast.length === 0 ? <Alert severity="info">Chưa có nhân vật cố định. Bấm “Thêm nhân vật” để thiết kế mới, hoặc trong Bước 3 của một video đã duyệt, bấm “Lưu vào dàn cố định” ở dòng nhân vật.</Alert>
                    : <Box sx={{display: 'grid', gap: 1.5, gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'}}}>
                        {cast.map(member => <Box key={member.id} sx={{border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, opacity: member.status === 'archived' ? .6 : 1}}>
                            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography fontWeight={600}>{member.name}</Typography>
                                <Chip size="small" label={member.id}/>
                                <Chip size="small" label={member.design?.selections?.gender === 'male' ? 'Nam' : 'Nữ'}/>
                                {member.profile.age && <Chip size="small" label={member.profile.age}/>}
                                {member.status === 'archived' && <Chip size="small" color="warning" label="Đã lưu trữ"/>}
                            </Stack>
                            {member.profile.role && <Typography variant="body2" sx={{mt: .75}}>{member.profile.role}</Typography>}
                            {member.profile.personality && <Typography variant="caption" color="text.secondary" component="div">{member.profile.personality}</Typography>}
                            {member.profile.voice && <Typography variant="caption" color="text.secondary" component="div">Giọng: {member.profile.voice}</Typography>}
                            <Stack direction="row" gap={1} sx={{mt: 1}} flexWrap="wrap">
                                <Button size="small" variant="contained" disabled={busy} onClick={() => setDesigning({id: member.id, name: member.name, profile: member.profile, sort: member.sort, expected_revision: member.revision, isNew: false})}>Thiết kế</Button>
                                <Button size="small" variant="outlined" disabled={busy} onClick={() => openForm(member)}>Sửa hồ sơ</Button>
                                <Button size="small" disabled={busy} onClick={() => void setStatus(member, member.status === 'archived' ? 'restore' : 'archive')}>{member.status === 'archived' ? 'Khôi phục' : 'Lưu trữ'}</Button>
                            </Stack>
                        </Box>)}
                    </Box>}
            </> : <Stack spacing={2}>
                <Button size="small" startIcon={<ArrowBackOutlinedIcon/>} sx={{alignSelf: 'flex-start'}} disabled={busy} onClick={() => setForm(null)}>Danh sách</Button>
                {previewHtml && <SceneAssetHtmlPreview html={previewHtml} title={`Xem trước ${form.name}`} height="38vh"/>}
                <Box sx={{display: 'grid', gap: 2, gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'}}}>
                    <TextField size="small" label="Tên nhân vật *" value={form.name} disabled={busy}
                        onChange={e => setForm({...form, name: e.target.value, id: form.isNew && (form.id === '' || form.id === seriesCastSuggestId(form.name)) ? seriesCastSuggestId(e.target.value) : form.id})}/>
                    <TextField size="small" label="ID (dùng làm asset id trong video) *" value={form.id} disabled={busy || !form.isNew}
                        helperText={form.isNew ? 'Chữ thường, số, gạch dưới. Không đổi được sau khi tạo.' : 'Không đổi được.'}
                        onChange={e => setForm({...form, id: e.target.value.toLowerCase()})}/>
                    {SERIES_CAST_PROFILE_FIELDS.map(field => <TextField key={field.key} size="small" label={field.label} placeholder={field.placeholder}
                        multiline={field.multiline} minRows={field.multiline ? 2 : undefined} value={form.profile[field.key] || ''} disabled={busy}
                        onChange={e => setForm({...form, profile: {...form.profile, [field.key]: e.target.value}})}/>)}
                    <TextField size="small" type="number" label="Thứ tự" value={form.sort} disabled={busy} onChange={e => setForm({...form, sort: Number(e.target.value) || 0})}/>
                </Box>
                <Stack direction="row" gap={1}>
                    {form.isNew
                        ? <Button variant="contained" disabled={busy || !formValid} onClick={() => setDesigning(form)}>Tiếp: thiết kế ngoại hình</Button>
                        : <Button variant="contained" disabled={busy || !formValid} onClick={() => void saveProfile(form)}>{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</Button>}
                    <Button disabled={busy} onClick={() => setForm(null)}>Hủy</Button>
                </Stack>
                {form.isNew && <Alert severity="info">Nhân vật cố định dùng qua nhiều video nên cần đẹp và nhất quán: kiểm tra toàn thân, cận mặt và các biểu cảm trong bộ Thiết kế trước khi lưu.</Alert>}
            </Stack>}
        </Stack>
        {designing && <CharacterDesignDialog key={`cast:${designing.id}`} shortVideoId={0} asset={{id: designing.id, name: designing.name}} busy={busy}
            title="Thiết kế nhân vật cố định" loadDesigner={() => loadDesigner(designing.isNew ? '' : designing.id)}
            replacingNote={designing.isNew ? 'Thiết kế nhân vật mới cho dàn cố định.' : 'Lưu sẽ cập nhật nhân vật cố định. Video đã gắn sẽ báo “Có bản mới” và chỉ đổi khi bấm Đồng bộ; beat đã dựng dùng vai này cần dựng lại.'}
            onClose={() => setDesigning(null)}
            onSave={async data => saveProfile(designing, data.design)}/>}
    </DrawerCustom>;
}
