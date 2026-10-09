import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
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

type SoundMode = 'sfx' | 'music';

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
    modes?: string[];
    sfx_model?: string;
    music_model?: string;
    music_default_duration?: number;
    music_max_duration?: number;
    defaults?: {
        sfx?: { duration?: number; max_duration?: number };
        music?: { duration?: number; max_duration?: number };
    };
};

type GenerateResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    file?: string;
    preview_url?: string;
    download_url?: string;
    prompt?: string;
    final_prompt?: string;
    mode?: SoundMode;
    single_event?: boolean;
    duration_sec?: number;
    seed?: number | null;
    engine?: string;
    model?: string;
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

const DURATION_PRESETS: Record<SoundMode, Array<{ value: number; label: string }>> = {
    sfx: [
        { value: 1.5, label: '1.5s' },
        { value: 8, label: '8s' },
    ],
    music: [
        { value: 15, label: '15s' },
        { value: 30, label: '30s' },
        { value: 60, label: '60s' },
    ],
};

const MODEL_OPTIONS: Record<SoundMode, Array<{ value: string; label: string }>> = {
    sfx: [
        { value: '', label: 'Mặc định (audiogen-medium)' },
        { value: 'facebook/audiogen-medium', label: 'facebook/audiogen-medium' },
    ],
    music: [
        { value: '', label: 'Mặc định (musicgen-large — tốt nhất)' },
        { value: 'facebook/musicgen-large', label: 'musicgen-large (chất lượng cao)' },
        { value: 'facebook/musicgen-medium', label: 'musicgen-medium (nhanh hơn)' },
        { value: 'facebook/musicgen-small', label: 'musicgen-small (nhẹ nhất)' },
    ],
};

function toNumber(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

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

    const [mode, setMode] = React.useState<SoundMode>('sfx');
    const [prompt, setPrompt] = React.useState('');
    const [generating, setGenerating] = React.useState(false);
    const [result, setResult] = React.useState<GenerateResponse | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [status, setStatus] = React.useState<StatusResponse | null>(null);
    const [statusLoading, setStatusLoading] = React.useState(false);
    const [commands, setCommands] = React.useState<CommandMap | undefined>(undefined);
    const [durationInput, setDurationInput] = React.useState<string>('1.5');
    const [singleEvent, setSingleEvent] = React.useState<boolean>(true);
    const [seedInput, setSeedInput] = React.useState<string>('');
    const [temperatureInput, setTemperatureInput] = React.useState<string>('');
    const [topKInput, setTopKInput] = React.useState<string>('');
    const [topPInput, setTopPInput] = React.useState<string>('');
    const [cfgCoefInput, setCfgCoefInput] = React.useState<string>('');
    const [model, setModel] = React.useState<string>('');
    const defaultsAppliedRef = React.useRef(false);

    const defaultDurationFor = React.useCallback((nextMode: SoundMode, res: StatusResponse | null): string => {
        if (nextMode === 'music') {
            const value = Number(res?.music_default_duration ?? res?.defaults?.music?.duration ?? 30);
            return String(Number.isFinite(value) && value > 0 ? value : 30);
        }
        const value = Number(res?.defaults?.sfx?.duration ?? res?.default_duration ?? 1.5);
        return String(Number.isFinite(value) && value > 0 ? value : 1.5);
    }, []);

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
                    const d = defaultDurationFor('sfx', res || null);
                    setDurationInput(d);
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
    }, [defaultDurationFor]);

    React.useEffect(() => {
        if (!open) {
            setMode('sfx');
            setPrompt('');
            setGenerating(false);
            setResult(null);
            setError(null);
            setStatus(null);
            setCommands(undefined);
            setDurationInput('1.5');
            setSingleEvent(true);
            setSeedInput('');
            setTemperatureInput('');
            setTopKInput('');
            setTopPInput('');
            setCfgCoefInput('');
            setModel('');
            defaultsAppliedRef.current = false;
            return;
        }
        loadStatus();
    }, [open, loadStatus]);

    const handleModeChange = (nextMode: SoundMode) => {
        setMode(nextMode);
        setResult(null);
        setDurationInput(defaultDurationFor(nextMode, status));
        setModel('');
    };

    const canGenerate = prompt.trim() !== '' && !generating;

    const handleGenerate = () => {
        const trimmed = prompt.trim();
        if (trimmed === '') {
            setError(mode === 'music' ? 'Nhập mô tả nhạc nền trước khi generate' : 'Nhập mô tả sound effect trước khi generate');
            return;
        }

        setGenerating(true);
        setError(null);
        setResult(null);

        const data: Record<string, string | number> = {
            mode,
            prompt: trimmed,
        };

        const duration = toNumber(durationInput);
        if (duration !== undefined) data.duration = duration;
        const seed = toNumber(seedInput);
        if (seed !== undefined) data.seed = Math.trunc(seed);
        const temperature = toNumber(temperatureInput);
        if (temperature !== undefined) data.temperature = temperature;
        const topK = toNumber(topKInput);
        if (topK !== undefined) data.top_k = Math.trunc(topK);
        const topP = toNumber(topPInput);
        if (topP !== undefined) data.top_p = topP;
        const cfgCoef = toNumber(cfgCoefInput);
        if (cfgCoef !== undefined) data.cfg_coef = cfgCoef;
        if (model !== '') data.model = model;
        if (mode === 'sfx') {
            data.single_event = singleEvent ? 1 : 0;
        }

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/sound-effect/generate',
            method: 'POST',
            data,
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

    const isMusic = mode === 'music';
    const downloadUrl = result?.download_url || result?.preview_url;

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Sound effect & nhạc nền (AudioCraft)"
            width={680}
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

                <Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                    >
                        Chế độ
                    </Typography>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={mode}
                        onChange={(_event, next: SoundMode | null) => {
                            if (next !== null) handleModeChange(next);
                        }}
                        disabled={generating}
                    >
                        <ToggleButton value="sfx" sx={{ textTransform: 'none', px: 2, gap: 0.75 }}>
                            <GraphicEqOutlinedIcon fontSize="small" />
                            Sound effect
                        </ToggleButton>
                        <ToggleButton value="music" sx={{ textTransform: 'none', px: 2, gap: 0.75 }}>
                            <MusicNoteOutlinedIcon fontSize="small" />
                            Nhạc nền
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Alert severity="info">
                    {isMusic ? (
                        <>
                            Sinh <b>nhạc nền</b> từ mô tả bằng model <b>MusicGen</b> (
                            {status?.music_model || 'facebook/musicgen-large'}). Nhập mô tả bằng{' '}
                            <b>tiếng Anh</b>, ví dụ: <i>&quot;upbeat corporate background music&quot;</i>,{' '}
                            <i>&quot;calm lofi hip hop loop&quot;</i>,{' '}
                            <i>&quot;cinematic emotional piano&quot;</i>.
                        </>
                    ) : (
                        <>
                            Sinh <b>sound effect</b> từ mô tả bằng model <b>AudioGen</b>. Nhập mô tả bằng{' '}
                            <b>tiếng Anh</b>, ví dụ: <i>&quot;heavy rain with thunder&quot;</i>,{' '}
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
                        </>
                    )}
                </Alert>

                {status && status.healthy === false && (
                    <Alert severity={status.installed ? 'warning' : 'error'}>
                        {status.installed
                            ? 'Service AudioCraft chưa chạy. Bấm Generate sẽ tự khởi động; nếu không lên, chạy lệnh bên dưới.'
                            : 'Service AudioCraft chưa được cài đặt.'}
                        <ServiceCommands commands={status.commands || commands} />
                    </Alert>
                )}

                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={5}
                    size="small"
                    label={isMusic ? 'Mô tả nhạc nền' : 'Mô tả sound effect'}
                    placeholder={
                        isMusic
                            ? 'upbeat corporate background music, positive, no vocals'
                            : 'heavy rain with thunder and distant lightning'
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={generating}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canGenerate) {
                            handleGenerate();
                        }
                    }}
                    helperText="Nhấn Ctrl/Cmd + Enter để generate"
                />

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    useFlexGap
                    flexWrap="wrap"
                >
                    <Box sx={{ minWidth: 260 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                        >
                            Thời lượng
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={toNumber(durationInput) ?? null}
                                onChange={(_event, next: number | null) => {
                                    if (next !== null) setDurationInput(String(next));
                                }}
                                disabled={generating}
                            >
                                {DURATION_PRESETS[mode].map((opt) => (
                                    <ToggleButton
                                        key={opt.value}
                                        value={opt.value}
                                        sx={{ textTransform: 'none', px: 1.5 }}
                                    >
                                        {opt.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                            <TextField
                                size="small"
                                type="number"
                                label="Giây"
                                value={durationInput}
                                onChange={(e) => setDurationInput(e.target.value)}
                                disabled={generating}
                                inputProps={{ min: 1, step: 0.5, style: { width: 72 } }}
                            />
                        </Stack>
                    </Box>

                    {!isMusic && (
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
                    )}

                    <TextField
                        select
                        size="small"
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={generating}
                        sx={{ minWidth: 260 }}
                    >
                        {MODEL_OPTIONS[mode].map((opt) => (
                            <MenuItem key={opt.value || 'default'} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>

                <Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                    >
                        Tham số nâng cao (bỏ trống = mặc định model)
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
                        <TextField
                            size="small"
                            label="Seed"
                            placeholder="random"
                            value={seedInput}
                            onChange={(e) => setSeedInput(e.target.value)}
                            disabled={generating}
                            inputProps={{ inputMode: 'numeric' }}
                            sx={{ width: 120 }}
                        />
                        <TextField
                            size="small"
                            label="Temperature"
                            placeholder="1.0"
                            value={temperatureInput}
                            onChange={(e) => setTemperatureInput(e.target.value)}
                            disabled={generating}
                            inputProps={{ inputMode: 'decimal' }}
                            sx={{ width: 130 }}
                        />
                        <TextField
                            size="small"
                            label="Top-k"
                            placeholder="250"
                            value={topKInput}
                            onChange={(e) => setTopKInput(e.target.value)}
                            disabled={generating}
                            inputProps={{ inputMode: 'numeric' }}
                            sx={{ width: 110 }}
                        />
                        <TextField
                            size="small"
                            label="Top-p"
                            placeholder="0"
                            value={topPInput}
                            onChange={(e) => setTopPInput(e.target.value)}
                            disabled={generating}
                            inputProps={{ inputMode: 'decimal' }}
                            sx={{ width: 110 }}
                        />
                        <TextField
                            size="small"
                            label="CFG coef"
                            placeholder="3.0"
                            value={cfgCoefInput}
                            onChange={(e) => setCfgCoefInput(e.target.value)}
                            disabled={generating}
                            inputProps={{ inputMode: 'decimal' }}
                            sx={{ width: 120 }}
                        />
                    </Stack>
                </Box>

                <Stack direction="row" justifyContent="flex-end">
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={
                            generating ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : isMusic ? (
                                <MusicNoteOutlinedIcon fontSize="small" />
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
                        {isMusic
                            ? 'Đang sinh nhạc nền. Lần đầu có thể mất vài phút để tải model MusicGen — đừng đóng tab.'
                            : 'Đang sinh sound effect. Lần đầu tiên có thể mất vài phút để tải model (~3GB) — đừng đóng tab.'}
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
                                    href={downloadUrl ? `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}download=1` : undefined}
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
                                <Chip
                                    size="small"
                                    color={result.mode === 'music' ? 'secondary' : 'primary'}
                                    variant="outlined"
                                    label={result.mode === 'music' ? 'Nhạc nền' : 'Sound effect'}
                                />
                                {result.duration_sec ? (
                                    <Chip size="small" variant="outlined" label={`${result.duration_sec}s`} />
                                ) : null}
                                {result.single_event ? (
                                    <Chip size="small" color="success" variant="outlined" label="1 lần duy nhất" />
                                ) : null}
                                {result.engine ? (
                                    <Chip size="small" variant="outlined" label={result.engine} />
                                ) : null}
                                {result.model ? (
                                    <Chip size="small" variant="outlined" label={result.model} />
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
