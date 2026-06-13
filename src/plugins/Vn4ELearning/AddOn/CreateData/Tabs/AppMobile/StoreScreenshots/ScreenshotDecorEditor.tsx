import React from 'react';
import { Stack } from '@mui/material';
import DecorStringListField from './DecorStringListField';
import ScreenshotBackgroundPatternField from './ScreenshotBackgroundPatternField';
import ScreenshotDecorOptionsField from './ScreenshotDecorOptionsField';
import StoreScreenshotColorField from './StoreScreenshotColorField';
import { normalizeBackgroundColor } from './storeScreenshotBackgroundColorPrompt';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import type { DecorSuggestion } from './storeScreenshotVisualDecorCatalog';
import {
    formatDecorStringListForField,
    parseDecorStringListForSave,
} from './storeScreenshotVisualDecorCatalog';

export type ScreenshotDecorEditorValue = {
    background_pattern?: string;
    background_color?: string;
    floating_icons_enabled?: boolean;
    icons?: string[];
    background_motifs?: string[];
    /** Raw text đang edit — giữ space/xuống dòng khi gõ. */
    iconsText?: string;
    backgroundMotifsText?: string;
};

type Props = {
    value: ScreenshotDecorEditorValue;
    brandColor?: string;
    onChange: (patch: Partial<ScreenshotDecorEditorValue>) => void;
    disabled?: boolean;
};

function resolveIconsText(value: ScreenshotDecorEditorValue): string {
    return value.iconsText ?? formatDecorStringListForField(value.icons);
}

function resolveBackgroundMotifsText(value: ScreenshotDecorEditorValue): string {
    return value.backgroundMotifsText ?? formatDecorStringListForField(value.background_motifs);
}

export function buildDecorEditorValueFromShot(
    shot?: ScreenshotDecorEditorValue | null,
): ScreenshotDecorEditorValue {
    const icons = shot?.icons ?? [];
    const backgroundMotifs = shot?.background_motifs ?? [];

    return {
        background_pattern: shot?.background_pattern ?? '',
        background_color: shot?.background_color ?? '',
        floating_icons_enabled: shot?.floating_icons_enabled,
        icons,
        background_motifs: backgroundMotifs,
        iconsText: shot?.iconsText ?? formatDecorStringListForField(icons),
        backgroundMotifsText: shot?.backgroundMotifsText ?? formatDecorStringListForField(backgroundMotifs),
    };
}

export function normalizeDecorEditorValue(value: ScreenshotDecorEditorValue): DecorSuggestion {
    const floatingIconsEnabled = normalizeFloatingIconsEnabled(value.floating_icons_enabled);
    const backgroundPattern = normalizeBackgroundPatternId(value.background_pattern);

    return {
        background_pattern: backgroundPattern,
        background_color: normalizeBackgroundColor(value.background_color),
        floating_icons_enabled: floatingIconsEnabled,
        icons: floatingIconsEnabled
            ? parseDecorStringListForSave(resolveIconsText(value), 3)
            : [],
        background_motifs: backgroundPattern === 'none'
            ? []
            : parseDecorStringListForSave(resolveBackgroundMotifsText(value), 6),
    };
}

export function decorEditorValuesEqual(
    left: ScreenshotDecorEditorValue,
    right: ScreenshotDecorEditorValue,
): boolean {
    const normalizedLeft = normalizeDecorEditorValue(left);
    const normalizedRight = normalizeDecorEditorValue(right);

    return [
        normalizedLeft.background_pattern,
        normalizedLeft.background_color ?? '',
        String(normalizedLeft.floating_icons_enabled),
        resolveIconsText(left),
        resolveBackgroundMotifsText(left),
    ].join('::') === [
        normalizedRight.background_pattern,
        normalizedRight.background_color ?? '',
        String(normalizedRight.floating_icons_enabled),
        resolveIconsText(right),
        resolveBackgroundMotifsText(right),
    ].join('::');
}

function ScreenshotDecorEditor({
    value,
    brandColor,
    onChange,
    disabled = false,
}: Props) {
    const floatingIconsEnabled = normalizeFloatingIconsEnabled(value.floating_icons_enabled);
    const backgroundPattern = normalizeBackgroundPatternId(value.background_pattern);
    const backgroundColorSwatches = brandColor ? [brandColor] : [];

    const handleChange = (patch: Partial<ScreenshotDecorEditorValue>) => {
        onChange(patch);
    };

    return (
        <Stack spacing={1.25}>
            <ScreenshotBackgroundPatternField
                value={value.background_pattern || ''}
                onChange={(backgroundPattern) => handleChange({
                    background_pattern: backgroundPattern,
                    ...(backgroundPattern === 'none' ? { background_motifs: [], backgroundMotifsText: '' } : {}),
                })}
            />
            <StoreScreenshotColorField
                label="Màu nền"
                value={value.background_color || ''}
                onChange={(backgroundColor) => handleChange({ background_color: backgroundColor })}
                swatchColors={backgroundColorSwatches}
                note="Để trống = không gợi ý riêng; sinh ảnh dùng màu brand từ template."
            />
            <ScreenshotDecorOptionsField
                floatingIconsEnabled={floatingIconsEnabled}
                onFloatingIconsChange={(nextFloatingIconsEnabled) => handleChange({
                    floating_icons_enabled: nextFloatingIconsEnabled,
                    ...(nextFloatingIconsEnabled ? {} : { icons: [], iconsText: '' }),
                })}
            />
            <DecorStringListField
                label="Floating icons"
                items={value.icons}
                text={value.iconsText}
                onTextChange={(iconsText) => handleChange({ iconsText })}
                placeholder="Mỗi dòng một mô tả icon (gồm style)"
                helperText="Mỗi dòng một mô tả; để trống = không gợi ý AI. Style icon gộp trong mô tả."
                disabled={disabled || !floatingIconsEnabled}
            />
            <DecorStringListField
                label="Họa tiết nền"
                items={value.background_motifs}
                text={value.backgroundMotifsText}
                onTextChange={(backgroundMotifsText) => handleChange({ backgroundMotifsText })}
                placeholder="Mỗi dòng một họa tiết (hình dạng, vị trí)"
                helperText="Mỗi dòng một mô tả họa tiết nền; để trống = không gợi ý AI."
                disabled={disabled || backgroundPattern === 'none'}
            />
        </Stack>
    );
}

export default ScreenshotDecorEditor;
