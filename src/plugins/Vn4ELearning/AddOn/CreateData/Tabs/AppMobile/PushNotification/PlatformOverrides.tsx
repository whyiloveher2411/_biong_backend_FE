import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import Divider from 'components/atoms/Divider';
import Typography from 'components/atoms/Typography';
import { Tab, Tabs } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { PlatformOverridesState } from './types';

interface PlatformOverridesProps {
    value: PlatformOverridesState;
    onChange: (next: PlatformOverridesState) => void;
}

export default function PlatformOverrides({ value, onChange }: PlatformOverridesProps) {
    const [tab, setTab] = React.useState<'android' | 'ios'>('android');

    const handleChange = (platform: 'android' | 'ios', field: string, val: ANY) => {
        onChange({ ...value, [platform]: { ...value[platform], [field]: val } });
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">Tùy chỉnh nền tảng</Typography>
                <Tabs value={tab} onChange={(_, v: ANY) => setTab(v)}>
                    <Tab value="android" label="Android" />
                    <Tab value="ios" label="iOS" />
                </Tabs>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {tab === 'android' && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <FieldForm component="text" config={{ title: "channel_id" }} name="channelId" post={value.android} onReview={(v) => handleChange('android', 'channelId', v)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FieldForm component="text" config={{ title: "sound" }} name="sound" post={value.android} onReview={(v) => handleChange('android', 'sound', v)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FieldForm component="image" config={{ title: "iconUrl" }} name="iconUrl" post={value.android} onReview={(v) => handleChange('android', 'iconUrl', v)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FieldForm component="image" config={{ title: "imageUrl" }} name="imageUrl" post={value.android} onReview={(v) => handleChange('android', 'imageUrl', v)} />
                    </Grid>
                    <Grid item xs={12}>
                        <FieldForm component="text" config={{ title: "click_action" }} name="clickAction" post={value.android} onReview={(v) => handleChange('android', 'clickAction', v)} />
                    </Grid>
                </Grid>
            )}

            {tab === 'ios' && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <FieldForm component="number" config={{ title: "badge" }} name="badge" post={value.ios} onReview={(v) => handleChange('ios', 'badge', v)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FieldForm component="text" config={{ title: "sound" }} name="sound" post={value.ios} onReview={(v) => handleChange('ios', 'sound', v)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FieldForm component="text" config={{ title: "category" }} name="category" post={value.ios} onReview={(v) => handleChange('ios', 'category', v)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FieldForm component="image" config={{ title: "imageUrl" }} name="imageUrl" post={value.ios} onReview={(v) => handleChange('ios', 'imageUrl', v)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FieldForm component="true_false" config={{ title: "mutable-content" }} name="mutableContent" post={value.ios} onReview={(v) => handleChange('ios', 'mutableContent', v)} />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}


