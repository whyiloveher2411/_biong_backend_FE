import React from 'react';
import {
    Box,
    FormControlLabel,
    MenuItem,
    Paper,
    Slider,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import Button from 'components/atoms/Button';
import ColorFieldControl from 'components/atoms/fields/color/Control';
import {
    SCENE_LAYOUT_BACKGROUND_KEYS,
    SCENE_LAYOUT_HEADLINE_KEYS,
    SCENE_LAYOUT_KARAOKE_KEYS,
    SCENE_LAYOUT_VISUAL_KEYS,
    resolveSceneActiveColor,
    resolveSceneBottomPadding,
    resolveSceneHeadlineColor,
    resolveSceneHeadlineFontSize,
    resolveSceneHeadlineTop,
    resolveSceneKaraokeFontSize,
    resolveSceneShowHeadline,
    resolveSceneShowKaraoke,
    resolveSceneShowVisual,
    resolveSceneTextBoxHeight,
    resolveSceneTextColor,
    resolveSceneVisualMotion,
    sceneBackgroundColor,
    type ShortVideoManifestScene,
    type ShortVideoManifestSceneLayout,
    type ShortVideoRenderManifest,
} from 'helpers/shortVideoRenderManifest';

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

export { HEADER_BUTTON_SX };

function SceneEditGroup({
    title,
    onReset,
    hideReset,
    children,
}: {
    title: string;
    onReset?: () => void;
    hideReset?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                }}
            >
                <Typography variant="subtitle2" fontWeight={600}>
                    {title}
                </Typography>
                {!hideReset && onReset ? (
                    <Button size="small" variant="text" onClick={onReset}>
                        Đặt lại nhóm này
                    </Button>
                ) : null}
            </Box>
            {children}
        </Paper>
    );
}

function SliderField({
    label,
    value,
    min,
    max,
    step,
    defaultHint,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    defaultHint?: string;
    onChange: (value: number) => void;
}) {
    return (
        <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
                {label}: {value}
            </Typography>
            <Slider
                size="small"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(_event, next) => {
                    const num = Array.isArray(next) ? next[0] : next;
                    onChange(num);
                }}
            />
            {defaultHint ? (
                <Typography variant="caption" color="text.secondary">
                    {defaultHint}
                </Typography>
            ) : null}
        </Box>
    );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
    return (
        <TextField
            label={label}
            size="small"
            fullWidth
            value={value}
            InputProps={{ readOnly: true }}
        />
    );
}

function patchOrClearString(
    current: string | undefined,
    next: string
): string | undefined {
    const trimmed = next.trim();
    if (!trimmed) {
        return undefined;
    }
    if (current !== undefined && trimmed === current) {
        return trimmed;
    }
    return trimmed;
}

export default function ShortVideoSceneEditPanel({
    manifest,
    selectedSceneId,
    onSceneLayoutChange,
    onResetLayoutGroup,
}: Props) {
    const selectedScene = manifest.scenes.find((s) => s.id === selectedSceneId);

    if (!selectedScene) {
        return (
            <Typography variant="body2" color="text.secondary">
                Chọn scene bên trái để chỉnh layout
            </Typography>
        );
    }

    const layout = selectedScene.layout ?? {};
    const sceneId = selectedScene.id;

    const patch = (next: Partial<ShortVideoManifestSceneLayout>) => {
        onSceneLayoutChange(sceneId, next);
    };

    const reset = (keys: (keyof ShortVideoManifestSceneLayout)[]) => {
        onResetLayoutGroup(sceneId, keys);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            <SceneEditGroup
                title="Nền scene"
                onReset={() => reset(SCENE_LAYOUT_BACKGROUND_KEYS)}
            >
                <ColorFieldControl
                    label="Background"
                    value={sceneBackgroundColor(selectedScene, manifest)}
                    note={`Mặc định: ${manifest.style.bg}`}
                    onChange={(color) => patch({ background: color })}
                />
            </SceneEditGroup>

            <HeadlineGroup
                scene={selectedScene}
                manifest={manifest}
                layout={layout}
                patch={patch}
                onReset={() => reset(SCENE_LAYOUT_HEADLINE_KEYS)}
            />

            <KaraokeGroup
                scene={selectedScene}
                manifest={manifest}
                layout={layout}
                patch={patch}
                onReset={() => reset(SCENE_LAYOUT_KARAOKE_KEYS)}
            />

            <VisualGroup
                scene={selectedScene}
                layout={layout}
                patch={patch}
                onReset={() => reset(SCENE_LAYOUT_VISUAL_KEYS)}
            />

            <SceneEditGroup title="Thông tin scene" hideReset>
                <ReadonlyField label="Scene id" value={selectedScene.id} />
                <ReadonlyField label="Voiceover" value={selectedScene.voiceover} />
                <ReadonlyField
                    label="Thời lượng (giây)"
                    value={String(selectedScene.duration_sec)}
                />
                <ReadonlyField
                    label="Audio URL"
                    value={selectedScene.audio_url || '—'}
                />
            </SceneEditGroup>
        </Box>
    );
}

function HeadlineGroup({
    scene,
    manifest,
    layout,
    patch,
    onReset,
}: {
    scene: ShortVideoManifestScene;
    manifest: ShortVideoRenderManifest;
    layout: ShortVideoManifestSceneLayout;
    patch: (next: Partial<ShortVideoManifestSceneLayout>) => void;
    onReset: () => void;
}) {
    const defaultText = scene.on_screen_text?.trim() || '';
    const displayText = layout.headline_text ?? '';
    const fontSize = layout.headline_font_size ?? resolveSceneHeadlineFontSize(scene);
    const top = layout.headline_top ?? resolveSceneHeadlineTop(scene);

    return (
        <SceneEditGroup title="Tiêu đề màn hình" onReset={onReset}>
            <FormControlLabel
                control={
                    <Switch
                        checked={resolveSceneShowHeadline(scene)}
                        onChange={(e) =>
                            patch({ show_headline: e.target.checked ? undefined : false })
                        }
                    />
                }
                label="Hiển thị tiêu đề"
            />
            <TextField
                label="Nội dung tiêu đề"
                size="small"
                fullWidth
                multiline
                minRows={2}
                placeholder={defaultText || 'Tiêu đề màn hình'}
                value={displayText}
                onChange={(e) =>
                    patch({
                        headline_text: patchOrClearString(layout.headline_text, e.target.value),
                    })
                }
                helperText={
                    defaultText
                        ? `Gốc từ script: ${defaultText}`
                        : 'Không có tiêu đề gốc'
                }
            />
            <ColorFieldControl
                label="Màu tiêu đề"
                value={layout.headline_color ?? resolveSceneHeadlineColor(scene, manifest)}
                note={`Mặc định: ${manifest.style.text}`}
                onChange={(color) => patch({ headline_color: color })}
            />
            <SliderField
                label="Cỡ chữ tiêu đề"
                value={fontSize}
                min={24}
                max={72}
                step={1}
                defaultHint="Mặc định: 56"
                onChange={(value) => patch({ headline_font_size: value })}
            />
            <SliderField
                label="Vị trí Y tiêu đề"
                value={top}
                min={80}
                max={320}
                step={4}
                defaultHint="Mặc định: 180"
                onChange={(value) => patch({ headline_top: value })}
            />
        </SceneEditGroup>
    );
}

function KaraokeGroup({
    scene,
    manifest,
    layout,
    patch,
    onReset,
}: {
    scene: ShortVideoManifestScene;
    manifest: ShortVideoRenderManifest;
    layout: ShortVideoManifestSceneLayout;
    patch: (next: Partial<ShortVideoManifestSceneLayout>) => void;
    onReset: () => void;
}) {
    const fontSize = layout.font_size ?? resolveSceneKaraokeFontSize(scene, manifest);
    const bottomPadding = layout.bottom_padding ?? resolveSceneBottomPadding(scene, manifest);
    const textBoxHeight = layout.text_box_height ?? resolveSceneTextBoxHeight(scene, manifest);

    return (
        <SceneEditGroup title="Karaoke" onReset={onReset}>
            <FormControlLabel
                control={
                    <Switch
                        checked={resolveSceneShowKaraoke(scene)}
                        onChange={(e) =>
                            patch({ show_karaoke: e.target.checked ? undefined : false })
                        }
                    />
                }
                label="Hiển thị karaoke"
            />
            <ColorFieldControl
                label="Màu chữ"
                value={layout.text_color ?? resolveSceneTextColor(scene, manifest)}
                note={`Mặc định: ${manifest.style.text}`}
                onChange={(color) => patch({ text_color: color })}
            />
            <ColorFieldControl
                label="Màu từ đang phát"
                value={layout.active_color ?? resolveSceneActiveColor(scene, manifest)}
                note={`Mặc định: ${manifest.style.active}`}
                onChange={(color) => patch({ active_color: color })}
            />
            <SliderField
                label="Cỡ chữ karaoke"
                value={fontSize}
                min={24}
                max={72}
                step={1}
                defaultHint={`Mặc định: ${manifest.text_profile.font_size}`}
                onChange={(value) => patch({ font_size: value })}
            />
            <SliderField
                label="Padding đáy"
                value={bottomPadding}
                min={120}
                max={400}
                step={4}
                defaultHint={`Mặc định: ${manifest.text_profile.bottom_padding}`}
                onChange={(value) => patch({ bottom_padding: value })}
            />
            <SliderField
                label="Chiều cao vùng karaoke"
                value={textBoxHeight}
                min={240}
                max={640}
                step={8}
                defaultHint={`Mặc định: ${manifest.text_profile.text_box_height}`}
                onChange={(value) => patch({ text_box_height: value })}
            />
        </SceneEditGroup>
    );
}

function VisualGroup({
    scene,
    layout,
    patch,
    onReset,
}: {
    scene: ShortVideoManifestScene;
    layout: ShortVideoManifestSceneLayout;
    patch: (next: Partial<ShortVideoManifestSceneLayout>) => void;
    onReset: () => void;
}) {
    const originalRef = scene.visual?.ref?.trim() || '';
    const motion = layout.visual_motion ?? resolveSceneVisualMotion(scene);

    return (
        <SceneEditGroup title="Hình ảnh" onReset={onReset}>
            <FormControlLabel
                control={
                    <Switch
                        checked={resolveSceneShowVisual(scene)}
                        onChange={(e) =>
                            patch({ show_visual: e.target.checked ? undefined : false })
                        }
                    />
                }
                label="Hiển thị hình ảnh"
            />
            <ReadonlyField label="Loại visual" value={scene.visual?.type || '—'} />
            <ReadonlyField label="URL gốc" value={originalRef || '—'} />
            <TextField
                label="URL override"
                size="small"
                fullWidth
                placeholder={originalRef || 'https://…'}
                value={layout.visual_ref ?? ''}
                onChange={(e) =>
                    patch({
                        visual_ref: patchOrClearString(layout.visual_ref, e.target.value),
                    })
                }
            />
            <TextField
                select
                label="Hiệu ứng"
                size="small"
                fullWidth
                value={motion}
                onChange={(e) => patch({ visual_motion: e.target.value })}
            >
                <MenuItem value="pop">Pop</MenuItem>
                <MenuItem value="fade">Fade</MenuItem>
            </TextField>
        </SceneEditGroup>
    );
}
