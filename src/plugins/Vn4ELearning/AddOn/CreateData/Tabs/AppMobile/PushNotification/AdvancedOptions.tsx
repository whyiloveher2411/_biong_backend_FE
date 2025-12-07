import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import Radio from 'components/atoms/Radio';
import RadioGroup from 'components/atoms/RadioGroup';
import FormControlLabel from 'components/atoms/FormControlLabel';
import { AdvancedOptionsState, PriorityType } from './types';

interface AdvancedOptionsProps {
    value: AdvancedOptionsState;
    onChange: (next: AdvancedOptionsState) => void;
}

export default function AdvancedOptions({ value, onChange }: AdvancedOptionsProps) {
    const setPriority = (p: PriorityType) => onChange({ ...value, priority: p });

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Tùy chọn nâng cao</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <RadioGroup row value={value.priority} onChange={(_, v) => setPriority(v as PriorityType)}>
                        <FormControlLabel value="high" control={<Radio />} label="High" />
                        <FormControlLabel value="normal" control={<Radio />} label="Normal" />
                    </RadioGroup>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        type="number"
                        fullWidth
                        label="TTL (giây)"
                        placeholder="Ví dụ: 3600"
                        value={value.ttlSeconds ?? ''}
                        onChange={(e) => onChange({ ...value, ttlSeconds: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        type="datetime-local"
                        label="Lên lịch gửi (tùy chọn)"
                        InputLabelProps={{ shrink: true }}
                        value={value.scheduleAt || ''}
                        onChange={(e) => onChange({ ...value, scheduleAt: e.target.value || null })}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}


