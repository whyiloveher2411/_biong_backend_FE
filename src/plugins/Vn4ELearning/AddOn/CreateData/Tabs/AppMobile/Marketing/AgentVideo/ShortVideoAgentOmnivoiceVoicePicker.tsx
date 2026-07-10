import React from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
    resolveOmnivoiceVoicePreviewUrl,
    type OmnivoiceVoiceCatalogItem,
    type OmnivoiceVoiceDesignTokenGroup,
    type OmnivoiceVoiceMode,
} from './agentVideoApi';
import {
    formatOmnivoiceVoiceDesignGroupLabelVi,
    formatOmnivoiceVoiceDesignTokenVi,
} from './omnivoiceVoiceDesignLabels';

export function voiceInitials(labelOrKey: string): string {
    const parts = String(labelOrKey || '')
        .trim()
        .split(/[\s_]+/)
        .filter(Boolean);
    if (parts.length >= 2) {
        const a = parts[0][0] || '';
        const b = parts[1][0] || '';
        return `${a}${b}`.toUpperCase();
    }
    const single = parts[0] || '?';
    if (single.length === 1) {
        return single.toUpperCase();
    }
    return `${single[0].toUpperCase()}${single[1].toLowerCase()}`;
}

const VOICE_AVATAR_COLORS = [
    '#1976d2',
    '#00897b',
    '#7b1fa2',
    '#e65100',
    '#c62828',
    '#2e7d32',
    '#ad1457',
    '#3949ab',
    '#00838f',
    '#6d4c41',
] as const;

function normalizeVoiceKey(key: string): string {
    return String(key || '').normalize('NFC').trim().toLowerCase();
}

export function voiceAvatarColor(key: string, allKeys?: string[]): string {
    const normalized = normalizeVoiceKey(key);
    if (!normalized) {
        return VOICE_AVATAR_COLORS[0];
    }

    if (allKeys && allKeys.length > 0) {
        const sortedUnique = Array.from(
            new Set(allKeys.map(normalizeVoiceKey).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'vi'));
        const index = sortedUnique.indexOf(normalized);
        if (index >= 0) {
            return VOICE_AVATAR_COLORS[index % VOICE_AVATAR_COLORS.length];
        }
    }

    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
        hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
        hash |= 0;
    }
    return VOICE_AVATAR_COLORS[Math.abs(hash) % VOICE_AVATAR_COLORS.length];
}

function normalizeToken(token: string): string {
    return String(token || '').trim().toLowerCase();
}

function parseDesignTokens(design: string): Set<string> {
    return new Set(
        String(design || '')
            .split(',')
            .map((part) => normalizeToken(part))
            .filter(Boolean),
    );
}

function buildDesignString(activeTokens: Set<string>, catalog: OmnivoiceVoiceDesignTokenGroup[]): string {
    const ordered: string[] = [];
    catalog.forEach((group) => {
        group.tokens.forEach((token) => {
            const normalized = normalizeToken(token);
            if (activeTokens.has(normalized)) {
                ordered.push(token);
            }
        });
    });
    return ordered.join(', ');
}

function toggleDesignToken(
    design: string,
    token: string,
    catalog: OmnivoiceVoiceDesignTokenGroup[],
): string {
    const normalized = normalizeToken(token);
    const active = parseDesignTokens(design);
    if (active.has(normalized)) {
        active.delete(normalized);
    } else {
        active.add(normalized);
    }
    return buildDesignString(active, catalog);
}

export type OmnivoiceVoicePickerProps = {
    active?: boolean;
    catalog: OmnivoiceVoiceCatalogItem[];
    selectedVoice: string;
    selectedVoiceMode: OmnivoiceVoiceMode;
    selectedVoiceDesign: string;
    designTokenGroups: OmnivoiceVoiceDesignTokenGroup[];
    saving?: boolean;
    previewingDesign?: boolean;
    onSelectClone: (voiceKey: string) => void | Promise<void>;
    onApplyDesign: (design: string) => void | Promise<void>;
    onPlayPreview: (item: OmnivoiceVoiceCatalogItem) => void;
    onPlayDesignPreview: (design: string) => void;
    playingUrl: string | null;
};

export default function ShortVideoAgentOmnivoiceVoicePicker({
    active = true,
    catalog,
    selectedVoice,
    selectedVoiceMode,
    selectedVoiceDesign,
    designTokenGroups,
    saving = false,
    previewingDesign = false,
    onSelectClone,
    onApplyDesign,
    onPlayPreview,
    onPlayDesignPreview,
    playingUrl,
}: OmnivoiceVoicePickerProps) {
    const items = catalog.length > 0
        ? catalog
        : [{ key: 'minh_quân', label: 'minh quân' }];
    const catalogKeys = items.map((item) => item.key);
    const [tab, setTab] = React.useState<OmnivoiceVoiceMode>(selectedVoiceMode);
    const [draftDesign, setDraftDesign] = React.useState(selectedVoiceDesign);

    React.useEffect(() => {
        if (!active) {
            return;
        }
        setTab(selectedVoiceMode);
        setDraftDesign(selectedVoiceDesign);
    }, [active, selectedVoiceDesign, selectedVoiceMode]);

    const tokenCatalog = designTokenGroups.length > 0
        ? designTokenGroups
        : [
            { id: 'gender', label: 'Giới tính', tokens: ['male', 'female'] },
            { id: 'age', label: 'Độ tuổi', tokens: ['young adult', 'middle-aged', 'elderly'] },
            { id: 'pitch', label: 'Cao độ', tokens: ['moderate pitch', 'low pitch', 'very low pitch'] },
        ];
    const activeTokens = parseDesignTokens(draftDesign);
    const designDirty = draftDesign.trim() !== selectedVoiceDesign.trim()
        || selectedVoiceMode !== 'design';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
            <Tabs
                value={tab}
                onChange={(_event, nextTab: OmnivoiceVoiceMode) => setTab(nextTab)}
                variant="fullWidth"
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    minHeight: 44,
                }}
            >
                <Tab label="Giọng có sẵn" value="clone" sx={{ minHeight: 44, textTransform: 'none' }} />
                <Tab label="Thiết kế giọng" value="design" sx={{ minHeight: 44, textTransform: 'none' }} />
            </Tabs>

            {tab === 'clone' ? (
                <List disablePadding sx={{ flex: 1, overflowY: 'auto', maxHeight: 360 }}>
                    {items.map((item) => {
                        const previewUrl = resolveOmnivoiceVoicePreviewUrl(item);
                        const isPlaying = Boolean(previewUrl && playingUrl === previewUrl);
                        const isSelected = selectedVoiceMode === 'clone' && selectedVoice === item.key;
                        const displayName = item.label || item.key.replace(/_/g, ' ');
                        const initials = voiceInitials(item.label || item.key);
                        const avatarColor = voiceAvatarColor(item.key, catalogKeys);

                        return (
                            <ListItemButton
                                key={item.key}
                                selected={isSelected}
                                disabled={saving}
                                onClick={() => {
                                    void onSelectClone(item.key);
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
                                        <Typography
                                            variant="body1"
                                            fontWeight={700}
                                            noWrap
                                        >
                                            {displayName}
                                        </Typography>
                                    )}
                                />
                                {isSelected ? (
                                    <Typography
                                        variant="caption"
                                        color="primary"
                                        sx={{
                                            fontStyle: 'italic',
                                            whiteSpace: 'nowrap',
                                            mr: 0.25,
                                        }}
                                    >
                                        Đang chọn
                                    </Typography>
                                ) : null}
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
                </List>
            ) : (
                <Box sx={{ px: 0, py: 1.5, display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
                    <TextField
                        label="Thiết kế giọng"
                        value={draftDesign}
                        onChange={(event) => setDraftDesign(event.target.value)}
                        placeholder="male, middle-aged, very low pitch"
                        multiline
                        minRows={2}
                        fullWidth
                        disabled={saving}
                        helperText="Chọn chip bên dưới hoặc gõ token tiếng Anh, phân tách bằng dấu phẩy"
                    />

                    {tokenCatalog.map((group) => (
                        <Box key={group.id}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                                {formatOmnivoiceVoiceDesignGroupLabelVi(group.id, group.label)}
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                {group.tokens.map((token) => {
                                    const selected = activeTokens.has(normalizeToken(token));
                                    return (
                                        <Chip
                                            key={`${group.id}-${token}`}
                                            label={formatOmnivoiceVoiceDesignTokenVi(token)}
                                            size="small"
                                            clickable
                                            color={selected ? 'primary' : 'default'}
                                            variant={selected ? 'filled' : 'outlined'}
                                            disabled={saving}
                                            onClick={() => {
                                                setDraftDesign((prev) => toggleDesignToken(prev, token, tokenCatalog));
                                            }}
                                        />
                                    );
                                })}
                            </Stack>
                        </Box>
                    ))}

                    <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                        <Button
                            variant="outlined"
                            startIcon={previewingDesign
                                ? <CircularProgress size={16} />
                                : (playingUrl && playingUrl.includes('mode=design')
                                    ? <StopIcon />
                                    : <PlayArrowIcon />)}
                            disabled={saving || previewingDesign || !draftDesign.trim()}
                            onClick={() => onPlayDesignPreview(draftDesign)}
                        >
                            {previewingDesign ? 'Đang tạo...' : 'Nghe thử'}
                        </Button>
                        <Button
                            variant="contained"
                            disabled={saving || !draftDesign.trim() || (!designDirty && selectedVoiceMode === 'design')}
                            onClick={() => {
                                void onApplyDesign(draftDesign.trim());
                            }}
                        >
                            Áp dụng
                        </Button>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
