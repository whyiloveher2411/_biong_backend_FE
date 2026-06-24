import React from 'react';
import {
    Box,
    Checkbox,
    Collapse,
    IconButton,
    InputAdornment,
    Link,
    MenuItem,
    Slider,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import ShortVideoStockMediaSearchDrawer from './ShortVideoStockMediaSearchDrawer';
import type { StockVideoSearchItem } from 'helpers/marketingStockImageApi';

export const INSPECTOR_PANEL_TAB_SX = {
    minHeight: 40,
    py: 0,
    px: 0,
    mr: 2.5,
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'none',
    minWidth: 'auto',
    color: 'text.secondary',
    '&.Mui-selected': {
        color: 'text.primary',
        fontWeight: 600,
    },
} as const;

export const INSPECTOR_TOGGLE_BUTTON_SX = {
    flex: 1,
    textTransform: 'none',
    fontSize: 13,
    fontWeight: 500,
    py: 0.75,
} as const;

export const INSPECTOR_SHELL_CONTENT_SX = {
    px: 0,
    pt: 0,
    pb: 0,
} as const;

const INSPECTOR_ROW_DIVIDER_SX = {
    borderBottom: '1px solid',
    borderColor: 'divider',
} as const;

const INSPECTOR_ROW_PADDING_SX = {
    px: 2,
    py: 1.25,
} as const;

type InspectorPanelTabsProps = {
    value: number;
    onChange: (value: number) => void;
    tabs: { label: string }[];
};

export function InspectorPanelTabs({ value, onChange, tabs }: InspectorPanelTabsProps) {
    return (
        <Tabs
            value={value}
            onChange={(_event, next) => onChange(next)}
            variant="standard"
            scrollButtons={false}
            sx={{
                minHeight: 40,
                px: 2,
                ...INSPECTOR_ROW_DIVIDER_SX,
                '& .MuiTabs-indicator': {
                    height: 2,
                    bgcolor: 'text.primary',
                },
            }}
        >
            {tabs.map((tab, index) => (
                <Tab key={tab.label} label={tab.label} sx={INSPECTOR_PANEL_TAB_SX} value={index} />
            ))}
        </Tabs>
    );
}

type InspectorPropertyGroupProps = {
    title: string;
    subtitle?: string;
    defaultExpanded?: boolean;
    collapsible?: boolean;
    action?: React.ReactNode;
    onExpandedChange?: (expanded: boolean) => void;
    children: React.ReactNode;
};

export function InspectorPropertyGroup({
    title,
    subtitle,
    defaultExpanded = false,
    collapsible = true,
    action,
    onExpandedChange,
    children,
}: InspectorPropertyGroupProps) {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const isExpanded = collapsible ? expanded : true;

    const toggleExpanded = React.useCallback(() => {
        if (!collapsible) {
            return;
        }
        setExpanded((prev) => {
            const next = !prev;
            onExpandedChange?.(next);
            return next;
        });
    }, [collapsible, onExpandedChange]);

    return (
        <Box sx={INSPECTOR_ROW_DIVIDER_SX}>
            <Box
                role={collapsible ? 'button' : undefined}
                tabIndex={collapsible ? 0 : undefined}
                onClick={collapsible ? toggleExpanded : undefined}
                onKeyDown={collapsible ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpanded();
                    }
                } : undefined}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    ...INSPECTOR_ROW_PADDING_SX,
                    cursor: collapsible ? 'pointer' : 'default',
                    userSelect: 'none',
                }}
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} fontSize={13} lineHeight={1.35}>
                        {title}
                    </Typography>
                    {subtitle ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {subtitle}
                        </Typography>
                    ) : null}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    {action}
                    {collapsible ? (
                        <ChevronRightIcon
                            sx={{
                                fontSize: 18,
                                color: 'text.secondary',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s ease',
                            }}
                        />
                    ) : null}
                </Box>
            </Box>
            <Collapse in={isExpanded}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {children}
                </Box>
            </Collapse>
        </Box>
    );
}

type InspectorPropertyRowProps = {
    label: string;
    description?: string;
    enabled?: boolean;
    onEnabledChange?: (enabled: boolean) => void;
    showToggle?: boolean;
    fullWidthControl?: boolean;
    children?: React.ReactNode;
};

export function InspectorPropertyRow({
    label,
    description,
    enabled = true,
    onEnabledChange,
    showToggle = false,
    fullWidthControl = false,
    children,
}: InspectorPropertyRowProps) {
    const disabled = showToggle && !enabled;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: fullWidthControl ? 'column' : 'row',
                alignItems: fullWidthControl ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: fullWidthControl ? 0.75 : 1,
                ...INSPECTOR_ROW_PADDING_SX,
                ...INSPECTOR_ROW_DIVIDER_SX,
                opacity: disabled ? 0.55 : 1,
                transition: 'opacity 0.15s ease',
            }}
        >
            <Box sx={{ minWidth: 0, flex: fullWidthControl ? undefined : 1 }}>
                <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                        lineHeight: 1.35,
                        fontWeight: 500,
                        fontSize: 13,
                        display: 'block',
                    }}
                >
                    {label}
                </Typography>
                {description ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {description}
                    </Typography>
                ) : null}
            </Box>
            {showToggle ? (
                <Checkbox
                    size="small"
                    checked={enabled}
                    onChange={(e) => onEnabledChange?.(e.target.checked)}
                    sx={{ p: 0, flexShrink: 0, color: 'text.secondary' }}
                />
            ) : null}
            {!showToggle && children ? (
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: fullWidthControl ? 'stretch' : 'flex-end',
                        width: fullWidthControl ? '100%' : 'auto',
                    }}
                >
                    {disabled ? null : children}
                </Box>
            ) : null}
            {showToggle && enabled && children ? (
                <Box
                    sx={{
                        width: '100%',
                        pl: 0.5,
                        pb: 0.25,
                    }}
                >
                    {children}
                </Box>
            ) : null}
        </Box>
    );
}

type InspectorPropertySwitchProps = {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

export function InspectorPropertySwitch({
    label,
    description,
    checked,
    onChange,
}: InspectorPropertySwitchProps) {
    return (
        <InspectorPropertyRow
            label={label}
            description={description}
            showToggle
            enabled={checked}
            onEnabledChange={onChange}
        />
    );
}

type InspectorPropertyZIndexProps = {
    value: number;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    onValueChange: (value: number) => void;
};

export function InspectorPropertyZIndex({
    value,
    enabled,
    onEnabledChange,
    onValueChange,
}: InspectorPropertyZIndexProps) {
    const [draft, setDraft] = React.useState(String(value));
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        if (!isEditing) {
            setDraft(String(value));
        }
    }, [isEditing, value]);

    const commitDraft = React.useCallback(() => {
        const parsed = Number.parseInt(draft, 10);
        if (!Number.isFinite(parsed)) {
            setDraft(String(value));
            return;
        }
        const clamped = Math.max(-999, Math.min(999, parsed));
        onValueChange(clamped);
        setDraft(String(clamped));
    }, [draft, onValueChange, value]);

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                ...INSPECTOR_ROW_PADDING_SX,
                ...INSPECTOR_ROW_DIVIDER_SX,
            }}
        >
            <Typography
                variant="body2"
                color="text.primary"
                sx={{
                    flex: 1,
                    lineHeight: 1.35,
                    fontWeight: 500,
                    fontSize: 13,
                }}
            >
                Z-Index
            </Typography>
            <Box
                sx={{
                    width: 72,
                    flexShrink: 0,
                    visibility: enabled ? 'visible' : 'hidden',
                }}
            >
                <TextField
                    type="number"
                    size="small"
                    disabled={!enabled}
                    value={isEditing ? draft : String(value)}
                    onFocus={() => {
                        setIsEditing(true);
                        setDraft(String(value));
                    }}
                    onChange={(event) => {
                        setDraft(event.target.value);
                    }}
                    onBlur={() => {
                        setIsEditing(false);
                        commitDraft();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                        if (event.key === 'Escape') {
                            setDraft(String(value));
                            event.currentTarget.blur();
                        }
                    }}
                    inputProps={{ min: -999, max: 999, step: 1 }}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            py: 0.75,
                            px: 1,
                        },
                    }}
                />
            </Box>
            <Checkbox
                size="small"
                checked={enabled}
                onChange={(event) => onEnabledChange(event.target.checked)}
                sx={{ p: 0, flexShrink: 0, color: 'text.secondary' }}
            />
        </Box>
    );
}

type InspectorPropertySelectProps = {
    label: string;
    description?: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
    helperText?: string;
};

export function InspectorPropertySelect({
    label,
    description,
    value,
    onChange,
    options,
    disabled = false,
    helperText,
}: InspectorPropertySelectProps) {
    return (
        <InspectorPropertyRow label={label} description={description || helperText} fullWidthControl>
            <TextField
                select
                size="small"
                fullWidth
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
        </InspectorPropertyRow>
    );
}

type InspectorPropertyTextProps = {
    label: string;
    description?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
    minRows?: number;
    type?: string;
    error?: boolean;
    helperText?: string;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    endAdornment?: React.ReactNode;
};

export function InspectorPropertyText({
    label,
    description,
    value,
    onChange,
    placeholder,
    multiline = false,
    minRows = 1,
    type,
    error = false,
    helperText,
    inputProps,
    endAdornment,
}: InspectorPropertyTextProps) {
    return (
        <InspectorPropertyRow
            label={label}
            description={description || (error ? helperText : undefined)}
            fullWidthControl
        >
            <TextField
                size="small"
                fullWidth
                value={value}
                type={type}
                placeholder={placeholder}
                multiline={multiline}
                minRows={minRows}
                error={error}
                helperText={!description ? helperText : undefined}
                onChange={(e) => onChange(e.target.value)}
                inputProps={inputProps}
                InputProps={endAdornment ? { endAdornment } : undefined}
            />
        </InspectorPropertyRow>
    );
}

type InspectorPropertyImageUrlProps = Omit<InspectorPropertyTextProps, 'endAdornment' | 'type'>;

export function InspectorPropertyImageUrl(props: InspectorPropertyImageUrlProps) {
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    return (
        <>
            <InspectorPropertyText
                {...props}
                endAdornment={(
                    <IconButton
                        size="small"
                        aria-label="Tìm ảnh stock"
                        edge="end"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <SearchIcon fontSize="small" />
                    </IconButton>
                )}
            />
            <ShortVideoStockMediaSearchDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                mediaType="image"
                onSelectImage={(url) => props.onChange(url)}
            />
        </>
    );
}

type InspectorPropertyVideoUrlProps = Omit<InspectorPropertyTextProps, 'endAdornment' | 'type'> & {
    onStockVideoSelect?: (url: string, item: StockVideoSearchItem) => void;
};

export function InspectorPropertyVideoUrl(props: InspectorPropertyVideoUrlProps) {
    const { onStockVideoSelect, ...textProps } = props;
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    return (
        <>
            <InspectorPropertyText
                {...textProps}
                endAdornment={(
                    <IconButton
                        size="small"
                        aria-label="Tìm video stock"
                        edge="end"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <SearchIcon fontSize="small" />
                    </IconButton>
                )}
            />
            <ShortVideoStockMediaSearchDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                mediaType="video"
                onSelectVideo={(url, item) => {
                    textProps.onChange(url);
                    onStockVideoSelect?.(url, item);
                }}
            />
        </>
    );
}

type InspectorPropertyReadonlyProps = {
    label: string;
    value: string;
    description?: string;
    href?: string;
};

export function InspectorPropertyReadonly({ label, value, description, href }: InspectorPropertyReadonlyProps) {
    const trimmedHref = href?.trim() || '';
    const displayValue = value || '—';

    return (
        <InspectorPropertyRow label={label} description={description}>
            {trimmedHref ? (
                <Link
                    href={trimmedHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="body2"
                    noWrap
                    sx={{ maxWidth: 140, textAlign: 'right', display: 'block' }}
                >
                    {displayValue}
                </Link>
            ) : (
                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140, textAlign: 'right' }}>
                    {displayValue}
                </Typography>
            )}
        </InspectorPropertyRow>
    );
}

export function InspectorPanelBody({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {children}
        </Box>
    );
}

function normalizePickerColor(value: string): string {
    const trimmed = (value || '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return trimmed;
    }
    if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return `#${trimmed}`;
    }
    return '#000000';
}

type InspectorPropertyColorProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

export function InspectorPropertyColor({ label, value, onChange }: InspectorPropertyColorProps) {
    const pickerColor = normalizePickerColor(value);

    return (
        <InspectorPropertyRow label={label}>
            <Box
                component="label"
                sx={{
                    width: 32,
                    height: 32,
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
        </InspectorPropertyRow>
    );
}

type InspectorPropertyNumberProps = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
};

export function InspectorPropertyNumber({
    label,
    value,
    onChange,
    min = 12,
    max = 96,
    step = 1,
}: InspectorPropertyNumberProps) {
    const [draft, setDraft] = React.useState(String(value));
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        if (!isEditing) {
            setDraft(String(value));
        }
    }, [isEditing, value]);

    const commitDraft = React.useCallback(() => {
        const parsed = Number.parseInt(draft, 10);
        if (!Number.isFinite(parsed)) {
            setDraft(String(value));
            return;
        }
        const clamped = Math.min(max, Math.max(min, parsed));
        onChange(clamped);
        setDraft(String(clamped));
    }, [draft, max, min, onChange, value]);

    return (
        <InspectorPropertyRow label={label}>
            <TextField
                type="number"
                size="small"
                value={isEditing ? draft : String(value)}
                onFocus={() => {
                    setIsEditing(true);
                    setDraft(String(value));
                }}
                onChange={(e) => {
                    setDraft(e.target.value);
                }}
                onBlur={() => {
                    setIsEditing(false);
                    commitDraft();
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                        setDraft(String(value));
                        event.currentTarget.blur();
                    }
                }}
                inputProps={{ min, max, step }}
                sx={{
                    width: 72,
                    '& .MuiInputBase-input': {
                        textAlign: 'right',
                        py: 0.75,
                        px: 1,
                    },
                }}
            />
        </InspectorPropertyRow>
    );
}

type InspectorPropertyDecimalNumberProps = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    suffix?: string;
};

export function InspectorPropertyDecimalNumber({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 0.01,
    decimals = 2,
    suffix,
}: InspectorPropertyDecimalNumberProps) {
    const formatValue = React.useCallback(
        (next: number) => next.toFixed(decimals),
        [decimals]
    );
    const [draft, setDraft] = React.useState(formatValue(value));
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        if (!isEditing) {
            setDraft(formatValue(value));
        }
    }, [formatValue, isEditing, value]);

    const commitDraft = React.useCallback(() => {
        const parsed = Number.parseFloat(draft);
        if (!Number.isFinite(parsed)) {
            setDraft(formatValue(value));
            return;
        }
        const clamped = Math.min(max, Math.max(min, parsed));
        const rounded = Math.round(clamped * (10 ** decimals)) / (10 ** decimals);
        onChange(rounded);
        setDraft(formatValue(rounded));
    }, [decimals, draft, formatValue, max, min, onChange, value]);

    return (
        <InspectorPropertyRow label={label}>
            <TextField
                type="number"
                size="small"
                value={isEditing ? draft : formatValue(value)}
                onFocus={() => {
                    setIsEditing(true);
                    setDraft(formatValue(value));
                }}
                onChange={(e) => {
                    setDraft(e.target.value);
                }}
                onBlur={() => {
                    setIsEditing(false);
                    commitDraft();
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                        setDraft(formatValue(value));
                        event.currentTarget.blur();
                    }
                }}
                inputProps={{ min, max, step }}
                InputProps={suffix ? {
                    endAdornment: (
                        <InputAdornment position="end">
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                {suffix}
                            </Typography>
                        </InputAdornment>
                    ),
                } : undefined}
                sx={{
                    width: suffix ? 88 : 72,
                    '& .MuiInputBase-input': {
                        textAlign: 'right',
                        py: 0.75,
                        px: 1,
                    },
                }}
            />
        </InspectorPropertyRow>
    );
}

type InspectorPropertyVolumeProps = {
    label: string;
    description?: string;
    valuePercent: number;
    onChange: (percent: number) => void;
    disabled?: boolean;
};

export function InspectorPropertyVolume({
    label,
    description,
    valuePercent,
    onChange,
    disabled = false,
}: InspectorPropertyVolumeProps) {
    const clampedPercent = Math.max(0, Math.min(100, Math.round(valuePercent)));

    return (
        <InspectorPropertyRow label={label} description={description} fullWidthControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', px: 0.25 }}>
                <Slider
                    size="small"
                    value={clampedPercent}
                    min={0}
                    max={100}
                    step={1}
                    disabled={disabled}
                    onChange={(_event, next) => {
                        if (typeof next === 'number') {
                            onChange(next);
                        }
                    }}
                    aria-label={label}
                    sx={{
                        flex: 1,
                        color: 'text.secondary',
                        height: 4,
                        py: 0.75,
                        '& .MuiSlider-thumb': {
                            width: 12,
                            height: 12,
                        },
                        '& .MuiSlider-rail': {
                            opacity: 0.35,
                        },
                    }}
                />
                <Typography
                    variant="caption"
                    sx={{
                        minWidth: 36,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'text.secondary',
                    }}
                >
                    {clampedPercent}%
                </Typography>
            </Box>
        </InspectorPropertyRow>
    );
}
