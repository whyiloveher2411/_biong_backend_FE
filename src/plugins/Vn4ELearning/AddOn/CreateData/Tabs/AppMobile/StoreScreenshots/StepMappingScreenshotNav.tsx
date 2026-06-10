import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';
import { encodeExternalImageUrl } from './storeScreenshotImageUtils';
import type { EditableItem } from './stepMappingTypes';

type Props = {
    items: EditableItem[];
    activeId: string;
    onSelect: (id: string) => void;
};

function StepMappingScreenshotNav({ items, activeId, onSelect }: Props) {
    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 9,
                py: 1,
                px: 1.5,
                mx: { xs: -2, md: -3 },
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                    Chọn screenshot
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {items.findIndex((item) => item.id === activeId) + 1} / {items.length}
                </Typography>
            </Stack>
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 0.5,
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: 3,
                        bgcolor: 'action.disabled',
                    },
                }}
            >
                {items.map((item) => {
                    const selected = item.id === activeId;
                    const hasAiImage = Boolean(item.ai_image_url);
                    const previewUrl = encodeExternalImageUrl(item.source_url);

                    return (
                        <Box
                            key={item.id}
                            component="button"
                            type="button"
                            onClick={() => onSelect(item.id)}
                            sx={(theme) => ({
                                position: 'relative',
                                flex: '0 0 auto',
                                width: 72,
                                p: 0.5,
                                borderRadius: 1.5,
                                border: '2px solid',
                                borderColor: selected
                                    ? theme.palette.primary.main
                                    : theme.palette.divider,
                                bgcolor: selected
                                    ? alpha(theme.palette.primary.main, 0.08)
                                    : theme.palette.background.paper,
                                cursor: 'pointer',
                                textAlign: 'center',
                                font: 'inherit',
                                transition: theme.transitions.create(['border-color', 'background-color']),
                                '&:hover': {
                                    borderColor: selected
                                        ? theme.palette.primary.dark
                                        : theme.palette.text.disabled,
                                },
                            })}
                        >
                            <Box
                                component="img"
                                src={previewUrl}
                                alt={`Screenshot ${item.order}`}
                                sx={{
                                    width: '100%',
                                    height: 96,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    display: 'block',
                                }}
                            />
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="center"
                                spacing={0.25}
                                sx={{ mt: 0.5 }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{ fontWeight: selected ? 700 : 500, lineHeight: 1.2 }}
                                >
                                    #{item.order}
                                </Typography>
                                {hasAiImage ? (
                                    <CheckCircleIcon sx={{ width: 14, height: 14, color: 'success.main' }} />
                                ) : null}
                            </Stack>
                            {selected ? (
                                <Chip
                                    label="Đang sửa"
                                    size="small"
                                    color="primary"
                                    sx={{
                                        position: 'absolute',
                                        top: 4,
                                        left: 4,
                                        height: 18,
                                        '& .MuiChip-label': { px: 0.75, fontSize: 10 },
                                    }}
                                />
                            ) : null}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

export default StepMappingScreenshotNav;
