import React from 'react';
import {
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
import type { useAgentVideoContent } from './useAgentVideoContent';
import ShortVideoAgentVideoSettingsDialog from './ShortVideoAgentVideoSettingsDialog';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
    /** beat_N — beat đang chọn. */
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
 * Workflow HTML beat: thay cụm nút ảnh beat bằng nút mở lại đúng chat
 * DeepSeek đã tạo HTML motion (URL + cookie lưu trong beat_html[beatId]).
 */
export default function WhiteboardBeatHtmlChatControl({ state, beatId }: Props) {
    const chatUrl = String(state.beatHtml[beatId]?.chat_url || '').trim();
    const opening = (state.openingBeatDeepSeekChatBeatIds || []).includes(beatId);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    return (
        <>
            <Stack direction="column" spacing={0.5} alignItems="flex-start">
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
                            ? 'Mở lại chat DeepSeek đã tạo HTML motion của beat bằng headless browser + cookie đã lưu'
                            : 'Chưa lưu chat DeepSeek — bấm nút DeepSeek ở box HTML motion để mở chat mới, gửi prompt rồi lưu HTML beat'}
                    >
                        <span>
                            <Button
                                size="small"
                                variant="outlined"
                                sx={compactButtonSx}
                                startIcon={opening ? (
                                    <CircularProgress size={13} color="inherit" />
                                ) : (
                                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                                )}
                                disabled={!chatUrl || opening}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    if (!chatUrl || opening) {
                                        return;
                                    }
                                    state.handleOpenBeatDeepSeekSavedChat(beatId);
                                }}
                            >
                                Mở chat DeepSeek
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
