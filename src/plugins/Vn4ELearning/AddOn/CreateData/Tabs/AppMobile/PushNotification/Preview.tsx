import React from 'react';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import { ComposeState } from './types';

interface PreviewProps {
    compose: ComposeState;
}

export default function Preview({ compose }: PreviewProps) {
    const { payload, overrides } = compose;

    return (
        <Card variant="outlined">
            <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Preview
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {payload.imageUrl && (
                        <Box component="img" src={payload.imageUrl} alt="notification" sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1 }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>{payload.title || 'Tiêu đề...'}</Typography>
                        <Typography variant="body2" color="text.secondary">{payload.body || 'Nội dung...'}</Typography>
                    </Box>
                </Box>

                <Box sx={{ mt: 2, color: 'text.secondary', fontSize: 12 }}>
                    <div>Android: channelId={overrides.android.channelId || '-'}, sound={overrides.android.sound || '-'}</div>
                    <div>iOS: sound={overrides.ios.sound || '-'}, badge={overrides.ios.badge ?? '-'}</div>
                </Box>
            </CardContent>
        </Card>
    );
}


