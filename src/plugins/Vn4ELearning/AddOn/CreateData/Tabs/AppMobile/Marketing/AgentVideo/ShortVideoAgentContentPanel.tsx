import React from 'react';
import {
    Alert,
    Box,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LoadingButton from 'components/atoms/LoadingButton';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentContentPanel({ state }: Props) {
    const linked = state.marketingPostId > 0;
    const contentDirty = !linked
        && state.agentSourceContent !== state.savedAgentSourceContent;
    const githubDirty = !linked
        && state.agentGithubRepo !== state.savedAgentGithubRepo;

    return (
        <Box
            sx={{
                height: '100%',
                overflow: 'auto',
                p: 2,
            }}
        >
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Content
            </Typography>

            {linked ? (
                <Stack spacing={1.5}>
                    <Alert severity="info">
                        Đang liên kết marketing post #{state.marketingPostId}
                        {' — '}
                        nội dung chỉ đọc. Không thể chỉnh sửa hay fetch README.
                    </Alert>
                    {state.contentPlainText.trim() ? (
                        <Box
                            component="pre"
                            sx={{
                                m: 0,
                                p: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily: 'inherit',
                                fontSize: 13,
                                lineHeight: 1.5,
                                maxHeight: '70vh',
                                overflow: 'auto',
                            }}
                        >
                            {state.contentPlainText}
                        </Box>
                    ) : (
                        <Alert severity="warning">
                            Marketing post chưa có nội dung plain text.
                        </Alert>
                    )}
                </Stack>
            ) : (
                <Stack spacing={1.5}>
                    <Alert severity="info">
                        Chưa liên kết marketing post — nhập nội dung nguồn tại đây
                        (hoặc fetch README từ GitHub). Agent dùng nội dung này cho creative brief.
                    </Alert>
                    <TextField
                        label="Nội dung nguồn"
                        value={state.agentSourceContent}
                        onChange={(e) => state.setAgentSourceContent(e.target.value)}
                        multiline
                        minRows={12}
                        fullWidth
                        size="small"
                        placeholder="Dán hoặc viết nội dung nguồn cho short video…"
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                        <TextField
                            label="GitHub repo"
                            value={state.agentGithubRepo}
                            onChange={(e) => state.setAgentGithubRepo(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="owner/repo hoặc https://github.com/owner/repo"
                        />
                        <LoadingButton
                            variant="outlined"
                            loading={state.fetchingGithubReadme}
                            startIcon={<CloudDownloadIcon />}
                            onClick={() => void state.handleFetchGithubReadme()}
                            disabled={!state.agentGithubRepo.trim()}
                            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Fetch README
                        </LoadingButton>
                    </Stack>
                    <Box>
                        <LoadingButton
                            variant="contained"
                            loading={state.savingSourceContent}
                            startIcon={<SaveIcon />}
                            onClick={() => void state.handleSaveSourceContent()}
                            disabled={!contentDirty && !githubDirty}
                        >
                            Lưu nội dung
                        </LoadingButton>
                    </Box>
                </Stack>
            )}
        </Box>
    );
}
