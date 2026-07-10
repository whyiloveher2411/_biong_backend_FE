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

const sectionCardSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    p: 1.5,
} as const;

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

    const sourceDirty = !linked && (
        String(contentPostRef.current.agent_source_content || '') !== state.savedAgentSourceContent
        || state.agentGithubRepo !== state.savedAgentGithubRepo
        || state.agentSourceFormat !== state.savedAgentSourceFormat
    );
    const additionalDirty = state.agentAdditionalInfo !== state.savedAgentAdditionalInfo;
    const isDirty = sourceDirty || additionalDirty;

    const handleSave = () => {
        if (!isDirty) {
            return;
        }
        const content = String(contentPostRef.current.agent_source_content || '');
        if (!linked) {
            state.setAgentSourceContent(content);
        }
        void state.handleSaveSourceContent(
            linked ? undefined : content,
            state.agentAdditionalInfo,
        );
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ flex: 1, overflow: 'auto', p: 2, pb: 1 }}>
                <Stack spacing={2}>
                    <Box sx={sectionCardSx}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            Nguồn chính
                        </Typography>

                        {linked ? (
                            <Stack spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                    Đang liên kết marketing post #{state.marketingPostId}
                                    {' — '}
                                    nội dung chỉ đọc.
                                </Typography>
                                {state.contentPlainText.trim() ? (
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            p: 1.25,
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontFamily: 'inherit',
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            maxHeight: '50vh',
                                            overflow: 'auto',
                                        }}
                                    >
                                        {state.contentPlainText}
                                    </Box>
                                ) : (
                                    <Alert severity="warning" sx={{ py: 0.5 }}>
                                        Marketing post chưa có nội dung plain text.
                                    </Alert>
                                )}
                            </Stack>
                        ) : (
                            <Stack spacing={1.5}>
                                <Typography variant="caption" color="text.secondary">
                                    Chọn loại nội dung, nhập nguồn hoặc fetch README từ GitHub.
                                </Typography>
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
                                        Lấy thông tin
                                    </LoadingButton>
                                </Stack>
                            </Stack>
                        )}
                    </Box>

                    <Box sx={sectionCardSx}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                            Thông tin thêm
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Tuỳ chọn — nếu có, prompt sinh script sẽ bắt buộc đưa vào lời thoại
                        </Typography>
                        <TextField
                            multiline
                            minRows={4}
                            maxRows={10}
                            fullWidth
                            size="small"
                            placeholder="42k stars GitHub, 500k downloads, featured Product Hunt..."
                            value={state.agentAdditionalInfo}
                            onChange={(e) => state.setAgentAdditionalInfo(e.target.value)}
                        />
                    </Box>
                </Stack>
            </Box>

            <Box
                sx={{
                    flexShrink: 0,
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <LoadingButton
                        variant="contained"
                        loading={state.savingSourceContent}
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={!isDirty || state.savingSourceContent}
                    >
                        Lưu
                    </LoadingButton>
                    {isDirty ? (
                        <Typography variant="caption" color="warning.main">
                            Có thay đổi chưa lưu
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Đã lưu
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
