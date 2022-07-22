import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import InputLabel from 'components/atoms/InputLabel';
import OutlinedInput from 'components/atoms/OutlinedInput';
import { uuid } from 'helpers/id';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';


export default React.memo(function TextForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    let valueInital = post && post[name] ? post[name] : '';

    const [render, setRender] = React.useState(0);

    const formatCode = config.formatCode ? config.formatCode : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

    const handleOnChange = (e: React.FormEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => {

        post[name] = e.currentTarget.value;
        setRender(prev => prev + 1);
        onReview(post[name]);
    };

    React.useEffect(() => {

        if (!post[name]) {
            onReview(uuid(formatCode).toUpperCase(), name);
            setRender(prev => prev + 1);
        }

    }, []);


    return (
        <FormControl size={config.size ?? 'medium'} fullWidth variant="outlined">
            {
                Boolean(config.title) &&
                <InputLabel {...config.labelProps}>{config.title}</InputLabel>
            }
            <OutlinedInput
                type='text'
                value={valueInital}
                label={config.title ? config.title : undefined}
                onBlur={handleOnChange}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRender(render + 1); post[name] = e.currentTarget.value }}
                placeholder={config.placeholder ?? ''}
                disabled
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton
                            aria-label="random uuid"
                            onClick={() => {
                                onReview(uuid(formatCode).toUpperCase(), name);
                                setRender(prev => prev + 1);
                            }}
                            edge="end"
                        >
                            <Icon icon="Refresh" />
                        </IconButton>
                    </InputAdornment>
                }
                {...config.inputProps}
            />
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

