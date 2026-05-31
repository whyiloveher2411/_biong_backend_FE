import { Theme } from '@mui/material';
import Button from 'components/atoms/Button';
import Dialog from 'components/atoms/Dialog';
import DialogActions from 'components/atoms/DialogActions';
import DialogContent from 'components/atoms/DialogContent';
import DialogContentText from 'components/atoms/DialogContentText';
import DialogTitle from 'components/atoms/DialogTitle';
import Box from 'components/atoms/Box';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Grid from 'components/atoms/Grid';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import { Delete, Add } from '@mui/icons-material';
import React from 'react';
import FieldForm from '../FieldForm';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        width: '100%',
        padding: 24,
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        backgroundColor: '#a4a4a44a',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
    },
    rowField: {
        flex: 1,
        minWidth: 0,
    },
    addRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing(2),
        marginTop: theme.spacing(2),
        paddingTop: theme.spacing(2),
        borderTop: `1px solid ${theme.palette.divider}`,
    },
    emptyState: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(2),
        color: theme.palette.text.secondary,
    },
    keyError: {
        marginTop: theme.spacing(0.5),
    },
}));

export function humanizeFieldKey(key: string): string {
    return key
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function parseGroupValue(post: JsonFormat, name: string): JsonFormat {
    try {
        if (typeof post[name] === 'object' && post[name] !== null && !Array.isArray(post[name])) {
            return { ...post[name] };
        }
        if (post[name]) {
            const parsed = JSON.parse(post[name]);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch {
        // ignore parse errors
    }
    return {};
}

function sortedKeys(obj: JsonFormat): string[] {
    return Object.keys(obj).sort((a, b) => a.localeCompare(b));
}

export default React.memo(function DynamicGroupForm(props: FieldFormItemProps) {
    const classes = useStyles();
    const { config, post, name, onReview } = props;

    const valueView = config.value_view || 'number';

    let valueInitial = parseGroupValue(post, name);
    post[name] = valueInitial;

    const [, setRender] = React.useState(0);
    const [newKeyInput, setNewKeyInput] = React.useState('');
    const [keyError, setKeyError] = React.useState('');
    const [deleteConfirmKey, setDeleteConfirmKey] = React.useState<string | null>(null);

    const commitValue = (next: JsonFormat) => {
        post[name] = next;
        onReview(next);
        setRender((prev) => prev + 1);
    };

    const onChangeField = (value: ANY, fieldKey: string) => {
        if (typeof post[name] !== 'object' || post[name] === null) {
            post[name] = {};
        }
        post[name] = {
            ...post[name],
            [fieldKey]: value,
        };
        onReview(post[name]);
        setRender((prev) => prev + 1);
    };

    const handleAddKey = () => {
        const trimmed = newKeyInput.trim();
        if (!trimmed) {
            setKeyError('Vui lòng nhập tên key.');
            return;
        }
        if (!KEY_PATTERN.test(trimmed)) {
            setKeyError('Key phải dùng snake_case: chữ thường, số, gạch dưới (vd. marketing_news).');
            return;
        }
        const current = parseGroupValue(post, name);
        if (Object.prototype.hasOwnProperty.call(current, trimmed)) {
            setKeyError(`Key "${trimmed}" đã tồn tại.`);
            return;
        }
        setKeyError('');
        setNewKeyInput('');
        commitValue({
            ...current,
            [trimmed]: 0,
        });
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirmKey) return;
        const current = parseGroupValue(post, name);
        const next = { ...current };
        delete next[deleteConfirmKey];
        setDeleteConfirmKey(null);
        commitValue(next);
    };

    const keys = sortedKeys(
        typeof post[name] === 'object' && post[name] !== null ? post[name] : {}
    );

    return (
        <FormControl className={classes.root} component="div">
            <FormLabel component="legend" sx={{ fontSize: 20, fontWeight: 500, mb: 1 }}>
                {config.title}
            </FormLabel>
            {Boolean(config.note) && (
                <FormHelperText sx={{ marginTop: 4 }}>
                    <span dangerouslySetInnerHTML={{ __html: config.note }} />
                </FormHelperText>
            )}
            <SpecialNotes specialNotes={config.special_notes} />

            {keys.length === 0 ? (
                <Typography variant="body2" className={classes.emptyState}>
                    Chưa có key nào. Thêm key đầu tiên bên dưới.
                </Typography>
            ) : (
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    {keys.map((key) => (
                        <Grid item xs={12} key={key}>
                            <Box className={classes.row}>
                                <Box className={classes.rowField}>
                                    <FieldForm
                                        component={valueView}
                                        config={{
                                            title: humanizeFieldKey(key),
                                            ...(valueView === 'number'
                                                ? {
                                                    activeSubtraction: true,
                                                    activeAddition: true,
                                                    min: 0,
                                                    step: 1,
                                                }
                                                : {}),
                                        }}
                                        post={post[name] ?? {}}
                                        name={key}
                                        onReview={(value) => onChangeField(value, key)}
                                    />
                                </Box>
                                <IconButton
                                    aria-label={`Xóa key ${key}`}
                                    color="error"
                                    size="small"
                                    onClick={() => setDeleteConfirmKey(key)}
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Box className={classes.addRow}>
                <TextField
                    label="Thêm key mới"
                    placeholder="vd. marketing_news"
                    value={newKeyInput}
                    size="small"
                    sx={{ flex: 1 }}
                    onChange={(e) => {
                        setNewKeyInput(e.target.value);
                        if (keyError) setKeyError('');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKey();
                        }
                    }}
                />
                <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddKey}
                    sx={{ mt: 0.5, flexShrink: 0 }}
                >
                    Thêm key
                </Button>
            </Box>
            {keyError ? (
                <FormHelperText error className={classes.keyError}>
                    {keyError}
                </FormHelperText>
            ) : null}

            <Dialog open={deleteConfirmKey !== null} onClose={() => setDeleteConfirmKey(null)}>
                <DialogTitle>Xóa key?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc muốn xóa key{' '}
                        <strong>{deleteConfirmKey ? humanizeFieldKey(deleteConfirmKey) : ''}</strong>
                        {deleteConfirmKey ? ` (${deleteConfirmKey})` : ''}? Hành động này có hiệu lực sau khi bấm Update.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmKey(null)}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={handleConfirmDelete}>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </FormControl>
    );
}, (props1, props2) => props1.post[props1.name] === props2.post[props2.name]);
