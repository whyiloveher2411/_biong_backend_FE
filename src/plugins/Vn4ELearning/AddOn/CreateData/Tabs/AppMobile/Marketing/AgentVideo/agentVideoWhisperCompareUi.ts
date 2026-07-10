import type { CaptionAlignTier } from './agentVideoCaptionScriptAlign';

export type WhisperTokenTierStyle = {
    bg: string;
    border: string;
    color: string;
};

export const WHISPER_TIER_STYLES: Record<CaptionAlignTier, WhisperTokenTierStyle> = {
    green: {
        bg: '#e8f5e9',
        border: '#2e7d32',
        color: '#1b5e20',
    },
    yellow: {
        bg: '#fff8e1',
        border: '#f9a825',
        color: '#e65100',
    },
    red: {
        bg: '#ffebee',
        border: '#c62828',
        color: '#b71c1c',
    },
    grey: {
        bg: '#f5f5f5',
        border: '#bdbdbd',
        color: '#616161',
    },
};

export const WHISPER_GAP_OUTLINE = '2px solid #ef6c00';

export const WHISPER_KARAOKE_ACTIVE_STYLE = {
    bgcolor: '#000',
    color: '#fff',
    parenColor: 'rgba(255,255,255,0.75)',
};

export type WhisperCompareFilter = 'all' | 'issues' | 'orphans';
