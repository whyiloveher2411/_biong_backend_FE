import React from 'react';
import {
    Alert,
    Box,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { MarketingCopyPromptButton } from '../Marketing/MarketingPromptActionButtons';
import { buildHeadlineBulkJsonPlaceholder } from './storeScreenshotHeadlinePrompt';
import StoreScreenshotExampleHighlight from './StoreScreenshotExampleHighlight';
import {
    parseHeadlineBulkResponse,
    type HeadlineBulkRow,
} from './storeScreenshotHeadlineParser';

type Props = {
    promptText: string;
    expectedCount: number;
    onApply: (rows: HeadlineBulkRow[]) => void;
};

function StepMappingHeadlineBulkPanel({ promptText, expectedCount, onApply }: Props) {
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [pasteValue, setPasteValue] = React.useState('');
    const [applyError, setApplyError] = React.useState('');
    const [applySuccess, setApplySuccess] = React.useState('');

    const placeholder = React.useMemo(
        () => buildHeadlineBulkJsonPlaceholder(expectedCount),
        [expectedCount],
    );

    const handleCopied = () => {
        setDrawerOpen(true);
        setApplyError('');
        setApplySuccess('');
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setApplyError('');
    };

    const handleApply = () => {
        setApplyError('');
        setApplySuccess('');

        const result = parseHeadlineBulkResponse(pasteValue, expectedCount);
        if (result.errors.length > 0) {
            setApplyError(result.errors.join(' · '));
            return;
        }

        onApply(result.rows);
        setApplySuccess(`Đã cập nhật headline/subtitle (en + vi) cho ${result.rows.length} screenshot`);
        setDrawerOpen(false);
    };

    return (
        <>
            <Box
                sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                }}
            >
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            Sinh headline & subtitle thu hút user
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Prompt gồm phong cách ảnh chung (bước Template) + phong cách headline từng ảnh (bước Upload). VD chọn Vui & gamification thì mọi headline/subtitle phải vui, game-like. AI trả về en + vi.
                        </Typography>
                    </Box>

                    <MarketingCopyPromptButton
                        promptText={promptText}
                        onCopied={handleCopied}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        Sao chép prompt sinh headline/subtitle
                    </MarketingCopyPromptButton>

                    <StoreScreenshotExampleHighlight
                        title="Ví dụ JSON AI trả về"
                        headline="Học mỗi ngày chỉ 5 phút"
                        subtitle="Bài học ngắn, vừa với lịch bận rộn"
                        hint={`AI phải trả về đúng ${expectedCount} phần tử — mỗi phần tử có screenshot, headline.en, headline.vi, subtitle.en, subtitle.vi.`}
                        avoid='Tránh headline kiểu "App học code với nhiều tính năng" — không thu hút user.'
                    />

                    {applySuccess ? (
                        <Alert severity="success" onClose={() => setApplySuccess('')}>
                            {applySuccess}
                        </Alert>
                    ) : null}
                </Stack>
            </Box>

            <DrawerCustom
                open={drawerOpen}
                onClose={handleCloseDrawer}
                title="Paste JSON headline/subtitle"
                width={560}
                activeOnClose
                action={(
                    <LoadingButton
                        variant="contained"
                        onClick={handleApply}
                        disabled={!pasteValue.trim()}
                    >
                        Áp dụng
                    </LoadingButton>
                )}
            >
                <Stack spacing={2}>
                    <StoreScreenshotExampleHighlight
                        title="Ví dụ paste vào đây"
                        headline="Học mỗi ngày chỉ 5 phút"
                        subtitle="Bài học ngắn, vừa với lịch bận rộn"
                        hint="Dán JSON array từ AI — phải có cả en và vi trong mỗi headline/subtitle."
                    />

                    <TextField
                        label="JSON từ AI"
                        value={pasteValue}
                        onChange={(event) => setPasteValue(event.target.value)}
                        placeholder={placeholder}
                        fullWidth
                        multiline
                        minRows={14}
                        helperText="Đúng số lượng và thứ tự 1..N — áp dụng ghi đè en + vi, giữ nguyên ngôn ngữ khác. JSON chỉ có vi sẽ bị từ chối (thiếu en)."
                    />

                    {applyError ? (
                        <Alert severity="error">{applyError}</Alert>
                    ) : null}
                </Stack>
            </DrawerCustom>
        </>
    );
}

export default StepMappingHeadlineBulkPanel;
