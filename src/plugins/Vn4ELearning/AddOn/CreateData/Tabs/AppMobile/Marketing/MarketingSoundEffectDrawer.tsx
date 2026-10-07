import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';

type Props = {
    open: boolean;
    onClose: () => void;
};

type CommandMap = Record<string, string>;

type StatusResponse = {
    success?: boolean;
    healthy?: boolean;
    installed?: boolean;
    base_url?: string;
    default_duration?: number;
    single_event?: boolean;
    prompt_suffix?: string;
    generation_params?: Record<string, number>;
    commands?: CommandMap;
};

type GenerateResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    file?: string;
    preview_url?: string;
    prompt?: string;
    final_prompt?: string;
    single_event?: boolean;
    duration_sec?: number;
    seed?: number | null;
    engine?: string;
    started?: boolean;
    needs_install?: boolean;
    commands?: CommandMap;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    return 'Yêu cầu thất bại';
}

const DURATION_OPTIONS: Array<{ value: number; label: string }> = [
    { value: 1.5, label: '1.5s' },
    { value: 8, label: '8s' },
];

function ServiceCommands({ commands }: { commands?: CommandMap }) {
    const { showMessage } = useFloatingMessages();

    if (!commands) return null;

    const order: Array<keyof CommandMap> = ['install', 'start', 'stop', 'kill', 'status', 'logs'];

    return (
        <Box
            sx={{
                mt: 1,
                p: 1.25,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Chạy tại thư mục <code>_biong_backend</code>:
            </Typography>
            {order
                .filter((key) => Boolean(commands[key]))
                .map((key) => (
                    <Stack
                        key={key}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mt: 0.5 }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.8rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {commands[key]}
                        </Typography>
                        <Tooltip title="Copy">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    navigator.clipboard?.writeText(commands[key] ?? '');
                                    showMessage('Đã copy lệnh', 'success');
                                }}
                            >
                                <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                ))}
        </Box>
    );
}

export default function MarketingSoundEffectDrawer({ open, onClose }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [prompt, setPrompt] = React.useState('');
    const [generating, setGenerating] = React.useState(false);
    const [result, setResult] = React.useState<GenerateResponse | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [status, setStatus] = React.useState<StatusResponse | null>(null);
    const [statusLoading, setStatusLoading] = React.useState(false);
    const [commands, setCommands] = React.useState<CommandMap | undefined>(undefined);
    const [duration, setDuration] = React.useState<number>(1.5);
    const [singleEvent, setSingleEvent] = React.useState<boolean>(true);
    const defaultsAppliedRef = React.useRef(false);

    const loadStatus = React.useCallback(() => {
        setStatusLoading(true);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/sound-effect/status',
            method: 'POST',
            data: {},
            loading: false,
            success: (res: StatusResponse) => {
                setStatusLoading(false);
                setStatus(res || null);
                setCommands(res?.commands);
                if (!defaultsAppliedRef.current) {
                    const d = Number(res?.default_duration);
                    setDuration(d === 8 ? 8 : 1.5);
                    if (typeof res?.single_event === 'boolean') {
                        setSingleEvent(res.single_event);
                    }
                    defaultsAppliedRef.current = true;
                }
            },
            error: () => {
                setStatusLoading(false);
                setStatus(null);
            },
        });
    }, []);

    React.useEffect(() => {
        if (!open) {
            setPrompt('');
            setGenerating(false);
            setResult(null);
            setError(null);
            setStatus(null);
            setCommands(undefined);
            defaultsAppliedRef.current = false;
            return;
        }
        loadStatus();
    }, [open, loadStatus]);

    const canGenerate = prompt.trim() !== '' && !generating;

    const handleGenerate = () => {
        const trimmed = prompt.trim();
        if (trimmed === '') {
            setError('Nhập mô tả sound effect trước khi generate');
            return;
        }

        setGenerating(true);
        setError(null);
        setResult(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/sound-effect/generate',
            method: 'POST',
            data: { prompt: trimmed, duration, single_event: singleEvent },
            loading: false,
            success: (res: GenerateResponse) => {
                setGenerating(false);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    if (res?.commands) {
                        setCommands(res.commands);
                    }
                    if (res?.needs_install) {
                        setStatus((prev) => ({
                            ...(prev || {}),
                            installed: false,
                            commands: res?.commands || prev?.commands,
                        }));
                    }
                    return;
                }
                setResult(res);
                loadStatus();
            },
            error: () => {
                setGenerating(false);
                setError('Yêu cầu thất bại');
            },
        });
    };

    const serviceChip = (() => {
        if (statusLoading && !status) {
            return <Chip size="small" variant="outlined" label="Đang kiểm tra service…" />;
        }
        if (status?.healthy) {
            return <Chip size="small" color="success" label="Service sẵn sàng" />;
        }
        if (status?.installed) {
            return <Chip size="small" color="warning" label="Service chưa chạy (sẽ tự start)" />;
        }
        return <Chip size="small" color="error" label="Chưa cài service" />;
    })();

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Sound effect (AudioCraft)"
            width={640}
            restDialogContent={{
                sx: {
                    pt: 2.5,
                    px: 3,
                    pb: 2,
                    backgroundColor: 'body.background',
                },
            }}
        >
            <Stack spacing={2.5} sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    {serviceChip}
                    <Button
                        size="small"
                        variant="text"
                        startIcon={
                            statusLoading ? (
                                <CircularProgress size={14} color="inherit" />
                            ) : (
                                <RefreshIcon fontSize="small" />
                            )
                        }
                        onClick={loadStatus}
                        disabled={statusLoading}
                        sx={{ textTransform: 'none' }}
                    >
                        Kiểm tra lại
                    </Button>
                </Stack>

                <Alert severity="info">
                    Sinh <b>sound effect</b> từ mô tả bằng model AudioGen (AudioCraft). Nhập mô tả
                    bằng <b>tiếng Anh</b> để model hiểu tốt nhất, ví dụ:{' '}
                    <i>&quot;heavy rain with thunder&quot;</i>,{' '}
                    <i>&quot;footsteps on gravel&quot;</i>,{' '}
                    <i>&quot;cinematic whoosh transition&quot;</i>.
                    {singleEvent ? (
                        <>
                            {' '}
                            Chế độ <b>1 lần duy nhất</b> sẽ thêm &quot;
                            {status?.prompt_suffix || 'single one-shot sound, happens only once, no repetition, no echo'}
                            &quot; vào prompt.
                        </>
                    ) : (
                        <> Chế độ <b>cho phép lặp lại</b> — model có thể sinh nhiều tiếng trong clip.</>
                    )}
                </Alert>

                {status && status.healthy === false && (
                    <Alert severity={status.installed ? 'warning' : 'error'}>
                        {status.installed
                            ? 'Service AudioCraft SFX chưa chạy. Bấm Generate sẽ tự khởi động; nếu không lên, chạy lệnh bên dưới.'
                            : 'Service AudioCraft SFX chưa được cài đặt.'}
                        <ServiceCommands commands={status.commands || commands} />
                    </Alert>
                )}

                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={5}
                    size="small"
                    label="Mô tả sound effect"
                    placeholder="heavy rain with thunder and distant lightning"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={generating}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canGenerate) {
                            handleGenerate();
                        }
                    }}
                    helperText={`Nhấn Ctrl/Cmd + Enter để generate${status?.default_duration ? ` · mặc định ${status.default_duration}s` : ''}`}
                />

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    useFlexGap
                    flexWrap="wrap"
                >
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                        >
                            Thời lượng
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={duration}
                            onChange={(_event, next: number | null) => {
                                if (next !== null) setDuration(next);
                            }}
                            disabled={generating}
                        >
                            {DURATION_OPTIONS.map((opt) => (
                                <ToggleButton
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{ textTransform: 'none', px: 1.5 }}
                                >
                                    {opt.label}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                        >
                            Lặp lại
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={singleEvent ? 'single' : 'repeat'}
                            onChange={(_event, next: string | null) => {
                                if (next !== null) setSingleEvent(next === 'single');
                            }}
                            disabled={generating}
                        >
                            <ToggleButton value="single" sx={{ textTransform: 'none', px: 1.5 }}>
                                1 lần duy nhất
                            </ToggleButton>
                            <ToggleButton value="repeat" sx={{ textTransform: 'none', px: 1.5 }}>
                                Cho phép lặp lại
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Stack>

                <Stack direction="row" justifyContent="flex-end">
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={
                            generating ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <GraphicEqOutlinedIcon fontSize="small" />
                            )
                        }
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        sx={{ textTransform: 'none' }}
                    >
                        {generating ? 'Đang sinh…' : 'Generate'}
                    </Button>
                </Stack>

                {generating && (
                    <Alert severity="info">
                        Đang sinh sound effect. Lần đầu tiên có thể mất vài phút để tải model
                        (~3GB) — đừng đóng tab.
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                        <ServiceCommands commands={commands} />
                    </Alert>
                )}

                {result?.success && result.preview_url && (
                    <>
                        <Divider />
                        <Stack spacing={1.25}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                spacing={1}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Nghe thử
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadIcon fontSize="small" />}
                                    component="a"
                                    href={`${result.preview_url}${result.preview_url.includes('?') ? '&' : '?'}download=1`}
                                    download
                                    sx={{ textTransform: 'none' }}
                                >
                                    Tải về
                                </Button>
                            </Stack>

                            <Box
                                component="audio"
                                controls
                                autoPlay
                                src={result.preview_url}
                                sx={{ width: '100%' }}
                            />

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {result.duration_sec ? (
                                    <Chip size="small" variant="outlined" label={`${result.duration_sec}s`} />
                                ) : null}
                                {result.single_event ? (
                                    <Chip size="small" color="success" variant="outlined" label="1 lần duy nhất" />
                                ) : null}
                                {result.engine ? (
                                    <Chip size="small" variant="outlined" label={result.engine} />
                                ) : null}
                                {typeof result.seed === 'number' ? (
                                    <Chip size="small" variant="outlined" label={`seed ${result.seed}`} />
                                ) : null}
                                {result.started ? (
                                    <Chip size="small" color="success" label="Tự khởi động service" />
                                ) : null}
                            </Stack>

                            {result.final_prompt || result.prompt ? (
                                <Typography variant="caption" color="text.secondary">
                                    Prompt: {result.final_prompt || result.prompt}
                                </Typography>
                            ) : null}
                        </Stack>
                    </>
                )}
            </Stack>
        </DrawerCustom>
    );
}
