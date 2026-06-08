import React from 'react';
import {
    Alert,
    Box,
    Link,
    Stack,
    Typography,
} from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import type { StoreMetadata, StoreScreenshotConfig } from './storeScreenshotTypes';
import { exportStoreScreenshots } from './storeScreenshotApi';

type Props = {
    appMobileId: number;
    config: StoreScreenshotConfig;
    storeMetadata: StoreMetadata;
    onUpdated: (config: StoreScreenshotConfig, storeMetadata?: StoreMetadata) => void;
    onError: (message: string) => void;
};

function StepExport({ appMobileId, config, storeMetadata, onUpdated, onError }: Props) {
    const [exporting, setExporting] = React.useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const result = await exportStoreScreenshots(appMobileId);
            onUpdated(result.config, result.store_metadata);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Export zip thất bại');
        } finally {
            setExporting(false);
        }
    };

    const exportUrl = config.export?.last_export_url || '';
    const rawLength = storeMetadata.raw_text?.length || 0;
    const screenshotCount = config.screenshots?.length || 0;
    const generatedCount = (config.screenshots || []).filter(
        (item) => String(item.ai_image_url || '').trim() !== '',
    ).length;

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                Export zip gồm store metadata và ảnh AI đã upload theo từng store target.
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">Store metadata: {rawLength} ký tự</Typography>
                <Typography variant="body2">Screenshot thô: {screenshotCount}</Typography>
                <Typography variant="body2">Ảnh AI đã upload: {generatedCount}</Typography>
                {config.export?.last_export_at ? (
                    <Typography variant="body2">
                        Lần export gần nhất: {new Date(config.export.last_export_at).toLocaleString()}
                    </Typography>
                ) : null}
            </Box>

            <Box>
                <LoadingButton
                    variant="contained"
                    loading={exporting}
                    onClick={handleExport}
                    disabled={generatedCount === 0}
                >
                    Tải bộ ảnh (.zip)
                </LoadingButton>
            </Box>

            {exportUrl ? (
                <Alert severity="success">
                    <Link href={exportUrl} target="_blank" rel="noopener noreferrer">
                        Tải file zip đã export
                    </Link>
                </Alert>
            ) : null}
        </Stack>
    );
}

export default StepExport;
