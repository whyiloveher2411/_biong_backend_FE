import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    clearShortVideoCookieCooldown,
    deleteShortVideoCookies,
    listShortVideoCookies,
    normalizeShortVideoCookieValue,
    normalizeShortVideoLocalStorage,
    parseShortVideoCookieApiMessage,
    probeShortVideoCookieLogin,
    recordCanvaFlow,
    recordCanvaSignupFlow,
    recordDeepseekFlow,
    recordLeonardoFlow,
    saveShortVideoCookie,
    setLeonardoCookieUsage,
    SUPPORTED_COOKIE_WEBSITE,
    testLoginShortVideoCookie,
    validateShortVideoCookieJson,
    type ShortVideoCookie,
} from 'helpers/marketingShortVideoCookieApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

type CookieFormState = {
    id: number;
    title: string;
    website: string;
    cookie_value: string;
    local_storage: string;
    description: string;
};

const EMPTY_FORM: CookieFormState = {
    id: 0,
    title: '',
    website: SUPPORTED_COOKIE_WEBSITE,
    cookie_value: '',
    local_storage: '',
    description: '',
};

/** Chuỗi "còn lại" cho cooldown (account hết quota đang nghỉ). */
function formatCooldownRemaining(untilSec: number): string {
    const now = Math.floor(Date.now() / 1000);
    let remain = Math.max(0, Math.floor(untilSec) - now);
    if (remain <= 0) {
        return '';
    }
    const days = Math.floor(remain / 86400);
    remain -= days * 86400;
    const hours = Math.floor(remain / 3600);
    remain -= hours * 3600;
    const mins = Math.floor(remain / 60);
    if (days > 0) {
        return `${days} ngày ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} phút`;
}

function CookieForm({
    form,
    onFormChange,
    saving,
    showLocalStorage = false,
    onSubmit,
    onCancel,
}: {
    form: CookieFormState;
    onFormChange: (patch: Partial<CookieFormState>) => void;
    saving: boolean;
    showLocalStorage?: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    const validation = validateShortVideoCookieJson(form.cookie_value);
    const localStorageValidation = normalizeShortVideoLocalStorage(form.local_storage);

    return (
        <Stack spacing={2}>
            <TextField
                label="Tên cookie *"
                value={form.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                placeholder="VD: Meta account 1, Meta account 2"
            />
            <TextField
                label="Website (domain)"
                value={form.website}
                disabled
                size="small"
                fullWidth
                helperText="Domain cố định theo tab — meta.ai (render ảnh beat), vibes.ai, www.canva.com, app.leonardo.ai (convert ảnh beat → video), chat.deepseek.com hoặc chatgpt.com (sinh title/thumbnail)"
            />
            <TextField
                label="Mô tả"
                value={form.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                multiline
                minRows={2}
            />
            <TextField
                label="Cookie (JSON hoặc bảng DevTools) *"
                value={form.cookie_value}
                onChange={(e) => onFormChange({ cookie_value: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                multiline
                minRows={6}
                maxRows={14}
                error={Boolean(form.cookie_value.trim()) && !validation.ok}
                helperText={
                    form.cookie_value.trim() && !validation.ok
                        ? validation.error || 'Cookie không hợp lệ'
                        : 'Dán cookie export từ extension Cookie-Editor (JSON) — hoặc copy bảng cookie từ Chrome DevTools (dùng cho site chặn export cookie httpOnly như chat.deepseek.com, chatgpt.com).'
                }
            />
            {showLocalStorage ? (
                <TextField
                    label="LocalStorage (JSON hoặc bảng Key/Value)"
                    value={form.local_storage}
                    onChange={(e) => onFormChange({ local_storage: e.target.value })}
                    disabled={saving}
                    size="small"
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={12}
                    error={Boolean(form.local_storage.trim()) && !localStorageValidation.ok}
                    helperText={
                        form.local_storage.trim() && !localStorageValidation.ok
                            ? localStorageValidation.error || 'LocalStorage không hợp lệ'
                            : 'Site chat (DeepSeek/ChatGPT) có thể lưu token đăng nhập ở localStorage (DeepSeek: key "userToken", giá trị dạng {"value":"<token>","__version":"0"}). Dán JSON {"key":"value"} hoặc bảng Key/Value từ DevTools (Application → Local Storage). Token thô cũng được — hệ thống tự bọc lại.'
                    }
                />
            ) : null}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={saving}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={onSubmit} disabled={saving}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : null}
                    {form.id > 0 ? 'Lưu thay đổi' : 'Thêm cookie'}
                </Button>
            </Stack>
        </Stack>
    );
}

export function ShortVideoCookieManageContent({
    active = true,
    website = 'meta.ai',
    shortVideoId = 0,
}: {
    active?: boolean;
    /** Domain cố định cho tab này (meta.ai / vibes.ai / www.canva.com). */
    website?: string;
    /** Short video đang mở — cần cho recorder Canva (lấy ảnh beat test). */
    shortVideoId?: number;
}) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [cookies, setCookies] = React.useState<ShortVideoCookie[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<CookieFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoCookie | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [testingId, setTestingId] = React.useState<number | null>(null);
    const [probingId, setProbingId] = React.useState<number | null>(null);
    const [probeResult, setProbeResult] = React.useState<{
        cookie: ShortVideoCookie;
        loggedIn: boolean | null;
        cookieCount: number;
        storageKeys: string[];
        storage: Record<string, string>;
    } | null>(null);
    const [recording, setRecording] = React.useState(false);
    const [recordingSignup, setRecordingSignup] = React.useState(false);
    const [recordingLeonardo, setRecordingLeonardo] = React.useState(false);
    const [recordingDeepseek, setRecordingDeepseek] = React.useState(false);
    const [clearingId, setClearingId] = React.useState<number | null>(null);
    const [togglingUsageId, setTogglingUsageId] = React.useState<number | null>(null);

    // Test đăng nhập áp dụng cho site dạng cookie (Meta.ai / Vibes.ai / Canva / Leonardo / DeepSeek) — BE mở
    // browser với đúng cookie của site tương ứng.
    const canTestLogin =
        website === 'meta.ai' ||
        website === 'vibes.ai' ||
        website.includes('canva.com') ||
        website.includes('leonardo.ai') ||
        website.includes('deepseek.com') ||
        website.includes('chatgpt.com');
    // Recorder chỉ có cho Canva (học flow image → video thủ công).
    const canRecordCanva = website.includes('canva.com');
    // Recorder Leonardo (DEV) — học flow image → video trên app.leonardo.ai.
    const canRecordLeonardo = website.includes('leonardo.ai');
    // Recorder DeepSeek (DEV) — học flow chat (gõ prompt → gửi → đợi phản hồi) trên chat.deepseek.com.
    const canRecordDeepseek = website.includes('deepseek.com');
    // ChatGPT cũng là site chat dạng cookie (domain chatgpt.com).
    const isChatgpt = website.includes('chatgpt.com');
    // Probe đăng nhập headless (dò trạng thái + localStorage) — dùng cho mọi site cookie.
    const canProbeLogin = canTestLogin;
    // Field localStorage chỉ hiện với DeepSeek (token login nằm ở localStorage) và ChatGPT.
    const showLocalStorage = canRecordDeepseek || isChatgpt;

    const emptyForm = React.useMemo<CookieFormState>(() => ({
        ...EMPTY_FORM,
        website,
    }), [website]);

    const reloadList = React.useCallback(() => {
        setLoading(true);
        setError(null);
        listShortVideoCookies(website)
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoCookieApiMessage(result, 'Không tải được danh sách cookie'));
                    setCookies([]);
                    return;
                }
                setCookies(Array.isArray(result?.cookies) ? result.cookies : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách cookie');
            });
    }, [website]);

    React.useEffect(() => {
        if (active) {
            setMode('list');
            setForm(emptyForm);
            setDeleteTarget(null);
            setTestingId(null);
            setProbingId(null);
            setProbeResult(null);
            setRecording(false);
            setRecordingSignup(false);
            setRecordingLeonardo(false);
            setRecordingDeepseek(false);
            setTogglingUsageId(null);
            reloadList();
        }
    }, [active, emptyForm, reloadList]);

    const openAddForm = () => {
        setForm(emptyForm);
        setMode('form');
    };

    const openEditForm = (cookie: ShortVideoCookie) => {
        setForm({
            id: cookie.id,
            title: cookie.title || '',
            website: cookie.website || website,
            cookie_value: cookie.cookie_value || '',
            local_storage: cookie.local_storage || '',
            description: cookie.description || '',
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<CookieFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const handleSubmit = () => {
        const title = form.title.trim();
        // Tab cố định domain → luôn lưu theo website của tab (tránh nhảy bảng).
        const targetWebsite = website.trim().toLowerCase() || SUPPORTED_COOKIE_WEBSITE;
        if (!title) {
            showMessage('Tên cookie không được để trống', 'warning');
            return;
        }
        const validation = normalizeShortVideoCookieValue(form.cookie_value);
        if (!validation.ok) {
            showMessage(validation.error || 'Cookie không hợp lệ', 'warning');
            return;
        }

        const localStorageValidation = normalizeShortVideoLocalStorage(form.local_storage);
        if (showLocalStorage && !localStorageValidation.ok) {
            showMessage(localStorageValidation.error || 'LocalStorage không hợp lệ', 'warning');
            return;
        }

        setSaving(true);
        saveShortVideoCookie({
            id: form.id > 0 ? form.id : 0,
            title,
            website: targetWebsite,
            description: form.description,
            // Lưu JSON đã chuẩn hoá (bảng DevTools được chuyển thành mảng cookie).
            cookie_value: validation.value,
            local_storage: showLocalStorage ? localStorageValidation.value : '',
        })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không lưu được cookie'), 'error');
                    return;
                }
                showMessage(form.id > 0 ? 'Đã cập nhật cookie' : 'Đã thêm cookie', 'success');
                setMode('list');
                setForm(emptyForm);
                reloadList();
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được cookie', 'error');
            });
    };

    const handleTestLogin = (cookie: ShortVideoCookie) => {
        setTestingId(cookie.id);
        testLoginShortVideoCookie(cookie.id, cookie.website || website)
            .then((result) => {
                setTestingId(null);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoCookieApiMessage(result, 'Không mở được browser test đăng nhập'),
                        'error',
                    );
                    return;
                }
                showMessage(
                    parseShortVideoCookieApiMessage(
                        result,
                        'Đã mở browser (chế độ hiện cửa sổ) — kiểm tra trạng thái đăng nhập rồi tự đóng cửa sổ khi xong',
                    ),
                    'success',
                );
            })
            .catch((err: unknown) => {
                setTestingId(null);
                showMessage(err instanceof Error ? err.message : 'Không mở được browser test đăng nhập', 'error');
            });
    };

    const handleProbeLogin = (cookie: ShortVideoCookie) => {
        if (probingId !== null) {
            return;
        }
        setProbingId(cookie.id);
        probeShortVideoCookieLogin(cookie.id, cookie.website || website)
            .then((result) => {
                setProbingId(null);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoCookieApiMessage(result, 'Không probe được trạng thái đăng nhập'),
                        'error',
                    );
                    return;
                }
                setProbeResult({
                    cookie,
                    loggedIn: result.logged_in ?? null,
                    cookieCount: Number(result.cookie_count ?? 0),
                    storageKeys: Array.isArray(result.storage_keys) ? result.storage_keys : [],
                    storage: result.storage && typeof result.storage === 'object' ? result.storage : {},
                });
                showMessage(
                    parseShortVideoCookieApiMessage(result, 'Đã probe trạng thái đăng nhập'),
                    result.logged_in === true ? 'success' : 'warning',
                );
            })
            .catch((err: unknown) => {
                setProbingId(null);
                showMessage(err instanceof Error ? err.message : 'Không probe được trạng thái đăng nhập', 'error');
            });
    };

    const handleRecordCanva = () => {
        if (shortVideoId <= 0) {
            showMessage('Cần mở short video trước khi ghi thao tác Canva (dùng ảnh beat làm ảnh test)', 'warning');
            return;
        }
        setRecording(true);
        recordCanvaFlow(shortVideoId)
            .then((result) => {
                setRecording(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không mở được recorder Canva'), 'error');
                    return;
                }
                const baseMessage = parseShortVideoCookieApiMessage(
                    result,
                    'Đã mở Chrome recorder Canva — thao tác upload → Image to Video → Generate → Download rồi bấm "End test"',
                );
                showMessage(
                    result?.out_dir ? `${baseMessage} — log: ${result.out_dir}` : baseMessage,
                    'success',
                );
            })
            .catch((err: unknown) => {
                setRecording(false);
                showMessage(err instanceof Error ? err.message : 'Không mở được recorder Canva', 'error');
            });
    };

    const handleRecordCanvaSignup = () => {
        if (recordingSignup) {
            return;
        }
        setRecordingSignup(true);
        recordCanvaSignupFlow()
            .then((result) => {
                setRecordingSignup(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không mở được recorder đăng ký Canva'), 'error');
                    return;
                }
                const baseMessage = parseShortVideoCookieApiMessage(
                    result,
                    'Đã mở Chrome recorder đăng ký Canva — tạo tài khoản tới khi vào được Canva rồi bấm "End test"',
                );
                showMessage(
                    result?.out_dir ? `${baseMessage} — log: ${result.out_dir}` : baseMessage,
                    'success',
                );
            })
            .catch((err: unknown) => {
                setRecordingSignup(false);
                showMessage(err instanceof Error ? err.message : 'Không mở được recorder đăng ký Canva', 'error');
            });
    };

    const handleRecordLeonardo = () => {
        if (recordingLeonardo) {
            return;
        }
        setRecordingLeonardo(true);
        recordLeonardoFlow(shortVideoId)
            .then((result) => {
                setRecordingLeonardo(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không mở được recorder Leonardo'), 'error');
                    return;
                }
                const baseMessage = parseShortVideoCookieApiMessage(
                    result,
                    'Đã mở Chrome recorder Leonardo — thao tác upload ảnh → chọn model Video/Motion → Generate → Download rồi bấm "End test"',
                );
                showMessage(
                    result?.out_dir ? `${baseMessage} — log: ${result.out_dir}` : baseMessage,
                    'success',
                );
            })
            .catch((err: unknown) => {
                setRecordingLeonardo(false);
                showMessage(err instanceof Error ? err.message : 'Không mở được recorder Leonardo', 'error');
            });
    };

    const handleRecordDeepseek = () => {
        if (recordingDeepseek) {
            return;
        }
        setRecordingDeepseek(true);
        recordDeepseekFlow(shortVideoId)
            .then((result) => {
                setRecordingDeepseek(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không mở được recorder DeepSeek'), 'error');
                    return;
                }
                const baseMessage = parseShortVideoCookieApiMessage(
                    result,
                    'Đã mở Chrome recorder DeepSeek — gõ prompt → gửi → đợi phản hồi rồi bấm "End test"',
                );
                showMessage(
                    result?.out_dir ? `${baseMessage} — log: ${result.out_dir}` : baseMessage,
                    'success',
                );
            })
            .catch((err: unknown) => {
                setRecordingDeepseek(false);
                showMessage(err instanceof Error ? err.message : 'Không mở được recorder DeepSeek', 'error');
            });
    };

    const handleToggleLeonardoUsage = (cookie: ShortVideoCookie) => {
        if (togglingUsageId !== null) {
            return;
        }
        const exhausted = Number(cookie.daily_remaining ?? 1) <= 0;
        setTogglingUsageId(cookie.id);
        setLeonardoCookieUsage(cookie.id, !exhausted, cookie.website || website)
            .then((result) => {
                setTogglingUsageId(null);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không cập nhật được trạng thái lượt'), 'error');
                    return;
                }
                showMessage(
                    parseShortVideoCookieApiMessage(
                        result,
                        exhausted ? 'Đã bỏ đánh dấu hết lượt' : 'Đã đánh dấu hết lượt hôm nay',
                    ),
                    'success',
                );
                reloadList();
            })
            .catch((err: unknown) => {
                setTogglingUsageId(null);
                showMessage(err instanceof Error ? err.message : 'Không cập nhật được trạng thái lượt', 'error');
            });
    };

    const handleClearCooldown = (cookie: ShortVideoCookie) => {
        if (clearingId !== null) {
            return;
        }
        setClearingId(cookie.id);
        clearShortVideoCookieCooldown(cookie.id, cookie.website || website)
            .then((result) => {
                setClearingId(null);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không bỏ được nghỉ cho cookie'), 'error');
                    return;
                }
                showMessage('Đã bỏ nghỉ (cooldown) cho cookie', 'success');
                reloadList();
            })
            .catch((err: unknown) => {
                setClearingId(null);
                showMessage(err instanceof Error ? err.message : 'Không bỏ được nghỉ cho cookie', 'error');
            });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoCookies([deleteTarget.id], deleteTarget.website)
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không xóa được cookie'), 'error');
                    setDeleteTarget(null);
                    return;
                }
                showMessage('Đã xóa cookie', 'success');
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được cookie', 'error');
            });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ flexShrink: 0 }}
            >
                {mode === 'form' ? (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={() => setMode('list')}
                    >
                        Danh sách
                    </Button>
                ) : (
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={openAddForm}
                    >
                        Thêm cookie
                    </Button>
                )}
                {canRecordCanva && mode === 'list' ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={recording ? <CircularProgress size={14} color="inherit" /> : <FiberManualRecordOutlinedIcon />}
                        onClick={handleRecordCanva}
                        disabled={recording || recordingSignup || loading}
                    >
                        Ghi lại thao tác
                    </Button>
                ) : null}
                {canRecordCanva && mode === 'list' ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={recordingSignup ? <CircularProgress size={14} color="inherit" /> : <PersonAddAltOutlinedIcon />}
                        onClick={handleRecordCanvaSignup}
                        disabled={recordingSignup || recording || loading}
                    >
                        Ghi lại đăng ký
                    </Button>
                ) : null}
                {canRecordLeonardo && mode === 'list' ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={recordingLeonardo ? <CircularProgress size={14} color="inherit" /> : <FiberManualRecordOutlinedIcon />}
                        onClick={handleRecordLeonardo}
                        disabled={recordingLeonardo || loading}
                    >
                        Ghi lại thao tác
                    </Button>
                ) : null}
                {canRecordDeepseek && mode === 'list' ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={recordingDeepseek ? <CircularProgress size={14} color="inherit" /> : <FiberManualRecordOutlinedIcon />}
                        onClick={handleRecordDeepseek}
                        disabled={recordingDeepseek || loading}
                    >
                        Ghi lại thao tác
                    </Button>
                ) : null}
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Tải lại">
                    <span>
                        <IconButton size="small" onClick={reloadList} disabled={loading}>
                            {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            {canRecordCanva && mode === 'list' ? (
                <Alert severity="info" sx={{ flexShrink: 0 }}>
                    Đăng ký tài khoản Canva tự động làm NGAY TRÊN TRANG CANVA: mở <b>canva.com</b> trong
                    trình duyệt đã cài extension → panel <b>“Đăng ký Canva tự động”</b> hiện ở góc phải
                    (nhập email + App Password Gmail + nhãn). Panel tự đăng ký, lấy OTP và lưu tài khoản
                    vào danh sách này.
                </Alert>
            ) : null}

            {canRecordLeonardo && mode === 'list' ? (
                <Alert severity="info" sx={{ flexShrink: 0 }}>
                    “Ghi lại thao tác” mở Chrome với cookie <b>app.leonardo.ai</b> để bạn thao tác tay
                    (upload ảnh → chọn model Video/Motion → Generate → Download). Khi xong bấm
                    <b> “End test”</b> (góc phải trên) — log phục vụ dev viết automation còn được lưu
                    vào <code>storage/logs/leonardo-record/</code>.
                </Alert>
            ) : null}

            {canRecordDeepseek && mode === 'list' ? (
                <Alert severity="info" sx={{ flexShrink: 0 }}>
                    “Ghi lại thao tác” mở Chrome với cookie <b>chat.deepseek.com</b> để bạn thao tác tay
                    (gõ prompt → gửi → đợi phản hồi). Khi xong bấm <b>“End test”</b> (góc phải trên) —
                    log phục vụ dev viết automation còn được lưu vào <code>storage/logs/deepseek-record/</code>.
                </Alert>
            ) : null}

            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && mode === 'form' ? (
                <Box
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        p: 2.5,
                        maxWidth: 720,
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        {form.id > 0 ? 'Sửa cookie' : 'Thêm cookie mới'}
                    </Typography>
                    <CookieForm
                        form={form}
                        onFormChange={handleFormChange}
                        saving={saving}
                        showLocalStorage={showLocalStorage}
                        onSubmit={handleSubmit}
                        onCancel={() => setMode('list')}
                    />
                </Box>
            ) : null}

            {!loading && mode === 'list' && cookies.length === 0 ? (
                <Box
                    sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        py: 8,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                    }}
                >
                    <CookieOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Chưa có cookie nào
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        {website === 'vibes.ai'
                            ? 'Cookie pool vibes.ai dùng convert ảnh beat → video headless (xoay vòng, cookie bị giới hạn sẽ tạm nghỉ).'
                            : website.includes('canva.com')
                                ? 'Cookie pool www.canva.com dùng convert ảnh beat → video (xoay vòng, cookie bị giới hạn sẽ tạm nghỉ).'
                                : website.includes('leonardo.ai')
                                    ? 'Cookie pool app.leonardo.ai dùng convert ảnh beat → video (xoay vòng, cookie bị giới hạn sẽ tạm nghỉ).'
                                    : website.includes('deepseek.com')
                                        ? 'Cookie pool chat.deepseek.com dùng mở phiên viết nội dung + sinh tiêu đề / nội dung thumbnail YouTube qua browser (xoay vòng).'
                                        : website.includes('chatgpt.com')
                                            ? 'Cookie pool chatgpt.com dùng mở phiên viết nội dung ChatGPT + sinh tiêu đề / nội dung thumbnail qua browser (xoay vòng).'
                                            : 'Cookie pool meta.ai dùng render ảnh beat (xoay vòng) và extension tự set cookie để mở Meta.ai.'}
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddOutlinedIcon />}
                        onClick={openAddForm}
                    >
                        Thêm cookie
                    </Button>
                </Box>
            ) : null}

            {!loading && mode === 'list' && cookies.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                    }}
                >
                    {cookies.map((cookie) => (
                        <Box
                            key={cookie.id}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                p: 1.5,
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'flex-start',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    flexShrink: 0,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CookieOutlinedIcon color="action" />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mb: 0.5 }}
                                >
                                    <Chip
                                        size="small"
                                        label={cookie.website || SUPPORTED_COOKIE_WEBSITE}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ maxWidth: 180 }}
                                    />
                                    <Chip
                                        size="small"
                                        label={String(cookie.cookie_count ?? 0) + ' cookie'}
                                        variant="outlined"
                                    />
                                    {typeof cookie.daily_limit === 'number' && cookie.daily_limit > 0 ? (
                                        <Chip
                                            size="small"
                                            color={Number(cookie.daily_remaining ?? 0) > 0 ? 'success' : 'default'}
                                            variant={Number(cookie.daily_remaining ?? 0) > 0 ? 'outlined' : 'filled'}
                                            label={`Hôm nay ${Number(cookie.daily_used ?? 0)}/${cookie.daily_limit} lượt`}
                                        />
                                    ) : null}
                                {typeof cookie.daily_limit === 'number' && cookie.daily_limit > 0 ? (
                                    <Tooltip
                                        title={
                                            Number(cookie.daily_remaining ?? 0) > 0
                                                ? 'Đánh dấu đã dùng hết lượt hôm nay'
                                                : 'Bỏ đánh dấu (dùng lại ngay)'
                                        }
                                    >
                                        <span>
                                            <IconButton
                                                size="small"
                                                color={Number(cookie.daily_remaining ?? 0) > 0 ? 'default' : 'success'}
                                                onClick={() => handleToggleLeonardoUsage(cookie)}
                                                disabled={togglingUsageId !== null}
                                            >
                                                {togglingUsageId === cookie.id ? (
                                                    <CircularProgress size={18} />
                                                ) : Number(cookie.daily_remaining ?? 0) > 0 ? (
                                                    <DoNotDisturbOnOutlinedIcon fontSize="small" />
                                                ) : (
                                                    <RestartAltOutlinedIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {formatCooldownRemaining(Number(cookie.cooldown_until || 0)) ? (
                                        <Chip
                                            size="small"
                                            color="warning"
                                            label={`Hết quota · còn ${formatCooldownRemaining(Number(cookie.cooldown_until || 0))}`}
                                        />
                                    ) : null}
                                </Stack>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                    {cookie.title || '(Không tên)'}
                                </Typography>
                                {cookie.description ? (
                                    <Typography
                                        variant="caption"
                                        color="text.disabled"
                                        sx={{ display: 'block' }}
                                        noWrap
                                    >
                                        {cookie.description}
                                    </Typography>
                                ) : null}
                            </Box>
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ flexShrink: 0, alignSelf: 'flex-start', mt: 0.25 }}
                            >
                                {formatCooldownRemaining(Number(cookie.cooldown_until || 0)) ? (
                                    <Tooltip title="Bỏ nghỉ (mở lại account dùng ngay)">
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="warning"
                                                onClick={() => handleClearCooldown(cookie)}
                                                disabled={clearingId !== null}
                                            >
                                                {clearingId === cookie.id ? (
                                                    <CircularProgress size={18} />
                                                ) : (
                                                    <LockOpenOutlinedIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {canTestLogin ? (
                                    <Tooltip title="Test đăng nhập (mở browser kiểm tra cookie)">
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleTestLogin(cookie)}
                                                disabled={testingId !== null}
                                            >
                                                {testingId === cookie.id ? (
                                                    <CircularProgress size={18} />
                                                ) : (
                                                    <LoginOutlinedIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {canProbeLogin ? (
                                    <Tooltip title="Probe đăng nhập (headless) — dò trạng thái + localStorage">
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="secondary"
                                                onClick={() => handleProbeLogin(cookie)}
                                                disabled={probingId !== null}
                                            >
                                                {probingId === cookie.id ? (
                                                    <CircularProgress size={18} />
                                                ) : (
                                                    <ScienceOutlinedIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                <Tooltip title="Sửa">
                                    <IconButton size="small" onClick={() => openEditForm(cookie)}>
                                        <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(cookie)}>
                                        <DeleteOutlineOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Box>
                    ))}
                </Box>
            ) : null}

            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => (deleting ? null : setDeleteTarget(null))}
            >
                <DialogTitle>Xóa cookie?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa cookie "{deleteTarget?.title || ''}" ({deleteTarget?.website})?
                        Hành động không thể hoàn tác — các beat đã lưu cookie_id này sẽ fallback sang cookie khác khi mở lại chat.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Hủy
                    </Button>
                    <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleting}>
                        {deleting ? <CircularProgress size={16} color="inherit" /> : null}
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(probeResult)}
                onClose={() => setProbeResult(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontSize: 16 }}>Kết quả probe đăng nhập</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                        <Alert severity={probeResult?.loggedIn === true ? 'success' : probeResult?.loggedIn === false ? 'warning' : 'info'} sx={{ py: 0.5 }}>
                            {probeResult?.loggedIn === true
                                ? 'ĐÃ đăng nhập'
                                : probeResult?.loggedIn === false
                                    ? 'CHƯA đăng nhập'
                                    : 'Không xác định được trạng thái'}
                            {' — '}
                            {probeResult?.cookieCount ?? 0} cookie set
                        </Alert>
                        <Typography variant="caption" color="text.secondary">
                            LocalStorage keys ({probeResult?.storageKeys.length ?? 0})
                        </Typography>
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                maxHeight: 240,
                                overflow: 'auto',
                                p: 1,
                                bgcolor: 'background.default',
                            }}
                        >
                            {(probeResult?.storageKeys.length ?? 0) === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Không có localStorage key nào.
                                </Typography>
                            ) : (
                                probeResult?.storageKeys.map((key) => (
                                    <Box key={key} sx={{ mb: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                                            {key}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                                        >
                                            {String(probeResult?.storage[key] ?? '').slice(0, 400) || '(rỗng)'}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProbeResult(null)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default function ShortVideoCookieManageDrawer({ open, onClose }: Props) {
    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Quản lý cookie chatbot"
            width={900}
            activeOnClose
            restDialogContent={{
                sx: {
                    backgroundColor: 'body.background',
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ height: '100%', p: 3, overflowY: 'auto' }} className="custom_scroll">
                <ShortVideoCookieManageContent active={open} />
            </Box>
        </DrawerCustom>
    );
}
