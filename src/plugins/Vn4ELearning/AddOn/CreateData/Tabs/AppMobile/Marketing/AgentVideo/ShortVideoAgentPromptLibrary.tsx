import React from 'react';
import {
    Box,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { alpha } from '@mui/material/styles';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    fetchImproveScriptPrompt,
    fetchScriptPhoneticPrompt,
    fetchShortVideoAgentPrompt,
    parseShortVideoPromptMessage,
    writePromptTextToClipboard,
} from 'helpers/marketingShortVideoAgentPrompt';
import { fetchImportHtmlBeatDivisionPrompt } from 'helpers/marketingImportHtmlWorkflow';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type PromptKey =
    | 'create_script'
    | 'improve_script'
    | 'phonetic'
    | 'beat_division'
    | 'fill_html'
    | 'assemble'
    | 'cursor_1'
    | 'cursor_2';

type PromptGroupTone = 'script' | 'beat' | 'agent';

type Props = {
    state: AgentVideoState;
};

function PromptGroup({
    title,
    tone,
    children,
}: {
    title: string;
    tone: PromptGroupTone;
    children: React.ReactNode;
}) {
    return (
        <Box
            sx={(theme) => {
                const color = tone === 'script'
                    ? theme.palette.primary.main
                    : tone === 'beat'
                        ? theme.palette.secondary.main
                        : theme.palette.grey[600];
                return {
                    bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.08),
                    border: '1px solid',
                    borderColor: alpha(color, 0.28),
                    borderRadius: 1,
                    px: 1,
                    py: 0.85,
                };
            }}
        >
            <Typography
                variant="caption"
                fontWeight={700}
                display="block"
                sx={(theme) => ({
                    mb: 0.5,
                    letterSpacing: 0.3,
                    color: tone === 'script'
                        ? theme.palette.primary.dark
                        : tone === 'beat'
                            ? theme.palette.secondary.dark
                            : theme.palette.text.secondary,
                })}
            >
                {title}
            </Typography>
            {children}
        </Box>
    );
}

const rowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    minHeight: 28,
    py: 0.25,
} as const;

function PromptRow(props: {
    label: string;
    ready: boolean;
    disabledReason?: string;
    loading: boolean;
    onCopy: () => void;
}) {
    const { label, ready, disabledReason, loading, onCopy } = props;
    const disabled = !ready || loading;
    const button = (
        <IconButton
            size="small"
            color="primary"
            disabled={disabled}
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            sx={{ p: 0.5 }}
        >
            {loading ? <CircularProgress size={14} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
        </IconButton>
    );

    return (
        <Box sx={rowSx}>
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12,
                    lineHeight: 1.3,
                    color: ready ? 'text.primary' : 'text.disabled',
                }}
            >
                {label}
            </Typography>
            <Chip
                size="small"
                label={ready ? 'ready' : 'thiếu'}
                color={ready ? 'success' : 'default'}
                variant={ready ? 'filled' : 'outlined'}
                sx={{
                    height: 18,
                    '& .MuiChip-label': { px: 0.6, fontSize: 10, fontWeight: 600 },
                }}
            />
            {disabled && disabledReason ? (
                <Tooltip title={disabledReason} placement="left">
                    <span>{button}</span>
                </Tooltip>
            ) : (
                button
            )}
        </Box>
    );
}

export default function ShortVideoAgentPromptLibrary({ state }: Props) {
    const { showMessage } = useFloatingMessages();
    const [copyingKey, setCopyingKey] = React.useState<PromptKey | ''>('');
    const beatSections = state.beatMap?.sections ?? [];
    const [selectedBeatId, setSelectedBeatId] = React.useState('');

    React.useEffect(() => {
        if (!beatSections.length) {
            setSelectedBeatId('');
            return;
        }
        setSelectedBeatId((prev) => {
            if (prev && beatSections.some((s) => s.id === prev)) {
                return prev;
            }
            if (state.activeBeatId && beatSections.some((s) => s.id === state.activeBeatId)) {
                return state.activeBeatId;
            }
            return beatSections[0].id;
        });
    }, [beatSections, state.activeBeatId]);

    const hasScript = state.hasScript;
    const whisperReady = state.whisperStatus === 'completed';
    const beatMapReady = Boolean(state.beatMapReady && beatSections.length > 0);
    const fillReady = beatMapReady && Boolean(selectedBeatId);
    const assembleReady = state.renderMode === 'import_html' && state.beatsHtmlCompleted > 0;
    const cursor1Ready = !state.scriptApproved;
    const cursor2Ready = state.renderMode === 'creative'
        && state.readyForPhase2
        && state.scriptApproved
        && !state.hasAgentVideo;

    const copyFetchedPrompt = async (
        key: PromptKey,
        fetchPrompt: () => Promise<{ success?: boolean; prompt?: string; message?: { content?: string } | string }>,
        successMessage: string,
        emptyMessage = 'Không tạo được prompt',
    ) => {
        setCopyingKey(key);
        try {
            const res = await fetchPrompt();
            const prompt = String(res?.prompt || '').trim();
            if (!res?.success || !prompt) {
                showMessage(
                    parseShortVideoPromptMessage(res?.message) || emptyMessage,
                    'error',
                );
                return;
            }
            const ok = await writePromptTextToClipboard(prompt);
            if (!ok) {
                showMessage('Không copy được — hãy chọn và copy thủ công', 'error');
                return;
            }
            showMessage(successMessage, 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setCopyingKey('');
        }
    };

    const handleCopyFillHtml = () => {
        if (!selectedBeatId) {
            showMessage('Chọn beat trước khi copy', 'warning');
            return;
        }
        void state.handleCopyBeatHtmlPrompt(selectedBeatId);
    };

    const fillLoading = Boolean(
        selectedBeatId && state.copyingBeatHtmlPromptBeatId === selectedBeatId,
    );

    return (
        <Stack spacing={1}>
            <PromptGroup title="Script" tone="script">
                <Stack spacing={0.25}>
                    <PromptRow
                        label="Tạo script"
                        ready={Boolean(state.shortVideoId)}
                        disabledReason="Thiếu short video"
                        loading={copyingKey === 'create_script'}
                        onCopy={() => {
                            void copyFetchedPrompt(
                                'create_script',
                                () => fetchShortVideoAgentPrompt(state.shortVideoId, '1', { variant: 'chatbot' }),
                                'Đã copy prompt tạo script (chatbot)',
                            );
                        }}
                    />
                    <PromptRow
                        label="Cải thiện script"
                        ready={hasScript}
                        disabledReason="Cần audio_script trước"
                        loading={copyingKey === 'improve_script'}
                        onCopy={() => {
                            void copyFetchedPrompt(
                                'improve_script',
                                () => fetchImproveScriptPrompt(state.shortVideoId),
                                'Đã copy prompt cải thiện script',
                            );
                        }}
                    />
                    <PromptRow
                        label="Chuẩn hóa giọng đọc"
                        ready={hasScript}
                        disabledReason="Cần audio_script trước"
                        loading={copyingKey === 'phonetic'}
                        onCopy={() => {
                            void copyFetchedPrompt(
                                'phonetic',
                                () => fetchScriptPhoneticPrompt(state.shortVideoId),
                                'Đã copy prompt chuẩn hóa giọng đọc',
                            );
                        }}
                    />
                </Stack>
            </PromptGroup>

            <PromptGroup title="Beat" tone="beat">
                <Stack spacing={0.5}>
                    <PromptRow
                        label="Chia beat"
                        ready={whisperReady}
                        disabledReason="Cần Whisper completed"
                        loading={copyingKey === 'beat_division'}
                        onCopy={() => {
                            void copyFetchedPrompt(
                                'beat_division',
                                () => fetchImportHtmlBeatDivisionPrompt(state.shortVideoId),
                                'Đã copy prompt chia beat',
                            );
                        }}
                    />
                    <Box>
                        <Box sx={rowSx}>
                            <Typography
                                variant="body2"
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 12,
                                    lineHeight: 1.3,
                                    color: fillReady ? 'text.primary' : 'text.disabled',
                                }}
                            >
                                Fill HTML beat
                            </Typography>
                            <Chip
                                size="small"
                                label={fillReady ? 'ready' : 'thiếu'}
                                color={fillReady ? 'success' : 'default'}
                                variant={fillReady ? 'filled' : 'outlined'}
                                sx={{
                                    height: 18,
                                    '& .MuiChip-label': { px: 0.6, fontSize: 10, fontWeight: 600 },
                                }}
                            />
                            {fillReady ? (
                                <IconButton
                                    size="small"
                                    color="primary"
                                    disabled={fillLoading}
                                    onClick={handleCopyFillHtml}
                                    aria-label="Copy Fill HTML beat"
                                    sx={{ p: 0.5 }}
                                >
                                    {fillLoading
                                        ? <CircularProgress size={14} />
                                        : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                                </IconButton>
                            ) : (
                                <Tooltip title={!beatMapReady ? 'Cần beat-map trước' : 'Chọn beat'}>
                                    <span>
                                        <IconButton size="small" disabled sx={{ p: 0.5 }}>
                                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        </Box>
                        <FormControl fullWidth size="small" sx={{ mt: 0.5 }} disabled={!beatMapReady}>
                            <InputLabel id="prompt-library-beat-select-label">Beat</InputLabel>
                            <Select
                                labelId="prompt-library-beat-select-label"
                                label="Beat"
                                value={selectedBeatId}
                                onChange={(e) => setSelectedBeatId(String(e.target.value))}
                            >
                                {beatSections.map((section) => (
                                    <MenuItem key={section.id} value={section.id}>
                                        {section.id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Stack>
            </PromptGroup>

            <PromptGroup title="Agent" tone="agent">
                <Stack spacing={0.25}>
                    <PromptRow
                        label="Ghép HTML"
                        ready={assembleReady}
                        disabledReason="Cần render HTML chatbot + ít nhất 1 beat HTML"
                        loading={copyingKey === 'assemble'}
                        onCopy={() => {
                            void copyFetchedPrompt(
                                'assemble',
                                () => fetchShortVideoAgentPrompt(state.shortVideoId, 'import_assemble'),
                                'Đã copy prompt ghép HTML chatbot',
                            );
                        }}
                    />
                    <PromptRow
                        label="Cursor bước 1"
                        ready={cursor1Ready}
                        disabledReason="Script đã duyệt — dùng bước 2 / ghép HTML"
                        loading={copyingKey === 'cursor_1'}
                        onCopy={() => {
                            setCopyingKey('cursor_1');
                            void Promise.resolve(state.handleCopyPrompt('1')).finally(() => {
                                setCopyingKey('');
                            });
                        }}
                    />
                    <PromptRow
                        label="Cursor bước 2"
                        ready={cursor2Ready}
                        disabledReason="Chỉ khi render mode Agent sáng tạo + sẵn sàng phase 2"
                        loading={copyingKey === 'cursor_2'}
                        onCopy={() => {
                            setCopyingKey('cursor_2');
                            void Promise.resolve(state.handleCopyPrompt('2')).finally(() => {
                                setCopyingKey('');
                            });
                        }}
                    />
                </Stack>
            </PromptGroup>
        </Stack>
    );
}
