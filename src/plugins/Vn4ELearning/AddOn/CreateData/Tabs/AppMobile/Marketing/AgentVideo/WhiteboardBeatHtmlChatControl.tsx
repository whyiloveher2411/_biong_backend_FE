import React from 'react';
import {
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
import type { useAgentVideoContent } from './useAgentVideoContent';
import { fetchDeepseekHtmlBeatSessionStatus, type DeepseekHtmlBeatSessionResponse } from './agentVideoApi';
import ShortVideoAgentVideoSettingsDialog from './ShortVideoAgentVideoSettingsDialog';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
    /** beat_N — beat đang chọn. */
    beatId: string;
    inline?: boolean;
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
export default function WhiteboardBeatHtmlChatControl({ state, beatId, inline = false }: Props) {
    const generationReady=!!state.beatHtmlMediaReadiness?.[beatId]?.ready;
    const generationReason=state.beatHtmlMediaReadiness?.[beatId]?.message || 'Cần có audio và Whisper hợp lệ trước khi tạo HTML beat.';
    const [session, setSession] = React.useState<DeepseekHtmlBeatSessionResponse | null>(null);
    React.useEffect(() => {
        let disposed = false;
        let busy = false;
        setSession(null);
        const poll = async () => {
            if (busy || document.visibilityState === 'hidden') return;
            busy = true;
            try {
                const result = await fetchDeepseekHtmlBeatSessionStatus(state.shortVideoId, beatId);
                if (!disposed && result?.success) setSession(result);
            } catch { /* A transient status error must not interrupt editing. */ }
            finally { busy = false; }
        };
        void poll();
        const timer = window.setInterval(() => void poll(), 10000);
        return () => { disposed = true; window.clearInterval(timer); };
    }, [state.shortVideoId, beatId]);
    const generation = session?.html_generation;
    const labels: Record<string, string> = {
        queued: 'Claude: trong hàng đợi', waiting_account: generation?.last_quota ? 'Claude: chờ tài khoản khác sau quota' : 'Claude: chờ tài khoản',
        quota_switch: 'Claude: đổi tài khoản do quota',
        waiting_dependency: 'Claude: chờ beat trước', preparing: 'Claude: chuẩn bị', submitting: 'Claude: đang gửi và chờ phản hồi',
        waiting_response: 'Claude: đang chờ phản hồi trên browser',
        saving: 'Claude: kiểm tra và lưu HTML', repair_pending: 'Claude: chờ sửa HTML', repair_submitting: 'Claude: đang gửi và chờ bản sửa',
        completed: 'Claude: đã lưu HTML', timed_out: 'Claude: chưa thu được phản hồi hoàn chỉnh',
        submit_uncertain: 'Claude: chưa xác nhận gửi', stale: 'Claude: đầu vào đã thay đổi', failed: 'Claude: lỗi', cancelled: 'Claude: đã huỷ',
    };
    const statusLabel = generation?.status ? labels[generation.status] : '';
    const cooldown = generation?.last_quota?.quota?.cooldown_until;
    const quotaHint = cooldown ? `Account ${generation?.last_quota?.cookie_id} nghỉ đến ${new Date(cooldown * 1000).toLocaleString('vi-VN')}. ${generation?.last_quota?.quota?.message || ''}` : '';
    const statusHint = generation?.error || quotaHint || statusLabel;
    const chatUrl = String(session?.chat_url || state.beatHtml[beatId]?.chat_url || '').trim();
    const opening = (state.openingBeatDeepSeekChatBeatIds || []).includes(beatId);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    if (inline) return <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button variant="contained" size="small" startIcon={opening ? <CircularProgress size={14} color="inherit" /> : <OpenInNewIcon />} title={generationReady ? '' : generationReason} disabled={opening || !generationReady} onClick={() => state.handleGenerateBeatHtmlWithClipPreflight(beatId)}>{opening ? 'Đang chuẩn bị beat…' : 'Tạo HTML + tự tạo clip thiếu'}</Button>
        {chatUrl ? <Button variant="outlined" size="small" disabled={opening} onClick={() => state.handleOpenBeatDeepSeekSavedChat(beatId)}>Mở lại chat HTML đã lưu</Button> : null}
    </Stack>;

    return (
        <>
            <Stack direction="column" spacing={0.5} alignItems="flex-start">
                {statusLabel ? <Tooltip title={statusHint}><Typography variant="caption" sx={{ color: 'common.white', bgcolor: 'rgba(0,0,0,0.65)', px: 0.75, borderRadius: 1 }}>{statusLabel}</Typography></Tooltip> : null}
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
                            ? 'Mở lại chatbot đã tạo HTML motion của beat bằng đúng cookie đã lưu'
                            : 'Chưa lưu chat — dùng nút DS hoặc Claude trên preview để tạo HTML beat'}
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
                                Mở chatbot
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
