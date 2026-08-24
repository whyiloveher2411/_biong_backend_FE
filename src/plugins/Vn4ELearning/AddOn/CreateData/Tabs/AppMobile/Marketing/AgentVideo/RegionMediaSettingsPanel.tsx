import React from 'react';
import {
    Box,
    Slider,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import {
    ATTENTION_SCALE_MAX_LIMIT,
    ATTENTION_SCALE_MAX_MIN,
    isRegionAttentionEnabled,
    normalizeAttentionCycleSec,
    normalizeAttentionScaleMax,
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

function RegionSection({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <Box sx={{ mb: 1.25 }}>
            <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: subtitle ? 0.25 : 0.5 }}>
                {title}
            </Typography>
            {subtitle ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75, fontSize: 10, lineHeight: 1.3 }}>
                    {subtitle}
                </Typography>
            ) : null}
            {children}
        </Box>
    );
}

export default function RegionMediaSettingsPanel({
    source,
    beatWords,
    beatStartSec,
    beatDurationSec,
    sceneBudgetSec,
    onPatch,
}: Props) {
    const attentionOn = isRegionAttentionEnabled(
        source.attention_start_sec,
        source.attention_end_sec,
    );
    const scaleMax = normalizeAttentionScaleMax(source.attention_scale_max);
    const cycleSec = normalizeAttentionCycleSec(source.attention_cycle_sec);
    const earliestStart = attentionEarliestStartSec(
        source,
        beatWords,
        beatStartSec,
        beatDurationSec,
    );

    return (
        <RegionSection
            title="Hiệu ứng gây chú ý"
            subtitle="Chạy sau khi ảnh render xong và hiệu ứng sau ảnh (nếu có). Không kéo sớm hơn mốc đó — sau này có thể thêm hiệu ứng khác trong nhóm này."
        >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: attentionOn ? 1 : 0 }}>
                <Switch
                    size="small"
                    checked={attentionOn}
                    onChange={(event) => {
                        if (event.target.checked) {
                            onPatch(enableAttentionPatch(
                                source,
                                beatWords,
                                beatStartSec,
                                beatDurationSec,
                                sceneBudgetSec,
                            ));
                        } else {
                            onPatch(disableAttentionPatch());
                        }
                    }}
                />
                <Typography variant="caption" fontWeight={700}>
                    Thở
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {attentionOn ? 'Đang bật' : 'Tắt'}
                </Typography>
            </Stack>
            {attentionOn ? (
                <Stack spacing={1.25}>
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
                        />
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {`Chu kỳ 1 nhịp: ${cycleSec.toFixed(1)}s`}
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
                        />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {`Thở từ ${Number(source.attention_start_sec).toFixed(1)}s → ${Number(source.attention_end_sec).toFixed(1)}s · không sớm hơn ${earliestStart.toFixed(1)}s`}
                    </Typography>
                </Stack>
            ) : null}
        </RegionSection>
    );
}
