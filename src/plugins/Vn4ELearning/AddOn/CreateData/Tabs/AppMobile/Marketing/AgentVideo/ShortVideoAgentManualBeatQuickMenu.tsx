import React from 'react';
import { Box, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { manualBeatColor, manualBeatDurationWarning, type ManualBeatMark } from './agentVideoManualBeats';

export type ManualBeatQuickMenuAnchor = {
    clientX: number;
    clientY: number;
    /** Tạo beat mới từ đoạn bôi đen */
    draft?: ManualBeatMark | null;
    /** Xóa beat đã có (click vào từ trong beat) */
    target?: ManualBeatMark | null;
    /** Lý do không tạo được (đè beat khác, không có timing…) */
    blockedReason?: string;
};

type Props = {
    anchor: ManualBeatQuickMenuAnchor | null;
    busy?: boolean;
    onCreate: (draft: ManualBeatMark) => void;
    onDelete: (markId: string) => void;
    onClose: () => void;
};

export default function ShortVideoAgentManualBeatQuickMenu({
    anchor,
    busy = false,
    onCreate,
    onDelete,
    onClose,
}: Props) {
    if (!anchor) {
        return null;
    }

    const draft = anchor.draft ?? null;
    const target = anchor.target ?? null;
    const isDelete = Boolean(target);
    const blocked = anchor.blockedReason || '';
    const warning = draft ? manualBeatDurationWarning(draft.durationSec) : null;

    const handleClick = () => {
        if (busy) {
            return;
        }
        if (isDelete && target) {
            onDelete(target.id);
            return;
        }
        if (draft && !blocked) {
            onCreate(draft);
        }
    };

    return (
        <Menu
            open
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={{ top: anchor.clientY, left: anchor.clientX }}
            slotProps={{ paper: { sx: { minWidth: 260, maxWidth: 380 } } }}
        >
            <MenuItem disabled={busy || (!isDelete && (!draft || Boolean(blocked)))} onClick={handleClick}>
                <ListItemText
                    primary={(
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            {isDelete ? (
                                <DeleteOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                            ) : (
                                <ContentCutOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                            )}
                            {isDelete ? `Xóa beat ${target?.order ?? ''}` : 'Tạo beat'}
                            {isDelete && target ? (
                                <Box
                                    component="span"
                                    sx={{
                                        ml: 1,
                                        width: 12,
                                        height: 12,
                                        borderRadius: '3px',
                                        bgcolor: manualBeatColor(target.order).border,
                                    }}
                                />
                            ) : null}
                        </Box>
                    )}
                    secondary={(
                        <Typography variant="caption" color={blocked ? 'error.main' : 'text.secondary'}>
                            {blocked
                                || (isDelete && target
                                    ? `${target.startSec.toFixed(2)}s → ${target.endSec.toFixed(2)}s · ${target.content}`
                                    : draft
                                        ? `${draft.durationSec.toFixed(2)}s · ${draft.content}`
                                        : 'Chưa chọn đoạn nào')}
                        </Typography>
                    )}
                />
            </MenuItem>
            {!isDelete && warning && !blocked ? (
                <MenuItem disabled sx={{ py: 0 }}>
                    <Typography variant="caption" color="warning.main">{warning}</Typography>
                </MenuItem>
            ) : null}
        </Menu>
    );
}
