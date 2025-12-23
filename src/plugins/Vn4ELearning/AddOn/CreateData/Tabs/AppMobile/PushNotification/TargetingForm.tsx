import React from 'react';
import Box from 'components/atoms/Box';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import Radio from 'components/atoms/Radio';
import RadioGroup from 'components/atoms/RadioGroup';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FieldForm from 'components/atoms/fields/FieldForm';
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
                <FieldForm
                    component="text"
                    config={{ title: "FCM Token" }}
                    name="token"
                    post={value}
                    onReview={(v) => onChange({ ...value, token: v })}
                />
            )}

            {value.type === 'multicast' && (
                <FieldForm
                    component="textarea"
                    config={{ title: "Danh sách token (mỗi dòng 1 token, tối đa 500)" }}
                    name="tokens_str"
                    post={{ tokens_str: (value.tokens || []).join('\n') }}
                    onReview={(v) => onChange({ ...value, tokens: v.split(/\n+/).map((s: string) => s.trim()).filter(Boolean) })}
                />
            )}

            {value.type === 'topic' && (
                <FieldForm
                    component="text"
                    config={{ title: "Topic", placeholder: "news, promotions..." }}
                    name="topic"
                    post={value}
                    onReview={(v) => onChange({ ...value, topic: v })}
                />
            )}

            {value.type === 'deviceGroup' && (
                <FieldForm
                    component="text"
                    config={{ title: "Notification Key (Device Group)" }}
                    name="notificationKey"
                    post={value}
                    onReview={(v) => onChange({ ...value, notificationKey: v })}
                />
            )}
        </Box>
    );
}


