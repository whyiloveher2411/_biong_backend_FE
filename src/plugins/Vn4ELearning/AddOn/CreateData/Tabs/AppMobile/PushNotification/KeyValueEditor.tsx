import React from 'react';
import Box from 'components/atoms/Box';
import Grid from 'components/atoms/Grid';
import TextField from 'components/atoms/TextField';
import IconButton from 'components/atoms/IconButton';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import Button from 'components/atoms/Button';
import { Add, DeleteOutline } from '@mui/icons-material';
import { KeyValueItem } from './types';

interface KeyValueEditorProps {
    label?: string;
    value: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
}

function createId() {
    return Math.random().toString(36).slice(2, 10);
}

export default function KeyValueEditor({ label = 'Data Payload', value, onChange }: KeyValueEditorProps) {
    const [items, setItems] = React.useState<KeyValueItem[]>([]);

    React.useEffect(() => {
        const next: KeyValueItem[] = Object.entries(value || {}).map(([key, val]) => ({ id: createId(), key, value: String(val ?? '') }));
        setItems(next);
    }, [value]);

    const syncBack = (list: KeyValueItem[]) => {
        const record: Record<string, string> = {};
        list.forEach(it => {
            if (it.key) record[it.key] = it.value ?? '';
        });
        onChange(record);
    };

    const addRow = () => {
        const next = [...items, { id: createId(), key: '', value: '' }];
        setItems(next);
    };

    const removeRow = (id: string) => {
        const next = items.filter(it => it.id !== id);
        setItems(next);
        syncBack(next);
    };

    const updateRow = (id: string, field: 'key' | 'value', val: string) => {
        const next = items.map(it => (it.id === id ? { ...it, [field]: val } : it));
        setItems(next);
        syncBack(next);
    };

    const hasDuplicateKeys = React.useMemo(() => {
        const keys = items.map(it => it.key).filter(Boolean);
        return new Set(keys).size !== keys.length;
    }, [items]);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
                <Button size="small" startIcon={<Add />} onClick={addRow} variant="outlined">Thêm</Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={1}>
                {items.map((item) => (
                    <React.Fragment key={item.id}>
                        <Grid item xs={5}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Key"
                                value={item.key}
                                onChange={(e) => updateRow(item.id, 'key', e.target.value)}
                                error={hasDuplicateKeys && !!item.key && items.filter(it => it.key === item.key).length > 1}
                                helperText={hasDuplicateKeys && !!item.key && items.filter(it => it.key === item.key).length > 1 ? 'Trùng key' : ' '}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Value"
                                value={item.value}
                                onChange={(e) => updateRow(item.id, 'value', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Tooltip title="Xoá">
                                <IconButton size="small" color="error" onClick={() => removeRow(item.id)}>
                                    <DeleteOutline fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                    </React.Fragment>
                ))}
            </Grid>
            {items.length === 0 && (
                <Box sx={{ color: 'text.secondary', fontSize: 13, mt: 1 }}>Chưa có dữ liệu ẩn</Box>
            )}
        </Box>
    );
}


