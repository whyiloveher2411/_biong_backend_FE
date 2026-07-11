import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import type { TtsPhoneticDictEntry } from './agentVideoApi';
import { buildPhoneticMarkedSegments } from './agentVideoPhoneticMarkUi';
import { getTextareaSelectedText } from './agentVideoPhoneticDictUi';

type Props = {
    value: string;
    onChange: (value: string) => void;
    phoneticDict?: TtsPhoneticDictEntry[];
    inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement | null>;
    placeholder?: string;
    minRows?: number;
    maxRows?: number;
    disabled?: boolean;
    sx?: SxProps<Theme>;
    onTextSelection?: (payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => void;
    onPhoneticSelection?: (payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => void;
};

const FONT_SIZE = 13;
const LINE_HEIGHT = 1.55;
const PAD_Y = 8.5;
const PAD_X = 14;

/** Style chữ dùng CHUNG cho mirror + textarea — tránh lệch gạch. */
const sharedTextSx = {
    m: 0,
    width: '100%',
    boxSizing: 'border-box' as const,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: 'inherit',
    fontWeight: 400,
    letterSpacing: 'normal',
    px: `${PAD_X}px`,
    py: `${PAD_Y}px`,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    // Cùng gutter scrollbar → wrap giống nhau
    overflowY: 'scroll' as const,
    overflowX: 'hidden' as const,
};

/**
 * Mirror + textarea cùng một hộp, cùng CSS — gạch phiên âm không lệch.
 * Selection lấy từ textarea thật.
 */
export default function ShortVideoAgentPhoneticScriptField({
    value,
    onChange,
    phoneticDict = [],
    inputRef,
    placeholder,
    minRows = 6,
    maxRows = 14,
    disabled,
    sx,
    onTextSelection,
}: Props) {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const mirrorRef = React.useRef<HTMLDivElement | null>(null);
    const lastPointerRef = React.useRef({ clientX: 0, clientY: 0 });
    const [focused, setFocused] = React.useState(false);

    const setRefs = React.useCallback((node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (!inputRef) return;
        if (typeof inputRef === 'function') {
            inputRef(node);
            return;
        }
        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    }, [inputRef]);

    const segments = React.useMemo(
        () => buildPhoneticMarkedSegments(value, phoneticDict),
        [phoneticDict, value],
    );

    const minHeight = PAD_Y * 2 + minRows * FONT_SIZE * LINE_HEIGHT;
    const maxHeight = PAD_Y * 2 + maxRows * FONT_SIZE * LINE_HEIGHT;

    const syncScroll = React.useCallback(() => {
        const ta = textareaRef.current;
        const mirror = mirrorRef.current;
        if (!ta || !mirror) return;
        mirror.scrollTop = ta.scrollTop;
        mirror.scrollLeft = ta.scrollLeft;
    }, []);

    const emitSelection = React.useCallback(() => {
        if (!onTextSelection) return;
        const text = getTextareaSelectedText(textareaRef.current);
        if (!text) return;
        onTextSelection({
            text,
            clientX: lastPointerRef.current.clientX,
            clientY: lastPointerRef.current.clientY,
        });
    }, [onTextSelection]);

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                border: '1px solid',
                borderColor: focused ? 'primary.main' : 'rgba(0, 0, 0, 0.23)',
                borderRadius: 1,
                bgcolor: 'background.paper',
                transition: 'border-color 0.15s',
                '&:hover': {
                    borderColor: focused ? 'primary.main' : 'text.primary',
                },
                ...((typeof sx === 'object' && sx && !Array.isArray(sx)) ? sx : {}),
            }}
            onMouseDown={(event) => {
                lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
            }}
            onMouseUp={(event) => {
                lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
                window.requestAnimationFrame(() => emitSelection());
            }}
        >
            {/* Mirror: cùng box model với textarea */}
            <Box
                ref={mirrorRef}
                aria-hidden
                sx={{
                    ...sharedTextSx,
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                    zIndex: 0,
                    minHeight,
                    maxHeight,
                }}
            >
                {segments.map((segment, index) => {
                    if (!segment.phonetic) {
                        return (
                            <React.Fragment key={`plain-${index}`}>
                                {segment.text}
                            </React.Fragment>
                        );
                    }
                    return (
                        <Box
                            key={`ph-${index}`}
                            component="span"
                            title={segment.phonetic}
                            sx={{
                                color: 'transparent',
                                WebkitTextFillColor: 'transparent',
                                textDecoration: 'underline dashed',
                                textDecorationThickness: '1.5px',
                                textUnderlineOffset: '3px',
                                textDecorationColor: (theme) => theme.palette.info.main,
                            }}
                        >
                            {segment.text}
                        </Box>
                    );
                })}
                {value.endsWith('\n') ? '\n' : null}
            </Box>

            <Box
                component="textarea"
                ref={setRefs}
                spellCheck={false}
                disabled={disabled}
                placeholder={placeholder}
                value={value}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                    onChange(event.target.value);
                }}
                onScroll={syncScroll}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyUp={() => {
                    window.requestAnimationFrame(() => emitSelection());
                }}
                sx={{
                    ...sharedTextSx,
                    position: 'relative',
                    zIndex: 1,
                    display: 'block',
                    background: 'transparent',
                    color: 'text.primary',
                    caretColor: 'text.primary',
                    minHeight,
                    maxHeight,
                    '&::placeholder': {
                        color: 'text.disabled',
                        opacity: 1,
                    },
                }}
            />
        </Box>
    );
}
