import React from 'react';
import Settings from '@mui/icons-material/Settings';
import LoadingButton from '@mui/lab/LoadingButton';
import { Box, Typography } from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifestTypes';
import {
    SHORT_VIDEO_RENDER_TEMPLATES,
    type ShortVideoTemplateApplyMode,
} from 'helpers/shortVideoRenderTemplates';
import { HEADER_BUTTON_SX } from './ShortVideoSceneEditPanel';

type Props = {
    open: boolean;
    onClose: () => void;
    manifest: ShortVideoRenderManifest;
    saving: boolean;
    onApplyAndSave: (
        templateId: string,
        mode: ShortVideoTemplateApplyMode
    ) => void | Promise<void>;
};

function TemplatePreviewSwatch({
    bg,
    text,
    active,
    selected,
    onClick,
    label,
    description,
}: {
    bg: string;
    text: string;
    active: string;
    selected: boolean;
    onClick: () => void;
    label: string;
    description: string;
}) {
    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            sx={{
                border: 2,
                borderColor: selected ? 'primary.main' : 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: selected ? 2 : 0,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                '&:focus-visible': {
                    outline: 2,
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                },
            }}
        >
            <Box
                sx={{
                    bgcolor: bg,
                    p: 1.5,
                    minHeight: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                }}
            >
                <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ color: text, lineHeight: 1.3 }}
                >
                    {label}
                </Typography>
                <Typography variant="caption" sx={{ color: text, opacity: 0.85 }}>
                    Chữ thường{' '}
                    <Box component="span" sx={{ color: active, fontWeight: 700 }}>
                        đang phát
                    </Box>
                </Typography>
            </Box>
            <Box sx={{ px: 1.5, py: 1, bgcolor: 'background.paper' }}>
                <Typography variant="caption" color="text.secondary">
                    {description}
                </Typography>
            </Box>
        </Box>
    );
}

export default function ShortVideoGlobalSettingsDrawer({
    open,
    onClose,
    manifest,
    saving,
    onApplyAndSave,
}: Props) {
    const [selectedTemplateId, setSelectedTemplateId] = React.useState(
        manifest.template_id || 'classic'
    );

    React.useEffect(() => {
        if (!open) {
            return;
        }
        setSelectedTemplateId(manifest.template_id || 'classic');
    }, [open, manifest.template_id]);

    const handleApply = (mode: ShortVideoTemplateApplyMode) => {
        void onApplyAndSave(selectedTemplateId, mode);
    };

    const headerAction = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <LoadingButton
                size="small"
                variant="contained"
                loading={saving}
                disabled={saving}
                onClick={() => handleApply('keep_scene_overrides')}
                sx={HEADER_BUTTON_SX}
            >
                Cập nhật
            </LoadingButton>
            <LoadingButton
                size="small"
                variant="contained"
                color="success"
                loading={saving}
                disabled={saving}
                onClick={() => handleApply('replace_all_scenes')}
                sx={{
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    '&:hover': {
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    },
                }}
            >
                Cập nhật tất cả scene
            </LoadingButton>
        </Box>
    );

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title="Cài đặt video"
            width={640}
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
            <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Template
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {SHORT_VIDEO_RENDER_TEMPLATES.map((template) => (
                        <TemplatePreviewSwatch
                            key={template.id}
                            bg={template.style.bg}
                            text={template.style.text}
                            active={template.style.active}
                            label={template.label}
                            description={template.description}
                            selected={selectedTemplateId === template.id}
                            onClick={() => setSelectedTemplateId(template.id)}
                        />
                    ))}
                </Box>
            </Box>
        </DrawerCustom>
    );
}

export { Settings as ShortVideoGlobalSettingsIcon };
