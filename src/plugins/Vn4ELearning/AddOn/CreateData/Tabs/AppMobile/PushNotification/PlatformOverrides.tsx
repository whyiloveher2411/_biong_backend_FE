import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import { Tab, Tabs } from '@mui/material';
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
                        <TextField label="channel_id" fullWidth value={value.android.channelId || ''} onChange={(e) => handleChange('android', 'channelId', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField label="sound" fullWidth value={value.android.sound || ''} onChange={(e) => handleChange('android', 'sound', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField label="iconUrl" fullWidth value={value.android.iconUrl || ''} onChange={(e) => handleChange('android', 'iconUrl', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField label="imageUrl" fullWidth value={value.android.imageUrl || ''} onChange={(e) => handleChange('android', 'imageUrl', e.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="click_action" fullWidth value={value.android.clickAction || ''} onChange={(e) => handleChange('android', 'clickAction', e.target.value)} />
                    </Grid>
                </Grid>
            )}

            {tab === 'ios' && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField type="number" label="badge" fullWidth value={value.ios.badge ?? ''} onChange={(e) => handleChange('ios', 'badge', e.target.value === '' ? undefined : Number(e.target.value))} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="sound" fullWidth value={value.ios.sound || ''} onChange={(e) => handleChange('ios', 'sound', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="category" fullWidth value={value.ios.category || ''} onChange={(e) => handleChange('ios', 'category', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField label="imageUrl" fullWidth value={value.ios.imageUrl || ''} onChange={(e) => handleChange('ios', 'imageUrl', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField label="mutable-content (true/false)" fullWidth value={String(value.ios.mutableContent ?? '')} onChange={(e) => handleChange('ios', 'mutableContent', e.target.value === 'true')} />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}


