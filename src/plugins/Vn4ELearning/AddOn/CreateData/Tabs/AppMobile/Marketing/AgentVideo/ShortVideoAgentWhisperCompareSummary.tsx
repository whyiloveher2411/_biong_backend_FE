import React from 'react';
import {
    Box,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import Button from 'components/atoms/Button';
import type { CaptionAlignResult } from './agentVideoCaptionScriptAlign';
import type { WhisperWord } from './agentVideoApi';
import ShortVideoAgentWhisperCompareText from './ShortVideoAgentWhisperCompareText';

type Props = {
    audioScript: string;
    alignResult: CaptionAlignResult | null;
    whisperWords: WhisperWord[];
    issuesOnly: boolean;
    onToggleIssuesOnly: () => void;
    onOpenCompare: (focusIndex?: number) => void;
    dimmed?: boolean;
};

export default function ShortVideoAgentWhisperCompareSummary({
    audioScript,
    alignResult,
    whisperWords,
    issuesOnly,
    onToggleIssuesOnly,
    onOpenCompare,
    dimmed = false,
}: Props) {
    if (!alignResult) {
        return null;
    }

    const { stats } = alignResult;
    const issueCount = stats.yellow + stats.red;

    return (
        <Stack spacing={1} sx={{ opacity: dimmed ? 0.65 : 1 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="caption" color="text.secondary">
                    {stats.total} từ · {stats.green} xanh · {stats.yellow} vàng · {stats.red} đỏ
                    {stats.trustedRatio > 0 ? ` · ${Math.round(stats.trustedRatio * 100)}% tin cậy` : ''}
                </Typography>
                {issueCount > 0 ? (
                    <Chip
                        size="small"
                        label={issuesOnly ? `Chỉ lỗi (${issueCount})` : `Lỗi (${issueCount})`}
                        color={issuesOnly ? 'warning' : 'default'}
                        variant={issuesOnly ? 'filled' : 'outlined'}
                        onClick={onToggleIssuesOnly}
                        sx={{ cursor: 'pointer' }}
                    />
                ) : (
                    <Chip size="small" label="Khớp tốt" color="success" variant="outlined" />
                )}
            </Stack>

            <Box
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    bgcolor: 'background.paper',
                }}
            >
                <ShortVideoAgentWhisperCompareText
                    audioScript={audioScript}
                    tokens={alignResult.tokens}
                    whisperWords={whisperWords}
                    filter={issuesOnly ? 'issues' : 'all'}
                    compact
                    maxHeight={140}
                    onSeekToken={(index) => onOpenCompare(index)}
                />
            </Box>

            <Button
                size="small"
                variant="outlined"
                startIcon={<CompareArrowsIcon />}
                onClick={() => onOpenCompare()}
                sx={{ alignSelf: 'flex-start' }}
            >
                So sánh chi tiết
            </Button>
        </Stack>
    );
}
