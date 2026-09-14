import React from 'react';
import {
    Box,
    Collapse,
    IconButton,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha, type Theme } from '@mui/material/styles';

export type WorkflowSectionTone =
    | 'neutral'
    | 'info'
    | 'pipeline'
    | 'prompt'
    | 'meta'
    | 'visual'
    | 'action'
    | 'social';

const TONE_STYLES: Record<
    WorkflowSectionTone,
    (theme: Theme) => { bgcolor: string; borderColor: string; titleColor: string }
> = {
    neutral: (theme) => ({
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.06),
        borderColor: alpha(theme.palette.grey[500], 0.22),
        titleColor: theme.palette.text.secondary,
    }),
    info: (theme) => ({
        bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.14 : 0.07),
        borderColor: alpha(theme.palette.info.main, 0.28),
        titleColor: theme.palette.info.dark,
    }),
    pipeline: (theme) => ({
        bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.14 : 0.07),
        borderColor: alpha(theme.palette.success.main, 0.28),
        titleColor: theme.palette.success.dark,
    }),
    prompt: (theme) => ({
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.06),
        borderColor: alpha(theme.palette.primary.main, 0.28),
        titleColor: theme.palette.primary.dark,
    }),
    meta: (theme) => ({
        bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
        borderColor: alpha(theme.palette.warning.main, 0.28),
        titleColor: theme.palette.warning.dark,
    }),
    visual: (theme) => ({
        bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07),
        borderColor: alpha(theme.palette.secondary.main, 0.28),
        titleColor: theme.palette.secondary.dark,
    }),
    action: (theme) => ({
        bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.1 : 0.04),
        borderColor: alpha(theme.palette.error.main, 0.18),
        titleColor: theme.palette.text.secondary,
    }),
    social: (theme) => ({
        bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
        borderColor: alpha(theme.palette.success.main, 0.2),
        titleColor: theme.palette.success.dark,
    }),
};

type WorkflowSectionProps = {
    title: string;
    description?: React.ReactNode;
    tone?: WorkflowSectionTone;
    children: React.ReactNode;
    /** Header phụ bên phải title (vd. nút Import). */
    headerAction?: React.ReactNode;
    /** Bật thu gọn (mặc định mở nếu không truyền). */
    collapsible?: boolean;
    /** Trạng thái mở ban đầu khi collapsible (mặc định false = thu gọn). */
    defaultExpanded?: boolean;
};

export function WorkflowSection({
    title,
    description,
    tone = 'neutral',
    children,
    headerAction,
    collapsible = false,
    defaultExpanded = false,
}: WorkflowSectionProps) {
    const [expanded, setExpanded] = React.useState(collapsible ? defaultExpanded : true);

    React.useEffect(() => {
        if (collapsible) {
            setExpanded(defaultExpanded);
        }
    }, [collapsible, defaultExpanded]);

    const toggleExpanded = React.useCallback(() => {
        if (collapsible) {
            setExpanded((prev) => !prev);
        }
    }, [collapsible]);

    return (
        <Box
            sx={(theme) => {
                const style = TONE_STYLES[tone](theme);
                return {
                    bgcolor: style.bgcolor,
                    border: '1px solid',
                    borderColor: style.borderColor,
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1.5,
                };
            }}
        >
            <Box
                onClick={toggleExpanded}
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: (expanded && description) ? 0.5 : (expanded ? 1 : 0),
                    cursor: collapsible ? 'pointer' : 'default',
                }}
            >
                <Typography
                    variant="caption"
                    display="block"
                    fontWeight={700}
                    sx={(theme) => ({
                        letterSpacing: 0.2,
                        textTransform: 'uppercase',
                        fontSize: 10.5,
                        color: TONE_STYLES[tone](theme).titleColor,
                        pt: headerAction || collapsible ? 0.35 : 0,
                    })}
                >
                    {title}
                </Typography>
                <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    onClick={collapsible ? (event) => event.stopPropagation() : undefined}
                >
                    {headerAction}
                    {collapsible ? (
                        <IconButton
                            size="small"
                            aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
                            sx={{
                                p: 0.25,
                                transform: expanded ? 'rotate(180deg)' : 'none',
                                transition: 'transform 150ms',
                            }}
                        >
                            <ExpandMoreIcon fontSize="small" />
                        </IconButton>
                    ) : null}
                </Box>
            </Box>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                {description ? (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1.25, lineHeight: 1.4 }}
                    >
                        {description}
                    </Typography>
                ) : null}
                {children}
            </Collapse>
        </Box>
    );
}

/** Nền paper cho input nằm trên section tint — dễ tách field khỏi card. */
export const workflowFieldSurfaceSx = {
    bgcolor: 'background.paper',
    borderRadius: 1,
} as const;
