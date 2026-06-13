import React from 'react';
import { Stack, Tooltip } from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    removeStoreScreenshotGeminiLogo,
    restoreStoreScreenshotGeminiLogoOriginal,
} from './storeScreenshotApi';
import type {
    StoreScreenshotConfig,
    StoreScreenshotGeminiRemoverStatus,
    StoreScreenshotProjectResponse,
} from './storeScreenshotTypes';
import type { GeminiLogoRegionsById } from './storeScreenshotGeminiLogoRegion';
import {
    buildGeminiLogoRegionPayload,
    countGeminiLogoRegions,
    normalizeGeminiLogoRegion,
} from './storeScreenshotGeminiLogoRegion';

type Props = {
    appMobileId: number;
    config: StoreScreenshotConfig;
    geminiRemover?: StoreScreenshotGeminiRemoverStatus;
    regionsById: GeminiLogoRegionsById;
    onProjectRefreshed: (result: StoreScreenshotProjectResponse) => void;
    onRegionsCleared: (screenshotIds: string[]) => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
};

function countRemovableWithRegion(
    config: StoreScreenshotConfig,
    regionsById: GeminiLogoRegionsById,
): number {
    return (config.screenshots || []).filter((item) => {
        const hasImage = String(item.ai_image_url || '').trim() !== '';
        const hasRegion = Boolean(normalizeGeminiLogoRegion(regionsById[item.id]));
        return hasImage && !item.gemini_logo_removed && hasRegion;
    }).length;
}

function countRestorable(config: StoreScreenshotConfig): number {
    return (config.screenshots || []).filter((item) => (
        Boolean(item.gemini_logo_removed)
        && String(item.ai_image_original_url || '').trim() !== ''
    )).length;
}

function StepPreviewToolbar({
    appMobileId,
    config,
    geminiRemover,
    regionsById,
    onProjectRefreshed,
    onRegionsCleared,
    onError,
    onSuccess,
}: Props) {
    const [removing, setRemoving] = React.useState(false);
    const [restoring, setRestoring] = React.useState(false);

    const removableWithRegionCount = countRemovableWithRegion(config, regionsById);
    const restorableCount = countRestorable(config);
    const selectedRegionCount = countGeminiLogoRegions(regionsById);
    const removerReady = geminiRemover?.ready ?? false;
    const removerMessage = String(geminiRemover?.message || '').trim();

    const handleRemove = async () => {
        const regionPayload = buildGeminiLogoRegionPayload(regionsById);
        if (regionPayload.length === 0) {
            onError('Chưa chọn vùng logo trên ảnh nào');
            return;
        }

        const confirmMessage = `Xóa logo Gemini trên ${regionPayload.length} ảnh đã chọn vùng? Ảnh chưa chọn vùng sẽ không bị thay đổi. Ảnh gốc được lưu backup để khôi phục sau.`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setRemoving(true);
        try {
            const result = await removeStoreScreenshotGeminiLogo(appMobileId, {
                regions: regionPayload,
                screenshotIds: regionPayload.map((row) => row.screenshot_id),
            });
            onProjectRefreshed(result);
            const processed = Number(result.processed || 0);
            const clearedIds = (result.results || [])
                .map((row) => String(row.screenshot_id || '').trim())
                .filter(Boolean);
            if (clearedIds.length > 0) {
                onRegionsCleared(clearedIds);
            }
            onSuccess(processed > 0
                ? `Đã xóa logo Gemini trên ${processed} ảnh đã chọn`
                : 'Đã xử lý ảnh đã chọn');
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không xóa được logo Gemini');
        } finally {
            setRemoving(false);
        }
    };

    const handleRestore = async () => {
        if (!window.confirm('Lấy lại ảnh gốc có logo Gemini cho tất cả ảnh đã xóa logo?')) {
            return;
        }

        setRestoring(true);
        try {
            const result = await restoreStoreScreenshotGeminiLogoOriginal(appMobileId);
            onProjectRefreshed(result);
            const processed = Number(result.processed || 0);
            onSuccess(processed > 0
                ? `Đã khôi phục ${processed} ảnh gốc`
                : 'Đã khôi phục ảnh gốc');
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không khôi phục được ảnh gốc');
        } finally {
            setRestoring(false);
        }
    };

    const removeDisabled = !removerReady
        || selectedRegionCount === 0
        || removableWithRegionCount === 0
        || removing
        || restoring;
    const restoreDisabled = restorableCount === 0 || removing || restoring;

    const removeTooltip = !removerReady
        ? (removerMessage || 'Chưa cấu hình Gemini watermark remover trên server này')
        : selectedRegionCount === 0
            ? 'Chọn vùng logo trên ảnh trước khi xóa'
            : removableWithRegionCount === 0
                ? 'Tất cả ảnh đã chọn vùng đều đã xóa logo'
                : `Sẽ xóa logo trên ${removableWithRegionCount} ảnh đã chọn vùng`;

    return (
        <Stack direction="row" spacing={1} flexShrink={0}>
            <Tooltip title={removeTooltip}>
                <span>
                    <LoadingButton
                        size="small"
                        variant="contained"
                        loading={removing}
                        disabled={removeDisabled}
                        onClick={handleRemove}
                    >
                        Xóa logo Gemini
                    </LoadingButton>
                </span>
            </Tooltip>
            <LoadingButton
                size="small"
                variant="outlined"
                loading={restoring}
                disabled={restoreDisabled}
                onClick={handleRestore}
            >
                Lấy lại ảnh gốc
            </LoadingButton>
        </Stack>
    );
}

export default StepPreviewToolbar;
