import React from 'react';
import Dialog from 'components/molecules/Dialog';
import { Box, LinearProgress, Typography, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { StreamProgressData } from 'hook/useStreamSync';
import CloseIcon from '@mui/icons-material/Close';

interface SyncProgressDialogProps {
    open: boolean;
    onClose: () => void;
    progress: number;
    currentStage: string;
    messages: StreamProgressData[];
    error: string | null;
    isSyncing: boolean;
    totalObjects: number;
    completedObjects: number;
}

function SyncProgressDialog({
    open,
    onClose,
    progress,
    currentStage,
    messages,
    error,
    isSyncing,
    totalObjects,
    completedObjects,
}: SyncProgressDialogProps) {
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const getStageLabel = (stage: string): string => {
        const labels: { [key: string]: string } = {
            init: 'Khởi tạo',
            course: 'Đang xử lý course',
            translates: 'Đang đồng bộ bản dịch',
            translate: 'Đang xử lý bản dịch',
            lessons: 'Đang đồng bộ lessons',
            course_complete: 'Hoàn thành course',
            finished: 'Hoàn thành',
            final: 'Kết quả cuối cùng',
            error: 'Lỗi',
        };
        return labels[stage] || stage;
    };

    const getMessageText = (data: StreamProgressData): string => {
        if (data.message) {
            // Handle case where message is an object with {content, options}
            if (typeof data.message === 'object' && data.message !== null && 'content' in data.message) {
                return String((data.message as { content: string }).content);
            }
            // Handle case where message is a string
            return String(data.message);
        }
        if (data.course_name) {
            return `Course: ${data.course_name}`;
        }
        if (data.current !== undefined && data.total !== undefined) {
            return `${data.current}/${data.total}`;
        }
        return getStageLabel(data.type || data.stage || '');
    };

    const handleClose = React.useCallback(() => {
        if (!isSyncing) {
            onClose();
        }
    }, [isSyncing, onClose]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title="Đồng bộ lên Firebase"
            style={{ minHeight: 400 }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Progress Bar */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {getStageLabel(currentStage)}
                            </Typography>
                            {totalObjects > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {completedObjects}/{totalObjects} objects đã hoàn thành
                                </Typography>
                            )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            {Math.round(progress)}%
                        </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={progress} />
                </Box>

                {/* Error Message */}
                {error && (
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'error.light',
                            color: 'error.contrastText',
                            borderRadius: 1,
                        }}
                    >
                        <Typography variant="body2">{error}</Typography>
                    </Box>
                )}

                {/* Messages Log */}
                <Box
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        maxHeight: 300,
                        overflow: 'auto',
                    }}
                >
                    <List dense>
                        {messages.map((msg, index) => (
                            <ListItem
                                key={index}
                                sx={{
                                    bgcolor: msg.type === 'error' ? 'error.light' : 'transparent',
                                    py: 0.5,
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" component="span">
                                            {getMessageText(msg)}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box>
                                            {msg.progress !== undefined && (
                                                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                                    Tiến độ: {Math.round(msg.progress)}%
                                                </Typography>
                                            )}
                                            {msg.totalObjects !== undefined && msg.completedObjects !== undefined && (
                                                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                                    {msg.completedObjects}/{msg.totalObjects} objects
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                        <div ref={messagesEndRef} />
                    </List>
                </Box>

                {/* Action Buttons */}
                {!isSyncing && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <IconButton onClick={onClose} color="primary">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
}

export default SyncProgressDialog;

