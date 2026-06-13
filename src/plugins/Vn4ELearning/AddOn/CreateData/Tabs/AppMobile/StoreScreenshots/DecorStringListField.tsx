import React from 'react';
import { TextField } from '@mui/material';
import { formatDecorStringListForField } from './storeScreenshotVisualDecorCatalog';

type Props = {
    label: string;
    items?: string[];
    text?: string;
    onTextChange: (text: string) => void;
    placeholder?: string;
    helperText?: string;
    disabled?: boolean;
    minRows?: number;
    maxRows?: number;
};

function DecorStringListField({
    label,
    items = [],
    text,
    onTextChange,
    placeholder,
    helperText,
    disabled = false,
    minRows = 2,
    maxRows = 5,
}: Props) {
    const savedText = formatDecorStringListForField(items);
    const [draftText, setDraftText] = React.useState(() => text ?? savedText);
    const isFocusedRef = React.useRef(false);

    React.useEffect(() => {
        if (isFocusedRef.current) {
            return;
        }
        setDraftText(text ?? savedText);
    }, [text, savedText]);

    return (
        <TextField
            label={label}
            value={draftText}
            onFocus={() => {
                isFocusedRef.current = true;
            }}
            onBlur={() => {
                isFocusedRef.current = false;
                onTextChange(draftText);
            }}
            onChange={(event) => {
                const nextText = event.target.value;
                setDraftText(nextText);
                onTextChange(nextText);
            }}
            placeholder={placeholder}
            fullWidth
            multiline
            minRows={minRows}
            maxRows={maxRows}
            size="small"
            disabled={disabled}
            helperText={helperText}
        />
    );
}

export default DecorStringListField;
