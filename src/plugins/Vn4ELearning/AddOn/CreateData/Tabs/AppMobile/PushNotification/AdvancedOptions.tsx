import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import Typography from 'components/atoms/Typography';
import FieldForm from 'components/atoms/fields/FieldForm';
import { AdvancedOptionsState } from './types';

interface AdvancedOptionsProps {
    value: AdvancedOptionsState;
    onChange: (next: AdvancedOptionsState) => void;
}

export default function AdvancedOptions({ value, onChange }: AdvancedOptionsProps) {
    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Tùy chọn nâng cao</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <FieldForm
                        component="select"
                        config={{
                            title: "Độ ưu tiên",
                            list_option: {
                                high: { title: "High" },
                                normal: { title: "Normal" }
                            }
                        }}
                        name="priority"
                        post={value}
                        onReview={(v) => onChange({ ...value, priority: v })}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FieldForm
                        component="number"
                        config={{ title: "TTL (giây)", placeholder: "Ví dụ: 3600" }}
                        name="ttlSeconds"
                        post={value}
                        onReview={(v) => onChange({ ...value, ttlSeconds: v })}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FieldForm
                        component="date_time"
                        config={{ title: "Lên lịch gửi (tùy chọn)" }}
                        name="scheduleAt"
                        post={value}
                        onReview={(v) => onChange({ ...value, scheduleAt: v })}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}


