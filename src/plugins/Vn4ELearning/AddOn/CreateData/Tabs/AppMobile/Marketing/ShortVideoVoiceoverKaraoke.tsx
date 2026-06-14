import React from 'react';
import { Typography } from '@mui/material';
import type { ShortVideoRenderWord } from 'helpers/shortVideoRenderJson';

type Props = {
    words: ShortVideoRenderWord[];
    currentTimeSec: number;
    /** Chỉ highlight sau khi user đã bắt đầu phát audio (tránh active ở 0:00 trước khi play). */
    playbackActive: boolean;
    variant?: 'body2' | 'body1';
    textColor?: string;
    activeColor?: string;
    /** Khi chưa phát, tô từ đầu bằng activeColor để preview màu karaoke. */
    previewActiveWhenIdle?: boolean;
};

export default function ShortVideoVoiceoverKaraoke({
    words,
    currentTimeSec,
    playbackActive,
    variant = 'body2',
    textColor,
    activeColor,
    previewActiveWhenIdle = true,
}: Props) {
    if (words.length === 0) {
        return null;
    }

    return (
        <Typography
            component="div"
            variant={variant}
            sx={{
                lineHeight: 1.45,
                textAlign: 'left',
            }}
        >
            {words.map((word, index) => {
                const reached =
                    playbackActive && currentTimeSec >= word.start - 0.02;
                const previewActive =
                    !playbackActive && previewActiveWhenIdle && index === 0;
                const isActive = reached || previewActive;

                return (
                    <React.Fragment key={`${word.text}-${index}-${word.start}`}>
                        <Typography
                            component="span"
                            variant="inherit"
                            sx={{
                                fontWeight: isActive ? 700 : 400,
                                color: isActive
                                    ? activeColor || 'error.main'
                                    : textColor || 'text.primary',
                                transition: 'color 0.08s ease',
                            }}
                        >
                            {word.text}
                        </Typography>
                        {index < words.length - 1 ? ' ' : ''}
                    </React.Fragment>
                );
            })}
        </Typography>
    );
}
