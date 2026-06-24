import React from 'react';
import {
    Box,
    Button,
    Typography,
} from '@mui/material';
import type { ShortVideoRenderManifest, ShortVideoTextClip } from 'helpers/shortVideoRenderManifest';
import {
    TEXT_CLIP_BACKGROUND_EFFECT_OPTIONS,
    TEXT_CLIP_FONT_WEIGHT_OPTIONS,
    TEXT_CLIP_TRANSFORM_OPTIONS,
    updateTextClipInManifest,
} from 'helpers/shortVideoTextClips';
import {
    InspectorPanelBody,
    InspectorPanelTabs,
    InspectorPropertyColor,
    InspectorPropertyGroup,
    InspectorPropertyNumber,
    InspectorPropertyReadonly,
    InspectorPropertySelect,
    InspectorPropertyText,
    InspectorPropertyVolume,
} from './ShortVideoInspectorFields';
import ShortVideoTextClipAnimationPanel from './ShortVideoTextClipAnimationPanel';
import ShortVideoInspectorZIndexGroup from './ShortVideoInspectorZIndexGroup';

const INSPECTOR_SHELL_SX = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    overflowY: 'auto',
    bgcolor: 'background.paper',
} as const;

const TEXT_CLIP_INSPECTOR_TAB = {
    properties: 0,
    animation: 1,
} as const;

type Props = {
    manifest: ShortVideoRenderManifest;
    clipId: string;
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onSave?: () => void;
    saving?: boolean;
    dirty?: boolean;
};

function EmptyInspector() {
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Chọn clip text trên timeline để chỉnh thuộc tính
            </Typography>
        </Box>
    );
}

export default function ShortVideoTextClipInspector({
    manifest,
    clipId,
    onManifestChange,
    onSave,
    saving = false,
    dirty = false,
}: Props) {
    const [activeTab, setActiveTab] = React.useState<number>(TEXT_CLIP_INSPECTOR_TAB.properties);
    const clip = (manifest.text_clips ?? []).find((item) => item.id === clipId);

    const onPatch = React.useCallback(
        (patch: Partial<ShortVideoTextClip>) => {
            if (!clipId) {
                return;
            }
            onManifestChange(updateTextClipInManifest(manifest, clipId, patch));
        },
        [clipId, manifest, onManifestChange]
    );

    if (!clip) {
        return <EmptyInspector />;
    }

    return (
        <Box sx={INSPECTOR_SHELL_SX} className="custom_scroll">
            <InspectorPanelTabs
                value={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { label: 'Thuộc tính' },
                    { label: 'Animation' },
                ]}
            />

            {activeTab === TEXT_CLIP_INSPECTOR_TAB.properties ? (
                <InspectorPanelBody>
                    <InspectorPropertyGroup title="Nội dung">
                        <InspectorPropertyText
                            label="Nội dung"
                            value={clip.content}
                            onChange={(value) => onPatch({ content: value })}
                            placeholder="Nhập nội dung text"
                            multiline
                            minRows={3}
                        />
                    </InspectorPropertyGroup>

                    <InspectorPropertyGroup title="Kiểu chữ">
                        <InspectorPropertyNumber
                            label="Cỡ chữ"
                            value={clip.font_size ?? 48}
                            min={12}
                            max={160}
                            onChange={(value) => onPatch({ font_size: value })}
                        />
                        <InspectorPropertySelect
                            label="Độ đậm"
                            value={String(clip.font_weight ?? 700)}
                            onChange={(value) => onPatch({
                                font_weight: Number(value) as ShortVideoTextClip['font_weight'],
                            })}
                            options={[...TEXT_CLIP_FONT_WEIGHT_OPTIONS]}
                        />
                        <InspectorPropertySelect
                            label="Kiểu chữ hoa/thường"
                            value={clip.text_transform ?? 'none'}
                            onChange={(value) => onPatch({
                                text_transform: value === 'none'
                                    ? undefined
                                    : (value as ShortVideoTextClip['text_transform']),
                            })}
                            options={[...TEXT_CLIP_TRANSFORM_OPTIONS]}
                        />
                        <InspectorPropertyNumber
                            label="Chiều cao dòng (%)"
                            value={clip.line_height_percent ?? 120}
                            min={50}
                            max={300}
                            onChange={(value) => onPatch({ line_height_percent: value })}
                        />
                        <InspectorPropertyNumber
                            label="Khoảng cách chữ (px)"
                            value={clip.letter_spacing_px ?? 0}
                            min={-20}
                            max={80}
                            onChange={(value) => onPatch({
                                letter_spacing_px: value === 0 ? undefined : value,
                            })}
                        />
                        <InspectorPropertyNumber
                            label="Nghiêng ngang (°)"
                            value={clip.skew_x_deg ?? 0}
                            min={-45}
                            max={45}
                            onChange={(value) => onPatch({
                                skew_x_deg: value === 0 ? undefined : value,
                            })}
                        />
                        <InspectorPropertyColor
                            label="Màu chữ"
                            value={clip.color ?? '#FFFFFF'}
                            onChange={(value) => onPatch({ color: value })}
                        />
                        <InspectorPropertyVolume
                            label="Độ mờ chữ"
                            valuePercent={clip.opacity ?? 100}
                            onChange={(percent) => onPatch({ opacity: percent })}
                        />
                        <InspectorPropertySelect
                            label="Căn lề"
                            value={clip.text_align ?? 'center'}
                            onChange={(value) => onPatch({
                                text_align: value === 'left' || value === 'right' ? value : 'center',
                            })}
                            options={[
                                { value: 'left', label: 'Trái' },
                                { value: 'center', label: 'Giữa' },
                                { value: 'right', label: 'Phải' },
                            ]}
                        />
                    </InspectorPropertyGroup>

                    <InspectorPropertyGroup title="Hộp nền">
                        <InspectorPropertyColor
                            label="Màu nền"
                            value={clip.background_color ?? '#000000'}
                            onChange={(value) => onPatch({ background_color: value })}
                        />
                        {clip.background_color ? (
                            <>
                                <InspectorPropertyVolume
                                    label="Độ mờ nền"
                                    valuePercent={clip.background_opacity ?? 100}
                                    onChange={(percent) => onPatch({ background_opacity: percent })}
                                />
                                <InspectorPropertySelect
                                    label="Hiệu ứng nền"
                                    value={clip.background_effect ?? ''}
                                    options={[
                                        { value: '', label: 'Mặc định (tự động)' },
                                        ...TEXT_CLIP_BACKGROUND_EFFECT_OPTIONS.map((option) => ({
                                            value: option.value,
                                            label: option.label,
                                        })),
                                    ]}
                                    onChange={(value) => onPatch({
                                        background_effect: value === ''
                                            ? undefined
                                            : value as ShortVideoTextClip['background_effect'],
                                    })}
                                />
                            </>
                        ) : null}
                        <InspectorPropertyNumber
                            label="Padding ngang"
                            value={clip.padding_x ?? 16}
                            min={0}
                            max={120}
                            onChange={(value) => onPatch({ padding_x: value })}
                        />
                        <InspectorPropertyNumber
                            label="Padding dọc"
                            value={clip.padding_y ?? 8}
                            min={0}
                            max={120}
                            onChange={(value) => onPatch({ padding_y: value })}
                        />
                        <InspectorPropertyNumber
                            label="Bo góc"
                            value={clip.border_radius ?? 0}
                            min={0}
                            max={80}
                            onChange={(value) => onPatch({ border_radius: value })}
                        />
                        <InspectorPropertyNumber
                            label="Rộng tối đa box (%)"
                            value={clip.box_max_width_percent ?? 92}
                            min={10}
                            max={100}
                            onChange={(value) => onPatch({ box_max_width_percent: value })}
                        />
                    </InspectorPropertyGroup>

                    <InspectorPropertyGroup title="Vị trí">
                        <InspectorPropertyReadonly
                            label="X (%)"
                            value={String(Math.round(clip.position_x ?? 50))}
                            description="Kéo trên preview để chỉnh"
                        />
                        <InspectorPropertyReadonly
                            label="Y (%)"
                            value={String(Math.round(clip.position_y ?? 50))}
                            description="Kéo trên preview để chỉnh"
                        />
                    </InspectorPropertyGroup>

                    <ShortVideoInspectorZIndexGroup
                        zIndex={clip.z_index}
                        onChange={(value) => onPatch({ z_index: value })}
                    />
                </InspectorPanelBody>
            ) : null}

            {activeTab === TEXT_CLIP_INSPECTOR_TAB.animation ? (
                <ShortVideoTextClipAnimationPanel clip={clip} onPatch={onPatch} />
            ) : null}

            <Box
                sx={{
                    px: 2,
                    pb: 2,
                    pt: 1,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    position: 'sticky',
                    bottom: 0,
                }}
            >
                <Button
                    variant="contained"
                    fullWidth
                    disabled={!dirty || saving}
                    onClick={onSave}
                >
                    {saving ? 'Đang lưu...' : 'Lưu chỉnh sửa text'}
                </Button>
            </Box>
        </Box>
    );
}
