import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import InputLabel from 'components/atoms/InputLabel';
import OutlinedInput from 'components/atoms/OutlinedInput';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import TooltipAiSuggest, { useTooltipAiSuggest } from '../TooltipAiSuggest';
import { FieldFormItemProps } from '../type';

export default React.memo(function TextForm({ config, post, onReview, name, dataPostType, ...rest }: FieldFormItemProps) {

    let valueInital = post && post[name] !== undefined ? post[name] : '';

    const [render, setRender] = React.useState(0);

    const tooltipAiSuggest = useTooltipAiSuggest({
        config,
        onAccept: (result: string) => {
            post[name] = result;
            setRender(prev => prev + 1);
            onReview(post[name]);
        },
        name,
        post,
        dataPostType,
    });

    const handleOnChange = (e: React.FormEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => {

        post[name] = e.currentTarget.value;

        setRender(prev => prev + 1);

        onReview(post[name]);
    };


    return (<TooltipAiSuggest
        {...tooltipAiSuggest.tooltipAiSuggestProps}
    >
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
                onSelectCapture={(e: React.SyntheticEvent<HTMLDivElement, Event>) => {
                    tooltipAiSuggest.setTextSelected(window.getSelection()?.toString() ?? '');
                }}

                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRender(render + 1); post[name] = e.currentTarget.value }}
                placeholder={config.placeholder ?? ''}
                {...config.inputProps}
                startAdornment={tooltipAiSuggest.startAdornment}
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
    </TooltipAiSuggest>
    )

}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

