import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
    open: boolean;
    onClose: () => void;
};

const AUTO_SAVE_DEBOUNCE_MS = 800;

/**
 * Dialog settings TOÀN video — render động theo danh sách field parse từ
 * prompts/{folder}/setting-field.md của visual type hiện tại. Thêm block/key
 * mới vào md là field tự hiện ở đây, không cần sửa UI.
 * Hiện hỗ trợ field-type: url (TextField auto-save + nút mở tab mới).
 */
export default function ShortVideoAgentVideoSettingsDialog({ state, open, onClose }: Props) {
    const [drafts, setDrafts] = React.useState<Record<string, string>>({});
    const draftsRef = React.useRef<Record<string, string>>({});
    const timersRef = React.useRef<Record<string, number>>({});
    const pendingRef = React.useRef<Record<string, string>>({});

    const setDraft = React.useCallback((key: string, value: string) => {
        draftsRef.current = { ...draftsRef.current, [key]: value };
        setDrafts(draftsRef.current);
    }, []);

    // Mở dialog → nạp giá trị đã lưu vào draft.
    React.useEffect(() => {
        if (open) {
            const next: Record<string, string> = {};
            state.settingFields.forEach((field) => {
                next[field.key] = String(state.videoSettings[field.key] ?? '');
            });
            draftsRef.current = next;
            setDrafts(next);
            pendingRef.current = {};
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const flushSave = React.useCallback((key: string) => {
        const pending = pendingRef.current[key];
        if (pending === undefined) {
            return;
        }
        delete pendingRef.current[key];
        void state.handleSaveVideoSetting(key, pending);
    }, [state]);

    const handleChange = React.useCallback((key: string, value: string) => {
        setDraft(key, value);
        pendingRef.current[key] = value;
        // Auto-save sau khi dừng gõ ~0.8s.
        if (timersRef.current[key] != null) {
            window.clearTimeout(timersRef.current[key]);
        }
        timersRef.current[key] = window.setTimeout(() => {
            flushSave(key);
        }, AUTO_SAVE_DEBOUNCE_MS);
    }, [flushSave, setDraft]);

    const handleBlur = React.useCallback((key: string) => {
        if (timersRef.current[key] != null) {
            window.clearTimeout(timersRef.current[key]);
            timersRef.current[key] = 0;
        }
        flushSave(key);
    }, [flushSave]);

    const handleClose = React.useCallback(() => {
        // Flush hết thay đổi chưa kịp auto-save trước khi đóng.
        Object.keys(pendingRef.current).forEach((key) => {
            if (timersRef.current[key] != null) {
                window.clearTimeout(timersRef.current[key]);
                timersRef.current[key] = 0;
            }
            flushSave(key);
        });
        onClose();
    }, [flushSave, onClose]);

    const urlFields = state.settingFields.filter((field) => field.field_type === 'url');
    const unsupportedFields = state.settingFields.filter((field) => field.field_type !== 'url');

    return (
        <Dialog
            open={open}
            onClose={(_event, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    handleClose();
                }
            }}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>Cài đặt video</DialogTitle>
            <DialogContent dividers>
                {state.settingFields.length === 0 ? (
                    <Alert severity="info">
                        Visual type này chưa có setting field nào — thêm block mới vào{' '}
                        <b>prompts/&lt;visual-type&gt;/setting-field.md</b> là field tự hiện ở đây.
                    </Alert>
                ) : null}
                <Stack spacing={2} sx={{ pt: state.settingFields.length ? 0.5 : 0 }}>
                    {urlFields.map((field) => {
                        const savedUrl = String(state.videoSettings[field.key] ?? '').trim();
                        const draft = String(drafts[field.key] ?? '');
                        const saving = Boolean(state.savingVideoSettingKeys[field.key]);
                        return (
                            <Box key={field.key}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    {field.title || field.key}
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    margin="dense"
                                    placeholder="Dán URL — tự lưu khi dừng gõ"
                                    value={draft}
                                    onChange={(event) => { handleChange(field.key, event.target.value); }}
                                    onBlur={() => { handleBlur(field.key); }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {saving ? <CircularProgress size={16} /> : null}
                                                <Tooltip title={savedUrl
                                                    ? 'Mở URL đã lưu trong tab mới'
                                                    : 'Chưa có URL đã lưu'}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={!savedUrl}
                                                            onClick={() => {
                                                                window.open(savedUrl, '_blank', 'noopener,noreferrer');
                                                            }}
                                                        >
                                                            <OpenInNewIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </InputAdornment>
                                        ),
                                    }}
                                    helperText={savedUrl ? `Đã lưu — ${savedUrl}` : 'Chưa có URL'}
                                />
                            </Box>
                        );
                    })}
                    {unsupportedFields.map((field) => (
                        <TextField
                            key={field.key}
                            fullWidth
                            size="small"
                            margin="dense"
                            label={field.title || field.key}
                            value={String(drafts[field.key] ?? '')}
                            disabled
                            helperText={`Kiểu "${field.field_type}" chưa được hỗ trợ`}
                        />
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button size="small" onClick={handleClose}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}
