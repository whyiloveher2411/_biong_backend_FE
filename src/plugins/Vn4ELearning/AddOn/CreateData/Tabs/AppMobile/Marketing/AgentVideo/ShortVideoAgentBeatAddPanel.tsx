import React from 'react';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import { listBeatTimelineEffectDefinitions } from './beatTimelineEffects/registry';
import type { BeatTimelineEffectType } from './agentVideoApi';

type Props = {
    onAddEffect: (type: BeatTimelineEffectType) => void;
    saving?: boolean;
};

export default function ShortVideoAgentBeatAddPanel({ onAddEffect, saving = false }: Props) {
    const definitions = listBeatTimelineEffectDefinitions();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                Chọn hiệu ứng để thêm vào timeline audio beat tại vị trí playhead hiện tại.
            </Typography>
            {definitions.map((def) => (
                <Card
                    key={def.type}
                    variant="outlined"
                    sx={{ borderColor: def.timelineColor, borderLeft: `4px solid ${def.timelineColor}` }}
                >
                    <CardActionArea
                        disabled={saving}
                        onClick={() => onAddEffect(def.type)}
                    >
                        <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ZoomInMapIcon sx={{ color: def.timelineColor }} />
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {def.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {def.description}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>
            ))}
        </Box>
    );
}
