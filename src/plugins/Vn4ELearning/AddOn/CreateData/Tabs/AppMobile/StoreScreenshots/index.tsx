import React from 'react';
import {
    Alert,
    Box,
    Chip,
    Grid,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ShortTextOutlinedIcon from '@mui/icons-material/ShortTextOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import StepMetadata from './StepMetadata';
import StepUpload from './StepUpload';
import StepMapping from './StepMapping';
import StepTemplate from './StepTemplate';
import StepPreview from './StepPreview';
import StepExport from './StepExport';
import {
    DEFAULT_STORE_METADATA,
    DEFAULT_STORE_SCREENSHOT_CONFIG,
    normalizeStoreScreenshotStepId,
    STORE_SCREENSHOT_STEPS,
} from './storeScreenshotConstants';
import type {
    StoreMetadata,
    StoreScreenshotConfig,
    StoreScreenshotTarget,
} from './storeScreenshotTypes';
import { fetchStoreScreenshotProject, saveStoreScreenshotActiveStep } from './storeScreenshotApi';

type Props = {
    data: CreatePostTypeData;
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Nháp',
    metadata_saved: 'Đã lưu metadata',
    screenshots_uploaded: 'Đã upload screenshot',
    template_saved: 'Đã lưu template',
    ai_content_saved: 'Đã lưu prompt AI',
    ai_images_ready: 'Đã có ảnh AI',
    mapping_ready: 'Sẵn sàng mapping',
    generating: 'Đang tạo ảnh',
    generated: 'Đã tạo ảnh',
    exported: 'Đã export',
    stale: 'Cần tạo lại',
};

const STEP_ICONS: Record<string, React.ReactNode> = {
    metadata: <DescriptionOutlinedIcon fontSize="small" />,
    upload: <CloudUploadOutlinedIcon fontSize="small" />,
    template: <PaletteOutlinedIcon fontSize="small" />,
    mapping: <ShortTextOutlinedIcon fontSize="small" />,
    preview: <PreviewOutlinedIcon fontSize="small" />,
    export: <ArchiveOutlinedIcon fontSize="small" />,
};

function StoreScreenshots({ data }: Props) {
    const appMobileId = Number(data.post.id || 0);
    const { showMessage } = useFloatingMessages();
    const [activeStepId, setActiveStepId] = React.useState<string>(
        () => normalizeStoreScreenshotStepId(DEFAULT_STORE_SCREENSHOT_CONFIG.active_step_id),
    );
    const [loading, setLoading] = React.useState(true);
    const [config, setConfig] = React.useState<StoreScreenshotConfig>(DEFAULT_STORE_SCREENSHOT_CONFIG);
    const [storeMetadata, setStoreMetadata] = React.useState<StoreMetadata>(DEFAULT_STORE_METADATA);
    const [targets, setTargets] = React.useState<Record<string, StoreScreenshotTarget>>({});
    const [appLogoUrl, setAppLogoUrl] = React.useState('');

    const showMessageRef = React.useRef(showMessage);
    showMessageRef.current = showMessage;

    React.useEffect(() => {
        if (!appMobileId) {
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        setLoading(true);

        fetchStoreScreenshotProject(appMobileId)
            .then((result) => {
                if (cancelled) {
                    return;
                }
                const nextConfig = result.config || DEFAULT_STORE_SCREENSHOT_CONFIG;
                setConfig(nextConfig);
                setStoreMetadata(result.store_metadata || DEFAULT_STORE_METADATA);
                setTargets(result.targets || {});
                setAppLogoUrl(String(result.app?.logo || ''));
                setActiveStepId(normalizeStoreScreenshotStepId(nextConfig.active_step_id));
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }
                showMessageRef.current(
                    error instanceof Error ? error.message : 'Không tải được project',
                    'error',
                );
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [appMobileId]);

    const handleConfigUpdated = (nextConfig: StoreScreenshotConfig, nextStoreMetadata?: StoreMetadata) => {
        setConfig(nextConfig);
        if (nextStoreMetadata) {
            setStoreMetadata(nextStoreMetadata);
        }
    };

    const handleError = (message: string) => {
        showMessage(message, 'error');
    };

    const persistActiveStep = React.useCallback((stepId: string) => {
        const safeStepId = normalizeStoreScreenshotStepId(stepId);
        setActiveStepId(safeStepId);
        setConfig((prev) => ({
            ...prev,
            active_step_id: safeStepId,
        }));

        if (!appMobileId) {
            return;
        }

        saveStoreScreenshotActiveStep(appMobileId, safeStepId).catch((error) => {
            showMessageRef.current(
                error instanceof Error ? error.message : 'Không lưu được bước hiện tại',
                'error',
            );
        });
    }, [appMobileId]);

    const activeStep = STORE_SCREENSHOT_STEPS.find((step) => step.id === activeStepId)
        ?? STORE_SCREENSHOT_STEPS[0];

    const renderStepContent = () => {
        switch (activeStepId) {
            case 'metadata':
                return (
                    <StepMetadata
                        appMobileId={appMobileId}
                        appTitle={String(data.post.title || '')}
                        storeMetadata={storeMetadata}
                        onSaved={handleConfigUpdated}
                        onError={handleError}
                    />
                );
            case 'upload':
                return (
                    <StepUpload
                        appMobileId={appMobileId}
                        config={config}
                        onUpdated={handleConfigUpdated}
                        onError={handleError}
                    />
                );
            case 'template':
                return (
                    <StepTemplate
                        appMobileId={appMobileId}
                        config={config}
                        targets={targets}
                        onUpdated={handleConfigUpdated}
                        onError={handleError}
                    />
                );
            case 'mapping':
                return (
                    <StepMapping
                        appMobileId={appMobileId}
                        appTitle={String(data.post.title || '')}
                        appLogoUrl={appLogoUrl}
                        storeMetadata={storeMetadata}
                        config={config}
                        targets={targets}
                        onUpdated={handleConfigUpdated}
                        onError={handleError}
                    />
                );
            case 'preview':
                return (
                    <StepPreview config={config} />
                );
            case 'export':
                return (
                    <StepExport
                        appMobileId={appMobileId}
                        config={config}
                        storeMetadata={storeMetadata}
                        onUpdated={handleConfigUpdated}
                        onError={handleError}
                    />
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <Alert severity="info">Đang tải project Store screenshots...</Alert>;
    }

    return (
        <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant="h5">Store screenshots</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tạo ảnh listing cho App Store và Google Play bằng workflow AI: prompt, upload và export.
                    </Typography>
                </Box>
                <Chip
                    label={STATUS_LABELS[config.status] || config.status}
                    color={config.status === 'stale' ? 'warning' : 'default'}
                />
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 1,
                            bgcolor: 'background.paper',
                        }}
                    >
                        <List disablePadding>
                            {STORE_SCREENSHOT_STEPS.map((step, stepIndex) => {
                                const isSelected = activeStepId === step.id;
                                return (
                                    <ListItem key={step.id} disablePadding>
                                        <ListItemButton
                                            selected={isSelected}
                                            onClick={() => persistActiveStep(step.id)}
                                            sx={{
                                                borderRadius: 1,
                                                mb: 0.5,
                                                alignItems: 'flex-start',
                                                '&.Mui-selected': {
                                                    bgcolor: 'primary.main',
                                                    color: 'primary.contrastText',
                                                    '&:hover': {
                                                        bgcolor: 'primary.dark',
                                                    },
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 1,
                                                    mr: 1.5,
                                                    mt: 0.25,
                                                    flexShrink: 0,
                                                    bgcolor: isSelected
                                                        ? 'rgba(255,255,255,0.2)'
                                                        : 'action.hover',
                                                    color: isSelected ? 'inherit' : 'text.secondary',
                                                }}
                                            >
                                                {STEP_ICONS[step.id]}
                                            </Box>
                                            <ListItemText
                                                primary={`Bước ${stepIndex + 1}: ${step.label}`}
                                                secondary={step.description}
                                                primaryTypographyProps={{
                                                    fontWeight: 600,
                                                    color: isSelected ? 'inherit' : 'text.primary',
                                                }}
                                                secondaryTypographyProps={{
                                                    color: isSelected ? 'rgba(255,255,255,0.75)' : 'text.secondary',
                                                }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                </Grid>

                <Grid item xs={12} md={9}>
                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: { xs: 2, md: 3 },
                            bgcolor: 'background.paper',
                            minHeight: 420,
                        }}
                    >
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="h6">
                                Bước {(STORE_SCREENSHOT_STEPS.findIndex((step) => step.id === activeStepId) + 1) || 1}: {activeStep.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {activeStep.description}
                            </Typography>
                        </Box>
                        {renderStepContent()}
                    </Box>
                </Grid>
            </Grid>
        </Stack>
    );
}

export default StoreScreenshots;
