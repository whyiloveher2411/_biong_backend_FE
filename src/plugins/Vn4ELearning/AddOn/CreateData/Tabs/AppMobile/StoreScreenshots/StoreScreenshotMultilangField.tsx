import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Box,
    Chip,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import useLanguages from '../hooks/useLanguages';
import {
    normalizeMultilangText,
    sortLanguagesForScreenshotCopy,
    STORE_SCREENSHOT_BULK_LANG,
    STORE_SCREENSHOT_PROMPT_LANG,
    type StoreScreenshotMultilangText,
} from './storeScreenshotMultilang';

type Props = {
    label: string;
    value: StoreScreenshotMultilangText | string;
    onChange: (value: StoreScreenshotMultilangText) => void;
    placeholder?: string;
    helperText?: string;
    multiline?: boolean;
    minRows?: number;
};

function StoreScreenshotMultilangField({
    label,
    value,
    onChange,
    placeholder,
    helperText,
    multiline = false,
    minRows = 1,
}: Props) {
    const { languages } = useLanguages();
    const sortedLanguages = React.useMemo(() => {
        const source = languages.length
            ? languages
            : [
                { code: STORE_SCREENSHOT_PROMPT_LANG, name: 'English', flag_code: 'us' },
                { code: 'vi', name: 'Tiếng Việt', flag_code: 'vn' },
            ];
        return sortLanguagesForScreenshotCopy(source);
    }, [languages]);
    const normalizedValue = React.useMemo(() => normalizeMultilangText(value), [value]);

    const [langCode, setLangCode] = React.useState(STORE_SCREENSHOT_PROMPT_LANG);

    React.useEffect(() => {
        if (!sortedLanguages.length) {
            return;
        }
        if (!sortedLanguages.some((lang) => lang.code === langCode)) {
            setLangCode(sortedLanguages[0].code);
        }
    }, [sortedLanguages, langCode]);

    const currentLang = sortedLanguages.find((lang) => lang.code === langCode)
        ?? sortedLanguages[0];
    const currentValue = currentLang ? (normalizedValue[currentLang.code] || '') : '';
    const isPromptLang = currentLang?.code === STORE_SCREENSHOT_PROMPT_LANG;
    const isBulkLang = currentLang?.code === STORE_SCREENSHOT_BULK_LANG;

    const handleValueChange = (nextValue: string) => {
        if (!currentLang) {
            return;
        }

        const next = { ...normalizedValue };
        const trimmed = nextValue.trim();

        if (trimmed) {
            next[currentLang.code] = nextValue;
        } else {
            delete next[currentLang.code];
        }

        onChange(next);
    };

    return (
        <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {label}
                </Typography>
                {sortedLanguages.map((language) => {
                    const selected = langCode === language.code;
                    const filled = Boolean(normalizedValue[language.code]?.trim());

                    return (
                        <Tooltip
                            key={language.code}
                            title={language.code === STORE_SCREENSHOT_PROMPT_LANG
                                ? `${language.name} — dùng trong prompt ảnh AI`
                                : language.code === STORE_SCREENSHOT_BULK_LANG
                                    ? `${language.name} — sinh từ prompt bulk`
                                    : `${language.name} — review`}
                        >
                            <IconButton
                                size="small"
                                onClick={() => setLangCode(language.code)}
                                sx={{
                                    p: '2px',
                                    border: '1px solid',
                                    borderColor: selected ? 'primary.main' : 'divider',
                                    borderRadius: '4px',
                                    bgcolor: selected ? 'action.hover' : 'transparent',
                                    position: 'relative',
                                }}
                            >
                                {filled ? (
                                    <CheckCircleIcon
                                        sx={{
                                            position: 'absolute',
                                            top: -6,
                                            right: -6,
                                            width: 14,
                                            height: 14,
                                            color: 'success.main',
                                            bgcolor: 'background.paper',
                                            borderRadius: '50%',
                                        }}
                                    />
                                ) : null}
                                {language.icon_url ? (
                                    <img
                                        src={language.icon_url}
                                        alt={language.name}
                                        style={{
                                            width: 22,
                                            height: 16,
                                            objectFit: 'cover',
                                            borderRadius: 2,
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={`https://flagcdn.com/w20/${language.flag_code}.png`}
                                        alt={language.name}
                                        style={{
                                            width: 22,
                                            height: 16,
                                            objectFit: 'cover',
                                            borderRadius: 2,
                                            display: 'block',
                                        }}
                                    />
                                )}
                            </IconButton>
                        </Tooltip>
                    );
                })}
                {isPromptLang ? (
                    <Chip
                        label="Dùng trong prompt ảnh AI"
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                ) : isBulkLang ? (
                    <Chip
                        label="Sinh từ prompt bulk"
                        size="small"
                        color="warning"
                        variant="outlined"
                    />
                ) : (
                    <Chip
                        label="Review"
                        size="small"
                        variant="outlined"
                    />
                )}
            </Box>

            <TextField
                value={currentValue}
                onChange={(event) => handleValueChange(event.target.value)}
                placeholder={placeholder}
                helperText={helperText}
                fullWidth
                multiline={multiline}
                minRows={minRows}
            />
        </Stack>
    );
}

export default StoreScreenshotMultilangField;
