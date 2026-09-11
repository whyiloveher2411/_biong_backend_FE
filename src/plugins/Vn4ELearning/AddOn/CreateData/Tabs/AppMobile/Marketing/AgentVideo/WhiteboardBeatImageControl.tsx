import React from 'react';
import {
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    IconButton,
    Popover,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { openImportHtmlBeatMetaAiChatSyncLatest } from 'helpers/marketingImportHtmlWorkflow';
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
 * đặt TRÊN hàng nút: Mở url chatbot đã tạo ảnh + Update ảnh theo feedback
 * + Xóa ảnh beat hiện tại.
 */
export default function WhiteboardBeatImageControl({ state, beatId }: Props) {
    const entry = state.beatImage[beatId];
    const chatUrl = String(entry?.chat_url || '').trim();
    const hasImage = Boolean(String(entry?.image_url || '').trim());
    const deleting = state.deletingBeatImageId === beatId;
    const busy = Boolean(state.deletingBeatImageId);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    // Dialog feedback được neo ngay TRÊN button "Update ảnh theo feedback".
    const feedbackAnchorRef = React.useRef<HTMLSpanElement | null>(null);
    const setFeedbackAnchorRef = React.useCallback((el: HTMLSpanElement | null) => {
        feedbackAnchorRef.current = el;
    }, []);
    const [feedbackDialogOpen, setFeedbackDialogOpen] = React.useState(false);
    const [noteSubmitting, setNoteSubmitting] = React.useState(false);
    const hasFeedback = Boolean(
        entry?.qa_status === 'needs_image_refill' && String(entry?.qa_refine_note || '').trim() !== '',
    );
    const [noteDraft, setNoteDraft] = React.useState('');
    // Flag "cần update ảnh mới nhất từ chatbot" — checkbox toggle (pipeline ưu tiên
    // pull beat này TRƯỚC beat feedback / beat thiếu).
    const syncLatestPending = Boolean(entry?.sync_latest_pending);
    const [syncSaving, setSyncSaving] = React.useState(false);
    // Click "Mở url chatbot" debounce in-flight (control bị render nhiều lớp).
    const openChatInFlightRef = React.useRef<Record<string, number>>({});

    const syncNoteDraft = React.useCallback((open: boolean) => {
        // Prefill bằng feedback hiện tại (nếu beat đang chờ update).
        setNoteDraft(open ? String(entry?.qa_refine_note || '') : '');
    }, [entry?.qa_refine_note]);

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
                                    // Control có thể được render overlay nhiều lớp — chặn
                                    // click chồng: 1 dispatch lượt (5s/window) mỗi beat.
                                    const now = Date.now();
                                    if (openChatInFlightRef.current[beatId]
                                        && now - openChatInFlightRef.current[beatId] < 5000
                                    ) {
                                        return;
                                    }
                                    openChatInFlightRef.current[beatId] = now;
                                    // Meta.ai: mở qua extension — panel bên phải có nút
                                    // "Update ảnh mới nhất từ chatbot" (pull ảnh sau
                                    // khi user feedback trực tiếp trong chat).
                                    let host = '';
                                    try {
                                        host = new URL(chatUrl).hostname || '';
                                    } catch {
                                        host = '';
                                    }
                                    const isMetaAiChat = /(^|\.)meta\.ai$/i.test(host);
                                    if (isMetaAiChat) {
                                        void openImportHtmlBeatMetaAiChatSyncLatest({
                                            shortVideoId: state.shortVideoId,
                                            beatId,
                                            chatUrl,
                                            imageUrl: String(entry?.image_url || '').trim(),
                                            imagePrompt: String(entry?.image_prompt || '').trim(),
                                            objectLayerCount: 1,
                                            video2s: true,
                                            // Account tạo chat gốc — extension set đúng cookie này.
                                            cookieId: Number(entry?.cookie_id || 0),
                                        }).then(() => {
                                            state.showMessage(
                                                `Đã mở tab Meta.ai pull ảnh ${beatId} — bấm nút Update ảnh mới nhất trong panel bên phải`,
                                                'success',
                                            );
                                        }).catch((e) => {
                                            // KHÔNG window.open fallback — tránh tab thứ 2
                                            // không có panel; lỗi thông báo rõ ràng.
                                            state.showMessage(
                                                e instanceof Error ? e.message : String(e),
                                                'warning',
                                            );
                                        });
                                    } else {
                                        window.open(chatUrl, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                            >
                                Mở url chatbot
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip
                        placement="top"
                        title={chatUrl
                            ? (hasFeedback
                                ? 'Beat đang chờ update theo feedback — edit lại ghi chú rồi submit, hoặc gỡ feedback'
                                : 'Nhập ghi chú “ảnh này chưa ổn chỗ nào” — beat sẽ được đánh dấu cần update; pipeline sẽ mở lại chat Meta.ai cũ, gửi feedback và thay ảnh mới')
                            : 'Beat chưa có url chatbot — cần sinh ảnh qua Meta.ai (pipeline/extension) trước'}
                    >
                        <span ref={setFeedbackAnchorRef}>
                            <Button
                                size="small"
                                variant="outlined"
                                sx={{
                                    ...compactButtonSx,
                                    ...(hasFeedback
                                        ? {
                                            borderColor: 'rgba(255, 171, 0, 0.7)',
                                            color: '#ffcc80',
                                            '&:hover': {
                                                borderColor: 'rgba(255, 171, 0, 0.9)',
                                                bgcolor: 'rgba(255, 171, 0, 0.1)',
                                            },
                                            '&:disabled': {
                                                color: 'rgba(255, 255, 255, 0.38)',
                                                borderColor: 'rgba(255, 255, 255, 0.18)',
                                            },
                                        }
                                        : {}),
                                }}
                                startIcon={noteSubmitting
                                    ? <CircularProgress size={13} color="inherit" />
                                    : (
                                        <RateReviewIcon
                                            sx={{ fontSize: 14, ...(hasFeedback ? { color: '#ffb300' } : {}) }}
                                        />
                                    )}
                                disabled={!chatUrl}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    setFeedbackDialogOpen(true);
                                    syncNoteDraft(true);
                                }}
                            >
                                Update ảnh theo feedback
                            </Button>
                        </span>
                    </Tooltip>
                    <Popover
                        open={feedbackDialogOpen}
                        // Ngay TRÊN button feedback.
                        anchorEl={feedbackAnchorRef.current}
                        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        onClose={() => {
                            setFeedbackDialogOpen(false);
                        }}
                        disableScrollLock
                        slotProps={{
                            paper: {
                                onMouseDown: (event: React.MouseEvent) => {
                                    event.stopPropagation();
                                },
                                onClick: (event: React.MouseEvent) => {
                                    event.stopPropagation();
                                },
                                sx: {
                                    bgcolor: '#1b1b1b',
                                    color: 'common.white',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    p: 1.5,
                                    width: 320,
                                },
                            },
                        }}
                    >
                        <Stack spacing={1}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'white' }}>
                                Feedback cho ảnh beat — pipeline sẽ gửi vào chat Meta.ai cũ để update ảnh
                            </Typography>
                            <TextField
                                multiline
                                autoFocus
                                rows={4}
                                size="small"
                                fullWidth
                                placeholder="VD: chữ trên bảng bị gãy chỉ — vẽ lại thẳng hơn, hoặc người quá to so với xe"
                                value={noteDraft}
                                onChange={(event) => {
                                    setNoteDraft(event.target.value);
                                }}
                                inputProps={{
                                    onPointerDown: (event) => event.stopPropagation(),
                                    onClick: (event: React.MouseEvent) => event.stopPropagation(),
                                }}
                                sx={{
                                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: 1,
                                    '& .MuiOutlinedInput-root': {
                                        color: 'common.white',
                                        fontSize: 12,
                                    },
                                    '& fieldset': {
                                        borderColor: 'rgba(255,255,255,0.25)',
                                    },
                                }}
                            />
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {hasFeedback ? (
                                    <Button
                                        size="small"
                                        variant="text"
                                        sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
                                        disabled={noteSubmitting}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            event.preventDefault();
                                            setNoteSubmitting(true);
                                            void state.handleSaveBeatQa(beatId, '', '').finally(() => {
                                                setNoteSubmitting(false);
                                            });
                                            setNoteDraft('');
                                        }}
                                    >
                                        Gỡ feedback
                                    </Button>
                                ) : null}
                                <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ fontSize: 11, textTransform: 'none' }}
                                    startIcon={noteSubmitting
                                        ? <CircularProgress size={13} color="inherit" />
                                        : null}
                                    disabled={noteSubmitting}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        event.preventDefault();
                                        const note = String(noteDraft || '').trim();
                                        if (note === '') {
                                            return;
                                        }
                                        setNoteSubmitting(true);
                                        void state.handleSaveBeatQa(beatId, 'needs_image_refill', note)
                                            .then((saved) => {
                                                if (saved) {
                                                    setFeedbackDialogOpen(false);
                                                }
                                            })
                                            .finally(() => {
                                                setNoteSubmitting(false);
                                            });
                                    }}
                                >
                                    Submit
                                </Button>
                            </Stack>
                        </Stack>
                    </Popover>
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
                <Stack
                    direction="row"
                    alignItems="center"
                    sx={{
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(0,0,0,0.55)',
                    }}
                >
                    <FormControlLabel
                        sx={{
                            mr: 0,
                            '& .MuiFormControlLabel-label': {
                                fontSize: 11,
                                color: syncLatestPending ? '#80d8ff' : 'rgba(255,255,255,0.75)',
                            },
                        }}
                        control={(
                            <Checkbox
                                size="small"
                                checked={syncLatestPending}
                                disabled={!chatUrl || syncSaving}
                                onChange={(event) => {
                                    event.stopPropagation();
                                    const next = event.target.checked;
                                    setSyncSaving(true);
                                    void state.handleToggleBeatImageSyncLatest(beatId, next)
                                        .catch(() => {
                                            // 
                                        })
                                        .finally(() => {
                                            setSyncSaving(false);
                                        });
                                }}
                            />
                        )}
                        label="Update ảnh mới nhất từ chatbot"
                    />
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
