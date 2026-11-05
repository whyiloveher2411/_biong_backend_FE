import React from 'react';
import { Alert, Avatar, Button, Chip, CircularProgress, IconButton, List, ListItem, ListItemButton, ListItemAvatar, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { agentGeminiTtsSettings, previewAgentGeminiTts, type GeminiTtsSettings, type GeminiVoiceMetadata } from './agentVideoApi';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FemaleIcon from '@mui/icons-material/Female';
import MaleIcon from '@mui/icons-material/Male';

const voiceFilters = {
    language: 'Ngôn ngữ gốc',
    gender: 'Giới tính',
    pitch: 'Cao độ',
    style: 'Phong cách',
    use_case: 'Mục đích sử dụng',
} as const;
type VoiceFilter = keyof typeof voiceFilters;
const filterKeys = Object.keys(voiceFilters) as VoiceFilter[];

export default function ShortVideoAgentGeminiTtsSettings({ shortVideoId, selected, disabled, roleVoice, onSaveRoleVoice }: {
    shortVideoId: number;
    selected: boolean;
    disabled: boolean;
    roleVoice?: string;
    onSaveRoleVoice?: (voice: string) => Promise<void>;
}) {
    const [settings, setSettings] = React.useState<GeminiTtsSettings>();
    const [saved, setSaved] = React.useState<GeminiTtsSettings>();
    const [voices, setVoices] = React.useState<string[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [previewing, setPreviewing] = React.useState('');
    const [playing, setPlaying] = React.useState('');
    const [cachedVoices, setCachedVoices] = React.useState<string[]>([]);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const previewRequest = React.useRef(0);
    React.useEffect(() => () => {
        previewRequest.current += 1;
        audioRef.current?.pause();
    }, []);
    const [metadata, setMetadata] = React.useState<Record<string, GeminiVoiceMetadata>>({});
    const [filters, setFilters] = React.useState<Partial<Record<VoiceFilter, string>>>({});
    const [search, setSearch] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        let active = true;
        agentGeminiTtsSettings(shortVideoId).then((res) => {
            if (!active) return;
            if (!res.success || !res.settings || !res.voices) {
                setError((typeof res.message === 'string' ? res.message : res.message?.content) || 'Không tải được cài đặt Gemini TTS');
                return;
            }
            const initial = roleVoice === undefined ? res.settings : { ...res.settings, voice: roleVoice || res.settings.voice };
            setSettings(initial);
            setSaved({ ...initial, voice: roleVoice ?? initial.voice });
            setVoices(res.voices);
            setMetadata(res.voice_metadata ?? {});
            setCachedVoices(res.cached_voices ?? []);
        }).catch(() => {
            if (active) setError('Không tải được cài đặt Gemini TTS');
        });
        return () => { active = false; };
    }, [shortVideoId, roleVoice]);

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        setError('');
        try {
            if (onSaveRoleVoice) {
                await onSaveRoleVoice(settings.voice);
                return;
            }
            const res = await agentGeminiTtsSettings(shortVideoId, settings);
            if (!res.success || !res.settings) {
                setError((typeof res.message === 'string' ? res.message : res.message?.content) || 'Không lưu được cài đặt Gemini TTS');
                return;
            }
            setSettings(res.settings);
            setSaved(res.settings);
        } catch {
            setError('Không lưu được cài đặt Gemini TTS');
        } finally {
            setSaving(false);
        }
    };

    const preview = async (voice: string) => {
        audioRef.current?.pause();
        setPlaying('');
        if (playing === voice) return;

        const request = ++previewRequest.current;
        setPreviewing(voice);
        setError('');
        try {
            const res = await previewAgentGeminiTts(shortVideoId, { voice, style: '' });
            if (request !== previewRequest.current) return;
            if (!res.success || !res.audio_base64) {
                setError((typeof res.message === 'string' ? res.message : res.message?.content) || 'Không tải được mẫu Gemini');
                return;
            }

            setCachedVoices((current) => current.includes(voice) ? current : [...current, voice]);
            const audio = new Audio(`data:audio/mpeg;base64,${res.audio_base64}`);
            audioRef.current = audio;
            audio.onended = () => {
                if (request === previewRequest.current) setPlaying('');
            };
            setPlaying(voice);
            await audio.play();
        } catch {
            if (request === previewRequest.current) {
                setPlaying('');
                setError('Không phát được mẫu Gemini');
            }
        } finally {
            if (request === previewRequest.current) setPreviewing('');
        }
    };

    if (!settings) {
        return error ? <Alert severity="error">{error}</Alert> : null;
    }
    const dirty = settings.voice !== saved?.voice || settings.style !== saved?.style;

    const query = search.trim().toLocaleLowerCase('vi');
    const visibleVoices = voices.filter((voice) => {
        const info = metadata[voice];
        const searchable = [voice, info?.label, info?.description].join(' ').toLocaleLowerCase('vi');
        return searchable.includes(query) && filterKeys.every((key) => !filters[key] || info?.[key] === filters[key]);
    });

    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Gemini 3.8 Flash TTS</Typography>
            {!selected && !onSaveRoleVoice && (
                <Typography variant="caption" color="text.secondary">
                    Bạn có thể nghe thử ngay. Chọn Gemini ở danh sách nền tảng phía trên để dùng giọng này khi tạo audio.
                </Typography>
            )}
            <TextField
                size="small"
                label="Tìm giọng Gemini"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            {Object.keys(metadata).length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    {filterKeys.map((key) => {
                        const options = Array.from(new Set(Object.values(metadata).map((info) => info[key]))).sort((a, b) => a.localeCompare(b, 'vi'));
                        return (
                            <TextField
                                key={key}
                                select
                                SelectProps={{ native: true }}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                label={voiceFilters[key]}
                                value={filters[key] ?? ''}
                                onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
                            >
                                <option value="">Tất cả</option>
                                {options.map((option) => <option key={option} value={option}>{option}</option>)}
                            </TextField>
                        );
                    })}
                    {filterKeys.some((key) => filters[key]) && (
                        <Button size="small" onClick={() => setFilters({})}>Xóa bộ lọc</Button>
                    )}
                </Stack>
            )}
            {visibleVoices.length === 0 && <Typography variant="body2">Không tìm thấy giọng phù hợp.</Typography>}
            <List dense aria-label="Danh sách giọng Gemini" sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {visibleVoices.map((voice) => {
                    const info = metadata[voice];
                    const female = info?.gender === 'Nữ';
                    const male = info?.gender === 'Nam';
                    const cached = cachedVoices.includes(voice);
                    const label = playing === voice ? 'Dừng' : cached ? 'Phát mẫu' : 'Tạo và phát mẫu';
                    return (
                        <ListItem key={voice} disablePadding secondaryAction={
                            <IconButton
                                aria-label={`${label} ${voice}`}
                                title={label}
                                color={cached ? 'success' : 'default'}
                                disabled={Boolean(previewing)}
                                onClick={() => { void preview(voice); }}
                            >
                                {previewing === voice ? <CircularProgress size={20} /> :
                                    playing === voice ? <PauseIcon /> : <PlayArrowIcon />}
                            </IconButton>
                        }>
                            <ListItemButton
                                selected={settings.voice === voice}
                                aria-pressed={settings.voice === voice}
                                disabled={disabled || saving}
                                onClick={() => setSettings({ ...settings, voice })}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: female ? 'secondary.main' : 'primary.main' }}>
                                        {female ? <FemaleIcon /> : male ? <MaleIcon /> : (info?.label ?? voice).slice(0, 1)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={info?.label ?? voice}
                                    secondary={info && [info.language, info.gender, info.pitch, info.style, info.use_case, info.description].join(' · ')}
                                />
                                {saved?.voice === voice && <Chip size="small" label="Đang dùng" color="primary" />}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            {!onSaveRoleVoice && <TextField
                multiline
                minRows={2}
                label="Phong cách đọc"
                value={settings.style}
                disabled={disabled || saving}
                inputProps={{ maxLength: 1000 }}
                placeholder="Ấm áp, tự nhiên, đọc chậm và nhấn nhẹ các từ quan trọng"
                onChange={(e) => {
                    setSettings({ ...settings, style: e.target.value });
                }}
            />}
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="outlined" disabled={disabled || saving || !dirty} onClick={() => { void save(); }}>
                {saving ? 'Đang lưu…' : onSaveRoleVoice ? 'Dùng giọng này cho vai' : dirty ? 'Lưu giọng và phong cách' : 'Đã lưu giọng và phong cách'}
            </Button>
        </Stack>
    );
}
