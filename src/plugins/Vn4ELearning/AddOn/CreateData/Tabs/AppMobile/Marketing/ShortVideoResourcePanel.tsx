import React from 'react';
import {
    Box,
    Typography,
} from '@mui/material';
import TitleIcon from '@mui/icons-material/Title';
import NotesIcon from '@mui/icons-material/Notes';
import {
    SHORT_VIDEO_TEXT_DRAG_MIME,
    serializeTextClipDragPayload,
    type ShortVideoTextDragPreset,
} from 'helpers/shortVideoTextClips';

type DraggableTextItemProps = {
    preset: ShortVideoTextDragPreset;
    label: string;
    icon: React.ReactNode;
};

function DraggableTextItem({ preset, label, icon }: DraggableTextItemProps) {
    const handleDragStart = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData(SHORT_VIDEO_TEXT_DRAG_MIME, serializeTextClipDragPayload(preset));
        event.dataTransfer.effectAllowed = 'copy';
    }, [preset]);

    return (
        <Box
            draggable
            onDragStart={handleDragStart}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                cursor: 'grab',
                userSelect: 'none',
                '&:active': {
                    cursor: 'grabbing',
                },
                '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                },
            }}
        >
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.selected',
                    color: 'primary.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Typography variant="body2" fontWeight={500}>
                {label}
            </Typography>
        </Box>
    );
}

export default function ShortVideoResourcePanel() {
    return (
        <Box
            sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    width: 56,
                    flexShrink: 0,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    py: 1,
                    gap: 0.5,
                }}
            >
                <Box
                    aria-label="Text"
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.selected',
                        color: 'primary.main',
                    }}
                >
                    <TitleIcon sx={{ fontSize: 20 }} />
                </Box>
            </Box>
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={600}>
                        Text
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Kéo vào track trên timeline
                    </Typography>
                </Box>
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 2,
                    }}
                    className="custom_scroll"
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1.5, fontWeight: 600 }}
                    >
                        Cơ bản
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <DraggableTextItem
                            preset="title"
                            label="Thêm tiêu đề"
                            icon={<TitleIcon sx={{ fontSize: 18 }} />}
                        />
                        <DraggableTextItem
                            preset="body"
                            label="Thêm nội dung chính"
                            icon={<NotesIcon sx={{ fontSize: 18 }} />}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
