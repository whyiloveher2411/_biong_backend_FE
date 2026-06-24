import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
    Box,
    Button,
    IconButton,
    MenuItem,
    Select,
    Slider,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import type {
    ShortVideoVisualBackgroundMode,
    ShortVideoVisualClip,
    ShortVideoVisualGradientDirection,
    ShortVideoVisualGradientStop,
    ShortVideoVisualVerticalAlign,
} from 'helpers/shortVideoRenderManifest';
import {
    buildLinearGradientCss,
    createGradientFromSolidColor,
    DEFAULT_VISUAL_BACKGROUND_BLUR,
    DEFAULT_VISUAL_BACKGROUND_COLOR,
    DEFAULT_VISUAL_BACKGROUND_GRADIENT,
    DEFAULT_VISUAL_INSET_BOTTOM,
    DEFAULT_VISUAL_INSET_TOP,
    getGradientStopEdgeLabel,
    getGradientStopMarkerCoords,
    isColorBackgroundGradient,
    normalizeVisualBackgroundGradient,
    resolveActiveColorGradient,
    resolveGradientPreviewAxis,
    resolveGradientStopPositionFromPointer,
    resolveVisualBackgroundBlur,
    resolveVisualBackgroundColor,
    resolveVisualBackgroundMode,
    resolveVisualInsetBottom,
    resolveVisualInsetTop,
    resolveVisualVerticalAlign,
    sortGradientStops,
    stopColorToRgba,
    VISUAL_GRADIENT_DIRECTION_OPTIONS,
} from 'helpers/shortVideoVisualLayout';
import {
    INSPECTOR_TOGGLE_BUTTON_SX,
    InspectorPropertyColor,
    InspectorPropertyGroup,
    InspectorPropertyNumber,
    InspectorPropertyRow,
} from './ShortVideoInspectorFields';

type Props = {
    clip: ShortVideoVisualClip;
    onPatch: (patchData: Partial<ShortVideoVisualClip>) => void;
};

const MAX_GRADIENT_STOPS = 4;

function normalizePickerColor(value: string): string {
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
        return trimmed;
    }
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
        const [, r, g, b] = trimmed;
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return '#000000';
}

function resolveUiBackgroundMode(mode: ShortVideoVisualBackgroundMode): ShortVideoVisualBackgroundMode {
    return mode === 'gradient' ? 'color' : mode;
}

type ColorSwatchProps = {
    color: string;
    onChange: (color: string) => void;
    size?: number;
};

function ColorSwatch({ color, onChange, size = 28 }: ColorSwatchProps) {
    const pickerColor = normalizePickerColor(color);

    return (
        <Box
            component="label"
            sx={{
                width: size,
                height: size,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: pickerColor,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'block',
            }}
        >
            <input
                type="color"
                value={pickerColor}
                onChange={(event) => onChange(event.target.value)}
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                }}
            />
        </Box>
    );
}

type GradientPreviewBarProps = {
    direction: ShortVideoVisualGradientDirection;
    previewCss: string;
    stops: ShortVideoVisualGradientStop[];
    selectedIndex: number;
    onSelectStop: (index: number) => void;
    onStopsChange: (stops: ShortVideoVisualGradientStop[], commit: boolean) => void;
};

function GradientPreviewBar({
    direction,
    previewCss,
    stops,
    selectedIndex,
    onSelectStop,
    onStopsChange,
}: GradientPreviewBarProps) {
    const barRef = React.useRef<HTMLDivElement | null>(null);
    const dragStateRef = React.useRef<{ index: number; pointerId: number } | null>(null);
    const previewAxis = resolveGradientPreviewAxis(direction);

    const updateStopPosition = React.useCallback((
        index: number,
        clientX: number,
        clientY: number,
        commit: boolean
    ) => {
        const bar = barRef.current;
        if (!bar) {
            return;
        }
        const rect = bar.getBoundingClientRect();
        const position = resolveGradientStopPositionFromPointer(
            direction,
            rect,
            clientX,
            clientY
        );
        const nextStops = stops.map((stop, stopIndex) => (
            stopIndex === index ? { ...stop, position } : stop
        ));
        onStopsChange(nextStops, commit);
    }, [direction, onStopsChange, stops]);

    const handleMarkerPointerDown = (
        index: number,
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectStop(index);
        dragStateRef.current = { index, pointerId: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleMarkerPointerMove = (
        index: number,
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        const drag = dragStateRef.current;
        if (!drag || drag.index !== index || drag.pointerId !== event.pointerId) {
            return;
        }
        updateStopPosition(index, event.clientX, event.clientY, false);
    };

    const handleMarkerPointerUp = (
        index: number,
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        const drag = dragStateRef.current;
        if (!drag || drag.index !== index || drag.pointerId !== event.pointerId) {
            return;
        }
        dragStateRef.current = null;
        updateStopPosition(index, event.clientX, event.clientY, true);
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    return (
        <Box
            ref={barRef}
            sx={{
                position: 'relative',
                width: '100%',
                height: previewAxis === 'vertical' ? 120 : previewAxis === 'diagonal' ? 96 : 56,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                background: previewCss,
                overflow: 'hidden',
                touchAction: 'none',
            }}
        >
            {stops.map((stop, index) => {
                const coords = getGradientStopMarkerCoords(direction, stop.position);
                const isSelected = selectedIndex === index;
                return (
                    <Box
                        key={`gradient-marker-${index}`}
                        role="slider"
                        aria-label={`Vị trí màu ${index + 1}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={stop.position}
                        tabIndex={0}
                        onPointerDown={(event) => handleMarkerPointerDown(index, event)}
                        onPointerMove={(event) => handleMarkerPointerMove(index, event)}
                        onPointerUp={(event) => handleMarkerPointerUp(index, event)}
                        onPointerCancel={(event) => handleMarkerPointerUp(index, event)}
                        onKeyDown={(event) => {
                            const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp'
                                ? 1
                                : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                                    ? -1
                                    : 0;
                            if (!delta) {
                                return;
                            }
                            event.preventDefault();
                            const nextStops = stops.map((entry, stopIndex) => (
                                stopIndex === index
                                    ? {
                                        ...entry,
                                        position: Math.max(0, Math.min(100, entry.position + delta)),
                                    }
                                    : entry
                            ));
                            onStopsChange(nextStops, true);
                        }}
                        sx={{
                            position: 'absolute',
                            left: `${coords.leftPercent}%`,
                            top: `${coords.topPercent}%`,
                            transform: 'translate(-50%, -50%)',
                            width: isSelected ? 18 : 16,
                            height: isSelected ? 18 : 16,
                            borderRadius: '50%',
                            border: '2px solid #fff',
                            bgcolor: stopColorToRgba(stop),
                            boxShadow: isSelected
                                ? '0 0 0 2px rgba(25, 118, 210, 0.55)'
                                : '0 1px 4px rgba(0,0,0,0.25)',
                            cursor: 'grab',
                            touchAction: 'none',
                            zIndex: isSelected ? 2 : 1,
                            '&:active': {
                                cursor: 'grabbing',
                            },
                        }}
                    />
                );
            })}
        </Box>
    );
}

type ColorStopRowProps = {
    label: string;
    stop: ShortVideoVisualGradientStop;
    showPositionSlider: boolean;
    canRemove: boolean;
    onChange: (stop: ShortVideoVisualGradientStop) => void;
    onRemove: () => void;
};

function ColorStopRow({
    label,
    stop,
    showPositionSlider,
    canRemove,
    onChange,
    onRemove,
}: ColorStopRowProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderTop: '1px solid',
                borderColor: 'divider',
            }}
        >
            <ColorSwatch color={stop.color} onChange={(color) => onChange({ ...stop, color })} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.3 }}>
                    {label}
                    <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.75 }}
                    >
                        {stop.position}%
                    </Typography>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>
                        Độ hiện
                    </Typography>
                    <Slider
                        size="small"
                        value={stop.opacity ?? 100}
                        min={0}
                        max={100}
                        step={1}
                        sx={{ flex: 1, mx: 0 }}
                        onChange={(_event, value) => onChange({
                            ...stop,
                            opacity: Array.isArray(value) ? value[0] : value,
                        })}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 34, textAlign: 'right' }}>
                        {stop.opacity ?? 100}%
                    </Typography>
                </Box>
                {showPositionSlider ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>
                            Vị trí
                        </Typography>
                        <Slider
                            size="small"
                            value={stop.position}
                            min={0}
                            max={100}
                            step={1}
                            sx={{ flex: 1, mx: 0 }}
                            onChange={(_event, value) => onChange({
                                ...stop,
                                position: Array.isArray(value) ? value[0] : value,
                            })}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 34, textAlign: 'right' }}>
                            {stop.position}%
                        </Typography>
                    </Box>
                ) : null}
            </Box>
            {canRemove ? (
                <IconButton size="small" aria-label="Xóa màu" onClick={onRemove}>
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            ) : null}
        </Box>
    );
}

export default function ShortVideoVisualLayoutFields({ clip, onPatch }: Props) {
    const verticalAlign = resolveVisualVerticalAlign(clip);
    const insetTop = resolveVisualInsetTop(clip);
    const insetBottom = resolveVisualInsetBottom(clip);
    const backgroundMode = resolveUiBackgroundMode(resolveVisualBackgroundMode(clip));
    const backgroundColor = resolveVisualBackgroundColor(clip);
    const backgroundBlur = resolveVisualBackgroundBlur(clip);
    const usesGradient = isColorBackgroundGradient(clip);
    const activeGradient = resolveActiveColorGradient(clip);
    const [selectedStopIndex, setSelectedStopIndex] = React.useState(0);
    const [previewStops, setPreviewStops] = React.useState<ShortVideoVisualGradientStop[] | null>(null);

    const displayStops = previewStops ?? activeGradient?.stops ?? [];
    const displayGradient = activeGradient && usesGradient
        ? { ...activeGradient, stops: displayStops }
        : null;

    React.useEffect(() => {
        setPreviewStops(null);
    }, [clip.visual_background_gradient, clip.visual_background_mode]);

    React.useEffect(() => {
        if (!usesGradient || !activeGradient) {
            setSelectedStopIndex(0);
            return;
        }
        if (selectedStopIndex >= activeGradient.stops.length) {
            setSelectedStopIndex(Math.max(0, activeGradient.stops.length - 1));
        }
    }, [activeGradient, selectedStopIndex, usesGradient]);

    const patchGradient = (patch: Partial<NonNullable<typeof activeGradient>>) => {
        const base = activeGradient ?? createGradientFromSolidColor(backgroundColor);
        const normalized = normalizeVisualBackgroundGradient({
            ...base,
            ...patch,
        });

        onPatch({
            visual_background_mode: 'color',
            visual_background_color: normalized.stops[0]?.color ?? backgroundColor,
            visual_background_gradient: normalized,
        });
    };

    const patchGradientStops = (
        stops: ShortVideoVisualGradientStop[],
        commit = true
    ) => {
        if (!commit) {
            setPreviewStops(stops);
            return;
        }
        setPreviewStops(null);
        patchGradient({ stops: sortGradientStops(stops) });
    };

    const handleVerticalAlignChange = (
        _event: React.MouseEvent<HTMLElement>,
        next: ShortVideoVisualVerticalAlign | null
    ) => {
        if (!next) {
            return;
        }
        onPatch({ visual_vertical_align: next });
    };

    const handleBackgroundModeChange = (
        _event: React.MouseEvent<HTMLElement>,
        next: ShortVideoVisualBackgroundMode | null
    ) => {
        if (!next || next === 'gradient') {
            return;
        }
        onPatch({ visual_background_mode: next });
    };

    const handleSolidColorChange = (value: string) => {
        onPatch({
            visual_background_mode: 'color',
            visual_background_color: value,
            visual_background_gradient: undefined,
        });
    };

    const handleEnableGradient = () => {
        onPatch({
            visual_background_mode: 'color',
            visual_background_color: backgroundColor,
            visual_background_gradient: createGradientFromSolidColor(backgroundColor, 'to_top'),
        });
        setSelectedStopIndex(0);
    };

    const handleApplyNewsPreset = () => {
        const preset = normalizeVisualBackgroundGradient(DEFAULT_VISUAL_BACKGROUND_GRADIENT);
        onPatch({
            visual_background_mode: 'color',
            visual_background_color: preset.stops[0]?.color ?? backgroundColor,
            visual_background_gradient: preset,
        });
        setSelectedStopIndex(0);
    };

    const handleAddGradientStop = () => {
        if (!activeGradient || activeGradient.stops.length >= MAX_GRADIENT_STOPS) {
            return;
        }
        const lastStop = activeGradient.stops[activeGradient.stops.length - 1];
        patchGradientStops([
            ...activeGradient.stops,
            {
                color: lastStop?.color ?? backgroundColor,
                opacity: lastStop?.opacity ?? 100,
                position: Math.min(100, (lastStop?.position ?? 0) + 15),
            },
        ]);
        setSelectedStopIndex(activeGradient.stops.length);
    };

    const handleRemoveStop = (index: number) => {
        if (!activeGradient) {
            return;
        }
        const remaining = activeGradient.stops.filter((_, itemIndex) => itemIndex !== index);
        if (remaining.length <= 1) {
            onPatch({
                visual_background_mode: 'color',
                visual_background_color: remaining[0]?.color ?? backgroundColor,
                visual_background_gradient: undefined,
            });
            setSelectedStopIndex(0);
            return;
        }
        const nextStops = remaining.length > 1
            ? sortGradientStops(remaining)
            : remaining;
        patchGradientStops(nextStops, true);
        setSelectedStopIndex(Math.max(0, index - 1));
    };

    const previewCss = displayGradient
        ? buildLinearGradientCss(displayGradient)
        : (backgroundColor || DEFAULT_VISUAL_BACKGROUND_COLOR);

    return (
        <>
            <InspectorPropertyGroup title="Vị trí" collapsible={false}>
                <InspectorPropertyRow label="Căn dọc" fullWidthControl>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        fullWidth
                        value={verticalAlign}
                        onChange={handleVerticalAlignChange}
                        sx={{
                            bgcolor: 'background.default',
                            '& .MuiToggleButton-root': {
                                borderColor: 'divider',
                            },
                        }}
                    >
                        <ToggleButton value="top" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Trên
                        </ToggleButton>
                        <ToggleButton value="center" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Giữa
                        </ToggleButton>
                        <ToggleButton value="bottom" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Dưới
                        </ToggleButton>
                    </ToggleButtonGroup>
                </InspectorPropertyRow>

                {verticalAlign === 'top' ? (
                    <InspectorPropertyNumber
                        label="Cách trên"
                        value={insetTop}
                        min={0}
                        max={1400}
                        step={10}
                        onChange={(value) => onPatch({ visual_inset_top: value })}
                    />
                ) : null}

                {verticalAlign === 'bottom' ? (
                    <InspectorPropertyNumber
                        label="Cách dưới"
                        value={insetBottom}
                        min={0}
                        max={1400}
                        step={10}
                        onChange={(value) => onPatch({ visual_inset_bottom: value })}
                    />
                ) : null}
            </InspectorPropertyGroup>

            <InspectorPropertyGroup title="Nền" collapsible={false}>
                <InspectorPropertyRow label="Loại nền" fullWidthControl>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        fullWidth
                        value={backgroundMode}
                        onChange={handleBackgroundModeChange}
                        sx={{
                            bgcolor: 'background.default',
                            '& .MuiToggleButton-root': {
                                borderColor: 'divider',
                            },
                        }}
                    >
                        <ToggleButton value="none" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Không
                        </ToggleButton>
                        <ToggleButton value="color" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Màu
                        </ToggleButton>
                        <ToggleButton value="media_blur" sx={INSPECTOR_TOGGLE_BUTTON_SX}>
                            Media mờ
                        </ToggleButton>
                    </ToggleButtonGroup>
                </InspectorPropertyRow>

                {backgroundMode === 'color' ? (
                    <>
                        <Box sx={{ px: 1.5, pt: 0.5, pb: 1 }}>
                            {usesGradient && displayGradient ? (
                                <GradientPreviewBar
                                    direction={displayGradient.direction}
                                    previewCss={previewCss}
                                    stops={displayStops}
                                    selectedIndex={selectedStopIndex}
                                    onSelectStop={setSelectedStopIndex}
                                    onStopsChange={patchGradientStops}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        height: 52,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: previewCss,
                                    }}
                                />
                            )}
                        </Box>

                        {!usesGradient ? (
                            <InspectorPropertyColor
                                label="Màu nền"
                                value={backgroundColor || DEFAULT_VISUAL_BACKGROUND_COLOR}
                                onChange={handleSolidColorChange}
                            />
                        ) : null}

                        {usesGradient && displayGradient ? (
                            <>
                                <InspectorPropertyRow label="Chiều" fullWidthControl>
                                    <Select
                                        size="small"
                                        fullWidth
                                        value={displayGradient.direction}
                                        onChange={(event) => patchGradient({
                                            direction: event.target.value as typeof displayGradient.direction,
                                        })}
                                    >
                                        {VISUAL_GRADIENT_DIRECTION_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </InspectorPropertyRow>

                                {displayStops.map((stop, index) => (
                                    <ColorStopRow
                                        key={`color-stop-${index}`}
                                        label={getGradientStopEdgeLabel(
                                            displayGradient.direction,
                                            index,
                                            displayStops.length
                                        )}
                                        stop={stop}
                                        showPositionSlider={displayStops.length > 2}
                                        canRemove
                                        onChange={(nextStop) => {
                                            const stops = [...displayStops];
                                            stops[index] = nextStop;
                                            patchGradientStops(stops, true);
                                        }}
                                        onRemove={() => handleRemoveStop(index)}
                                    />
                                ))}
                            </>
                        ) : null}

                        <Box
                            sx={{
                                px: 1.5,
                                pb: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                            }}
                        >
                            {!usesGradient ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleEnableGradient}
                                >
                                    Thêm màu chuyển
                                </Button>
                            ) : null}
                            {usesGradient && displayGradient && displayStops.length < MAX_GRADIENT_STOPS ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddGradientStop}
                                >
                                    Thêm màu
                                </Button>
                            ) : null}
                            <Button
                                size="small"
                                variant="text"
                                onClick={handleApplyNewsPreset}
                            >
                                Mẫu phụ đề đỏ
                            </Button>
                        </Box>

                        {usesGradient ? (
                            <Box sx={{ px: 1.5, pb: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Kéo nút trên thanh xem trước để chỉnh vị trí %. Giảm độ hiện để làm màu trong suốt dần.
                                </Typography>
                            </Box>
                        ) : null}
                    </>
                ) : null}

                {backgroundMode === 'media_blur' ? (
                    <>
                        <InspectorPropertyNumber
                            label="Độ mờ"
                            value={backgroundBlur}
                            min={8}
                            max={48}
                            step={2}
                            onChange={(value) => onPatch({ visual_background_blur: value })}
                        />
                        <Box sx={{ px: 1.5, pb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Video YouTube chỉ hiển thị thumbnail mờ làm nền
                            </Typography>
                        </Box>
                    </>
                ) : null}
            </InspectorPropertyGroup>
        </>
    );
}

export {
    DEFAULT_VISUAL_BACKGROUND_BLUR,
    DEFAULT_VISUAL_BACKGROUND_COLOR,
    DEFAULT_VISUAL_INSET_BOTTOM,
    DEFAULT_VISUAL_INSET_TOP,
};
