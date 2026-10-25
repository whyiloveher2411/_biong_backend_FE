import React from 'react';
import { Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { saydiVoiceCastRequest, type SaydiVoiceCast, type SaydiVoiceSampleItem } from './agentVideoApi';

type Props = { shortVideoId: number; samples: SaydiVoiceSampleItem[]; disabled: boolean };

export default function ShortVideoAgentSaydiCastSettings({ shortVideoId, samples, disabled }: Props) {
    const [config, setConfig] = React.useState<SaydiVoiceCast>({ enabled: false, speakers: {} });
    const [busy, setBusy] = React.useState(true);
    const [error, setError] = React.useState('');
    const [saved, setSaved] = React.useState(false);
    React.useEffect(() => {
        let active = true;
        setBusy(true); setError(''); setSaved(false);
        void saydiVoiceCastRequest(shortVideoId).then((r) => {
            if (!active) return;
            if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message));
            setConfig(r.config ?? { enabled: false, speakers: {} });
        }).catch((e) => { if (active) setError(String(e.message ?? e)); })
            .finally(() => { if (active) setBusy(false); });
        return () => { active = false; };
    }, [shortVideoId]);
    const change = (next: SaydiVoiceCast) => { setConfig(next); setSaved(false); setError(''); };
    return <Stack spacing={1.5} sx={{ py: 1 }}>
        <FormControlLabel label="Nhiều giọng Saydi cho video này" control={<Switch checked={config.enabled} disabled={disabled || busy} onChange={(e) => change({ ...config, enabled: e.target.checked,
            speakers: e.target.checked && !config.speakers.narrator ? { narrator: { name: 'Người dẫn truyện', voice_sample: '' }, ...config.speakers } : config.speakers })} />} />
        {config.enabled ? <>
            <Typography variant="caption">Mỗi nhân vật và người dẫn dùng một giọng riêng. Mỗi thời điểm chỉ một giọng nói. ID là tên sample Saydi, không phải số thứ tự.</Typography>
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {Object.entries(config.speakers).map(([id, speaker]) => <Stack key={id} spacing={1} sx={{ mb: 2 }}>
                    <TextField size="small" label={id === 'narrator' ? 'Người dẫn truyện (narrator)' : `Tên nhân vật (${id})`} value={speaker.name} disabled={busy || disabled} onChange={(e) => change({ ...config, speakers: { ...config.speakers, [id]: { ...speaker, name: e.target.value } } })} />
                    <TextField select size="small" label={`Giọng Saydi: ${speaker.name}`} value={speaker.voice_sample} disabled={busy || disabled} helperText={speaker.voice_sample ? `[giong-doc-id: ${speaker.voice_sample}]` : 'Chọn giọng trong danh mục bên dưới'} onChange={(e) => change({ ...config, speakers: { ...config.speakers, [id]: { ...speaker, voice_sample: e.target.value } } })}>
                        <MenuItem value="">Chọn giọng</MenuItem>
                        {speaker.voice_sample && !samples.some((s) => s.name === speaker.voice_sample) ? <MenuItem value={speaker.voice_sample}>{speaker.voice_sample} (đã lưu)</MenuItem> : null}
                        {samples.map((sample) => <MenuItem key={sample.name} value={sample.name}>{sample.display_name || sample.name} · {sample.name}</MenuItem>)}
                    </TextField>
                    {id !== 'narrator' ? <Button size="small" disabled={busy || disabled} onClick={() => { const next = { ...config.speakers }; delete next[id]; change({ ...config, speakers: next }); }}>Xóa nhân vật</Button> : null}
                </Stack>)}
            </Box>
            <Button disabled={busy || disabled} onClick={() => { let n = 1; while (config.speakers[`character_${n}`]) n++; change({ ...config, speakers: { ...config.speakers, [`character_${n}`]: { name: '', voice_sample: '' } } }); }}>Thêm nhân vật / giọng</Button>
            <Alert severity="info">Lưu trước khi copy prompt viết kịch bản. Prompt sẽ nhận bảng giọng này. Đổi giọng không tự sửa nhãn trong kịch bản cũ hay tạo lại audio; hãy cập nhật nhãn rồi lưu và duyệt kịch bản.</Alert>
        </> : null}
        <Button variant="outlined" disabled={busy || disabled} onClick={async () => {
            setBusy(true); setError(''); setSaved(false);
            try { const r = await saydiVoiceCastRequest(shortVideoId, config); if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message)); if (r.config) setConfig(r.config); setSaved(true); }
            catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
        }}>{busy ? 'Đang tải / lưu…' : 'Lưu cấu hình nhiều giọng'}</Button>
        {saved ? <Alert severity="success">Đã lưu cho video này. Mở lại prompt để lấy cấu hình mới.</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>;
}
