import React from 'react';
import { Box, Typography } from '@mui/material';
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
};

export function WorkflowSection({
    title,
    description,
    tone = 'neutral',
    children,
    headerAction,
}: WorkflowSectionProps) {
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
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: description ? 0.5 : 1,
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
                        pt: headerAction ? 0.35 : 0,
                    })}
                >
                    {title}
                </Typography>
                {headerAction}
            </Box>
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
        </Box>
    );
}

/** Nền paper cho input nằm trên section tint — dễ tách field khỏi card. */
export const workflowFieldSurfaceSx = {
    bgcolor: 'background.paper',
    borderRadius: 1,
} as const;
