import React from 'react';
import {
    Avatar,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Tooltip,
    Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    resolveOmnivoiceVoicePreviewUrl,
    type OmnivoiceVoiceCatalogItem,
} from './agentVideoApi';

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
    '#1976d2', // blue
    '#00897b', // teal
    '#7b1fa2', // purple
    '#e65100', // orange
    '#c62828', // red
    '#2e7d32', // green
    '#ad1457', // pink
    '#3949ab', // indigo
    '#00838f', // cyan
    '#6d4c41', // brown
] as const;

function normalizeVoiceKey(key: string): string {
    return String(key || '').normalize('NFC').trim().toLowerCase();
}

/**
 * Màu avatar theo voice key.
 * Nếu truyền `allKeys` (catalog), gán màu tuần tự theo key đã sort → không trùng trong list.
 */
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

type Props = {
    open: boolean;
    onClose: () => void;
    catalog: OmnivoiceVoiceCatalogItem[];
    selectedVoice: string;
    saving?: boolean;
    onSelect: (voiceKey: string) => void | Promise<void>;
    onPlayPreview: (item: OmnivoiceVoiceCatalogItem) => void;
    playingUrl: string | null;
};

export default function ShortVideoAgentOmnivoiceVoiceDrawer({
    open,
    onClose,
    catalog,
    selectedVoice,
    saving = false,
    onSelect,
    onPlayPreview,
    playingUrl,
}: Props) {
    const items = catalog.length > 0
        ? catalog
        : [{ key: 'minh_quân', label: 'minh quân' }];
    const catalogKeys = items.map((item) => item.key);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Chọn giọng OmniVoice"
            width={480}
            ModalProps={{
                sx: { zIndex: 1400 },
            }}
            restDialogContent={{
                sx: {
                    px: 0,
                    py: 0,
                },
            }}
        >
            <List disablePadding>
                {items.map((item) => {
                    const previewUrl = resolveOmnivoiceVoicePreviewUrl(item);
                    const isPlaying = Boolean(previewUrl && playingUrl === previewUrl);
                    const isSelected = selectedVoice === item.key;
                    const displayName = item.label || item.key.replace(/_/g, ' ');
                    const initials = voiceInitials(item.label || item.key);
                    const avatarColor = voiceAvatarColor(item.key, catalogKeys);

                    return (
                        <ListItemButton
                            key={item.key}
                            selected={isSelected}
                            disabled={saving}
                            onClick={() => {
                                void onSelect(item.key);
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
        </DrawerCustom>
    );
}
