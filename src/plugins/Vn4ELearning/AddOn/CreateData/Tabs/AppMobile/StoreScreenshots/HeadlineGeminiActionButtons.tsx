import React from 'react';
import { Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import LoadingButton from 'components/atoms/LoadingButton';
import type { HeadlineGeminiWorkflow } from './useHeadlineGeminiPanel';

type Props = {
    workflow: HeadlineGeminiWorkflow;
};

function HeadlineGeminiActionButtons({ workflow }: Props) {
    const {
        disabled,
        promptText,
        openingGemini,
        readingClipboard,
        importing,
        handleOpenGemini,
        handleImportFromClipboard,
    } = workflow;

    return (
        <Stack spacing={0.5}>
            <LoadingButton
                variant="outlined"
                size="small"
                fullWidth
                loading={openingGemini}
                disabled={disabled || !promptText.trim() || readingClipboard || importing}
                startIcon={<AutoAwesomeIcon />}
                onClick={handleOpenGemini}
                title="Tự điền prompt + screenshot — bạn chỉ cần bấm Gửi trên Gemini rồi copy JSON trả về"
            >
                Mở Gemini
            </LoadingButton>
            <LoadingButton
                variant="contained"
                size="small"
                fullWidth
                loading={readingClipboard || importing}
                disabled={disabled || openingGemini}
                startIcon={<ContentPasteGoIcon />}
                onClick={handleImportFromClipboard}
                title="Đọc JSON từ clipboard và lưu gợi ý headline + decor"
            >
                Lấy từ clipboard
            </LoadingButton>
        </Stack>
    );
}

export default HeadlineGeminiActionButtons;
