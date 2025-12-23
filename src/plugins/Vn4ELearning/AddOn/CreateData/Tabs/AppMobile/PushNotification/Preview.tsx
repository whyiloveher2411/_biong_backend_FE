import React from 'react';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';

interface PreviewProps {
    title: string;
    body: string;
}

export default function Preview({ title, body }: PreviewProps) {
    return (
        <Card variant="outlined">
            <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Preview
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>{title || 'Tiêu đề...'}</Typography>
                        <Typography variant="body2" color="text.secondary">{body || 'Nội dung...'}</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}


