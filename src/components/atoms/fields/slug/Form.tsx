import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import InputLabel from 'components/atoms/InputLabel';
import OutlinedInput from 'components/atoms/OutlinedInput';
import InputAdornment from 'components/atoms/InputAdornment';
import IconButton from 'components/atoms/IconButton';
import Icon from 'components/atoms/Icon';
import Tooltip from 'components/atoms/Tooltip';

import { __ } from 'helpers/i18n';
import React from 'react';
import { FieldFormItemProps } from '../type';
import { convertToSlug } from 'helpers/string';
import SpecialNotes from '../SpecialNotes';

export default React.memo(function TextForm({ config, post, onReview, name }: FieldFormItemProps) {

    let valueInital = post && post[name] ? post[name] : '';

    const [, setRender] = React.useState(0);

    console.log('render Slug');

    const handleOnChange = (e: React.FormEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => {

        post[name] = e.currentTarget.value;

        setRender(prev => prev + 1);

        onReview(post[name]);
    };

    return (
        <FormControl size={config.size ?? 'medium'} fullWidth variant="outlined">
            {
                config.title ?
                    <>
                        <InputLabel {...config.labelProps}>{config.title}</InputLabel>
                        <OutlinedInput
                            type='text'
                            value={valueInital}
                            label={config.title}
                            onBlur={handleOnChange}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRender(prev => prev + 1); post[name] = e.currentTarget.value }}
                            placeholder={config.placeholder ?? ''}
                            endAdornment={
                                config.referenceKey ?
                                    <InputAdornment position="end">
                                        <Tooltip title={__('Automatically generate slug based on "{{field}}" field', {
                                            field: config.referenceKey
                                        })}>
                                            <IconButton
                                                aria-label="Sync slug"
                                                onClick={() => {
                                                    onReview(convertToSlug(post[config.referenceKey]), name);
                                                    setRender(prev => prev + 1);
                                                }}
                                                size="large"
                                            >
                                                <Icon icon="SyncAlt" />
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                    : <></>
                            }
                            {...config.inputProps}
                        />
                    </>
                    :
                    <OutlinedInput
                        type='text'
                        value={valueInital}
                        onBlur={handleOnChange}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRender(prev => prev + 1); post[name] = e.currentTarget.value }}
                        placeholder={config.placeholder ?? ''}
                        {...config.inputProps}
                    />
            }

            {

                config.maxLength ?
                    <FormHelperText style={{ display: 'flex', justifyContent: 'space-between' }} >
                        {Boolean(config.note) && <span dangerouslySetInnerHTML={{ __html: config.note ?? __('Clean URLs, also sometimes referred to as RESTful URLs, user-friendly URLs, pretty URLs or search engine-friendly URLs') }}></span>}
                        <span style={{ marginLeft: 24, whiteSpace: 'nowrap' }}>{valueInital.length + '/' + config.maxLength}</span>
                    </FormHelperText>
                    :
                    <FormHelperText><span dangerouslySetInnerHTML={{ __html: config.note ?? __('Clean URLs, also sometimes referred to as RESTful URLs, user-friendly URLs, pretty URLs or search engine-friendly URLs') }}></span></FormHelperText>
            }
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )

}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

