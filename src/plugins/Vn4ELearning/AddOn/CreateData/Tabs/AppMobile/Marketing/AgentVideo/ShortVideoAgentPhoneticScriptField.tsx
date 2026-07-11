import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import type { TtsPhoneticDictEntry } from './agentVideoApi';
import { buildPhoneticMarkedSegments } from './agentVideoPhoneticMarkUi';
import { buildDomSelectionAnchor } from './agentVideoPhoneticDictUi';
import PhoneticMarkedWord from './PhoneticMarkedWord';

type Props = {
    value: string;
    onChange: (value: string) => void;
    phoneticDict?: TtsPhoneticDictEntry[];
    /** true = textarea sửa text; false = box xem + mark phiên âm */
    editMode?: boolean;
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
};

const FONT_SIZE = 13;
const LINE_HEIGHT = 1.55;
const PAD_Y = 8.5;
const PAD_X = 14;

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
    overflowY: 'scroll' as const,
    overflowX: 'hidden' as const,
};

/**
 * View: box text thật + PhoneticMarkedWord (gạch đúng vị trí, hover tooltip).
 * Edit: textarea thường — không mark, không menu phiên âm.
 */
export default function ShortVideoAgentPhoneticScriptField({
    value,
    onChange,
    phoneticDict = [],
    editMode = false,
    inputRef,
    placeholder,
    minRows = 6,
    maxRows = 14,
    disabled,
    sx,
    onTextSelection,
}: Props) {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const viewRootRef = React.useRef<HTMLDivElement | null>(null);
    const lastPointerRef = React.useRef({ clientX: 0, clientY: 0 });
    const [focused, setFocused] = React.useState(false);

    const setTextareaRefs = React.useCallback((node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (!inputRef) return;
        if (typeof inputRef === 'function') {
            inputRef(node);
            return;
        }
        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    }, [inputRef]);

    React.useEffect(() => {
        if (editMode) return;
        if (!inputRef) return;
        if (typeof inputRef === 'function') {
            inputRef(null);
            return;
        }
        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = null;
    }, [editMode, inputRef]);

    const segments = React.useMemo(
        () => buildPhoneticMarkedSegments(value, phoneticDict),
        [phoneticDict, value],
    );

    const minHeight = PAD_Y * 2 + minRows * FONT_SIZE * LINE_HEIGHT;
    const maxHeight = PAD_Y * 2 + maxRows * FONT_SIZE * LINE_HEIGHT;

    const shellSx = {
        position: 'relative' as const,
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
    };

    const emitViewSelection = React.useCallback(() => {
        if (editMode || !onTextSelection) return;
        const anchor = buildDomSelectionAnchor(viewRootRef.current, lastPointerRef.current);
        if (!anchor) return;
        onTextSelection({
            text: anchor.text,
            clientX: anchor.left,
            clientY: anchor.top,
        });
    }, [editMode, onTextSelection]);

    if (editMode) {
        return (
            <Box
                sx={shellSx}
                onFocus={() => setFocused(true)}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setFocused(false);
                    }
                }}
            >
                <Box
                    component="textarea"
                    ref={setTextareaRefs}
                    spellCheck={false}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                        onChange(event.target.value);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    sx={{
                        ...sharedTextSx,
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

    const isEmpty = !String(value || '').length;

    return (
        <Box
            ref={viewRootRef}
            sx={shellSx}
            onMouseDown={(event) => {
                lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
            }}
            onMouseUp={(event) => {
                lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
                window.requestAnimationFrame(() => emitViewSelection());
            }}
        >
            <Box
                sx={{
                    ...sharedTextSx,
                    color: isEmpty ? 'text.disabled' : 'text.primary',
                    minHeight,
                    maxHeight,
                    userSelect: disabled ? 'none' : 'text',
                    cursor: disabled ? 'default' : 'text',
                }}
            >
                {isEmpty ? (
                    placeholder || ''
                ) : (
                    <>
                        {segments.map((segment, index) => {
                            if (!segment.phonetic) {
                                return (
                                    <React.Fragment key={`plain-${index}`}>
                                        {segment.text}
                                    </React.Fragment>
                                );
                            }
                            return (
                                <PhoneticMarkedWord key={`ph-${index}`} phonetic={segment.phonetic}>
                                    {segment.text}
                                </PhoneticMarkedWord>
                            );
                        })}
                        {value.endsWith('\n') ? '\n' : null}
                    </>
                )}
            </Box>
        </Box>
    );
}
