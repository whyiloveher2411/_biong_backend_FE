import React from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';

type Props = {
    children: React.ReactNode;
    phonetic: string;
    /** Giữ style chữ gốc từ parent (màu tier Whisper, v.v.) */
    inheritColor?: boolean;
    /** Chỉ hiện gạch/tooltip — chữ trong suốt (overlay trên textarea) */
    ghostText?: boolean;
};

/**
 * Gạch đứt dưới từ có phiên âm; hover hiện phiên âm (portal fixed — không bị overflow cha cắt).
 */
export default function PhoneticMarkedWord({
    children,
    phonetic,
    inheritColor = false,
    ghostText = false,
}: Props) {
    const label = String(phonetic || '').trim();
    const anchorRef = React.useRef<HTMLSpanElement | null>(null);
    const [open, setOpen] = React.useState(false);
    const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

    const updateCoords = React.useCallback(() => {
        const node = anchorRef.current;
        if (!node) {
            return;
        }
        const rect = node.getBoundingClientRect();
        setCoords({
            top: rect.top,
            left: rect.left + rect.width / 2,
        });
    }, []);

    const handleEnter = React.useCallback(() => {
        updateCoords();
        setOpen(true);
    }, [updateCoords]);

    const handleLeave = React.useCallback(() => {
        setOpen(false);
    }, []);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onReposition = () => updateCoords();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [open, updateCoords]);

    if (!label) {
        return <>{children}</>;
    }

    const title = open && coords && typeof document !== 'undefined'
        ? createPortal(
            <Box
                component="span"
                aria-hidden
                sx={{
                    position: 'fixed',
                    top: coords.top - 4,
                    left: coords.left,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    lineHeight: 1.2,
                    letterSpacing: 0.01,
                    color: '#fff',
                    bgcolor: '#111',
                    px: 0.6,
                    py: 0.25,
                    borderRadius: 0.75,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
                    zIndex: 10000,
                }}
            >
                {label}
            </Box>,
            document.body,
        )
        : null;

    return (
        <Box
            component="span"
            ref={anchorRef}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            sx={{
                position: 'relative',
                display: 'inline',
                ...(ghostText ? {
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                } : {}),
                // Luôn dùng màu info — tránh currentColor trùng chữ xanh Whisper nên “mất” gạch
                textDecoration: 'underline dashed',
                textDecorationThickness: '1.5px',
                textUnderlineOffset: '3px',
                textDecorationColor: (theme) => theme.palette.info.main,
                cursor: 'help',
                // CompareWord set textDecoration:none — buộc con kế thừa gạch của cụm
                '& *': {
                    textDecoration: 'inherit',
                    textDecorationColor: 'inherit',
                },
            }}
        >
            {title}
            {children}
        </Box>
    );
}
