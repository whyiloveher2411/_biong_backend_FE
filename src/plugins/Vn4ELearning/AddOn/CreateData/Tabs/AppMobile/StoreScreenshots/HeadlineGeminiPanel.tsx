import React from 'react';
import {
    Alert,
    Stack,
    TextField,
} from '@mui/material';
import HeadlineVariantPicker from './HeadlineVariantPicker';
import type { HeadlineGeminiWorkflow } from './useHeadlineGeminiPanel';

type Props = {
    workflow: HeadlineGeminiWorkflow;
};

function HeadlineGeminiPanel({ workflow }: Props) {
    const {
        disabled,
        importing,
        pasteValue,
        handlePasteValueChange,
        applyError,
        applySuccess,
        clearApplySuccess,
        savingStyleId,
        handlePaste,
        handleSelectVariant,
        displayVariants,
        selectedStyleId,
    } = workflow;

    return (
        <Stack spacing={1.25}>
            {applyError ? (
                <Alert severity="error" sx={{ py: 0.25 }}>
                    {applyError}
                </Alert>
            ) : null}

            {applySuccess ? (
                <Alert severity="success" sx={{ py: 0.25 }} onClose={clearApplySuccess}>
                    {applySuccess}
                </Alert>
            ) : null}

            {displayVariants.length > 0 ? (
                <HeadlineVariantPicker
                    variants={displayVariants}
                    selectedStyleId={selectedStyleId}
                    savingStyleId={savingStyleId}
                    disabled={disabled || importing}
                    onSelect={handleSelectVariant}
                />
            ) : null}

            <TextField
                label="Dán JSON từ Gemini"
                value={pasteValue}
                onChange={(event) => {
                    handlePasteValueChange(event.target.value);
                }}
                onPaste={handlePaste}
                disabled={disabled}
                placeholder='{ "background_pattern": "...", "floating_icons_enabled": true, "icons": ["..."], "background_motifs": ["..."], "variants": [ ... ] }'
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                size="small"
                helperText="Ưu tiên bấm Lấy từ clipboard — JSON hợp lệ mới được gửi lên server."
            />
        </Stack>
    );
}

export default HeadlineGeminiPanel;
