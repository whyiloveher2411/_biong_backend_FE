import { makeStyles } from '@mui/styles'
import FormControl from 'components/atoms/FormControl'
import FormHelperText from 'components/atoms/FormHelperText'
import Icon from 'components/atoms/Icon'
import IconButton from 'components/atoms/IconButton'
import InputAdornment from 'components/atoms/InputAdornment'
import InputLabel from 'components/atoms/InputLabel'
import OutlinedInput from 'components/atoms/OutlinedInput'
import React from 'react'
import SpecialNotes from '../SpecialNotes'
import { FieldFormItemProps } from '../type'

const useStyles = makeStyles({
    inputHidden: {
        width: '100%',
        top: 0,
        position: 'absolute',
        bottom: 0,
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
    },
    colorSwatchList: {
        marginTop: 8,
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
})

export default React.memo(function ColorForm({ config, post, onReview, name }: FieldFormItemProps) {

    const classes = useStyles()
    const valueInital = post && post[name] ? post[name] : '';
    const listOptionColors = React.useMemo(() => {
        if (!Array.isArray(config.list_option)) return [];

        return config.list_option
            .map((value: unknown) => typeof value === 'string' ? value.trim() : '')
            .filter((value: string) => /^#?[0-9A-Fa-f]{6}$/.test(value))
            .map((value: string) => value.startsWith('#') ? value : `#${value}`);
    }, [config.list_option]);

    const [, setValue] = React.useState(0);
    const latestValueRef = React.useRef(valueInital);
    React.useEffect(() => { latestValueRef.current = valueInital; }, [valueInital]);
    const syncOnBlur = () => { onReview(latestValueRef.current || ''); };

    const handleChange = (v: string) => {
        setValue(prev => prev + 1);
        post[name] = v;
        latestValueRef.current = v;
        onReview(v);
    };

    return (
        <FormControl size={config.size ?? 'medium'} fullWidth variant="outlined">
            {
                config.title ?
                    <>
                        <InputLabel {...config.labelProps}>{config.title}</InputLabel>
                        <OutlinedInput
                            fullWidth
                            type='text'
                            style={{ color: valueInital }}
                            value={valueInital}
                            onBlur={syncOnBlur}
                            onChange={e => handleChange(e.target.value)}
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="Color picker"
                                        edge="end"
                                    >
                                        <Icon icon="ColorLens" />
                                        <input className={classes.inputHidden} value={valueInital} onBlur={syncOnBlur} onChange={e => handleChange(e.target.value)} type="color" />
                                    </IconButton>
                                </InputAdornment>
                            }
                            label={config.title}
                            {...config.inputProps}
                        />
                    </>
                    :
                    <OutlinedInput
                        fullWidth
                        type='text'
                        style={{ color: valueInital }}
                        value={valueInital}
                        onBlur={syncOnBlur}
                        onChange={e => handleChange(e.target.value)}
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="Color picker"
                                    edge="end"
                                >
                                    <Icon icon="ColorLens" />
                                    <input className={classes.inputHidden} value={valueInital} onBlur={syncOnBlur} onChange={e => handleChange(e.target.value)} type="color" />
                                </IconButton>
                            </InputAdornment>
                        }
                        {...config.inputProps}
                    />
            }
            {
                Boolean(config.note) &&
                <FormHelperText>{config.note}</FormHelperText>
            }
            {
                listOptionColors.length > 0 && (
                    <div className={classes.colorSwatchList}>
                        {listOptionColors.map((hex: string) => {
                            const selected = (valueInital ?? '').toLowerCase() === hex.toLowerCase();
                            return (
                                <div
                                    key={hex}
                                    className={`${classes.colorSwatchItem}${selected ? ` ${classes.colorSwatchItemActive}` : ''}`}
                                    style={{ backgroundColor: hex }}
                                    onClick={() => handleChange(hex)}
                                    aria-label={`Chọn màu ${hex}`}
                                >
                                    {selected && (
                                        <Icon
                                            icon="Check"
                                            style={{ color: '#fff', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.75))' }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            }
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

