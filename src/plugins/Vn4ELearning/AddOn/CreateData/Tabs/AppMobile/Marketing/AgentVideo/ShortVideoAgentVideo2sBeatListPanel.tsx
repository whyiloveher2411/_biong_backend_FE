import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import TuneIcon from '@mui/icons-material/Tune';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { parseBeatListText } from './agentVideoManualBeats';
import { resolveOmnivoiceDisplaySummary } from './agentVideoUi';
import type { useAgentVideoContent } from './useAgentVideoContent';
import {
    SECTION_THEMES,
    SectionShell,
    subPanelSx,
} from './ShortVideoAgentSectionShell';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    onOpenAudioSettings: () => void;
};

const PLACEHOLDER = [
    'Try to imagine a morning more than one hundred thousand years ago.',
    'The sun has just risen beyond the rock wall.',
    "Inside the cave, last night's fire has burned down to a few red coals.",
].join('\n');

export default function ShortVideoAgentVideo2sBeatListPanel({ state, onOpenAudioSettings }: Props) {
    const marks = state.manualBeatMarks;
    const promptFilled = marks.filter((mark) => mark.imagePrompt.trim() !== '').length;
    const beatAudioReadyCount = (state.beatAudio?.items ?? []).filter(
        (item) => item.status === 'ready',
    ).length;
    const beatAudioAllReady = marks.length > 0 && beatAudioReadyCount >= marks.length;

    const [listText, setListText] = React.useState('');
    const [listDirty, setListDirty] = React.useState(false);

    // Đổ danh sách beat đã lưu vào textarea — chỉ khi user chưa gõ gì (không đè
    // nội dung đang sửa). marks là nguồn truth đã parse (không có số thứ tự).
    React.useEffect(() => {
        if (listDirty) {
            return;
        }
        setListText(marks.map((mark) => mark.content).join('\n'));
    }, [listDirty, marks]);

    const parsedBeats = React.useMemo(() => parseBeatListText(listText), [listText]);

    const handleChange = (value: string) => {
        setListText(value);
        setListDirty(true);
    };

    const handleImport = async () => {
        const text = listText.trim();
        if (!text || state.importingVideo2sBeatList) {
            return;
        }
        // Chỉ sync textarea về marks đã lưu khi import THÀNH CÔNG — thất bại thì
        // giữ nguyên nội dung user đang gõ để sửa tiếp.
        const ok = await state.handleImportVideo2sBeatList(text);
        if (ok) {
            setListDirty(false);
        }
    };

    const voiceSummary = resolveOmnivoiceDisplaySummary({
        voiceKey: state.omnivoiceVoice || 'minh_quân',
        voiceMode: state.omnivoiceVoiceMode,
        voiceDesign: state.omnivoiceVoiceDesign,
        catalog: state.omnivoiceVoiceCatalog,
    });

    return (
        <SectionShell
            step={1}
            title="Danh sách beat"
            icon={<DescriptionOutlinedIcon fontSize="small" />}
            theme={SECTION_THEMES.script}
            trailing={(
                <Chip
                    size="small"
                    label={`${marks.length} beat`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.95)', fontWeight: 600 }}
                />
            )}
        >
            <Stack spacing={1.25}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                    <b>Mỗi dòng = 1 beat</b>
                    {' '}
                    (video 2s — ~2 giây đổi 1 ảnh). Có hoặc không số thứ tự đầu dòng
                    đều được. Bấm <b>Cập nhật beat</b> là hệ thống tự chia beat; audio
                    của beat thiếu/thay đổi do pipeline <b>Audio từng beat</b> tự tạo.
                    Sau đó chỉ cần điền <b>prompt ảnh</b> cho từng beat là xong.
                </Alert>

                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                        size="small"
                        color={parsedBeats.length > 0 ? 'primary' : 'default'}
                        variant={parsedBeats.length > 0 ? 'filled' : 'outlined'}
                        label={`${parsedBeats.length} beat trong ô nhập`}
                    />
                    {marks.length > 0 ? (
                        <>
                            <Chip
                                size="small"
                                color={promptFilled === marks.length ? 'success' : 'default'}
                                variant="outlined"
                                label={`${promptFilled}/${marks.length} có prompt ảnh`}
                            />
                            <Chip
                                size="small"
                                color={beatAudioAllReady ? 'success' : 'default'}
                                variant="outlined"
                                icon={beatAudioAllReady ? <CheckCircleOutlineIcon fontSize="small" /> : undefined}
                                label={`audio ${beatAudioReadyCount}/${marks.length}`}
                            />
                        </>
                    ) : null}
                </Stack>

                {/* Cấu hình giọng đọc TTS (audio từng beat đọc theo voice này) —
                    cùng block với section Audio của mode khác để không bị ẩn. */}
                <Box sx={subPanelSx(SECTION_THEMES.audio)}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ mb: 1 }}
                    >
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            Cấu hình giọng đọc TTS
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<TuneIcon />}
                            onClick={onOpenAudioSettings}
                        >
                            Cài đặt
                        </Button>
                    </Stack>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip
                            size="small"
                            label={state.agentTtsAuto ? 'TTS bật' : 'TTS tắt'}
                            color={state.agentTtsAuto ? 'success' : 'default'}
                            variant="outlined"
                        />
                        {state.agentTtsAuto ? (
                            <Chip size="small" label={state.chainLabel} variant="outlined" />
                        ) : null}
                        <Chip
                            size="small"
                            avatar={(
                                <Avatar
                                    sx={{
                                        width: 20,
                                        height: 20,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        bgcolor: voiceSummary.avatarColor,
                                        color: '#fff',
                                    }}
                                >
                                    {voiceSummary.initials}
                                </Avatar>
                            )}
                            label={voiceSummary.displayName}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`x${Number(state.omnivoiceSpeed || 1).toFixed(2)}`}
                            variant="outlined"
                        />
                    </Stack>
                </Box>

                <TextField
                    multiline
                    minRows={8}
                    maxRows={20}
                    placeholder={PLACEHOLDER}
                    value={listText}
                    onChange={(event) => handleChange(event.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            fontFamily: 'monospace',
                            fontSize: 13,
                            lineHeight: 1.55,
                        },
                    }}
                />

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <LoadingButton
                        loading={state.importingVideo2sBeatList}
                        disabled={parsedBeats.length === 0}
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={() => { void handleImport(); }}
                    >
                        Cập nhật beat
                    </LoadingButton>
                    <Button
                        size="small"
                        variant="text"
                        startIcon={<RefreshIcon />}
                        onClick={() => { void state.reloadManualBeatMarks(); }}
                    >
                        Tải lại
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        Sửa/xóa dòng rồi cập nhật lại — beat đổi nội dung sẽ tự tạo lại audio.
                    </Typography>
                </Stack>

                <Box>
                    <Typography variant="caption" color="text.secondary">
                        Prompt ảnh điền ở panel chia beat (Meta.ai) — pipeline dừng ở bước
                        {' '}
                        <b>Chia beat</b>
                        {' '}
                        chờ đủ prompt rồi tự chạy tiếp.
                    </Typography>
                </Box>
            </Stack>
        </SectionShell>
    );
}
