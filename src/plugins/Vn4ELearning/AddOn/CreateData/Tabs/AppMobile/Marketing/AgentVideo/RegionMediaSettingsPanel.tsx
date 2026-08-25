import React from 'react';
import {
    Box,
    Button,
    Slider,
    Stack,
    Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import {
    ATTENTION_EFFECT_OPTIONS,
    ATTENTION_INTENSITY_MAX,
    ATTENTION_INTENSITY_MIN,
    ATTENTION_MAGENTA,
    ATTENTION_SCALE_MAX_LIMIT,
    ATTENTION_SCALE_MAX_MIN,
    isRegionAttentionEnabled,
    normalizeAttentionCycleSec,
    normalizeAttentionIntensity,
    normalizeAttentionScaleMax,
    normalizeAttentionType,
    type AttentionEffectKey,
} from './agentVideoApi';
import {
    attentionEarliestStartSec,
    disableAttentionPatch,
    enableAttentionPatch,
    type AttentionTimingSource,
} from './regionAttentionTiming';

type Word = { index: number; text: string; start: number };

type Props = {
    source: AttentionTimingSource;
    beatWords: Word[];
    beatStartSec: number;
    beatDurationSec: number;
    sceneBudgetSec: number;
    onPatch: (patch: Record<string, unknown>) => void;
};

function activeAttentionType(source: AttentionTimingSource): AttentionEffectKey {
    const hasWindow = isRegionAttentionEnabled(
        source.attention_start_sec,
        source.attention_end_sec,
    );
    const type = normalizeAttentionType(source.attention_type, hasWindow);
    return hasWindow && type !== 'none' ? type : 'none';
}

export default function RegionMediaSettingsPanel({
    source,
    beatWords,
    beatStartSec,
    beatDurationSec,
    sceneBudgetSec,
    onPatch,
}: Props) {
    const type = activeAttentionType(source);
    const attentionOn = type !== 'none';
    const scaleMax = normalizeAttentionScaleMax(source.attention_scale_max);
    const cycleSec = normalizeAttentionCycleSec(source.attention_cycle_sec);
    const intensity = normalizeAttentionIntensity(source.attention_intensity);
    const earliestStart = attentionEarliestStartSec(
        source,
        beatWords,
        beatStartSec,
        beatDurationSec,
    );

    const selectType = (next: AttentionEffectKey) => {
        if (next === 'none') {
            onPatch(disableAttentionPatch());
            return;
        }
        if (attentionOn) {
            onPatch({ attention_type: next });
            return;
        }
        onPatch(enableAttentionPatch(
            source,
            beatWords,
            beatStartSec,
            beatDurationSec,
            sceneBudgetSec,
            next,
        ));
    };

    const showScale = type === 'breathe';
    const showCycle = type === 'breathe' || type === 'ripple' || type === 'light_sweep';
    const showIntensity = type === 'spotlight' || type === 'glitch' || type === 'saber' || type === 'god_rays';

    return (
        <Box
            sx={{
                mb: 1.25,
                border: '1px solid rgba(236,64,122,0.42)',
                borderLeft: `3px solid ${ATTENTION_MAGENTA}`,
                borderRadius: 1,
                p: 0.85,
                bgcolor: 'rgba(236,64,122,0.08)',
            }}
        >
            <Typography
                variant="caption"
                display="block"
                sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    color: ATTENTION_MAGENTA,
                    mb: 0.25,
                }}
            >
                Hiệu ứng gây chú ý
            </Typography>
            <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.75, fontSize: 10, lineHeight: 1.3, color: 'rgba(236,64,122,0.85)' }}
            >
                Một loại / vùng — chạy sau khi ảnh + hiệu ứng sau ảnh xong. Không kéo sớm hơn mốc đó.
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {ATTENTION_EFFECT_OPTIONS.map((opt) => {
                    const active = type === opt.value;
                    return (
                        <Button
                            key={opt.value}
                            size="small"
                            variant="outlined"
                            color={active ? 'secondary' : 'inherit'}
                            startIcon={active ? <CheckIcon /> : null}
                            onClick={() => selectType(opt.value)}
                            title={opt.description}
                            sx={{
                                textTransform: 'none',
                                flex: '1 1 45%',
                                fontSize: 11,
                                py: 0.25,
                                minHeight: 0,
                                color: active ? ATTENTION_MAGENTA : 'text.secondary',
                                borderColor: active ? ATTENTION_MAGENTA : 'rgba(236,64,122,0.28)',
                                bgcolor: active ? 'rgba(236,64,122,0.16)' : 'transparent',
                                '&:hover': {
                                    borderColor: ATTENTION_MAGENTA,
                                    bgcolor: 'rgba(236,64,122,0.12)',
                                },
                            }}
                        >
                            {opt.label}
                        </Button>
                    );
                })}
            </Stack>
            {attentionOn ? (
                <Stack spacing={1.15} sx={{ mt: 1.1 }}>
                    {showScale ? (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                {`Phóng to tối đa: ×${scaleMax.toFixed(2)}`}
                            </Typography>
                            <Slider
                                size="small"
                                min={ATTENTION_SCALE_MAX_MIN}
                                max={ATTENTION_SCALE_MAX_LIMIT}
                                step={0.01}
                                value={scaleMax}
                                onChange={(_, value) => {
                                    onPatch({ attention_scale_max: normalizeAttentionScaleMax(value as number) });
                                }}
                                sx={{ color: ATTENTION_MAGENTA }}
                            />
                        </Box>
                    ) : null}
                    {showCycle ? (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                {type === 'breathe'
                                    ? `Chu kỳ 1 nhịp: ${cycleSec.toFixed(1)}s`
                                    : type === 'ripple'
                                        ? `Khoảng cách sóng: ${cycleSec.toFixed(1)}s`
                                        : `Chu kỳ quét: ${cycleSec.toFixed(1)}s`}
                            </Typography>
                            <Slider
                                size="small"
                                min={0.5}
                                max={4}
                                step={0.1}
                                value={cycleSec}
                                onChange={(_, value) => {
                                    onPatch({ attention_cycle_sec: normalizeAttentionCycleSec(value as number) });
                                }}
                                sx={{ color: ATTENTION_MAGENTA }}
                            />
                        </Box>
                    ) : null}
                    {showIntensity ? (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                {`Cường độ: ${Math.round(intensity * 100)}%`}
                            </Typography>
                            <Slider
                                size="small"
                                min={ATTENTION_INTENSITY_MIN}
                                max={ATTENTION_INTENSITY_MAX}
                                step={0.01}
                                value={intensity}
                                onChange={(_, value) => {
                                    onPatch({ attention_intensity: normalizeAttentionIntensity(value as number) });
                                }}
                                sx={{ color: ATTENTION_MAGENTA }}
                            />
                        </Box>
                    ) : null}
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {`${Number(source.attention_start_sec).toFixed(1)}s → ${Number(source.attention_end_sec).toFixed(1)}s · không sớm hơn ${earliestStart.toFixed(1)}s`}
                    </Typography>
                </Stack>
            ) : null}
        </Box>
    );
}
