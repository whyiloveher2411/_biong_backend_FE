import React from 'react';
import { Avatar, Box, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import { AGENT_AUDIO_SCRIPT_SAVED_EVENT } from 'helpers/marketingAgentAudioScriptGeminiWorkflow';
import { saydiVoiceCastRequest } from './agentVideoApi';

type Voice = { id: string; name: string; description: string; voice_sample: string };

/** Use the entire video's role list, not the subset/order of speakers in this beat. */
export function beatVoiceColor(id: string, allIds: string[]): string {
    const ordered = Array.from(new Set([...allIds, id])).sort();
    return `hsl(${((ordered.indexOf(id) * 137.508) % 360).toFixed(3)}, 65%, 34%)`;
}

export default function BeatVoiceSummary({ shortVideoId, beatId, compact = false }: { shortVideoId: number; beatId: string; compact?: boolean }) {
    const [voices, setVoices] = React.useState<Voice[] | null>(null);
    const [allIds, setAllIds] = React.useState<string[]>([]);
    const [error, setError] = React.useState('');
    const [revision, setRevision] = React.useState(0);
    React.useEffect(() => {
        const updated = (e: Event) => { if (Number((e as CustomEvent).detail?.shortVideoId) === shortVideoId) setRevision((n) => n + 1); };
        document.addEventListener(AGENT_AUDIO_SCRIPT_SAVED_EVENT, updated);
        return () => document.removeEventListener(AGENT_AUDIO_SCRIPT_SAVED_EVENT, updated);
    }, [shortVideoId]);
    React.useEffect(() => {
        let current = true;
        setVoices(null); setError('');
        void saydiVoiceCastRequest(shortVideoId, undefined, beatId).then((r) => {
            if (!current) return;
            if (!r.success) throw new Error(typeof r.message === 'string' ? r.message : JSON.stringify(r.message));
            setVoices(r.beat_voices ?? []);
            setAllIds(Object.keys(r.config?.speakers ?? {}));
        }).catch((e) => { if (current) setError(e instanceof Error ? e.message : String(e)); });
        return () => { current = false; };
    }, [shortVideoId, beatId, revision]);
    const message = error || (voices === null ? 'Đang tải giọng của beat…' : 'Beat chưa có ID giọng đọc.');
    return <Stack role="group" aria-label="Giọng dùng trong beat" spacing={0.75} sx={{ mt: 1, ...(compact ? { pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.3)', alignItems: 'center', width: 64 } : {}) }}>
        <Typography variant="caption" sx={compact ? { color: 'common.white', fontSize: 10 } : { fontWeight: 700 }}>Giọng đọc</Typography>
        {voices?.length ? <Stack direction={compact ? 'column' : 'row'} flexWrap="wrap" sx={{ gap: 0.75 }}>
            {voices.map((voice) => {
                const color = beatVoiceColor(voice.id, allIds);
                const label = voice.name || voice.id;
                const title = `${label} (${voice.id})${voice.description ? ' — ' + voice.description : ''} · ${voice.voice_sample || 'Chưa cài giọng Saydi'}`;
                return <Tooltip key={voice.id} title={title} placement={compact ? 'left' : 'top'}>
                    <Box tabIndex={0} aria-label={`Giọng đọc: ${label} (${voice.id})`} data-voice-id={voice.id} data-voice-color={color}>
                        {compact ? <Stack alignItems="center" sx={{ width: 64 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: color, color: '#fff' }}><RecordVoiceOverOutlinedIcon sx={{ fontSize: 18 }} /></Avatar>
                            <Typography variant="caption" noWrap sx={{ maxWidth: 64, color: 'common.white', fontSize: 10 }}>{label}</Typography>
                        </Stack> : <Chip size="small" label={`${label} · ${voice.id}`} sx={{ bgcolor: color, color: '#fff', maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.5 } }} />}
                    </Box>
                </Tooltip>;
            })}
        </Stack> : <Tooltip title={message}><Box>
            {compact && !error && voices === null ? <CircularProgress size={16} sx={{ color: 'common.white' }} /> : <Typography variant="caption" role={error ? 'alert' : undefined} sx={{ color: compact ? 'common.white' : 'text.secondary' }}>{compact ? (error ? 'Lỗi tải' : '—') : message}</Typography>}
        </Box></Tooltip>}
    </Stack>;
}
