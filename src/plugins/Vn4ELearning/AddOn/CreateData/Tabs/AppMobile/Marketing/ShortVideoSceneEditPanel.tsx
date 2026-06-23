import React from 'react';
import { Box, Typography } from '@mui/material';
import {
    resolveSceneActiveColor,
    resolveSceneKaraokeFontSize,
    resolveSceneTextColor,
    type ShortVideoManifestSceneLayout,
    type ShortVideoRenderManifest,
} from 'helpers/shortVideoRenderManifest';
import {
    InspectorPanelBody,
    InspectorPropertyColor,
    InspectorPropertyNumber,
} from './ShortVideoInspectorFields';

const SCENE_LAYOUT_TEXT_STYLE_KEYS: (keyof ShortVideoManifestSceneLayout)[] = [
    'text_color',
    'active_color',
    'font_size',
];

type Props = {
    manifest: ShortVideoRenderManifest;
    selectedSceneId: string;
    onSceneLayoutChange: (
        sceneId: string,
        patch: Partial<ShortVideoManifestSceneLayout>
    ) => void;
    onResetLayoutGroup: (
        sceneId: string,
        keys: (keyof ShortVideoManifestSceneLayout)[]
    ) => void;
};

const HEADER_BUTTON_SX = {
    color: 'primary.main',
    backgroundColor: 'white',
    '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
} as const;

export { HEADER_BUTTON_SX, SCENE_LAYOUT_TEXT_STYLE_KEYS };

export default function ShortVideoSceneEditPanel({
    manifest,
    selectedSceneId,
    onSceneLayoutChange,
}: Props) {
    const selectedScene = manifest.scenes.find((s) => s.id === selectedSceneId);

    if (!selectedScene) {
        return (
            <Typography variant="body2" color="text.secondary">
                Chọn scene trên timeline để chỉnh layout
            </Typography>
        );
    }

    const layout = selectedScene.layout ?? {};
    const sceneId = selectedScene.id;

    const patch = (next: Partial<ShortVideoManifestSceneLayout>) => {
        onSceneLayoutChange(sceneId, next);
    };

    const textColor = layout.text_color ?? resolveSceneTextColor(selectedScene, manifest);
    const activeColor = layout.active_color ?? resolveSceneActiveColor(selectedScene, manifest);
    const fontSize = layout.font_size ?? resolveSceneKaraokeFontSize(selectedScene, manifest);

    return (
        <Box sx={{ width: '100%' }}>
            <InspectorPanelBody>
                <InspectorPropertyColor
                    label="Màu text"
                    value={textColor}
                    onChange={(color) => patch({ text_color: color })}
                />
                <InspectorPropertyColor
                    label="Màu từ đang phát"
                    value={activeColor}
                    onChange={(color) => patch({ active_color: color })}
                />
                <InspectorPropertyNumber
                    label="Cỡ chữ"
                    value={fontSize}
                    min={24}
                    max={72}
                    onChange={(value) => patch({ font_size: value })}
                />
            </InspectorPanelBody>
        </Box>
    );
}
