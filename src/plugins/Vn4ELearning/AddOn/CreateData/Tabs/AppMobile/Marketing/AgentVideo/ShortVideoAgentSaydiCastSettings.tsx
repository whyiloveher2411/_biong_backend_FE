import React from 'react';
import { Alert, Box, Button, Chip, Collapse, Stack, TextField, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha, type Theme } from '@mui/material/styles';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { AGENT_AUDIO_SCRIPT_SAVED_EVENT } from 'helpers/marketingAgentAudioScriptGeminiWorkflow';
import { saydiVoiceCastRequest, saveSaydiVoiceManifest, fetchSaydiVoiceSamples, resolveSaydiVoicePreviewUrl, type SaydiVoiceCast, type SaydiVoiceSampleItem } from './agentVideoApi';
import ShortVideoAgentSaydiVoicePicker from './ShortVideoAgentSaydiVoicePicker';

type Props = { shortVideoId: number; samples?: SaydiVoiceSampleItem[]; disabled?: boolean; revision?: string };

/** Màu nền/border xen kẽ để tách các dòng giọng dễ nhìn. */
const ROLE_TONES = ['primary', 'secondary', 'success', 'info', 'warning'] as const;
type RoleTone = typeof ROLE_TONES[number];
const roleTone = (index: number): RoleTone => ROLE_TONES[index % ROLE_TONES.length];
const roleBoxSx = (tone: RoleTone) => (theme: Theme) => ({
    p: 1.25,
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: alpha(theme.palette[tone].main, 0.35),
    borderLeft: '4px solid',
    borderLeftColor: theme.palette[tone].main,
    bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.16 : 0.06),
});

export default function ShortVideoAgentSaydiCastSettings({ shortVideoId, disabled = false, revision }: Props) {
    const [config, setConfig] = React.useState<SaydiVoiceCast>({ enabled: false, speakers: {} });
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [manifest, setManifest] = React.useState('');
    const [manifestOpen, setManifestOpen] = React.useState(false);
    const manifestDirty = React.useRef(false);
    const [manifestReady, setManifestReady] = React.useState(false);
    const [selectedRole, setSelectedRole] = React.useState('');
    const [catalog, setCatalog] = React.useState<SaydiVoiceSampleItem[]>([]);
    const [genders, setGenders] = React.useState<string[]>([]);
    const [languages, setLanguages] = React.useState<string[]>([]);
    const [catalogLoading, setCatalogLoading] = React.useState(false);
    const [catalogError, setCatalogError] = React.useState('');
    const [catalogRevision, setCatalogRevision] = React.useState(0);
    const [refresh, setRefresh] = React.useState(0);
    const [scanning, setScanning] = React.useState(false);
    const [playingUrl, setPlayingUrl] = React.useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const hasLoadedRef = React.useRef(false);
    const loadedVideoRef = React.useRef<number | null>(null);
    const requestIdRef = React.useRef(0);
    React.useEffect(() => {
        const onSaved = (e: Event) => { if (Number((e as CustomEvent).detail?.shortVideoId) === shortVideoId) setRefresh((n) => n + 1); };
        document.addEventListener(AGENT_AUDIO_SCRIPT_SAVED_EVENT, onSaved);
        return () => document.removeEventListener(AGENT_AUDIO_SCRIPT_SAVED_EVENT, onSaved);
    }, [shortVideoId]);
    React.useEffect(() => {
        let active = true;
        const requestId = ++requestIdRef.current;
        const videoChanged = loadedVideoRef.current !== shortVideoId;
        const firstLoad = videoChanged || !hasLoadedRef.current;
        if (videoChanged) {
            loadedVideoRef.current = shortVideoId;
            hasLoadedRef.current = false;
            setConfig({ enabled: false, speakers: {} });
            setManifest('');
            setManifestReady(false);
            manifestDirty.current = false;
            setSelectedRole('');
        }
        // Chỉ hiện trạng thái "đang quét" ở lần tải đầu / khi đổi video.
        // Các lần tự động quét lại chạy ngầm để danh sách giọng không bị chớp tắt.
        if (firstLoad) { setLoading(true); setError(''); }
        void saydiVoiceCastRequest(shortVideoId).then((r) => {
            if (!active || requestId !== requestIdRef.current) return;
            if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message));
            const next = r.config ?? { enabled: false, speakers: {} };
            hasLoadedRef.current = true;
            setConfig((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
            setManifestReady(r.manifest_ready ?? Object.values(next.speakers ?? {}).every((v) => Boolean(v.description)));
            if (!manifestDirty.current) {
                const nextManifest = r.manifest_json ?? '';
                setManifest((prev) => (prev === nextManifest ? prev : nextManifest));
            }
            setSelectedRole((prev) => (prev && next.speakers?.[prev] ? prev : ''));
        }).catch((e) => {
            if (!active || requestId !== requestIdRef.current) return;
            // Lỗi khi quét ngầm: giữ nguyên dữ liệu đang hiển thị, không làm layout nhảy.
            if (firstLoad) setError(String(e instanceof Error ? e.message : e));
        }).finally(() => {
            if (!active || requestId !== requestIdRef.current) return;
            setLoading(false);
            setScanning(false);
        });
        return () => { active = false; };
    }, [shortVideoId, revision, refresh]);
    React.useEffect(() => {
        if (!selectedRole) return;
        let active = true;
        setCatalogLoading(true); setCatalogError('');
        void fetchSaydiVoiceSamples(shortVideoId, { forceRefresh: catalogRevision > 0 }).then((r) => {
            if (!active) return;
            if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message));
            setCatalog(r.samples ?? []); setGenders(r.genders ?? []); setLanguages(r.languages ?? []);
        }).catch((e) => { if (active) setCatalogError(String(e.message ?? e)); }).finally(() => { if (active) setCatalogLoading(false); });
        return () => { active = false; };
    }, [shortVideoId, selectedRole, catalogRevision]);
    React.useEffect(() => {
        if (selectedRole || saving) return;
        const timer = window.setInterval(() => setRefresh((n) => n + 1), 10000);
        return () => window.clearInterval(timer);
    }, [selectedRole, saving]);
    React.useEffect(() => () => { audioRef.current?.pause(); }, []);
    const close = () => { audioRef.current?.pause(); setPlayingUrl(null); setSelectedRole(''); };
    const speaker = config.speakers[selectedRole];
    const voiceAssignments = React.useMemo(() => {
        const bySample: Record<string, Array<{ speakerId: string; name: string }>> = {};
        Object.entries(config.speakers).forEach(([id, role]) => {
            if (role.voice_sample) (bySample[role.voice_sample] ||= []).push({ speakerId: id, name: role.name || id });
        });
        return bySample;
    }, [config.speakers]);
    const genderLabels = { male: 'Nam', female: 'Nữ', neutral: 'Trung tính', unknown: 'Chưa xác định' };
    const missing = Object.values(config.speakers).filter((s) => !s.voice_sample).length;
    return <Stack spacing={1} sx={{ py: 1 }}>
        <Typography variant="subtitle2">Giọng đọc trong kịch bản</Typography>
        <Typography variant="caption">Viết và lưu kịch bản trước. Sau đó dán JSON id/description/gender của chatbot để đối chiếu. Danh sách này độc lập với nhân vật trên hình.</Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'action.hover' }}>
            <Button fullWidth color="inherit" aria-label={manifestOpen ? 'Thu gọn danh sách giọng JSON' : 'Mở rộng danh sách giọng JSON'} aria-expanded={manifestOpen} aria-controls="saydi-voice-manifest-json" onClick={() => setManifestOpen((v) => !v)}
                endIcon={manifestOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ justifyContent: 'space-between', textTransform: 'none', px: 1.25, py: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>Danh sách giọng (JSON)</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{manifest.trim() ? 'Đã nhập' : 'Chưa nhập'}</Typography>
                </Box>
            </Button>
            <Collapse in={manifestOpen} timeout="auto" unmountOnExit>
                <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
                    <TextField id="saydi-voice-manifest-json" label="Danh sách giọng (JSON)" multiline minRows={4} value={manifest} placeholder={'{"voices":[{"id":"giong-dan-truyen","description":"Giọng người dẫn chuyện...","gender":"male"}]}'} onChange={(e) => { manifestDirty.current = true; setManifest(e.target.value); }} disabled={disabled || saving} />
                    <Button disabled={disabled || saving || !manifest.trim()} onClick={async () => {
                        setSaving(true); setError(''); setNotice('');
                        try { const r = await saveSaydiVoiceManifest(shortVideoId, manifest); if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message)); if (r.config) setConfig(r.config); setManifestReady(Boolean(r.manifest_ready)); manifestDirty.current = false; setNotice('Đã lưu JSON; danh sách ID khớp kịch bản.'); }
                        catch(e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
                    }}>Lưu danh sách giọng JSON</Button>
                </Stack>
            </Collapse>
        </Box>
        {!manifestReady && Object.keys(config.speakers).length > 0 ? <Alert severity="warning">Lưu JSON có description khớp toàn bộ ID trong script trước khi cài giọng.</Alert> : null}
        {loading ? <Typography variant="caption">Đang quét kịch bản đã lưu…</Typography> : Object.keys(config.speakers).length ? <Stack spacing={1}>
            {Object.entries(config.speakers).map(([id, role], index) => <Box key={id} sx={roleBoxSx(roleTone(index))}>
                <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                    <Chip size="small" label={genderLabels[role.gender || 'unknown']} variant="outlined" />
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0, wordBreak: 'break-word' }}>{role.name || 'Chưa đặt tên'}</Typography>
                    <Box component="span" sx={{ flexShrink: 0, px: 0.75, borderRadius: 0.75, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{id}</Typography>
                    </Box>
                </Stack>
                <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 0.75 }}>{role.description || 'Chưa có mô tả'}</Typography>
                <Stack direction="row" alignItems="flex-start" flexWrap="wrap" sx={{ mt: 1, gap: 1 }}>
                    <Chip size="small" label={role.voice_sample || 'Chưa chọn giọng'} color={role.voice_sample ? 'default' : 'warning'} variant={role.voice_sample ? 'outlined' : 'filled'} sx={{ maxWidth: '100%', height: 'auto', minHeight: 24, '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.5 } }} />
                    <Button size="small" variant="outlined" sx={{ flexShrink: 0 }} disabled={disabled || saving || !manifestReady} aria-label={`Cài đặt giọng ${id}`} onClick={() => {setError(''); setNotice(''); setSelectedRole(id);}}>Cài đặt giọng</Button>
                </Stack>
            </Box>)}
            {missing ? <Alert severity="info">Còn {missing} ID chưa chọn giọng. Bạn vẫn có thể viết, lưu và chia beat; chọn đủ giọng trước khi tạo audio.</Alert> : null}
        </Stack> : <Typography variant="body2">Chưa có ID lời đọc trong kịch bản đã lưu.</Typography>}
        <Button size="small" disabled={loading || scanning || saving} onClick={() => { setScanning(true); setRefresh((n) => n + 1); }}>{scanning ? 'Đang quét kịch bản…' : 'Quét lại kịch bản đã lưu'}</Button>
        {notice ? <Alert severity="success">{notice}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <DrawerCustom open={Boolean(selectedRole)} onClose={close} title={`Giọng đọc: ${speaker?.name || selectedRole}`} width={600} ModalProps={{ sx: { zIndex: 1400 } }}>
            <Stack spacing={1} sx={{ p: 2 }}>
                <Typography variant="body2">Mô tả: {speaker?.description}. ID trong kịch bản: {selectedRole}. Chọn sample Saydi chỉ thay giọng đọc, không đổi ID hay nhân vật trên hình.</Typography>
                <Typography variant="caption">Giới tính giọng: {genderLabels[speaker?.gender || 'unknown']}. {speaker?.gender && speaker.gender !== 'unknown' ? 'Danh mục tự lọc theo giới tính này; bạn vẫn có thể đổi bộ lọc.' : 'Chưa có giới tính trong dữ liệu, hiển thị tất cả; không đoán từ tên.'}</Typography>
                <Typography variant="caption">Đổi giọng sẽ đánh dấu audio cũ cần tạo lại. Các ID khác chưa chọn giọng vẫn được giữ.</Typography>
                <Button disabled={catalogLoading || saving} onClick={() => setCatalogRevision((n) => n + 1)}>Tải lại danh mục từ API Saydi</Button>
                <Box sx={{ height: 450, display: 'flex', flexDirection: 'column' }}>
                    <ShortVideoAgentSaydiVoicePicker key={selectedRole} defaultGender={speaker?.gender && speaker.gender !== 'unknown' ? speaker.gender : 'all'} active={Boolean(selectedRole)} voiceAssignments={voiceAssignments} currentSpeakerId={selectedRole} samples={catalog} usedVoices={[]} genders={genders} languages={languages} selectedVoice={speaker?.voice_sample ?? ''} loading={catalogLoading} saving={saving || disabled} errorMessage={catalogError} playingUrl={playingUrl}
                        onSelect={async (voice) => {
                            if (!speaker) return;
                            const owners = (voiceAssignments[voice] || []).filter((owner) => owner.speakerId !== selectedRole);
                            if (owners.length) { setError(`Giọng này đã gán cho ${owners.map((owner) => `${owner.name} (${owner.speakerId})`).join(', ')}. Hãy chọn giọng khác.`); return; }
                            const next = { ...config, speakers: { ...config.speakers, [selectedRole]: { ...speaker, voice_sample: voice } } };
                            setSaving(true); setError('');
                            try { const r = await saydiVoiceCastRequest(shortVideoId, next); if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message)); setConfig(r.config ?? next); setNotice('Đã lưu giọng. ID trong kịch bản được giữ nguyên.'); close(); window.dispatchEvent(new CustomEvent('whatif-audio-updated', { detail: { shortVideoId } })); document.dispatchEvent(new CustomEvent(AGENT_AUDIO_SCRIPT_SAVED_EVENT, { detail: { shortVideoId } })); }
                            catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
                        }}
                        onPlayPreview={(sample) => {
                            const url = resolveSaydiVoicePreviewUrl(sample);
                            audioRef.current?.pause();
                            if (playingUrl === url) { setPlayingUrl(null); return; }
                            const audio = new Audio(url); audioRef.current = audio; setPlayingUrl(url);
                            audio.onended = () => setPlayingUrl(null);
                            void audio.play().catch(() => { setCatalogError('Không phát được mẫu giọng'); setPlayingUrl(null); });
                        }} />
                </Box>
                {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
        </DrawerCustom>
    </Stack>;
}
