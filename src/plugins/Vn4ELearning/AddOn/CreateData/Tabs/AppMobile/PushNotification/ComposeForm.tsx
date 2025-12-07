import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import KeyValueEditor from './KeyValueEditor';
import { NotificationPayload } from './types';

interface ComposeFormProps {
    value: NotificationPayload;
    onChange: (next: NotificationPayload) => void;
}

export default function ComposeForm({ value, onChange }: ComposeFormProps) {
    const handleChange = (field: keyof NotificationPayload, v: ANY) => {
        onChange({ ...value, [field]: v });
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Soạn nội dung
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Title"
                        value={value.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Body"
                        value={value.body}
                        onChange={(e) => handleChange('body', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Notification Image URL"
                        placeholder="https://..."
                        value={value.imageUrl || ''}
                        onChange={(e) => handleChange('imageUrl', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Icon URL"
                        placeholder="https://..."
                        value={value.iconUrl || ''}
                        onChange={(e) => handleChange('iconUrl', e.target.value)}
                    />
                </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <KeyValueEditor
                label="Data Payload (ẩn)"
                value={value.data || {}}
                onChange={(record) => handleChange('data', record)}
            />
        </Box>
    );
}


