import React from 'react';
import {
    Box,
    Checkbox,
    Collapse,
    IconButton,
    Link,
    MenuItem,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export const INSPECTOR_PANEL_TAB_SX = {
    minHeight: 36,
    py: 0.75,
    px: 1,
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'none',
    minWidth: 0,
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
            variant="fullWidth"
            sx={{
                minHeight: 36,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTabs-indicator': {
                    height: 2,
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
    defaultExpanded?: boolean;
    action?: React.ReactNode;
    onExpandedChange?: (expanded: boolean) => void;
    children: React.ReactNode;
};

export function InspectorPropertyGroup({
    title,
    defaultExpanded = true,
    action,
    onExpandedChange,
    children,
}: InspectorPropertyGroupProps) {
    const [expanded, setExpanded] = React.useState(defaultExpanded);

    const toggleExpanded = React.useCallback(() => {
        setExpanded((prev) => {
            const next = !prev;
            onExpandedChange?.(next);
            return next;
        });
    }, [onExpandedChange]);

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.5,
                    py: 0.75,
                    px: 0.25,
                }}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={toggleExpanded}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleExpanded();
                        }
                    }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        flex: 1,
                        minWidth: 0,
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                >
                    <IconButton
                        size="small"
                        aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
                        sx={{
                            p: 0.25,
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                        }}
                    >
                        <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" fontWeight={600} noWrap>
                        {title}
                    </Typography>
                </Box>
                {action}
            </Box>
            <Collapse in={expanded}>
                <Box sx={{ pb: 0.5 }}>{children}</Box>
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
                py: 1,
                px: 0.25,
                borderBottom: 1,
                borderColor: 'divider',
                opacity: disabled ? 0.55 : 1,
                transition: 'opacity 0.15s ease',
            }}
        >
            <Box sx={{ minWidth: 0, flex: fullWidthControl ? undefined : 1 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
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
                    sx={{ p: 0.25, flexShrink: 0 }}
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
        <InspectorPropertyRow label={label} description={description}>
            <Switch
                size="small"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </InspectorPropertyRow>
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
            />
        </InspectorPropertyRow>
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
                <Box
                    component="input"
                    type="color"
                    value={pickerColor}
                    onChange={(e) => onChange(e.target.value)}
                    sx={{
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
    return (
        <InspectorPropertyRow label={label}>
            <TextField
                type="number"
                size="small"
                value={value}
                onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (!Number.isFinite(parsed)) {
                        return;
                    }
                    onChange(Math.min(max, Math.max(min, parsed)));
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
