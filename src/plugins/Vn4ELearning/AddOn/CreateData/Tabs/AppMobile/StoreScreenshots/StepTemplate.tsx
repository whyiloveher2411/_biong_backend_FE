import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Card,
    CardActionArea,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import StoreScreenshotColorField from './StoreScreenshotColorField';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LoadingButton from 'components/atoms/LoadingButton';
import type { StoreScreenshotConfig, StoreScreenshotTarget } from './storeScreenshotTypes';
import { saveStoreScreenshotTemplate } from './storeScreenshotApi';
import {
    BACKGROUND_OPTIONS,
    buildTemplateStylePayload,
    DEVICE_FRAME_OPTIONS,
    FONT_FAMILY_OPTIONS,
    getPresetDefaults,
    LAYOUT_OPTIONS,
    normalizeFontFamilyId,
    readTemplateStyleFromConfig,
    STYLE_PRESETS,
    type FontFamilyId,
    type StyleAdvancedFields,
    type StylePresetId,
    TYPOGRAPHY_OPTIONS,
} from './storeScreenshotStyleOptions';

type Props = {
    appMobileId: number;
    config: StoreScreenshotConfig;
    targets: Record<string, StoreScreenshotTarget>;
    onUpdated: (config: StoreScreenshotConfig) => void;
    onError: (message: string) => void;
};

function StepTemplate({ appMobileId, config, targets, onUpdated, onError }: Props) {
    const initialStyle = readTemplateStyleFromConfig(config.template);

    const [brandColor, setBrandColor] = React.useState(config.template.brand_color || '#1A73E8');
    const [fontFamily, setFontFamily] = React.useState<FontFamilyId>(
        normalizeFontFamilyId(config.template.font_family),
    );
    const [selectedTargets, setSelectedTargets] = React.useState<string[]>(
        config.template.targets?.length
            ? [...config.template.targets]
            : Object.keys(targets),
    );
    const [stylePreset, setStylePreset] = React.useState<StylePresetId>(initialStyle.presetId);
    const [advanced, setAdvanced] = React.useState<StyleAdvancedFields>(initialStyle.advanced);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        const style = readTemplateStyleFromConfig(config.template);
        setBrandColor(config.template.brand_color || '#1A73E8');
        setFontFamily(normalizeFontFamilyId(config.template.font_family));
        setSelectedTargets(
            config.template.targets?.length
                ? [...config.template.targets]
                : Object.keys(targets),
        );
        setStylePreset(style.presetId);
        setAdvanced(style.advanced);
    }, [config.template, targets]);

    const toggleTarget = (targetKey: string) => {
        setSelectedTargets((prev) => (
            prev.includes(targetKey)
                ? prev.filter((key) => key !== targetKey)
                : [...prev, targetKey]
        ));
    };

    const handlePresetChange = (presetId: StylePresetId) => {
        setStylePreset(presetId);
        setAdvanced(getPresetDefaults(presetId));
    };

    const updateAdvanced = <K extends keyof StyleAdvancedFields>(key: K, value: StyleAdvancedFields[K]) => {
        setAdvanced((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (selectedTargets.length === 0) {
            onError('Hãy chọn ít nhất 1 store target');
            return;
        }

        setSaving(true);
        try {
            const result = await saveStoreScreenshotTemplate(
                appMobileId,
                buildTemplateStylePayload(brandColor, fontFamily, selectedTargets, stylePreset, advanced),
            );
            onUpdated(result.config);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không lưu được template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                Cấu hình phong cách ảnh marketing, màu brand, font chữ và kích thước output. Font family độc lập với phong cách ảnh — dùng cho headline/subtitle trên ảnh AI.
            </Alert>

            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Phong cách ảnh</Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                        gap: 1.5,
                    }}
                >
                    {STYLE_PRESETS.map((preset) => {
                        const selected = stylePreset === preset.id;
                        return (
                            <Card
                                key={preset.id}
                                variant="outlined"
                                sx={{
                                    borderColor: selected ? 'primary.main' : 'divider',
                                    bgcolor: selected ? 'action.selected' : 'background.paper',
                                }}
                            >
                                <CardActionArea onClick={() => handlePresetChange(preset.id)}>
                                    <Box sx={{ p: 1.5 }}>
                                        <Typography variant="subtitle2">{preset.label}</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            {preset.description}
                                        </Typography>
                                    </Box>
                                </CardActionArea>
                            </Card>
                        );
                    })}
                </Box>
            </Box>

            <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Tùy chỉnh chi tiết</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel id="store-screenshot-background-label">Nền</InputLabel>
                            <Select
                                labelId="store-screenshot-background-label"
                                label="Nền"
                                value={advanced.background_mode}
                                onChange={(event) => updateAdvanced(
                                    'background_mode',
                                    event.target.value as StyleAdvancedFields['background_mode'],
                                )}
                            >
                                {BACKGROUND_OPTIONS.map((option) => (
                                    <MenuItem key={option.id} value={option.id}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>
                                {BACKGROUND_OPTIONS.find((opt) => opt.id === advanced.background_mode)?.helper}
                            </FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="store-screenshot-layout-label">Bố cục</InputLabel>
                            <Select
                                labelId="store-screenshot-layout-label"
                                label="Bố cục"
                                value={advanced.layout_style}
                                onChange={(event) => updateAdvanced(
                                    'layout_style',
                                    event.target.value as StyleAdvancedFields['layout_style'],
                                )}
                            >
                                {LAYOUT_OPTIONS.map((option) => (
                                    <MenuItem key={option.id} value={option.id}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>
                                {LAYOUT_OPTIONS.find((opt) => opt.id === advanced.layout_style)?.helper}
                            </FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="store-screenshot-device-frame-label">Khung máy</InputLabel>
                            <Select
                                labelId="store-screenshot-device-frame-label"
                                label="Khung máy"
                                value={advanced.device_frame_style}
                                onChange={(event) => updateAdvanced(
                                    'device_frame_style',
                                    event.target.value as StyleAdvancedFields['device_frame_style'],
                                )}
                            >
                                {DEVICE_FRAME_OPTIONS.map((option) => (
                                    <MenuItem key={option.id} value={option.id}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>
                                {DEVICE_FRAME_OPTIONS.find((opt) => opt.id === advanced.device_frame_style)?.helper}
                            </FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="store-screenshot-typography-label">Typography</InputLabel>
                            <Select
                                labelId="store-screenshot-typography-label"
                                label="Typography"
                                value={advanced.typography_style}
                                onChange={(event) => updateAdvanced(
                                    'typography_style',
                                    event.target.value as StyleAdvancedFields['typography_style'],
                                )}
                            >
                                {TYPOGRAPHY_OPTIONS.map((option) => (
                                    <MenuItem key={option.id} value={option.id}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>
                                {TYPOGRAPHY_OPTIONS.find((opt) => opt.id === advanced.typography_style)?.helper}
                            </FormHelperText>
                        </FormControl>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Thương hiệu</Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                >
                    <Box sx={{ minWidth: 220, flex: 1 }}>
                        <StoreScreenshotColorField
                            label="Màu brand"
                            value={brandColor}
                            onChange={setBrandColor}
                            note="Màu chủ đạo của thương hiệu — dùng cho accent, họa tiết và phối với màu nền từng ảnh."
                        />
                    </Box>
                    <FormControl sx={{ minWidth: 220, flex: 1 }}>
                        <InputLabel id="store-screenshot-font-family-label">Font family</InputLabel>
                        <Select
                            labelId="store-screenshot-font-family-label"
                            label="Font family"
                            value={fontFamily}
                            onChange={(event) => setFontFamily(event.target.value as FontFamilyId)}
                        >
                            {FONT_FAMILY_OPTIONS.map((option) => (
                                <MenuItem key={option.id} value={option.id}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>
                            {FONT_FAMILY_OPTIONS.find((opt) => opt.id === fontFamily)?.helper}
                        </FormHelperText>
                    </FormControl>
                </Stack>
            </Box>

            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Store target</Typography>
                <FormGroup>
                    {Object.entries(targets).map(([key, target]) => (
                        <FormControlLabel
                            key={key}
                            control={(
                                <Checkbox
                                    checked={selectedTargets.includes(key)}
                                    onChange={() => toggleTarget(key)}
                                />
                            )}
                            label={`${target.label} · ${target.width}×${target.height}`}
                        />
                    ))}
                </FormGroup>
            </Box>

            <Box>
                <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
                    Lưu template
                </LoadingButton>
            </Box>
        </Stack>
    );
}

export default StepTemplate;
