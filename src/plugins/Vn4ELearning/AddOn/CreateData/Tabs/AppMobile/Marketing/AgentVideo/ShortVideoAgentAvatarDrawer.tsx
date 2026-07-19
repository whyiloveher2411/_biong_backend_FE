import React from 'react';
import {
    Box,
    Button,
    ImageList,
    ImageListItem,
    Stack,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { convertToURL, validURL } from 'helpers/url';
import type { AvatarPipAnchor, VerifiedAvatarOption } from './agentVideoApi';

export const AVATAR_PIP_ANCHORS: Array<{
    id: AvatarPipAnchor;
    label: string;
}> = [
    { id: 'top_left', label: 'Trên trái' },
    { id: 'top_right', label: 'Trên phải' },
    { id: 'center', label: 'Giữa' },
    { id: 'bottom_left', label: 'Dưới trái' },
    { id: 'bottom_right', label: 'Dưới phải' },
];

function resolveMasterSrc(raw: string): string {
    const s = String(raw || '').trim();
    if (!s) {
        return '';
    }
    if (validURL(s) || s.startsWith('data:')) {
        return s;
    }
    if (s.startsWith('//')) {
        return `https:${s}`;
    }
    if (s.startsWith('{')) {
        try {
            const parsed = JSON.parse(s) as { link?: string };
            const link = String(parsed?.link || '').trim();
            if (!link) {
                return '';
            }
            return validURL(link) ? link : convertToURL(process.env.REACT_APP_BASE_URL, link);
        } catch {
            return '';
        }
    }
    return convertToURL(process.env.REACT_APP_BASE_URL, s.replace(/^\//, ''));
}

function AnchorPreviewTile({
    anchor,
    selected,
    onSelect,
}: {
    anchor: AvatarPipAnchor;
    selected: boolean;
    onSelect: () => void;
}) {
    const spot = (() => {
        switch (anchor) {
            case 'top_left':
                return { top: 6, left: 6 };
            case 'top_right':
                return { top: 6, right: 6 };
            case 'bottom_left':
                return { bottom: 10, left: 6 };
            case 'center':
                return { top: '42%', left: '42%' };
            case 'bottom_right':
            default:
                return { bottom: 10, right: 6 };
        }
    })();

    return (
        <Button
            variant={selected ? 'contained' : 'outlined'}
            color={selected ? 'primary' : 'inherit'}
            onClick={onSelect}
            sx={{
                flex: '1 1 30%',
                minWidth: 88,
                maxWidth: 120,
                p: 0.75,
                flexDirection: 'column',
                gap: 0.5,
                textTransform: 'none',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '9 / 16',
                    borderRadius: 0.75,
                    bgcolor: selected ? 'rgba(255,255,255,0.18)' : 'action.hover',
                    border: '1px solid',
                    borderColor: selected ? 'transparent' : 'divider',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: selected ? 'common.white' : 'primary.main',
                        ...spot,
                    }}
                />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {AVATAR_PIP_ANCHORS.find((item) => item.id === anchor)?.label || anchor}
            </Typography>
        </Button>
    );
}

type Props = {
    open: boolean;
    onClose: () => void;
    avatars: VerifiedAvatarOption[];
    selectedId: number;
    selectedAnchor: AvatarPipAnchor;
    saving?: boolean;
    onApply: (avatarId: number, anchor: AvatarPipAnchor) => void | Promise<void>;
};

export default function ShortVideoAgentAvatarDrawer({
    open,
    onClose,
    avatars,
    selectedId,
    selectedAnchor,
    saving = false,
    onApply,
}: Props) {
    const [draftId, setDraftId] = React.useState(selectedId);
    const [draftAnchor, setDraftAnchor] = React.useState<AvatarPipAnchor>(selectedAnchor);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        setDraftId(selectedId);
        setDraftAnchor(selectedAnchor);
    }, [open, selectedId, selectedAnchor]);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Chọn avatar lip-sync"
            width={440}
            ModalProps={{ sx: { zIndex: 1400 } }}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 136px)',
                    overflow: 'auto',
                    pt: 2,
                    px: 0,
                    pb: 2,
                },
            }}
            action={(
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: '100%' }}>
                    <Button
                        color="inherit"
                        disabled={saving}
                        onClick={() => {
                            void onApply(0, draftAnchor);
                        }}
                    >
                        Bỏ chọn
                    </Button>
                    <LoadingButton
                        variant="contained"
                        loading={saving}
                        disabled={saving}
                        onClick={() => {
                            void onApply(draftId, draftAnchor);
                        }}
                        endIcon={<ChevronRightIcon />}
                    >
                        Áp dụng
                    </LoadingButton>
                </Stack>
            )}
        >
            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 600 }}>
                        Avatar verified
                    </Typography>
                    {avatars.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            Chưa có avatar verified. Tạo và verify trong quản lý avatar trước.
                        </Typography>
                    ) : (
                        <ImageList cols={3} gap={10} sx={{ m: 0 }}>
                            {avatars.map((item) => {
                                const selected = draftId === item.id;
                                const src = resolveMasterSrc(item.master_url);
                                return (
                                    <ImageListItem key={item.id} sx={{ overflow: 'hidden' }}>
                                        <Button
                                            onClick={() => setDraftId(item.id)}
                                            sx={{
                                                p: 0.75,
                                                width: '100%',
                                                flexDirection: 'column',
                                                gap: 0.75,
                                                textTransform: 'none',
                                                border: '2px solid',
                                                borderColor: selected ? 'primary.main' : 'transparent',
                                                bgcolor: selected ? 'action.selected' : 'transparent',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    bgcolor: '#fff',
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                {src ? (
                                                    <Box
                                                        component="img"
                                                        src={src}
                                                        alt=""
                                                        sx={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            display: 'block',
                                                        }}
                                                    />
                                                ) : null}
                                            </Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: selected ? 700 : 500,
                                                    lineHeight: 1.25,
                                                    textAlign: 'center',
                                                    width: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {item.title || `Avatar #${item.id}`}
                                            </Typography>
                                        </Button>
                                    </ImageListItem>
                                );
                            })}
                        </ImageList>
                    )}
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                        Vị trí PiP
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Chọn góc hoặc giữa khung 9:16.
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        {AVATAR_PIP_ANCHORS.map((item) => (
                            <AnchorPreviewTile
                                key={item.id}
                                anchor={item.id}
                                selected={draftAnchor === item.id}
                                onSelect={() => setDraftAnchor(item.id)}
                            />
                        ))}
                    </Stack>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
