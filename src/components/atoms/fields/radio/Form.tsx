import Typography from 'components/atoms/Typography';
import RadioGroup from 'components/atoms/RadioGroup';
import Radio from 'components/atoms/Radio';
import FormHelperText from 'components/atoms/FormHelperText';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormControl from 'components/atoms/FormControl';
import React from 'react';
import { FieldFormItemProps } from '../type';
import SpecialNotes from '../SpecialNotes';

export default React.memo(function RadioField({ config, name, post, onReview }: FieldFormItemProps) {

    let valueInital = post && post[name] ? post[name] : '';

    const [value, setValue] = React.useState(0);

    console.log('render RADIO');
    return (
        <FormControl component="fieldset">
            <Typography>{config.title}</Typography>
            <RadioGroup
                aria-label={config.title}
                name={name}
                value={valueInital}
                {...config}
                onChange={e => { post[name] = valueInital = e.target.value; onReview(e.target.value); setValue(value + 1); }}
            >
                {
                    Object.keys(config.list_option).map(key =>
                        <FormControlLabel key={key} value={key} control={<Radio color="primary" />} label={config.list_option[key].title} />
                    )
                }
            </RadioGroup>
            <FormHelperText>{config.note}</FormHelperText>
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
