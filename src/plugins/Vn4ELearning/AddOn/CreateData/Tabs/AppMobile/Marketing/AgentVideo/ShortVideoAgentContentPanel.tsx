import React from 'react';
import {
    Alert,
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LoadingButton from 'components/atoms/LoadingButton';
import TextareaForm from 'components/atoms/fields/textarea/Form';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentContentPanel({ state }: Props) {
    const linked = state.marketingPostId > 0;
    const contentPostRef = React.useRef({
        agent_source_content: state.agentSourceContent,
    });
    const [contentFieldKey, setContentFieldKey] = React.useState(0);
    const prevFetchingReadmeRef = React.useRef(false);

    React.useEffect(() => {
        contentPostRef.current.agent_source_content = state.savedAgentSourceContent;
        setContentFieldKey((prev) => prev + 1);
    }, [state.shortVideoId, state.savedAgentSourceContent]);

    React.useEffect(() => {
        if (prevFetchingReadmeRef.current && !state.fetchingGithubReadme) {
            contentPostRef.current.agent_source_content = state.agentSourceContent;
            setContentFieldKey((prev) => prev + 1);
        }
        prevFetchingReadmeRef.current = state.fetchingGithubReadme;
    }, [state.fetchingGithubReadme, state.agentSourceContent]);

    const handleSave = () => {
        const content = String(contentPostRef.current.agent_source_content || '');
        if (
            content === state.savedAgentSourceContent
            && state.agentGithubRepo === state.savedAgentGithubRepo
            && state.agentSourceFormat === state.savedAgentSourceFormat
        ) {
            return;
        }
        state.setAgentSourceContent(content);
        void state.handleSaveSourceContent(content);
    };

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
                        Chưa liên kết marketing post — chọn loại nội dung, nhập nguồn
                        (hoặc fetch README từ GitHub). Agent dùng nội dung này cho creative brief.
                    </Alert>
                    <FormControl fullWidth size="small">
                        <InputLabel id="agent-source-format-label">Loại nội dung nguồn</InputLabel>
                        <Select
                            labelId="agent-source-format-label"
                            label="Loại nội dung nguồn"
                            value={state.agentSourceFormat}
                            onChange={(e) => state.setAgentSourceFormat(String(e.target.value))}
                        >
                            {state.agentSourceFormatCatalog.map((item) => (
                                <MenuItem key={item.key} value={item.key}>
                                    {item.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextareaForm
                        key={contentFieldKey}
                        component="textarea"
                        name="agent_source_content"
                        post={contentPostRef.current}
                        config={{
                            title: 'Nội dung nguồn',
                            rows: 12,
                            note: 'Dán hoặc viết nội dung nguồn cho short video',
                        }}
                        onReview={(value) => {
                            const nextValue = String(value ?? '');
                            contentPostRef.current.agent_source_content = nextValue;
                            state.setAgentSourceContent(nextValue);
                        }}
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
                            onClick={handleSave}
                            disabled={state.savingSourceContent}
                        >
                            Lưu nội dung
                        </LoadingButton>
                    </Box>
                </Stack>
            )}
        </Box>
    );
}
