import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import Icon from 'components/atoms/Icon';
import Typography from 'components/atoms/Typography';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

function normalizePickerColor(value: string): string {
    const trimmed = (value || '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return trimmed;
    }
    if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return `#${trimmed}`;
    }
    return '#000000';
}

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    labelRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    colorPickerBox: {
        width: 48,
        height: 48,
        borderRadius: 10,
        border: '2px solid rgba(0, 0, 0, 0.12)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        boxSizing: 'border-box',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.16)',
        },
        '&:focus-within': {
            boxShadow: '0 0 0 2px #fff, 0 0 0 4px rgba(25, 118, 210, 0.45)',
        },
    },
    inputHidden: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        opacity: 0,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        margin: 0,
    },
    colorSwatchList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    colorSwatchItem: {
        width: 40,
        height: 40,
        borderRadius: 8,
        border: '3px solid rgba(0,0,0,0.15)',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSwatchItemActive: {
        borderColor: '#111',
        boxShadow: '0 0 0 1px #111, 0 0 0 3px #fff',
    },
});

export default React.memo(function ColorForm({ config, post, onReview, name }: FieldFormItemProps) {
    const classes = useStyles();
    const valueInital = post && post[name] ? post[name] : '';
    const pickerColor = normalizePickerColor(valueInital);

    const listOptionColors = React.useMemo(() => {
        if (!Array.isArray(config.list_option)) return [];

        return config.list_option
            .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value: string) => /^#?[0-9A-Fa-f]{6}$/.test(value))
            .map((value: string) => (value.startsWith('#') ? value : `#${value}`));
    }, [config.list_option]);

    const [, setValue] = React.useState(0);
    const latestValueRef = React.useRef(valueInital);
    React.useEffect(() => {
        latestValueRef.current = valueInital;
    }, [valueInital]);

    const syncOnBlur = () => {
        onReview(latestValueRef.current || '');
    };

    const handleChange = (v: string) => {
        setValue((prev) => prev + 1);
        post[name] = v;
        latestValueRef.current = v;
        onReview(v);
    };

    return (
        <FormControl size={config.size ?? 'medium'} fullWidth variant="outlined">
            <Box className={classes.root}>
                <Box className={classes.labelRow}>
                    {config.title ? (
                        <Typography variant="body2" fontWeight={500} color="text.primary">
                            {config.title}
                        </Typography>
                    ) : null}
                    <Box
                        className={classes.colorPickerBox}
                        style={{ backgroundColor: pickerColor }}
                        aria-label={
                            config.title
                                ? `Chọn màu cho ${config.title}`
                                : 'Chọn màu'
                        }
                    >
                        <input
                            className={classes.inputHidden}
                            value={pickerColor}
                            onBlur={syncOnBlur}
                            onChange={(e) => handleChange(e.target.value)}
                            type="color"
                            aria-hidden
                            tabIndex={0}
                        />
                    </Box>
                </Box>

                {Boolean(config.note) && <FormHelperText>{config.note}</FormHelperText>}

                {listOptionColors.length > 0 && (
                    <div className={classes.colorSwatchList}>
                        {listOptionColors.map((hex: string) => {
                            const selected =
                                (valueInital ?? '').toLowerCase() === hex.toLowerCase();
                            return (
                                <div
                                    key={hex}
                                    className={`${classes.colorSwatchItem}${
                                        selected ? ` ${classes.colorSwatchItemActive}` : ''
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    onClick={() => handleChange(hex)}
                                    aria-label={`Chọn màu ${hex}`}
                                >
                                    {selected && (
                                        <Icon
                                            icon="Check"
                                            style={{
                                                color: '#fff',
                                                filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.75))',
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Box>
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    );
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
});
