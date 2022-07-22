import Collapse from 'components/atoms/Collapse';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import FormControl from 'components/atoms/FormControl';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormHelperText from 'components/atoms/FormHelperText';
import Grid from 'components/atoms/Grid';
import Radio from 'components/atoms/Radio';
import RadioGroup from 'components/atoms/RadioGroup';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import React from 'react';

function DateTimeFormat(props: FieldFormItemProps) {
    let { config, name, post, onReview } = props;

    let valueInital = {};

    try {
        if (post[name] && typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name] && post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }
    } catch (error) {
        valueInital = {};
    }

    if (!valueInital) valueInital = {};

    post[name] = valueInital;

    const [value, setValue] = React.useState<{ [key: string]: ANY }>(post[name]);

    React.useEffect(() => {
        setValue((post && post[name]) ? post[name] : '');
        //eslint-disable-next-line
    }, [post]);

    React.useEffect(() => {
        onReview(value);
        //eslint-disable-next-line
    }, [value]);

    return (
        <FormControl fullWidth component="fieldset">
            <Typography>{config.title}</Typography>
            <RadioGroup
                name={name}
                value={value}
            >
                <FormControlLabel onClick={() => setValue({ ...post[name], type: 'default' })} value={'default'} control={<Radio checked={value.type === 'default'} color="primary" />} label={__('Default')} />
                <FormControlLabel style={{ marginTop: 10 }} onClick={() => setValue({ ...post[name], type: 'static-page' })} value={'static-page'} control={<Radio checked={value.type === 'static-page'} color="primary" />} label={__('A Static Page')} />
                <Collapse style={{ paddingLeft: 16, paddingRight: 16, width: '100%', marginTop: 10 }} in={value.type === 'static-page'}>
                    <Grid
                        container
                        spacing={4}>
                        <Grid item md={12} xs={12} >
                            <FieldForm
                                component={'select'}
                                config={{
                                    title: __('Page'),
                                    list_option: config.readingPageStatic,
                                }}
                                post={value}
                                name={'static-page'}
                                onReview={v => { setValue({ ...post[name], type: 'static-page', 'static-page': v }) }}
                            />
                        </Grid>
                    </Grid>
                </Collapse>
                <FormControlLabel onClick={() => setValue({ ...post[name], type: 'custom' })} value={'custom'} control={<Radio checked={value.type === 'custom'} color="primary" />} label={__('Custom')} />
                <Collapse style={{ paddingLeft: 16, paddingRight: 16, width: '100%', marginTop: 10 }} in={value.type === 'custom'}>
                    <Grid
                        container
                        spacing={4}>
                        <Grid item md={12} xs={12} >
                            <FieldForm
                                component={'select'}
                                config={{
                                    title: __('Posts'),
                                    list_option: config.adminObject,
                                }}
                                post={value}
                                name={'post-type'}
                                onReview={(v) => {
                                    setValue((prev) => ({
                                        ...prev,
                                        type: 'custom',
                                        'post-type': v,
                                        'post-id': false,
                                        'post-id_detail': ''
                                    }));
                                }}
                            />
                        </Grid>


                        <Grid item md={12} xs={12} >
                            {
                                Boolean(value['post-type']) &&
                                <FieldForm
                                    component={'relationship_onetomany'}
                                    config={{
                                        title: __('Detail'),
                                        object: value['post-type'],
                                        isRenderAfterOpen: true,
                                    }}
                                    post={value}
                                    name={'post-id'}
                                    onReview={(_key: ANY, v: ANY) => {
                                        setValue((prev) => ({
                                            ...prev,
                                            'post-id': v['post-id'],
                                            'post-id_detail': {
                                                id: v['post-id_detail']?.id,
                                                title: v['post-id_detail']?.title,
                                            }
                                        }))
                                    }}
                                />
                            }

                        </Grid>
                    </Grid>
                </Collapse>
            </RadioGroup>
            <FormHelperText>{config.note}</FormHelperText>
        </FormControl>
    )
}

export default DateTimeFormat
