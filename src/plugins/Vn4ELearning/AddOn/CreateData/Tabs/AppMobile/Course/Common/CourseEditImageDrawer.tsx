import React, { useState, useEffect } from 'react';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    Box,
    TextField,
    Button,
    FormControl,
    FormLabel,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    OutlinedInput,
    Chip,
    Grid,
    SelectChangeEvent,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import FieldForm from 'components/atoms/fields/FieldForm';
import useAjax from 'hook/useApi';
import { ImageObjectProps } from 'helpers/image';
import { validURL, convertToURL } from 'helpers/url';
import EditIcon from '@mui/icons-material/Edit';
import {
    STYLE_PRESETS,
    MODEL_ID_OPTIONS,
    IMAGE_TYPE_OPTIONS,
    INFOGRAPHIC_LAYOUT_OPTIONS,
    INFOGRAPHIC_STRUCTURE_OPTIONS,
    INFOGRAPHIC_COLOR_OPTIONS,
    ART_STYLE_OPTIONS,
    LIGHTING_OPTIONS,
    MOOD_OPTIONS,
    CAMERA_ANGLE_OPTIONS,
    LENS_OPTIONS,
    COLOR_PALETTE_OPTIONS,
    SUBJECT_OPTIONS,
    ERA_OPTIONS,
    BACKGROUND_OPTIONS,
    ASPECT_RATIO_OPTIONS,
    QUALITY_OPTIONS,
    NEGATIVE_PROMPT_OPTIONS,
    buildImageTypeAdd,
    imageTypeAddToPromptString,
    buildPrompt,
    getOptionLabel,
} from 'components/atoms/fields/image/GenerateImageAiDrawer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

interface CourseEditImageDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (imageUrl: string) => void;
    onJobQueued?: (jobId: number) => void;
    initialPrompt?: string;
    initialDescription?: string;
    initialImageType?: string;
    imageId?: number | string;
}

const COURSE_GENERATE_IMAGE_API = 'plugin/vn4-e-learning/app-mobile/course-new/ai/generate-image';

export default function CourseEditImageDrawer({
    open,
    onClose,
    onSuccess,
    onJobQueued,
    initialPrompt = '',
    initialDescription = '',
    initialImageType,
    imageId,
}: CourseEditImageDrawerProps) {
    const api = useAjax();
    const [modelId, setModelId] = useState('z-image');
    const [prompt, setPrompt] = useState('');
    const [imageType, setImageType] = useState('general_art');
    const [artStyle, setArtStyle] = useState('');
    const [lighting, setLighting] = useState('');
    const [mood, setMood] = useState('');
    const [cameraAngle, setCameraAngle] = useState('');
    const [lens, setLens] = useState('');
    const [colorPalette, setColorPalette] = useState('');
    const [subject, setSubject] = useState('');
    const [era, setEra] = useState('');
    const [background, setBackground] = useState('');
    const [infographicLayout, setInfographicLayout] = useState('');
    const [infographicStructure, setInfographicStructure] = useState('');
    const [infographicColor, setInfographicColor] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [quality, setQuality] = useState('512');
    const [negativePrompts, setNegativePrompts] = useState<string[]>([]);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [referenceImagePost, setReferenceImagePost] = useState<{ reference_image?: ImageObjectProps | null }>({ reference_image: null });
    const [loading, setLoading] = useState(false);

    const isInfographicType = imageType === 'infographic' || imageType === 'mindmap_diagram';

    useEffect(() => {
        if (open) {
            setPrompt(initialPrompt || '');
            if (initialImageType) {
                const matchingPreset = STYLE_PRESETS.find((p) => p.values.imageType === initialImageType);
                if (matchingPreset) {
                    const v = matchingPreset.values;
                    setSelectedPreset(matchingPreset.id);
                    setImageType(v.imageType);
                    setArtStyle(v.artStyle);
                    setLighting(v.lighting);
                    setMood(v.mood);
                    setCameraAngle(v.cameraAngle);
                    setLens(v.lens);
                    setColorPalette(v.colorPalette);
                    setSubject(v.subject);
                    setEra(v.era);
                    setBackground(v.background);
                    setInfographicLayout(v.infographicLayout);
                    setInfographicStructure(v.infographicStructure);
                    setInfographicColor(v.infographicColor);
                    setAspectRatio(v.aspectRatio);
                    setQuality(v.quality);
                    setNegativePrompts(v.negativePrompts ?? []);
                } else {
                    setSelectedPreset('');
                    setImageType(initialImageType);
                }
            } else {
                setSelectedPreset('');
            }
        }
    }, [open, initialPrompt, initialImageType]);

    const handleApplyPreset = (presetId: string) => {
        setSelectedPreset(presetId);
        if (!presetId) return;
        const preset = STYLE_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        const v = preset.values;
        setImageType(v.imageType);
        setArtStyle(v.artStyle);
        setLighting(v.lighting);
        setMood(v.mood);
        setCameraAngle(v.cameraAngle);
        setLens(v.lens);
        setColorPalette(v.colorPalette);
        setSubject(v.subject);
        setEra(v.era);
        setBackground(v.background);
        setInfographicLayout(v.infographicLayout);
        setInfographicStructure(v.infographicStructure);
        setInfographicColor(v.infographicColor);
        setAspectRatio(v.aspectRatio);
        setQuality(v.quality);
        setNegativePrompts(v.negativePrompts || []);
    };

    const handleSubmit = () => {
        if (!prompt.trim()) {
            api.showMessage('Vui lòng nhập mô tả hình ảnh (Prompt)', 'error');
            return;
        }

        const imageTypeAdd = buildImageTypeAdd(imageType, {
            infographic_layout: infographicLayout,
            infographic_structure: infographicStructure,
            infographic_color: infographicColor,
        });

        const { prompt: fullPrompt, negativePrompt } = buildPrompt(
            prompt,
            imageType,
            artStyle,
            lighting,
            mood,
            cameraAngle,
            lens,
            colorPalette,
            subject,
            era,
            background,
            imageTypeAdd,
            aspectRatio,
            quality,
            negativePrompts
        );

        const refImg = referenceImagePost?.reference_image;
        const referenceImage = refImg?.link
            ? (validURL(refImg.link) ? refImg.link : convertToURL(process.env.REACT_APP_BASE_URL, refImg.link))
            : undefined;

        setLoading(true);
        api.ajax({
            url: COURSE_GENERATE_IMAGE_API,
            method: 'POST',
            data: {
                model_id: modelId,
                prompt: fullPrompt,
                description: initialDescription || prompt,
                image_id: imageId,
                negative_prompt: negativePrompt,
                aspect_ratio: aspectRatio,
                quality,
                reference_image: referenceImage,
                image_type: getOptionLabel(IMAGE_TYPE_OPTIONS, imageType) || imageType,
                image_type_add: imageTypeAddToPromptString(imageTypeAdd),
                art_style: artStyle,
                lighting,
                mood,
                camera_angle: cameraAngle,
                lens,
                color_palette: colorPalette,
                subject,
                era,
                background,
                prompt_raw: prompt,
            },
            success: (result: ANY) => {
                setLoading(false);
                // API dùng queue: trả về job_id, không có image_url
                if (result.job_id != null) {
                    onJobQueued?.(Number(result.job_id));
                    onClose();
                    return;
                }
                const imageUrl = result.image_url || result.src || result.data?.src || result.data?.image_url || result.link;
                if (imageUrl) {
                    let link = imageUrl;
                    if (!validURL(imageUrl)) {
                        link = (link || '').replace(process.env.REACT_APP_BASE_URL ?? '', '/');
                    }
                    onSuccess(link.replace(/^\/\//, '/'));
                    onClose();
                } else {
                    api.showMessage('Không nhận được hình ảnh từ AI', 'error');
                }
            },
            error: () => {
                setLoading(false);
            },
        });
    };

    const handleReset = () => {
        setSelectedPreset('');
        setModelId('z-image');
        setReferenceImagePost({ reference_image: null });
        setPrompt(initialPrompt || '');
        setImageType('general_art');
        setArtStyle('');
        setLighting('');
        setMood('');
        setCameraAngle('');
        setLens('');
        setColorPalette('');
        setSubject('');
        setEra('');
        setBackground('');
        setInfographicLayout('');
        setInfographicStructure('');
        setInfographicColor('');
        setAspectRatio('1:1');
        setQuality('512');
        setNegativePrompts([]);
    };

    return (
        <DrawerCustom
            title="Chỉnh sửa hình ảnh AI"
            open={open}
            onClose={onClose}
            width={700}
            headerAction={
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Model</InputLabel>
                    <Select
                        value={modelId}
                        label="Model"
                        onChange={(e: SelectChangeEvent<string>) => setModelId(e.target.value)}
                        sx={{ color: 'inherit', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }, '& .MuiSvgIcon-root': { color: 'inherit' } }}
                    >
                        {MODEL_ID_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 2, pt: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Chọn nhanh style</InputLabel>
                    <Select
                        value={selectedPreset}
                        label="Chọn nhanh style"
                        onChange={(e: SelectChangeEvent<string>) => handleApplyPreset(e.target.value)}
                    >
                        <MenuItem value=""><em>Tuỳ chỉnh thủ công</em></MenuItem>
                        {STYLE_PRESETS.map((preset) => (
                            <MenuItem key={preset.id} value={preset.id}>{preset.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1 }}>Nội dung chính (Prompt)</FormLabel>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Mô tả chi tiết hình ảnh bạn muốn tạo..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        variant="outlined"
                    />
                </FormControl>

                <FieldForm
                    component="image"
                    config={{
                        title: 'Ảnh tham khảo (Reference Image)',
                        disableGenerateAi: true,
                        note: 'Chọn ảnh để AI tham khảo phong cách, bố cục...',
                    }}
                    post={referenceImagePost}
                    name="reference_image"
                    onReview={(value) => setReferenceImagePost((prev) => ({ ...prev, reference_image: value }))}
                />

                <FormControl fullWidth size="small">
                    <InputLabel>Loại hình ảnh (Image Type)</InputLabel>
                    <Select
                        value={imageType}
                        label="Loại hình ảnh (Image Type)"
                        onChange={(e: SelectChangeEvent<string>) => {
                            const val = e.target.value;
                            setImageType(val);
                            if (val !== 'infographic' && val !== 'mindmap_diagram') {
                                setInfographicLayout('');
                                setInfographicStructure('');
                                setInfographicColor('');
                            }
                        }}
                    >
                        {IMAGE_TYPE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {isInfographicType && (
                    <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Phong cách trình bày (Layout Style)</InputLabel>
                            <Select
                                value={infographicLayout}
                                label="Phong cách trình bày (Layout Style)"
                                onChange={(e: SelectChangeEvent<string>) => setInfographicLayout(e.target.value)}
                            >
                                <MenuItem value=""><em>Không chọn</em></MenuItem>
                                {INFOGRAPHIC_LAYOUT_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Cấu trúc thông tin (Structure)</InputLabel>
                            <Select
                                value={infographicStructure}
                                label="Cấu trúc thông tin (Structure)"
                                onChange={(e: SelectChangeEvent<string>) => setInfographicStructure(e.target.value)}
                            >
                                <MenuItem value=""><em>Không chọn</em></MenuItem>
                                {INFOGRAPHIC_STRUCTURE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Bảng màu Infographic</InputLabel>
                            <Select
                                value={infographicColor}
                                label="Bảng màu Infographic"
                                onChange={(e: SelectChangeEvent<string>) => setInfographicColor(e.target.value)}
                            >
                                <MenuItem value=""><em>Không chọn</em></MenuItem>
                                {INFOGRAPHIC_COLOR_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                <FormControl fullWidth size="small">
                    <Autocomplete
                        size="small"
                        options={ART_STYLE_OPTIONS}
                        groupBy={(option) => option.group}
                        getOptionLabel={(option) => option.label}
                        value={ART_STYLE_OPTIONS.find((o) => o.value === artStyle) || null}
                        onChange={(_, newValue) => setArtStyle(newValue?.value ?? '')}
                        renderInput={(params) => (
                            <TextField {...params} label="Phong cách nghệ thuật (Art Style)" />
                        )}
                        isOptionEqualToValue={(option, value) => option.value === value?.value}
                    />
                </FormControl>

                {!isInfographicType && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Ánh sáng</InputLabel>
                                <Select value={lighting} label="Ánh sáng" onChange={(e: SelectChangeEvent<string>) => setLighting(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {LIGHTING_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tâm trạng</InputLabel>
                                <Select value={mood} label="Tâm trạng" onChange={(e: SelectChangeEvent<string>) => setMood(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {MOOD_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                )}

                {!isInfographicType && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Góc máy</InputLabel>
                                <Select value={cameraAngle} label="Góc máy" onChange={(e: SelectChangeEvent<string>) => setCameraAngle(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {CAMERA_ANGLE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Ống kính</InputLabel>
                                <Select value={lens} label="Ống kính" onChange={(e: SelectChangeEvent<string>) => setLens(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {LENS_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                )}

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Bảng màu (Color Palette)</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {COLOR_PALETTE_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={colorPalette === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setColorPalette(colorPalette === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Chủ đề / Đối tượng</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {SUBJECT_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={subject === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setSubject(subject === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                </Grid>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Thời đại / Phong cách</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {ERA_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={era === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setEra(era === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Nền / Background</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {BACKGROUND_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={background === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setBackground(background === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                </Grid>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Tỷ lệ khung hình (Aspect Ratio)</InputLabel>
                            <Select value={aspectRatio} label="Tỷ lệ khung hình (Aspect Ratio)" onChange={(e: SelectChangeEvent<string>) => setAspectRatio(e.target.value)}>
                                {ASPECT_RATIO_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Độ chi tiết (Quality)</InputLabel>
                            <Select value={quality} label="Độ chi tiết (Quality)" onChange={(e: SelectChangeEvent<string>) => setQuality(e.target.value)}>
                                {QUALITY_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <FormControl fullWidth size="small">
                    <InputLabel>Bộ lọc loại bỏ (Negative Prompt)</InputLabel>
                    <Select
                        multiple
                        value={negativePrompts}
                        label="Bộ lọc loại bỏ (Negative Prompt)"
                        onChange={(e: SelectChangeEvent<string[]>) => setNegativePrompts(e.target.value as string[])}
                        input={<OutlinedInput label="Bộ lọc loại bỏ (Negative Prompt)" />}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip
                                        key={value}
                                        label={NEGATIVE_PROMPT_OPTIONS.find((o) => o.value === value)?.label || value}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        )}
                        MenuProps={{
                            PaperProps: { style: { maxHeight: 300 } },
                            autoFocus: false,
                        }}
                    >
                        {NEGATIVE_PROMPT_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}>
                    <Button variant="outlined" onClick={handleReset} sx={{ textTransform: 'none' }}>
                        Đặt lại
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
                            Hủy
                        </Button>
                        <LoadingButton
                            variant="contained"
                            onClick={handleSubmit}
                            loading={loading}
                            startIcon={<EditIcon fontSize="small" />}
                            sx={{ textTransform: 'none' }}
                        >
                            Tạo hình ảnh
                        </LoadingButton>
                    </Box>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
