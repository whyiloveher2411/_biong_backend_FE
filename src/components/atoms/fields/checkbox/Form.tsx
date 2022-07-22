import Checkbox from 'components/atoms/Checkbox'
import FormControl from 'components/atoms/FormControl'
import FormControlLabel from 'components/atoms/FormControlLabel'
import FormGroup from 'components/atoms/FormGroup'
import FormHelperText from 'components/atoms/FormHelperText'
import FormLabel from 'components/atoms/FormLabel'
import React from 'react'
import SpecialNotes from '../SpecialNotes'
import { FieldFormItemProps } from '../type'

export default React.memo(function CheckboxForm({ config, name, post, onReview }: FieldFormItemProps) {

    let valueInital: string[] = [];

    try {
        if (typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post && post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }
    } catch (error) {
        valueInital = [];
    }

    post[name] = valueInital;

    const [value, setValue] = React.useState(0);

    const handleOnClick = (e: React.ChangeEvent<HTMLInputElement>) => {

        let checked = e.target.checked;
        let key = e.target.name;

        if (checked) {
            valueInital.push(key);
        } else {
            let index = valueInital.indexOf(key);
            if (index > -1) {
                valueInital.splice(index, 1);
            }
        }

        post[name] = valueInital;
        onReview(post[name]);
        setValue(value + 1);
    };

    return (
        <FormControl >
            <FormLabel>{config.title}</FormLabel>
            <FormGroup>
                {
                    Object.keys(config.list_option).map(key =>
                        <FormControlLabel
                            key={key}
                            control={<Checkbox value={key} onChange={handleOnClick} checked={valueInital && valueInital.indexOf(key) !== -1} color="primary" name={key} />}
                            label={config.list_option[key].title}
                        />
                    )
                }
            </FormGroup>
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
