import React from 'react'
import FormControl from 'components/atoms/FormControl';
import InputLabel from 'components/atoms/InputLabel';
import OutlinedInput from 'components/atoms/OutlinedInput';
import FormHelperText from 'components/atoms/FormHelperText';
import { FieldFormItemProps } from '../type';
import SpecialNotes from '../SpecialNotes';

export default React.memo(function EmailForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    let valueInital = post && post[name] ? post[name] : '';

    const [render, setRender] = React.useState(0);

    const handleOnChange = (e: React.FormEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => {

        post[name] = e.currentTarget.value;

        onReview(post[name]);
    };


    console.log('render EMAIL');

    return (
        <FormControl size={config.size ?? 'medium'} fullWidth variant="outlined">
            {
                (config.title) ?
                    <>
                        <InputLabel {...config.labelProps}>{config.title}</InputLabel>
                        <OutlinedInput
                            type={config.type}
                            value={valueInital}
                            label={config.title}
                            onBlur={handleOnChange}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRender(render + 1); post[name] = e.currentTarget.value }}
                            placeholder={config.placeholder ?? ''}
                            {...config.inputProps}
                        />
                    </>
                    :
                    <OutlinedInput
                        type='text'
                        value={valueInital}
                        onBlur={handleOnChange}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRender(render + 1); post[name] = e.currentTarget.value }}
                        placeholder={config.placeholder ?? ''}
                        {...config.inputProps}
                    />
            }

            {

                config.maxLength ?
                    <FormHelperText style={{ display: 'flex', justifyContent: 'space-between' }} >
                        {Boolean(config.note) && <span dangerouslySetInnerHTML={{ __html: config.note }}></span>}
                        <span style={{ marginLeft: 24, whiteSpace: 'nowrap' }}>{valueInital.length + '/' + config.maxLength}</span>
                    </FormHelperText>
                    :
                    config.note ?
                        <FormHelperText><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
                        : null
            }
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )

}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

