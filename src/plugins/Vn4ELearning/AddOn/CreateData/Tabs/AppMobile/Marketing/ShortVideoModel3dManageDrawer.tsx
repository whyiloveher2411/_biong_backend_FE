import React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import CharacterWardrobeEditor from './CharacterWardrobeEditor';
import Model3dPreview, { type Model3dPreviewHandle } from './Model3dPreview';
import {
    buildModel3dPreviewUrl,
    buildModelAnimationCandidateUrl,
    characterRequest,
    CharacterConfig,
    CharacterGeneration,
    deleteShortVideoModel3ds,
    listShortVideoModel3ds,
    modelAnimationRequest,
    parseShortVideoModel3dApiMessage,
    saveShortVideoModel3d,
    uploadShortVideoModel3dFile,
    uploadShortVideoModel3dThumbnail,
    type ShortVideoModel3d,
    type ModelAnimationGeneration,
} from 'helpers/marketingShortVideoModel3dApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

type ModelMedia = {
    url: string;
    s3_key: string;
    file_name: string;
    file_size: number;
    file_format: string;
};

type ModelFormState = {
    character: CharacterConfig;
    generation?: CharacterGeneration;
    animationGeneration?: ModelAnimationGeneration;
    id: number;
    title: string;
    slug: string;
    kind: string;
    license: string;
    source: string;
    height: string;
    description: string;
    materials: string;
    clips: string;
    model: ModelMedia | null;
    thumbnail: { url: string; s3_key: string } | null;
};

const EMPTY_FORM: ModelFormState = {
    character: {enabled:false, additive:['sneak_pose','sad_pose','agree','headShake']},
    id: 0,
    title: '',
    slug: '',
    kind: 'prop',
    license: '',
    source: '',
    height: '',
    description: '',
    materials: '',
    clips: '',
    model: null,
    thumbnail: null,
};

const MODEL_ACCEPT = '.glb,.gltf,model/gltf-binary,model/gltf+json';

function fileExt(name: string): string {
    const match = /\.([a-z0-9]+)$/i.exec(String(name || '').trim());
    return match ? match[1].toLowerCase() : '';
}

function isAllowedModelFile(file: File): boolean {
    const ext = fileExt(file.name);
    return ext === 'glb' || ext === 'gltf';
}

function baseName(name: string): string {
    return String(name || '').replace(/\.[a-z0-9]+$/i, '').trim();
}

function formatFileSize(bytes: number): string {
    const value = Number(bytes || 0);
    if (!value || value <= 0) {
        return '';
    }
    if (value < 1024) {
        return `${value} B`;
    }
    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function countLines(text: string): number {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean).length;
}

function listPreview(text: string, max = 6): string[] {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, max);
}

type ClipRow = { name: string; rename: string; desc: string };

/** Parse field clips → rows {name, rename, desc}. */
function parseClipRows(text: string): ClipRow[] {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('|').map((s) => s.trim());
            return { name: parts[0] || '', rename: parts[1] || '', desc: parts[2] || '' };
        })
        .filter((row) => row.name !== '' || row.rename !== '');
}

/** Serialize rows → text: "Tên gốc" hoặc "Tên gốc | Tên đặt lại | Mô tả". */
function serializeClipRows(rows: ClipRow[]): string {
    return rows
        .map((row) => {
            const name = row.name.trim();
            const rename = row.rename.trim();
            const desc = row.desc.trim();
            if (!name && !rename && !desc) {
                return '';
            }
            if (!rename && !desc) {
                return name;
            }
            return `${name} | ${rename} | ${desc}`;
        })
        .filter(Boolean)
        .join('\n');
}

/** Editor đặt lại tên + mô tả cho từng clip. Tên gốc rỗng = trạng thái ĐỨNG YÊN. */
function ClipsEditor({
    value,
    onChange,
    onRemoveClip,
    disabled,
}: {
    value: string;
    onChange: (next: string) => void;
    onRemoveClip?: (clipName: string) => void;
    disabled?: boolean;
}) {
    const rows = React.useMemo(() => parseClipRows(value), [value]);

    const update = (index: number, patch: Partial<ClipRow>) => {
        const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
        onChange(serializeClipRows(next));
    };
    const addStatic = () => {
        if (rows.some((row) => row.name === '' && row.rename.trim().toLowerCase() === 'idle')) {
            return;
        }
        onChange(serializeClipRows([...rows, { name: '', rename: 'idle', desc: 'standing still' }]));
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="subtitle2">Clip (đặt lại tên + mô tả)</Typography>
                <Button size="small" onClick={addStatic} disabled={disabled} sx={{ textTransform: 'none' }}>
                    + Đứng yên (idle)
                </Button>
            </Stack>
            {rows.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    Model chưa có clip. Nếu là person, nó sẽ đứng yên (bind pose).
                </Typography>
            ) : (
                <Stack spacing={0.75}>
                    {rows.map((row, index) => (
                        <Stack key={`${row.name}-${index}`} direction="row" spacing={0.75} alignItems="center">
                            <TextField
                                size="small"
                                label="Clip gốc"
                                value={row.name}
                                placeholder="— đứng yên —"
                                disabled
                                sx={{ flex: 1, minWidth: 0 }}
                            />
                            <TextField
                                size="small"
                                label="Đặt lại tên"
                                value={row.rename}
                                onChange={(e) => update(index, { rename: e.target.value })}
                                disabled={disabled}
                                placeholder="idle, walk…"
                                sx={{ flex: 1, minWidth: 0 }}
                            />
                            <TextField
                                size="small"
                                label="Mô tả"
                                value={row.desc}
                                onChange={(e) => update(index, { desc: e.target.value })}
                                disabled={disabled}
                                placeholder="đi bộ, chạy…"
                                sx={{ flex: 1.3, minWidth: 0 }}
                            />
                            {row.name && onRemoveClip && (
                                <Tooltip title={`Xóa clip ${row.name} khỏi model`}>
                                    <span><IconButton size="small" color="error" aria-label={`Xóa clip ${row.name}`} onClick={() => onRemoveClip(row.name)} disabled={disabled}>
                                        <DeleteOutlineOutlinedIcon fontSize="small" />
                                    </IconButton></span>
                                </Tooltip>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Prompt dùng <b>tên đặt lại</b> (nếu có), else tên gốc. Dòng có Clip gốc rỗng = đứng yên (bind pose).
            </Typography>
        </Box>
    );
}

function ModelForm({
    form,
    onFormChange,
    saving,
    uploading,
    capturing,
    onSubmit,
    onCancel,
    onUploadFile,
    onRemoveClip,
}: {
    form: ModelFormState;
    onFormChange: (patch: Partial<ModelFormState>) => void;
    saving: boolean;
    uploading: boolean;
    capturing: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    onUploadFile: (file: File) => void;
    onRemoveClip: (clipName: string) => void;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);

    const acceptFile = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) {
            return;
        }
        onUploadFile(file);
    };

    return (
        <Stack spacing={2}>
            <TextField
                label="Tên model"
                value={form.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                placeholder="VD: robot, tree_pine"
                helperText="Tự điền từ tên file khi upload — sửa được."
            />
            <Stack direction="row" spacing={2}>
                <TextField
                    label="ID (slug)"
                    value={form.slug}
                    onChange={(e) => onFormChange({ slug: e.target.value })}
                    disabled={saving || uploading}
                    size="small"
                    fullWidth
                    placeholder="VD: tree_pine (để trống = tự sinh từ tên)"
                    inputProps={{ pattern: '[a-z0-9_]*' }}
                    helperText="Duy nhất, chỉ a-z 0-9 _ — dùng trong catalog/runtime."
                />
                <TextField
                    select
                    label="Loại"
                    value={form.kind}
                    onChange={(e) => onFormChange({ kind: e.target.value })}
                    disabled={saving || uploading}
                    size="small"
                    fullWidth
                    helperText="person → có animation (Assets.person)."
                >
                    <MenuItem value="prop">Prop (vật thể tĩnh)</MenuItem>
                    <MenuItem value="person">Person (nhân vật)</MenuItem>
                </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Giấy phép"
                    value={form.license}
                    onChange={(e) => onFormChange({ license: e.target.value })}
                    disabled={saving || uploading}
                    size="small"
                    fullWidth
                    placeholder="CC0, CC-BY…"
                />
                <TextField
                    label="Nguồn"
                    value={form.source}
                    onChange={(e) => onFormChange({ source: e.target.value })}
                    disabled={saving || uploading}
                    size="small"
                    fullWidth
                    placeholder="pack / tác giả / URL"
                />
            </Stack>
            <TextField
                label="Chiều cao (mét)"
                value={form.height}
                onChange={(e) => onFormChange({ height: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                type="number"
                inputProps={{ step: 0.001, min: 0 }}
                helperText="Tự tính từ model khi upload — sửa được."
            />
            <TextField
                label="Mô tả"
                value={form.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                multiline
                minRows={2}
                placeholder="Model này dùng để làm gì, xuất hiện ở đâu…"
            />
            <TextField
                label="Tên material"
                value={form.materials}
                onChange={(e) => onFormChange({ materials: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                multiline
                minRows={3}
                placeholder={'Mỗi dòng 1 tên material\nVD: Body\nMetal'}
                helperText="Danh sách tên material — mỗi dòng 1 tên. Tự điền khi upload."
            />
            <ClipsEditor
                value={form.clips}
                onChange={(next) => onFormChange({ clips: next })}
                onRemoveClip={onRemoveClip}
                disabled={saving || uploading}
            />
            <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    File model (.glb / .gltf)
                </Typography>
                <Box
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        acceptFile(e.dataTransfer.files);
                    }}
                    onClick={() => !uploading && !saving && fileInputRef.current?.click()}
                    sx={{
                        border: '1px dashed',
                        borderColor: dragOver ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        p: uploading ? 3 : 1.5,
                        textAlign: 'center',
                        cursor: uploading ? 'wait' : 'pointer',
                        bgcolor: dragOver ? 'action.selected' : 'background.default',
                        opacity: uploading ? 0.7 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={MODEL_ACCEPT}
                        hidden
                        onChange={(e) => {
                            acceptFile(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    {form.model?.url ? (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                            <ViewInArOutlinedIcon color="primary" />
                            <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                    {form.model.file_name || 'model'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {[
                                        form.model.file_format ? form.model.file_format.toUpperCase() : '',
                                        formatFileSize(form.model.file_size),
                                    ].filter(Boolean).join(' · ')}
                                </Typography>
                            </Box>
                        </Stack>
                    ) : (
                        <Stack spacing={0.5} alignItems="center" sx={{ py: 2 }}>
                            {uploading ? (
                                <CircularProgress size={22} />
                            ) : (
                                <CloudUploadOutlinedIcon color="action" />
                            )}
                            <Typography variant="caption" color="text.secondary">
                                {uploading
                                    ? 'Đang upload + phân tích model…'
                                    : 'Thả file vào đây hoặc bấm để chọn (.glb / .gltf)'}
                            </Typography>
                        </Stack>
                    )}
                </Box>
                {form.model?.url && !uploading ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                            {form.model.url}
                        </Typography>
                        <Button
                            size="small"
                            color="error"
                            disabled={saving || uploading}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFormChange({ model: null });
                            }}
                        >
                            Xóa file
                        </Button>
                    </Stack>
                ) : null}
            </Box>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={saving || uploading}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={onSubmit} disabled={saving || uploading || capturing || !form.model?.url}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : null}
                    {form.id > 0 ? 'Lưu thay đổi' : 'Thêm model'}
                </Button>
            </Stack>
        </Stack>
    );
}

/**
 * Drawer QUẢN LÝ MODEL 3D — thư viện dùng chung (toàn cục), không gắn short video.
 * Mỗi model: tên, chiều cao, mô tả, danh sách material, danh sách clip và file
 * .glb/.gltf. Khi upload file, các field thông tin được tự động điền từ model.
 */
export default function ShortVideoModel3dManageDrawer({ open, onClose }: Props) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [models, setModels] = React.useState<ShortVideoModel3d[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<ModelFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoModel3d | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
    const [bulkDeleting, setBulkDeleting] = React.useState(false);
    const [capturing, setCapturing] = React.useState(false);

    const previewRef = React.useRef<Model3dPreviewHandle | null>(null);
    // Chống chụp lặp cho cùng 1 URL (auto-capture chỉ 1 lần / file).
    const autoCapturedUrlRef = React.useRef<string>('');

    const toggleSelected = (modelId: number) => {
        setSelectedIds((prev) => (prev.includes(modelId)
            ? prev.filter((id) => id !== modelId)
            : [...prev, modelId]));
    };

    const reloadList = React.useCallback(() => {
        setLoading(true);
        setError(null);
        listShortVideoModel3ds()
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoModel3dApiMessage(
                        result,
                        'Không tải được danh sách model 3D',
                    ));
                    setModels([]);
                    return;
                }
                setModels(Array.isArray(result?.models) ? result.models : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách model 3D');
            });
    }, []);

    React.useEffect(() => {
        if (open) {
            setMode('list');
            setForm(EMPTY_FORM);
            setDeleteTarget(null);
            setSelectedIds([]);
            setBulkDeleteOpen(false);
            reloadList();
        }
    }, [open, reloadList]);

    const [creatingXbot,setCreatingXbot] = React.useState(false);
    const createXbot = async () => {
        setCreatingXbot(true);
        try {
            const res = await characterRequest('xbot');
            if (res.success === false || !res.model) throw new Error(parseShortVideoModel3dApiMessage(res));
            reloadList(); openEditForm(res.model);
        } catch (e) { showMessage(e instanceof Error ? e.message : 'Không tạo được nhân vật mẫu', 'error'); }
        finally { setCreatingXbot(false); }
    };
    const openAddForm = () => {
        autoCapturedUrlRef.current = '';
        setForm(EMPTY_FORM);
        setMode('form');
    };

    const openEditForm = (model: ShortVideoModel3d) => {
        autoCapturedUrlRef.current = '';
        setForm({
            character: model.character || EMPTY_FORM.character,
            generation: model.character_generation,
            animationGeneration: model.animation_generation,
            id: model.id,
            title: model.title || '',
            slug: model.slug || '',
            kind: model.kind || 'prop',
            license: model.license || '',
            source: model.source || '',
            height: model.height ? String(model.height) : '',
            description: model.description || '',
            materials: model.materials || '',
            clips: model.clips || '',
            model: model.model_url
                ? {
                    url: model.model_url,
                    s3_key: model.model_s3_key || '',
                    file_name: model.file_name || '',
                    file_size: Number(model.file_size || 0),
                    file_format: model.file_format || '',
                }
                : null,
            thumbnail: model.thumbnail_url
                ? { url: model.thumbnail_url, s3_key: model.thumbnail_s3_key || '' }
                : null,
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<ModelFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const [animationAction, setAnimationAction] = React.useState('');
    const [animationAlias, setAnimationAlias] = React.useState('');
    const [animationDescription, setAnimationDescription] = React.useState('');
    const [animationFeedback, setAnimationFeedback] = React.useState('');
    const [animationBusy, setAnimationBusy] = React.useState(false);
    const [animationClip, setAnimationClip] = React.useState('');
    const refreshAnimation = React.useCallback(async () => {
        if (form.id <= 0) return;
        try {
            const result = await modelAnimationRequest('status', {model_id: form.id});
            if (result.model) setForm((prev) => ({...prev, animationGeneration: result.model?.animation_generation}));
        } catch { /* polling is best effort; next poll retries */ }
    }, [form.id]);
    React.useEffect(() => {
        if (!form.id || !['queued', 'processing'].includes(form.animationGeneration?.status || '')) return undefined;
        const timer = window.setInterval(() => { void refreshAnimation(); }, 5000);
        return () => window.clearInterval(timer);
    }, [form.id, form.animationGeneration?.status, refreshAnimation]);
    const generateAnimation = async () => {
        setAnimationBusy(true);
        try {
            const result = await modelAnimationRequest('generate', {model_id: form.id, action: animationAction, alias: animationAlias, description: animationDescription});
            if (result.success === false) throw new Error(parseShortVideoModel3dApiMessage(result));
            setForm((prev) => ({...prev, animationGeneration: result.generation}));
            showMessage('Đã gửi yêu cầu tạo animation. Có thể mất vài phút.', 'success');
        } catch (e) { showMessage(e instanceof Error ? e.message : 'Không tạo được animation', 'error'); }
        finally { setAnimationBusy(false); }
    };
    const reviseAnimation = async () => {
        const generation = form.animationGeneration;
        const requestId = generation?.status === 'failed' ? generation.previous_request_id : generation?.request_id;
        if (!requestId || !animationFeedback.trim()) return;
        setAnimationBusy(true);
        try {
            const result = await modelAnimationRequest('revise', {model_id: form.id, request_id: requestId, feedback: animationFeedback});
            if (result.success === false) throw new Error(parseShortVideoModel3dApiMessage(result));
            setForm((prev) => ({...prev, animationGeneration: result.generation}));
            setAnimationClip('');
            showMessage('Đã gửi feedback cho DeepSeek. Candidate cũ chỉ được bỏ sau khi bản mới tạo thành công.', 'success');
        } catch (e) { showMessage(e instanceof Error ? e.message : 'Không gửi được feedback', 'error'); }
        finally { setAnimationBusy(false); }
    };
    const approveAnimation = async () => {
        if (!form.animationGeneration?.request_id || !animationClip) return;
        setAnimationBusy(true);
        try {
            const result = await modelAnimationRequest('approve', {model_id: form.id, request_id: form.animationGeneration.request_id, clip_name: animationClip});
            if (result.success === false || !result.model) throw new Error(parseShortVideoModel3dApiMessage(result, 'Không duyệt được animation'));
            const m = result.model;
            setForm((prev) => ({...prev, animationGeneration: m.animation_generation, clips: m.clips, model: {url: m.model_url, s3_key: m.model_s3_key, file_name: m.file_name, file_size: m.file_size, file_format: m.file_format}}));
            showMessage('Đã duyệt và thêm clip vào thư viện nhân vật.', 'success');
            reloadList();
        } catch (e) { showMessage(e instanceof Error ? e.message : 'Không duyệt được animation', 'error'); }
        finally { setAnimationBusy(false); }
    };
    const removeClip = async (clipName: string) => {
        if (!form.id || !window.confirm(`Xóa clip “${clipName}” khỏi file model này?`)) return;
        setSaving(true);
        try {
            const result = await modelAnimationRequest('remove_clip', {model_id: form.id, clip_name: clipName});
            if (result.success === false || !result.model) throw new Error(parseShortVideoModel3dApiMessage(result, 'Không xóa được clip'));
            const m = result.model;
            setForm((prev) => ({...prev, clips: m.clips, animationGeneration: m.animation_generation, model: {url: m.model_url, s3_key: m.model_s3_key, file_name: m.file_name, file_size: m.file_size, file_format: m.file_format}}));
            showMessage(`Đã xóa clip “${clipName}” khỏi model.`, 'success');
            reloadList();
        } catch (e) { showMessage(e instanceof Error ? e.message : 'Không xóa được clip', 'error'); }
        finally { setSaving(false); }
    };
    const discardAnimation = async () => {
        const requestId = form.animationGeneration?.request_id;
        if (!requestId) return;
        setAnimationBusy(true);
        try {
            const result = await modelAnimationRequest('discard', {model_id: form.id, request_id: requestId});
            if (result.success === false) throw new Error(parseShortVideoModel3dApiMessage(result));
            setForm((prev) => ({...prev, animationGeneration: {...(prev.animationGeneration || {}), status: 'discarded'}}));
        } catch (e) { showMessage(e instanceof Error ? e.message : 'Không xóa được candidate', 'error'); }
        finally { setAnimationBusy(false); }
    };

    const handleUploadFile = (file: File) => {
        if (!isAllowedModelFile(file)) {
            showMessage('Chỉ chấp nhận file .glb hoặc .gltf', 'warning');
            return;
        }
        setUploading(true);
        uploadShortVideoModel3dFile(file)
            .then((result) => {
                setUploading(false);
                if (result?.success === false || !result?.url) {
                    showMessage(
                        parseShortVideoModel3dApiMessage(result, 'Upload file model thất bại'),
                        'error',
                    );
                    return;
                }
                // File mới → thumbnail cũ không còn đúng, chụp lại tự động khi preview load xong.
                autoCapturedUrlRef.current = '';
                setForm((prev) => ({
                    ...prev,
                    // Tự điền thông tin từ model — chỉ ghi đè field còn trống/khác model cũ.
                    title: prev.title.trim() ? prev.title : baseName(result.file_name || file.name),
                    height: Number(result.height || 0) > 0
                        ? String(Number(result.height))
                        : prev.height,
                    materials: String(result.materials || '').trim()
                        ? String(result.materials)
                        : prev.materials,
                    clips: String(result.clips || '').trim()
                        ? String(result.clips)
                        : prev.clips,
                    model: {
                        url: result.url || '',
                        s3_key: result.s3_key || '',
                        file_name: result.file_name || file.name,
                        file_size: Number(result.file_size || 0),
                        file_format: result.file_format || fileExt(file.name),
                    },
                    character: {...EMPTY_FORM.character, enabled:false},
                    thumbnail: null,
                }));
                showMessage('Đã phân tích model và điền thông tin', 'success');
            })
            .catch((err: unknown) => {
                setUploading(false);
                showMessage(err instanceof Error ? err.message : 'Upload file model thất bại', 'error');
            });
    };

    const previewUrl = form.model?.url ? buildModel3dPreviewUrl(form.model.url) : '';

    const runCapture = React.useCallback(async (auto: boolean) => {
        const preview = previewRef.current;
        if (!preview || capturing) {
            return;
        }
        setCapturing(true);
        try {
            const blob = await preview.captureThumbnail();
            if (!blob) {
                if (!auto) {
                    showMessage('Không chụp được thumbnail', 'error');
                }
                return;
            }
            const result = await uploadShortVideoModel3dThumbnail(blob, form.id > 0 ? form.id : 0);
            if (result?.success === false || !result?.url) {
                if (!auto) {
                    showMessage(parseShortVideoModel3dApiMessage(result, 'Không lưu được thumbnail'), 'error');
                }
                return;
            }
            setForm((prev) => ({
                ...prev,
                thumbnail: { url: result.url || '', s3_key: result.s3_key || '' },
            }));
            if (!auto) {
                showMessage('Đã chụp thumbnail', 'success');
            }
        } catch (err: unknown) {
            if (!auto) {
                showMessage(err instanceof Error ? err.message : 'Không lưu được thumbnail', 'error');
            }
        } finally {
            setCapturing(false);
        }
    }, [capturing, form.id, showMessage]);

    const handlePreviewLoaded = React.useCallback(() => {
        const key = form.model?.url || '';
        if (!key || autoCapturedUrlRef.current === key) {
            return;
        }
        // Đã có thumbnail (mở model cũ để sửa) → không tự chụp lại, chỉ chụp khi file mới.
        if (form.thumbnail?.url) {
            return;
        }
        autoCapturedUrlRef.current = key;
        void runCapture(true);
    }, [form.model?.url, form.thumbnail?.url, runCapture]);

    const handlePreviewError = React.useCallback((message: string) => {
        showMessage(message || 'Không hiển thị được preview 3D', 'warning');
    }, [showMessage]);

    const handleSubmit = () => {
        const title = form.title.trim();
        if (!title) {
            showMessage('Tên model không được để trống', 'warning');
            return;
        }
        if (form.id <= 0 && !form.model?.url) {
            showMessage('Vui lòng upload file model (.glb/.gltf)', 'warning');
            return;
        }

        const heightNumber = Number(form.height);
        setSaving(true);
        saveShortVideoModel3d({
            character: form.character,
            id: form.id > 0 ? form.id : 0,
            title,
            slug: form.slug.trim(),
            kind: form.kind || 'prop',
            license: form.license,
            source: form.source,
            height: Number.isFinite(heightNumber) && heightNumber > 0 ? heightNumber : 0,
            description: form.description,
            materials: form.materials,
            clips: form.clips,
            model: form.model
                ? {
                    link: form.model.url,
                    type_link: 'external',
                    s3_key: form.model.s3_key,
                    file_name: form.model.file_name,
                    file_size: form.model.file_size,
                    file_format: form.model.file_format,
                }
                : null,
            thumbnail: form.thumbnail
                ? {
                    link: form.thumbnail.url,
                    type_link: 'external',
                    s3_key: form.thumbnail.s3_key,
                }
                : null,
        })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoModel3dApiMessage(result, 'Không lưu được model 3D'),
                        'error',
                    );
                    return;
                }
                showMessage(form.id > 0 ? 'Đã cập nhật model 3D' : 'Đã thêm model 3D', 'success');
                setMode('list');
                setForm(EMPTY_FORM);
                reloadList();
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được model 3D', 'error');
            });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoModel3ds([deleteTarget.id])
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoModel3dApiMessage(result, 'Không xóa được model 3D'),
                        'error',
                    );
                    setDeleteTarget(null);
                    return;
                }
                showMessage('Đã xóa model 3D', 'success');
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được model 3D', 'error');
            });
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) {
            return;
        }
        setBulkDeleting(true);
        deleteShortVideoModel3ds(selectedIds)
            .then((result) => {
                setBulkDeleting(false);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoModel3dApiMessage(result, 'Không xóa được model đã chọn'),
                        'error',
                    );
                    setBulkDeleteOpen(false);
                    return;
                }
                const deletedCount = Number(result?.deleted || selectedIds.length);
                showMessage(`Đã xóa ${deletedCount} model 3D`, 'success');
                setBulkDeleteOpen(false);
                setSelectedIds([]);
                reloadList();
            })
            .catch((err: unknown) => {
                setBulkDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được model đã chọn', 'error');
            });
    };

    const headerAction = (
        <Stack direction="row" spacing={1} alignItems="center">
            {mode === 'list' && <Button size="small" variant="contained" disabled={creatingXbot} onClick={createXbot}>{creatingXbot ? 'Đang tạo…' : 'Tạo nhân vật cartoon Xbot'}</Button>}
            {mode === 'form' ? (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArrowBackOutlinedIcon />}
                    onClick={() => setMode('list')}
                    sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
                >
                    Danh sách
                </Button>
            ) : (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddOutlinedIcon />}
                    onClick={openAddForm}
                    sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
                >
                    Thêm model 3D
                </Button>
            )}
        </Stack>
    );

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title="Quản lý model 3D"
                width={1100}
                activeOnClose
                headerAction={headerAction}
                restDialogContent={{
                    sx: {
                        backgroundColor: 'body.background',
                        pt: 2,
                        px: 3,
                        pb: 3,
                    },
                }}
            >
                <Typography>&nbsp;</Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
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
                            display: 'flex',
                            gap: 3,
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Cột trái: form thu nhỏ */}
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                p: 2.5,
                                flex: '1 1 380px',
                                minWidth: 300,
                                maxWidth: 440,
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                                {form.id > 0 ? 'Sửa model 3D' : 'Thêm model 3D mới'}
                            </Typography>
                            <ModelForm
                                form={form}
                                onFormChange={handleFormChange}
                                saving={saving}
                                uploading={uploading}
                                capturing={capturing}
                                onSubmit={handleSubmit}
                                onCancel={() => setMode('list')}
                                onUploadFile={handleUploadFile}
                                onRemoveClip={removeClip}
                            />
                        </Box>

                        {/* Cột phải: preview lớn + thumbnail */}
                        <Box
                            sx={{
                                flex: '2 2 520px',
                                minWidth: 320,
                                maxWidth: 760,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1.5,
                            }}
                        >
                            {previewUrl ? (
                                <>
                                    <Model3dPreview
                                        ref={previewRef}
                                        url={previewUrl}
                                        character={form.kind === 'person' ? form.character : undefined}
                                        onLoaded={handlePreviewLoaded}
                                        onError={handlePreviewError}
                                        sx={{ maxWidth: 520 }}
                                    />
                                    {form.kind === 'person' && form.id>0 && <Button variant="outlined" disabled={saving || uploading} onClick={()=>{autoCapturedUrlRef.current='';setForm(prev=>({...prev,id:0,title:prev.title+' · bản mới',slug:'',generation:undefined,thumbnail:null}));}}>Tạo bản sao để chỉnh ngoại hình riêng</Button>}
                                    {form.kind === 'person' && <CharacterWardrobeEditor value={form.character} onChange={character=>handleFormChange({character})} modelId={form.id} initialGeneration={form.generation} library={models.flatMap(m=>m.character?.library || [])} disabled={saving || uploading}/>}
                                    {form.kind === 'person' && form.id > 0 && (
                                        <Box sx={{border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, bgcolor: 'background.paper'}}>
                                            <Typography variant="subtitle1" sx={{fontWeight: 700, mb: 0.5}}>Tạo animation dùng lại</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 1.5}}>
                                                Sinh clip trên bản sao qua Animato + DeepSeek. Model gốc chỉ thay đổi sau khi bạn preview và duyệt.
                                            </Typography>
                                            <Stack spacing={1}>
                                                <TextField size="small" label="Mô tả hành động" value={animationAction} onChange={(e) => setAnimationAction(e.target.value)} placeholder="Ví dụ: nhân vật bước nhanh sang phải, dừng lại và chỉ tay về phía trước" disabled={animationBusy || ['queued','processing','ready'].includes(form.animationGeneration?.status || '')}/>
                                                <Stack direction="row" spacing={1}>
                                                    <TextField size="small" label="Tên clip trong beat" value={animationAlias} onChange={(e) => setAnimationAlias(e.target.value)} placeholder="point_forward" fullWidth disabled={animationBusy}/>
                                                    <TextField size="small" label="Mô tả clip" value={animationDescription} onChange={(e) => setAnimationDescription(e.target.value)} placeholder="chỉ tay về phía trước" fullWidth disabled={animationBusy}/>
                                                </Stack>
                                                <Button variant="contained" onClick={generateAnimation} disabled={animationBusy || uploading || saving || !animationAction.trim() || !animationAlias.trim() || ['queued','processing','ready'].includes(form.animationGeneration?.status || '')}>
                                                    {animationBusy || ['queued','processing'].includes(form.animationGeneration?.status || '') ? <CircularProgress size={16} color="inherit" sx={{mr: 1}}/> : null}
                                                    {['queued','processing'].includes(form.animationGeneration?.status || '') ? 'Animato đang tạo animation…' : 'Tạo animation với DeepSeek'}
                                                </Button>
                                                {form.animationGeneration?.status === 'failed' && <Alert severity="error">{form.animationGeneration.error || 'Tạo animation thất bại.'}</Alert>}
                                                {form.animationGeneration?.status === 'failed' && form.animationGeneration.previous_request_id && form.animationGeneration.candidate === `${form.animationGeneration.previous_request_id}.glb` && (
                                                    <>
                                                        <Alert severity="warning">Job sửa bị dừng, nhưng candidate trước vẫn được giữ. Bạn có thể preview và gửi feedback lại.</Alert>
                                                        <Model3dPreview url={buildModelAnimationCandidateUrl(form.id, form.animationGeneration.previous_request_id)} sx={{maxWidth: 420}} onError={(message) => showMessage(message, 'warning')}/>
                                                        <TextField
                                                            size="small"
                                                            label="Feedback để thử lại với DeepSeek"
                                                            value={animationFeedback}
                                                            onChange={(e) => setAnimationFeedback(e.target.value)}
                                                            multiline
                                                            minRows={2}
                                                            maxRows={5}
                                                            placeholder="Ví dụ: Hai tay vẫn dang ngang. Gập khuỷu và đặt cả hai bàn tay lên đùi suốt clip; không dang tay hoặc tạo dáng chữ T."
                                                            helperText="Candidate trước sẽ được dùng làm ngữ cảnh; model gốc không thay đổi."
                                                            disabled={animationBusy}
                                                        />
                                                        <Button variant="outlined" onClick={reviseAnimation} disabled={animationBusy || !animationFeedback.trim()}>
                                                            {animationBusy ? <CircularProgress size={16} sx={{mr: 1}}/> : null}
                                                            Gửi feedback tạo lại
                                                        </Button>
                                                    </>
                                                )}
                                                {form.animationGeneration?.status === 'ready' && form.animationGeneration.request_id && (
                                                    <>
                                                        <Alert severity="success">Candidate đã sẵn sàng. Preview clip bên dưới rồi chọn clip muốn thêm vào thư viện.</Alert>
                                                        <Model3dPreview url={buildModelAnimationCandidateUrl(form.id, form.animationGeneration.request_id)} sx={{maxWidth: 420}} onError={(message) => showMessage(message, 'warning')}/>
                                                        <TextField select size="small" label="Clip cần duyệt" value={animationClip} onChange={(e) => setAnimationClip(e.target.value)}>
                                                            {(form.animationGeneration.clips || []).map((clip) => <MenuItem key={clip} value={clip}>{clip}</MenuItem>)}
                                                        </TextField>
                                                        <TextField
                                                            size="small"
                                                            label="Feedback để tạo lại với DeepSeek"
                                                            value={animationFeedback}
                                                            onChange={(e) => setAnimationFeedback(e.target.value)}
                                                            multiline
                                                            minRows={2}
                                                            maxRows={5}
                                                            placeholder="Ví dụ: Hai tay vẫn dang ngang. Giữ bắp tay sát thân, gập khuỷu và đặt cả hai bàn tay lên đùi xuyên suốt clip; không tạo dáng chữ T."
                                                            helperText="Feedback được gửi cùng candidate hiện tại làm ngữ cảnh. Bản cũ chỉ bị dọn khi candidate mới tạo thành công."
                                                            disabled={animationBusy}
                                                        />
                                                        <Stack direction="row" spacing={1}>
                                                            <Button variant="outlined" onClick={reviseAnimation} disabled={animationBusy || !animationFeedback.trim()}>
                                                                {animationBusy ? <CircularProgress size={16} sx={{mr: 1}}/> : null}
                                                                Tạo lại theo feedback
                                                            </Button>
                                                            <Button variant="contained" onClick={approveAnimation} disabled={animationBusy || !animationClip}>Duyệt và thêm clip</Button>
                                                            <Button color="error" onClick={discardAnimation} disabled={animationBusy}>Bỏ candidate</Button>
                                                        </Stack>
                                                    </>
                                                )}
                                                {form.animationGeneration?.status === 'approved' && <Alert severity="info">Đã thêm clip “{form.animationGeneration.approved_clip}”. Clip này hiện dùng được trong beat.</Alert>}
                                            </Stack>
                                        </Box>
                                    )}
                                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                        <Box
                                            sx={{
                                                width: 132,
                                                height: 132,
                                                flexShrink: 0,
                                                borderRadius: 1.5,
                                                border: '1px dashed',
                                                borderColor: 'divider',
                                                bgcolor: 'background.paper',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 0.5,
                                            }}
                                        >
                                            {form.thumbnail?.url ? (
                                                <Box
                                                    component="img"
                                                    src={form.thumbnail.url}
                                                    alt="thumbnail"
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                            ) : (
                                                <>
                                                    <PhotoCameraOutlinedIcon color="disabled" />
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ px: 1, textAlign: 'center' }}
                                                    >
                                                        Chưa có thumbnail
                                                    </Typography>
                                                </>
                                            )}
                                        </Box>
                                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={capturing
                                                    ? <CircularProgress size={14} color="inherit" />
                                                    : <PhotoCameraOutlinedIcon />}
                                                onClick={() => { void runCapture(false); }}
                                                disabled={capturing || uploading || saving}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {form.thumbnail?.url ? 'Chụp lại thumbnail' : 'Chụp thumbnail'}
                                            </Button>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ maxWidth: 280 }}
                                            >
                                                Kéo để xoay model. Thumbnail được chụp tự động sau khi upload.
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </>
                            ) : (
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
                                    <ViewInArOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                        Chưa có file model
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        Upload file .glb/.gltf ở form bên trái để xem preview 3D.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && models.length === 0 ? (
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
                        <ViewInArOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            Chưa có model 3D nào
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Thư viện model 3D (.glb/.gltf) dùng làm tài nguyên khi render HTML beat.
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddOutlinedIcon />}
                            onClick={openAddForm}
                        >
                            Thêm model 3D
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && selectedIds.length > 0 ? (
                    <Box
                        sx={{
                            mb: 1.5,
                            px: 1.5,
                            py: 1,
                            border: '1px solid',
                            borderColor: 'primary.main',
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 120 }}>
                            Đã chọn {selectedIds.length} model
                        </Typography>
                        <Button
                            size="small"
                            onClick={() => setSelectedIds(models.map((item) => item.id))}
                            disabled={bulkDeleting || selectedIds.length >= models.length}
                            sx={{ textTransform: 'none' }}
                        >
                            Chọn tất cả
                        </Button>
                        <Button
                            size="small"
                            onClick={() => setSelectedIds([])}
                            disabled={bulkDeleting}
                            sx={{ textTransform: 'none' }}
                        >
                            Bỏ chọn
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => setBulkDeleteOpen(true)}
                            disabled={bulkDeleting}
                            startIcon={bulkDeleting ? <CircularProgress size={14} color="inherit" /> : undefined}
                            sx={{ textTransform: 'none' }}
                        >
                            Xóa đã chọn
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && models.length > 0 ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                        }}
                    >
                        {models.map((model) => {
                            const materialCount = countLines(model.materials);
                            const clipLabels = parseClipRows(model.clips).map((row) => row.rename || row.name).filter(Boolean);
                            const clipCount = clipLabels.length;
                            return (
                                <Box
                                    key={model.id}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: selectedIds.includes(model.id) ? 'primary.main' : 'divider',
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
                                            width: 84,
                                            height: 84,
                                            flexShrink: 0,
                                            borderRadius: 1.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'background.default',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                        }}
                                    >
                                        <Checkbox
                                            size="small"
                                            checked={selectedIds.includes(model.id)}
                                            onChange={() => toggleSelected(model.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                p: 0.25,
                                                zIndex: 1,
                                                bgcolor: 'rgba(255,255,255,0.75)',
                                                borderRadius: 1,
                                                '& .MuiSvgIcon-root': { fontSize: 18 },
                                            }}
                                        />
                                        <ViewInArOutlinedIcon color="disabled" sx={{ fontSize: 36 }} />
                                        {model.thumbnail_url ? (
                                            <Box
                                                component="img"
                                                src={model.thumbnail_url}
                                                alt={model.title || model.file_name || 'model 3D'}
                                                sx={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    display: 'block',
                                                }}
                                            />
                                        ) : null}
                                        {model.file_format ? (
                                            <Chip
                                                size="small"
                                                label={model.file_format.toUpperCase()}
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 2,
                                                    left: 2,
                                                    height: 16,
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    zIndex: 1,
                                                }}
                                            />
                                        ) : null}
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                            {model.slug ? (
                                                <Chip
                                                    size="small"
                                                    label={model.slug}
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700, maxWidth: 200 }}
                                                />
                                            ) : null}
                                            <Chip
                                                size="small"
                                                color={model.kind === 'person' ? 'secondary' : 'default'}
                                                variant="outlined"
                                                label={model.kind === 'person' ? 'person' : 'prop'}
                                            />
                                            {model.height > 0 ? (
                                                <Chip
                                                    size="small"
                                                    label={`Cao ${Number(model.height).toFixed(3)} m`}
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            ) : null}
                                            {materialCount > 0 ? (
                                                <Chip size="small" label={`${materialCount} material`} variant="outlined" />
                                            ) : null}
                                            {clipCount > 0 ? (
                                                <Chip size="small" label={`${clipCount} clip`} variant="outlined" />
                                            ) : null}
                                        </Stack>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                            {model.title || model.file_name || `#${model.id}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                            {model.file_name || model.model_url || 'Chưa có file'}
                                            {model.file_size ? ` · ${formatFileSize(model.file_size)}` : ''}
                                        </Typography>
                                        {model.description ? (
                                            <Typography
                                                variant="caption"
                                                color="text.disabled"
                                                sx={{ display: 'block', fontStyle: 'italic' }}
                                                noWrap
                                            >
                                                {model.description}
                                            </Typography>
                                        ) : null}
                                        {listPreview(model.materials, 3).length ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                                Material: {listPreview(model.materials, 3).join(', ')}
                                                {materialCount > 3 ? '…' : ''}
                                            </Typography>
                                        ) : null}
                                        {clipLabels.length ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                                Clip: {clipLabels.slice(0, 4).join(', ')}
                                                {clipCount > 4 ? '…' : ''}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                        <Tooltip title="Sửa">
                                            <IconButton size="small" onClick={() => openEditForm(model)}>
                                                <EditOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa">
                                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(model)}>
                                                <DeleteOutlineOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Box>
                ) : null}
            </DrawerCustom>
            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => (deleting ? null : setDeleteTarget(null))}
            >
                <DialogTitle>Xóa model 3D?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa model "{deleteTarget?.title || deleteTarget?.file_name || ''}" khỏi thư viện?
                        Hành động không thể hoàn tác.
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
                open={bulkDeleteOpen}
                onClose={() => (bulkDeleting ? null : setBulkDeleteOpen(false))}
            >
                <DialogTitle>Xóa {selectedIds.length} model đã chọn?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa {selectedIds.length} model 3D khỏi thư viện? Hành động không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
                        Hủy
                    </Button>
                    <Button color="error" variant="contained" onClick={handleBulkDelete} disabled={bulkDeleting}>
                        {bulkDeleting ? <CircularProgress size={16} color="inherit" /> : null}
                        Xóa {selectedIds.length} model
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
