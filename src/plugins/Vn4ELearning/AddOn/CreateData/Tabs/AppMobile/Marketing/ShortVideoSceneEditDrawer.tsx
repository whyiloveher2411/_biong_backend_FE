import React from 'react';
import { Alert, Box, Chip, Typography } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import DrawerCustom from 'components/molecules/DrawerCustom';
import type {
    ShortVideoManifestSceneLayout,
    ShortVideoRenderManifest,
} from 'helpers/shortVideoRenderManifest';
import ShortVideoSceneEditPanel, { HEADER_BUTTON_SX } from './ShortVideoSceneEditPanel';

type Props = {
    open: boolean;
    onClose: () => void;
    sceneId: string;
    manifest: ShortVideoRenderManifest | null;
    manifestLoading: boolean;
    manifestError: string;
    manifestInfo: string;
    saving: boolean;
    refreshing: boolean;
    dirty: boolean;
    onSceneLayoutChange: (
        sceneId: string,
        patch: Partial<ShortVideoManifestSceneLayout>
    ) => void;
    onResetLayoutGroup: (
        sceneId: string,
        keys: (keyof ShortVideoManifestSceneLayout)[]
    ) => void;
    onSave: () => void;
    onRefresh: () => void;
};

export default function ShortVideoSceneEditDrawer({
    open,
    onClose,
    sceneId,
    manifest,
    manifestLoading,
    manifestError,
    manifestInfo,
    saving,
    refreshing,
    dirty,
    onSceneLayoutChange,
    onResetLayoutGroup,
    onSave,
    onRefresh,
}: Props) {
    const sceneLabel = sceneId.trim() || '—';

    const headerAction = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {dirty ? (
                <Chip
                    label="Chưa lưu"
                    size="small"
                    sx={{
                        bgcolor: 'warning.main',
                        color: 'warning.contrastText',
                        fontWeight: 500,
                    }}
                />
            ) : null}
            <LoadingButton
                size="small"
                variant="contained"
                loading={refreshing}
                disabled={saving || refreshing}
                onClick={onRefresh}
                sx={HEADER_BUTTON_SX}
            >
                Làm mới manifest
            </LoadingButton>
            <LoadingButton
                size="small"
                variant="contained"
                color="success"
                loading={saving}
                disabled={!dirty || saving || refreshing}
                onClick={onSave}
                sx={HEADER_BUTTON_SX}
            >
                Lưu manifest
            </LoadingButton>
        </Box>
    );

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title={`Chỉnh scene ${sceneLabel}`}
            width={700}
            headerAction={headerAction}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    p: 0,
                    bgcolor: 'background.default',
                    overflowY: 'auto',
                },
            }}
        >
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {manifestError && (
                    <Alert severity="error">{manifestError}</Alert>
                )}
                {manifestInfo && !manifestError && (
                    <Alert severity="info">{manifestInfo}</Alert>
                )}
                {manifestLoading ? (
                    <Typography variant="body2" color="text.secondary">
                        Đang tải manifest…
                    </Typography>
                ) : manifest ? (
                    <ShortVideoSceneEditPanel
                        manifest={manifest}
                        selectedSceneId={sceneId}
                        onSceneLayoutChange={onSceneLayoutChange}
                        onResetLayoutGroup={onResetLayoutGroup}
                    />
                ) : (
                    <Alert severity="warning">
                        Chưa có manifest preview — cần script và audio đầy đủ mọi scene
                    </Alert>
                )}
            </Box>
        </DrawerCustom>
    );
}
