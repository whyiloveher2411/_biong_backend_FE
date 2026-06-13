import React from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CropFreeIcon from '@mui/icons-material/CropFree';
import { alpha } from '@mui/material/styles';
import type { GeminiLogoRegion } from './storeScreenshotGeminiLogoRegion';
import {
    displayRectToNaturalRegion,
    naturalRegionToDisplayRect,
} from './storeScreenshotGeminiLogoRegion';

type DisplayRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

type Props = {
    imageUrl: string;
    alt: string;
    order: number;
    region: GeminiLogoRegion | null;
    selecting: boolean;
    disabled?: boolean;
    logoRemoved?: boolean;
    onSelectStart: () => void;
    onSelectEnd: () => void;
    onRegionChange: (region: GeminiLogoRegion | null) => void;
};

function GeminiLogoRegionSelector({
    imageUrl,
    alt,
    order,
    region,
    selecting,
    disabled = false,
    logoRemoved = false,
    onSelectStart,
    onSelectEnd,
    onRegionChange,
}: Props) {
    const imageRef = React.useRef<HTMLImageElement>(null);
    const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);
    const [draftRect, setDraftRect] = React.useState<DisplayRect | null>(null);
    const [displayRect, setDisplayRect] = React.useState<DisplayRect | null>(null);

    const syncDisplayRect = React.useCallback(() => {
        const image = imageRef.current;
        if (!image || !region) {
            setDisplayRect(null);
            return;
        }
        setDisplayRect(naturalRegionToDisplayRect(region, image));
    }, [region]);

    React.useEffect(() => {
        syncDisplayRect();
    }, [syncDisplayRect, imageUrl]);

    React.useEffect(() => {
        const image = imageRef.current;
        if (!image || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            syncDisplayRect();
        });
        observer.observe(image);
        return () => observer.disconnect();
    }, [syncDisplayRect]);

    const commitDraftRect = React.useCallback((rect: DisplayRect | null) => {
        const image = imageRef.current;
        if (!image || !rect) {
            onRegionChange(null);
            setDisplayRect(null);
            return;
        }

        const natural = displayRectToNaturalRegion(rect, image);
        onRegionChange(natural);
        setDisplayRect(natural ? naturalRegionToDisplayRect(natural, image) : null);
    }, [onRegionChange]);

    const getLocalPoint = (event: React.MouseEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        return {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        };
    };

    const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!selecting || disabled) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const point = getLocalPoint(event);
        dragStartRef.current = point;
        setDraftRect({
            left: point.x,
            top: point.y,
            width: 0,
            height: 0,
        });
    };

    const handleOverlayMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!selecting || !dragStartRef.current) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const point = getLocalPoint(event);
        const start = dragStartRef.current;
        const left = Math.min(start.x, point.x);
        const top = Math.min(start.y, point.y);
        const width = Math.abs(point.x - start.x);
        const height = Math.abs(point.y - start.y);
        setDraftRect({ left, top, width, height });
    };

    const finishSelection = () => {
        if (!dragStartRef.current) {
            return;
        }
        dragStartRef.current = null;
        const rect = draftRect;
        setDraftRect(null);
        commitDraftRect(rect);
        onSelectEnd();
    };

    const handleOverlayMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!selecting) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        finishSelection();
    };

    const handleOverlayMouseLeave = () => {
        if (!selecting || !dragStartRef.current) {
            return;
        }
        finishSelection();
    };

    const activeRect = draftRect || displayRect;

    return (
        <Box
            sx={(theme) => ({
                flex: '0 0 auto',
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: theme.palette.common.black,
                boxShadow: theme.shadows[6],
                position: 'relative',
            })}
        >
            <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 3,
                }}
            >
                {region && !logoRemoved ? (
                    <Tooltip title="Xóa vùng đã chọn">
                        <IconButton
                            size="small"
                            aria-label="Xóa vùng đã chọn"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegionChange(null);
                                setDisplayRect(null);
                            }}
                            sx={{
                                bgcolor: alpha('#000', 0.55),
                                color: 'common.white',
                                '&:hover': { bgcolor: alpha('#000', 0.72) },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {!logoRemoved ? (
                    <Tooltip title={selecting ? 'Kéo trên ảnh để chọn vùng logo' : 'Chọn vùng logo Gemini'}>
                        <IconButton
                            size="small"
                            aria-label="Chọn vùng logo Gemini"
                            disabled={disabled}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (selecting) {
                                    onSelectEnd();
                                    return;
                                }
                                onSelectStart();
                            }}
                            sx={(theme) => ({
                                bgcolor: selecting
                                    ? theme.palette.primary.main
                                    : alpha('#000', 0.55),
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: selecting
                                        ? theme.palette.primary.dark
                                        : alpha('#000', 0.72),
                                },
                            })}
                        >
                            <CropFreeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Stack>

            <Typography
                variant="caption"
                sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 2,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: alpha('#000', 0.55),
                    color: 'common.white',
                    fontWeight: 600,
                }}
            >
                #{order}
            </Typography>

            <Box sx={{ position: 'relative', lineHeight: 0 }}>
                <Box
                    component="img"
                    ref={imageRef}
                    src={imageUrl}
                    alt={alt}
                    draggable={false}
                    onLoad={syncDisplayRect}
                    sx={{
                        display: 'block',
                        height: 'auto',
                        width: 'auto',
                        maxHeight: 'min(78vh, 920px)',
                        objectFit: 'contain',
                        userSelect: 'none',
                    }}
                />

                {selecting ? (
                    <Box
                        onMouseDown={handleOverlayMouseDown}
                        onMouseMove={handleOverlayMouseMove}
                        onMouseUp={handleOverlayMouseUp}
                        onMouseLeave={handleOverlayMouseLeave}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            cursor: 'crosshair',
                            zIndex: 1,
                        }}
                    />
                ) : null}

                {activeRect ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: activeRect.left,
                            top: activeRect.top,
                            width: activeRect.width,
                            height: activeRect.height,
                            border: '2px solid',
                            borderColor: draftRect ? 'warning.main' : 'success.main',
                            bgcolor: alpha('#4caf50', draftRect ? 0.08 : 0.16),
                            pointerEvents: 'none',
                            zIndex: 2,
                        }}
                    />
                ) : null}
            </Box>
        </Box>
    );
}

export default GeminiLogoRegionSelector;
