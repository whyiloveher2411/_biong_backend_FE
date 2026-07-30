import React from 'react';
import {
    Avatar,
    Box,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
    resolveSaydiVoicePreviewUrl,
    type SaydiVoiceSampleItem,
} from './agentVideoApi';
import { voiceAvatarColor, voiceInitials } from './ShortVideoAgentOmnivoiceVoicePicker';

const GENDER_LABELS: Record<string, string> = {
    male: 'Nam',
    female: 'Nữ',
    neutral: 'Trung tính',
};

/** Drawer TTS dùng zIndex 1400 — menu Select phải cao hơn để không bị che. */
const SELECT_MENU_PROPS = {
    sx: { zIndex: 1500 },
    PaperProps: {
        sx: { zIndex: 1500 },
    },
} as const;

type Props = {
    active?: boolean;
    samples: SaydiVoiceSampleItem[];
    genders: string[];
    languages: string[];
    selectedVoice: string;
    loading?: boolean;
    saving?: boolean;
    errorMessage?: string;
    playingUrl?: string | null;
    onSelect: (voiceName: string) => void | Promise<void>;
    onPlayPreview: (item: SaydiVoiceSampleItem) => void;
};

export default function ShortVideoAgentSaydiVoicePicker({
    active = true,
    samples,
    genders,
    languages,
    selectedVoice,
    loading = false,
    saving = false,
    errorMessage = '',
    playingUrl = null,
    onSelect,
    onPlayPreview,
}: Props) {
    const [search, setSearch] = React.useState('');
    const [gender, setGender] = React.useState('all');
    const [language, setLanguage] = React.useState('vi');

    React.useEffect(() => {
        if (!active) {
            return;
        }
        if (languages.includes('vi')) {
            setLanguage('vi');
        } else if (languages.length > 0) {
            setLanguage(languages[0]);
        } else {
            setLanguage('all');
        }
    }, [active, languages]);

    const catalogKeys = samples.map((item) => item.name);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        return samples.filter((item) => {
            if (gender !== 'all' && String(item.gender || '').toLowerCase() !== gender) {
                return false;
            }
            if (language !== 'all' && String(item.language || '').toLowerCase() !== language) {
                return false;
            }
            if (!q) {
                return true;
            }
            const hay = `${item.display_name || ''} ${item.name || ''} ${item.description || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [samples, search, gender, language]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, gap: 1.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                    size="small"
                    fullWidth
                    label="Tìm giọng"
                    placeholder="Tên hoặc mã sample…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={loading}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="saydi-gender-filter">Giới tính</InputLabel>
                    <Select
                        labelId="saydi-gender-filter"
                        label="Giới tính"
                        value={gender}
                        onChange={(e) => setGender(String(e.target.value))}
                        disabled={loading}
                        MenuProps={SELECT_MENU_PROPS}
                    >
                        <MenuItem value="all">Tất cả</MenuItem>
                        {genders.map((g) => (
                            <MenuItem key={g} value={g}>
                                {GENDER_LABELS[g] || g}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="saydi-lang-filter">Ngôn ngữ</InputLabel>
                    <Select
                        labelId="saydi-lang-filter"
                        label="Ngôn ngữ"
                        value={language}
                        onChange={(e) => setLanguage(String(e.target.value))}
                        disabled={loading}
                        MenuProps={SELECT_MENU_PROPS}
                    >
                        <MenuItem value="all">Tất cả</MenuItem>
                        {languages.map((lang) => (
                            <MenuItem key={lang} value={lang}>
                                {lang}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : null}

            {!loading && errorMessage ? (
                <Typography variant="body2" color="error">
                    {errorMessage}
                </Typography>
            ) : null}

            {!loading && !errorMessage ? (
                <Typography variant="caption" color="text.secondary">
                    {`${filtered.length}/${samples.length} giọng`}
                </Typography>
            ) : null}

            {!loading ? (
                <List disablePadding sx={{ flex: 1, overflowY: 'auto', maxHeight: 360 }}>
                    {filtered.map((item) => {
                        const isSelected = selectedVoice === item.name;
                        const displayName = item.display_name || item.name;
                        const initials = voiceInitials(displayName);
                        const avatarColor = voiceAvatarColor(item.name, catalogKeys);
                        const previewUrl = resolveSaydiVoicePreviewUrl(item);
                        const isPlaying = Boolean(previewUrl && playingUrl === previewUrl);
                        const metaBits = [
                            item.gender ? (GENDER_LABELS[item.gender] || item.gender) : '',
                            item.language || '',
                            item.accent || '',
                        ].filter(Boolean);

                        return (
                            <ListItemButton
                                key={item.name}
                                selected={isSelected}
                                disabled={saving}
                                onClick={() => {
                                    void onSelect(item.name);
                                }}
                                sx={{
                                    py: 1.25,
                                    px: 2,
                                    gap: 1.5,
                                    alignItems: 'center',
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        bgcolor: avatarColor,
                                        color: '#fff',
                                        boxShadow: isSelected
                                            ? `0 0 0 2px ${avatarColor}55`
                                            : undefined,
                                    }}
                                >
                                    {initials}
                                </Avatar>
                                <ListItemText
                                    primary={(
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" fontWeight={isSelected ? 700 : 500}>
                                                {displayName}
                                            </Typography>
                                            {isSelected ? (
                                                <Chip size="small" label="Đang chọn" color="primary" />
                                            ) : null}
                                            {item.featured ? (
                                                <Chip size="small" label="Nổi bật" variant="outlined" />
                                            ) : null}
                                        </Stack>
                                    )}
                                    secondary={(
                                        <Typography variant="caption" color="text.secondary">
                                            {[item.name, ...metaBits].filter(Boolean).join(' · ')}
                                        </Typography>
                                    )}
                                />
                                <Tooltip title={previewUrl ? (isPlaying ? 'Dừng' : 'Nghe thử') : 'Chưa có file nghe thử'}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={!previewUrl || saving}
                                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                onPlayPreview(item);
                                            }}
                                            aria-label={isPlaying ? 'Dừng nghe thử' : 'Nghe thử'}
                                        >
                                            {isPlaying
                                                ? <StopIcon fontSize="small" />
                                                : <PlayArrowIcon fontSize="small" />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </ListItemButton>
                        );
                    })}
                    {filtered.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                            Không tìm thấy giọng phù hợp
                        </Typography>
                    ) : null}
                </List>
            ) : null}
        </Box>
    );
}
