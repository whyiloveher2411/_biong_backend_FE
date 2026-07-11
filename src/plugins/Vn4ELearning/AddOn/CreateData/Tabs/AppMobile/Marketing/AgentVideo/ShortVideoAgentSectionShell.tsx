import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type SectionTheme = {
    accent: string;
    border: string;
    headerBg: string;
    surfaceLight: string;
    surfaceDark: string;
    innerLight: string;
    innerDark: string;
};

export const SECTION_THEMES = {
    script: {
        accent: '#1565c0',
        border: '#64b5f6',
        headerBg: '#1565c0',
        surfaceLight: '#e3f2fd',
        surfaceDark: 'rgba(21, 101, 192, 0.2)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
    audio: {
        accent: '#2e7d32',
        border: '#66bb6a',
        headerBg: '#2e7d32',
        surfaceLight: '#e8f5e9',
        surfaceDark: 'rgba(46, 125, 50, 0.2)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
    whisper: {
        accent: '#6a1b9a',
        border: '#ab47bc',
        headerBg: '#6a1b9a',
        surfaceLight: '#f3e5f5',
        surfaceDark: 'rgba(106, 27, 154, 0.22)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
    beatMap: {
        accent: '#00838f',
        border: '#4dd0e1',
        headerBg: '#00838f',
        surfaceLight: '#e0f7fa',
        surfaceDark: 'rgba(0, 131, 143, 0.22)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
    assemble: {
        accent: '#e65100',
        border: '#ff8a65',
        headerBg: '#e65100',
        surfaceLight: '#fff3e0',
        surfaceDark: 'rgba(230, 81, 0, 0.22)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
} as const;

export function sectionCardSx(theme: SectionTheme, muted = false) {
    return {
        border: '2px solid',
        borderColor: theme.border,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark' ? theme.surfaceDark : theme.surfaceLight
        ),
        opacity: muted ? 0.78 : 1,
        transition: 'opacity 0.15s ease',
        boxShadow: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark'
                ? 'none'
                : `0 1px 3px ${theme.accent}22`
        ),
    } as const;
}

export function sectionHeaderSx(theme: SectionTheme) {
    return {
        px: 1.5,
        py: 1.25,
        bgcolor: theme.headerBg,
        color: '#fff',
    } as const;
}

export function subPanelSx(theme: SectionTheme) {
    return {
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark' ? `${theme.border}55` : `${theme.border}99`
        ),
        bgcolor: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark' ? theme.innerDark : theme.innerLight
        ),
    } as const;
}

export function SectionShell({
    step,
    title,
    icon,
    theme,
    muted,
    trailing,
    children,
}: {
    step: number;
    title: string;
    icon: React.ReactNode;
    theme: SectionTheme;
    muted?: boolean;
    trailing?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Box sx={sectionCardSx(theme, muted)}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={sectionHeaderSx(theme)}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
                        {icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ color: '#fff' }}>
                        {step}. {title}
                    </Typography>
                </Stack>
                {trailing}
            </Stack>
            <Box sx={{ p: 1.5 }}>
                {children}
            </Box>
        </Box>
    );
}
