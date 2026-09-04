import React from 'react';
import {
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import type { useAgentVideoContent } from './useAgentVideoContent';
import ShortVideoAgentVideoSettingsDialog from './ShortVideoAgentVideoSettingsDialog';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
    /** beat_N — beat đang chọn trong box ảnh. */
    beatId: string;
};

const compactButtonSx = {
    minWidth: 0,
    px: 1,
    py: 0.25,
    fontSize: 11,
    textTransform: 'none',
    borderColor: 'rgba(255,255,255,0.35)',
    color: 'common.white',
    '&:disabled': {
        color: 'rgba(255,255,255,0.38)',
        borderColor: 'rgba(255,255,255,0.18)',
    },
} as const;

/**
 * Cụm control góc dưới-trái (trên phần audio): icon setting mở dialog settings
 * toàn video (field parse từ prompts/{folder}/setting-field.md theo visual type)
 * đặt TRÊN hàng nút: Mở url chatbot đã tạo ảnh + Xóa ảnh beat hiện tại.
 */
export default function WhiteboardBeatImageControl({ state, beatId }: Props) {
    const entry = state.beatImage[beatId];
    const chatUrl = String(entry?.chat_url || '').trim();
    const hasImage = Boolean(String(entry?.image_url || '').trim());
    const deleting = state.deletingBeatImageId === beatId;
    const busy = Boolean(state.deletingBeatImageId);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    return (
        <>
            <Stack
                direction="column"
                spacing={0.5}
                alignItems="flex-start"
            >
                <Tooltip
                    placement="top"
                    title="Cài đặt video — setting fields theo visual type (prompts/setting-field.md)"
                >
                    <IconButton
                        size="small"
                        aria-label="Cài đặt video"
                        onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            setSettingsOpen(true);
                        }}
                        sx={{
                            color: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.55)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        }}
                    >
                        <SettingsIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(0,0,0,0.55)',
                    }}
                >
                    <Tooltip
                        placement="top"
                        title={chatUrl
                            ? 'Mở lại chat chatbot (Meta.ai / Duck.ai) đã tạo ảnh beat này để xem/update ngay trong conversation'
                            : 'Chưa có url chatbot — ảnh sẽ được ghi url khi sinh lại qua extension hoặc pipeline'}
                    >
                        <span>
                            <Button
                                size="small"
                                variant="outlined"
                                sx={compactButtonSx}
                                startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                                disabled={!chatUrl}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    window.open(chatUrl, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                Mở url chatbot
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip
                        placement="top"
                        title={hasImage
                            ? 'Xóa ảnh beat hiện tại (giữ nguyên prompt, url chatbot và các vùng ảnh)'
                            : 'Beat chưa có ảnh'}
                    >
                        <span>
                            <Button
                                size="small"
                                variant="outlined"
                                sx={{
                                    ...compactButtonSx,
                                    borderColor: 'rgba(239,83,80,0.6)',
                                    color: '#ef9a9a',
                                    '&:hover': {
                                        borderColor: 'rgba(239,83,80,0.9)',
                                        bgcolor: 'rgba(239,83,80,0.12)',
                                    },
                                    '&:disabled': {
                                        color: 'rgba(255,255,255,0.38)',
                                        borderColor: 'rgba(255,255,255,0.18)',
                                    },
                                }}
                                startIcon={deleting
                                    ? <CircularProgress size={13} color="inherit" />
                                    : <DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                                disabled={!hasImage || busy}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    void state.handleDeleteBeatImage(beatId);
                                }}
                            >
                                Xóa ảnh beat hiện tại
                            </Button>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>
            {settingsOpen ? (
                <ShortVideoAgentVideoSettingsDialog
                    state={state}
                    open={settingsOpen}
                    onClose={() => { setSettingsOpen(false); }}
                />
            ) : null}
        </>
    );
}
