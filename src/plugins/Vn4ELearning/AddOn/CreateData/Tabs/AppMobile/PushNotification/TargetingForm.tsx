import React from 'react';
import Box from 'components/atoms/Box';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import Radio from 'components/atoms/Radio';
import RadioGroup from 'components/atoms/RadioGroup';
import FormControlLabel from 'components/atoms/FormControlLabel';
import { TargetingState, TargetType } from './types';

interface TargetingFormProps {
    value: TargetingState;
    onChange: (next: TargetingState) => void;
}

export default function TargetingForm({ value, onChange }: TargetingFormProps) {
    const setType = (type: TargetType) => onChange({ type });

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Nhắm mục tiêu</Typography>
            <RadioGroup row value={value.type} onChange={(_, v) => setType(v as TargetType)}>
                <FormControlLabel value="single" control={<Radio />} label="Single Device" />
                <FormControlLabel value="multicast" control={<Radio />} label="Multicast" />
                <FormControlLabel value="topic" control={<Radio />} label="Topic" />
                <FormControlLabel value="deviceGroup" control={<Radio />} label="Device Group" />
            </RadioGroup>
            <Divider sx={{ my: 2 }} />

            {value.type === 'single' && (
                <TextField fullWidth label="FCM Token" value={value.token || ''} onChange={(e) => onChange({ ...value, token: e.target.value })} />
            )}

            {value.type === 'multicast' && (
                <TextField
                    fullWidth
                    label="Danh sách token (mỗi dòng 1 token, tối đa 500)"
                    multiline
                    minRows={4}
                    value={(value.tokens || []).join('\n')}
                    onChange={(e) => onChange({ ...value, tokens: e.target.value.split(/\n+/).map(s => s.trim()).filter(Boolean) })}
                />
            )}

            {value.type === 'topic' && (
                <TextField fullWidth label="Topic" placeholder="news, promotions..." value={value.topic || ''} onChange={(e) => onChange({ ...value, topic: e.target.value })} />
            )}

            {value.type === 'deviceGroup' && (
                <TextField fullWidth label="Notification Key (Device Group)" value={value.notificationKey || ''} onChange={(e) => onChange({ ...value, notificationKey: e.target.value })} />
            )}
        </Box>
    );
}


