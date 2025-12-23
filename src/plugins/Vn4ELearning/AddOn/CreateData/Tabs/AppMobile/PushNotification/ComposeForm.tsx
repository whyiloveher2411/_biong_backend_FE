import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import Typography from 'components/atoms/Typography';
import FieldForm from 'components/atoms/fields/FieldForm';
import { NotificationPayload } from './types';

interface ComposeFormProps {
    value: NotificationPayload;
    onChange: (next: NotificationPayload) => void;
}

export default function ComposeForm({ value, onChange }: ComposeFormProps) {
    const handleReview = (field: keyof NotificationPayload, v: ANY) => {
        let finalValue = v;
        if (field === 'data' && typeof v === 'string') {
            try {
                finalValue = JSON.parse(v);
            } catch (e) {
                finalValue = value.data;
            }
        }
        onChange({ ...value, [field]: finalValue });
    };

    // Need a temporary object for JSON field because it expects a string in post[name]
    const postWithJsonStr = React.useMemo(() => ({
        ...value,
        data: JSON.stringify(value.data || {}, null, 4)
    }), [value.data]);

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Soạn nội dung
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <FieldForm
                        component="text"
                        config={{ title: "Title" }}
                        name="title"
                        post={value}
                        onReview={(v) => handleReview('title', v)}
                    />
                </Grid>
                <Grid item xs={12}>
                    <FieldForm
                        component="textarea"
                        config={{ title: "Body" }}
                        name="body"
                        post={value}
                        onReview={(v) => handleReview('body', v)}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FieldForm
                        component="image"
                        config={{ title: "Notification Image URL" }}
                        name="imageUrl"
                        post={value}
                        onReview={(v) => handleReview('imageUrl', v)}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FieldForm
                        component="image"
                        config={{ title: "Icon URL" }}
                        name="iconUrl"
                        post={value}
                        onReview={(v) => handleReview('iconUrl', v)}
                    />
                </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
                <FieldForm
                    component="repeater"
                    config={{ title: "Data Payload (ẩn)", sub_fields: {
                        key: { title: "Key", type: "text" },
                        value: { title: "Value", type: "text" }
                    } }}
                    name="data"
                    post={postWithJsonStr}
                    onReview={(v) => handleReview('data', v)}
                />
            </Box>
        </Box>
    );
}


