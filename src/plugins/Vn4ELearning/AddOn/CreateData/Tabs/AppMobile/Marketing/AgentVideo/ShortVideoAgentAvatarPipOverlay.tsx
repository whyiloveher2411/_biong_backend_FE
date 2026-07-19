import React from 'react';
import { Box, Typography } from '@mui/material';
import { convertToURL, validURL } from 'helpers/url';
import type { AvatarPipAnchor } from './agentVideoApi';

type Props = {
    show: boolean;
    masterUrl: string;
    anchor?: AvatarPipAnchor | string;
    /** Karaoke ON → bottom PiP cao hơn để tránh caption. */
    showKaraoke?: boolean;
    /** Gắn trong stage 1080×1920 (scale cùng iframe). */
    stageMode?: boolean;
};

function resolveMasterSrc(raw: string): string {
    const s = String(raw || '').trim();
    if (!s) {
        return '';
    }
    if (validURL(s) || s.startsWith('data:')) {
        return s;
    }
    if (s.startsWith('//')) {
        return `https:${s}`;
    }
    if (s.startsWith('{')) {
        try {
            const parsed = JSON.parse(s) as { link?: string };
            const link = String(parsed?.link || '').trim();
            if (!link) {
                return '';
            }
            return validURL(link) ? link : convertToURL(process.env.REACT_APP_BASE_URL, link);
        } catch {
            return '';
        }
    }
    return convertToURL(process.env.REACT_APP_BASE_URL, s.replace(/^\//, ''));
}

function resolvePipPosition(
    anchor: string,
    stageMode: boolean,
    showKaraoke: boolean,
): Record<string, string | number> {
    const margin = stageMode ? 28 : '5%';
    const topClear = stageMode ? 80 : '6%';
    const bottomClear = stageMode
        ? (showKaraoke ? 200 : 48)
        : (showKaraoke ? '12%' : '4%');

    switch (anchor) {
        case 'top_left':
            return { top: topClear, left: margin };
        case 'top_right':
            return { top: topClear, right: margin };
        case 'bottom_left':
            return { bottom: bottomClear, left: margin };
        case 'center':
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        case 'bottom_right':
        default:
            return { bottom: bottomClear, right: margin };
    }
}

/** PiP master tĩnh — demo vị trí CMS preview theo anchor. */
export default function ShortVideoAgentAvatarPipOverlay({
    show,
    masterUrl,
    anchor = 'bottom_right',
    showKaraoke = true,
    stageMode = false,
}: Props) {
    if (!show) {
        return null;
    }

    const src = resolveMasterSrc(masterUrl);
    const pos = resolvePipPosition(String(anchor || 'bottom_right'), stageMode, showKaraoke);

    const boxSx = stageMode
        ? {
            position: 'absolute' as const,
            ...pos,
            width: 216,
            height: 216,
            borderRadius: '50%',
            overflow: 'hidden',
            pointerEvents: 'none' as const,
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
            zIndex: 9999,
            bgcolor: '#ffffff',
            border: '3px solid rgba(255,255,255,0.85)',
        }
        : {
            position: 'absolute' as const,
            ...pos,
            width: '20%',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            overflow: 'hidden',
            pointerEvents: 'none' as const,
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            zIndex: 20,
            bgcolor: '#ffffff',
            border: '2px solid rgba(255,255,255,0.85)',
        };

    return (
        <Box aria-hidden sx={boxSx}>
            {src ? (
                <Box
                    component="img"
                    src={src}
                    alt=""
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
            ) : (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'warning.light',
                            textAlign: 'center',
                            fontSize: stageMode ? 18 : 10,
                            lineHeight: 1.25,
                            fontWeight: 700,
                        }}
                    >
                        Thiếu ảnh master
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
