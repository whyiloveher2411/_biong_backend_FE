import React from 'react'
import TextField from 'components/atoms/TextField';
import { FieldFormItemProps } from '../type';
import SpecialNotes from '../SpecialNotes';

export default React.memo(function LinkForm({ config, post, onReview, name }: FieldFormItemProps) {

    let valueInital = post && post[name] ? post[name] : '';

    const [value, setValue] = React.useState(0);

    console.log('render TEXT');

    return (
        <>
            <TextField
                fullWidth
                variant="outlined"
                name={name}
                value={valueInital}
                label={config.title}
                helperText={config.note}
                onBlur={e => { onReview(e.target.value) }}
                onChange={e => { setValue(value + 1); post[name] = e.target.value }}
                {...config.inputProps}
            />
            <SpecialNotes specialNotes={config.special_notes} />
        </>
    )

}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

