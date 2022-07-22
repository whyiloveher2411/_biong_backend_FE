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
})

export default React.memo(function ColorForm({ config, post, onReview, name }: FieldFormItemProps) {

    const classes = useStyles()
    const valueInital = post && post[name] ? post[name] : '';

    const [value, setValue] = React.useState(0);

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
                            onBlur={e => { onReview(e.target.value) }}
                            onChange={e => { setValue(value + 1); post[name] = e.target.value }}
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="Color picker"
                                        edge="end"
                                    >
                                        <Icon icon="ColorLens" />
                                        <input className={classes.inputHidden} value={valueInital} onBlur={e => { onReview(e.target.value) }} onChange={e => { setValue(value + 1); post[name] = e.target.value }} type="color" />
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
                        onBlur={e => { onReview(e.target.value) }}
                        onChange={e => { setValue(value + 1); post[name] = e.target.value }}
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="Color picker"
                                    edge="end"
                                >
                                    <Icon icon="ColorLens" />
                                    <input className={classes.inputHidden} value={valueInital} onBlur={e => { onReview(e.target.value) }} onChange={e => { setValue(value + 1); post[name] = e.target.value }} type="color" />
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
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

