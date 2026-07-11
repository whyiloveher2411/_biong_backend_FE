import React from 'react';
import { createPortal } from 'react-dom';
import { Box, MenuItem, Paper } from '@mui/material';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { ScriptTextSelectionAnchor } from './agentVideoPhoneticDictUi';

type Props = {
    anchor: ScriptTextSelectionAnchor | null;
    isEdit: boolean;
    /** Nhận đúng text đã snapshot lúc mở menu — không đọc lại selection. */
    onCreateOrEdit: (term: string) => void;
    onClose: () => void;
};

/** Bỏ qua outside-dismiss trong gesture mở (mouseup → click). */
const OUTSIDE_CLOSE_GRACE_MS = 400;

/**
 * Menu nổi (portal fixed) — không dùng Modal/Popover để tránh che UI.
 * Click ra ngoài → onClose. Click action → truyền `anchor.text` đã snapshot.
 */
export default function ShortVideoAgentPhoneticQuickMenu({
    anchor,
    isEdit,
    onCreateOrEdit,
    onClose,
}: Props) {
    const open = Boolean(anchor);
    const paperRef = React.useRef<HTMLDivElement | null>(null);
    const termRef = React.useRef(anchor?.text ?? '');
    const openedAtRef = React.useRef(0);

    React.useEffect(() => {
        if (anchor?.text) {
            termRef.current = anchor.text;
        }
    }, [anchor]);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }

        openedAtRef.current = Date.now();

        const isInsideMenu = (target: EventTarget | null) => {
            const node = target as Node | null;
            if (node && paperRef.current?.contains(node)) {
                return true;
            }
            if (node instanceof Element && node.closest('[data-phonetic-quick-menu="true"]')) {
                return true;
            }
            return false;
        };

        const onPointerDown = (event: PointerEvent) => {
            // Gesture mở menu: mouseup → (menu mount) → click cùng chuỗi — đừng đóng
            if (Date.now() - openedAtRef.current < OUTSIDE_CLOSE_GRACE_MS) {
                return;
            }
            if (isInsideMenu(event.target)) {
                return;
            }
            onClose();
        };

        // Gắn sau macrotask — tránh bắt nhầm event còn lại của gesture mở
        const attachTimer = window.setTimeout(() => {
            document.addEventListener('pointerdown', onPointerDown, true);
        }, OUTSIDE_CLOSE_GRACE_MS);

        return () => {
            window.clearTimeout(attachTimer);
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [open, onClose]);

    if (!open || !anchor || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <Paper
            ref={paperRef}
            elevation={8}
            aria-hidden={false}
            data-phonetic-quick-menu="true"
            sx={{
                position: 'fixed',
                top: anchor.top,
                left: anchor.left,
                transform: 'translate(-50%, calc(-100% - 8px))',
                // Cao hơn Drawer Whisper (1400) và PhoneticDictDrawer (1600)
                zIndex: 2100,
                py: 0.5,
                minWidth: 180,
                borderRadius: 1.5,
                pointerEvents: 'auto',
            }}
        >
            <MenuItem
                dense
                onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const term = String(termRef.current || anchor.text || '').trim();
                    if (term) {
                        onCreateOrEdit(term);
                    }
                    onClose();
                }}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.25,
                    py: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {isEdit ? (
                        <EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                        <RecordVoiceOverOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    )}
                    {isEdit ? 'Chỉnh sửa phiên âm' : 'Tạo phiên âm'}
                </Box>
                <Box
                    component="span"
                    sx={{
                        pl: 3.5,
                        maxWidth: 240,
                        fontSize: 12,
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {anchor.text}
                </Box>
            </MenuItem>
        </Paper>,
        document.body,
    );
}
