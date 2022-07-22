import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import InputLabel from 'components/atoms/InputLabel';
import OutlinedInput from 'components/atoms/OutlinedInput';
import TextareaAutosize from 'components/atoms/TextareaAutosize';
import { __ } from 'helpers/i18n';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

const useStyles = makeStyles({
    editor: {
        '&>.MuiInputLabel-outlined.MuiInputLabel-shrink': {
            transform: 'translate(14px, -11px) scale(0.75)'
        },
        '&>.MuiInputBase-root>textarea, &>label': {
            lineHeight: 2.2
        },
        lineHeight: '24px',
    },
})


export default React.memo(function TextareaForm(props: FieldFormItemProps) {

    const { config, post, name, onReview } = props;
    const classes = useStyles()

    const valueInital = post && post[name] ? post[name] : '';
    const [, setRender] = React.useState(0);

    const { showMessage } = useFloatingMessages();

    console.log('render Json');

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                alignItems: 'flex-end',
            }}
        >
            <FormControl fullWidth variant="outlined">
                {
                    config.title ?
                        <>
                            <InputLabel {...config.labelProps}>{config.title}</InputLabel>
                            <OutlinedInput
                                type='textarea'
                                name={name}
                                rows={config.rows ?? 1}
                                multiline
                                value={valueInital}
                                className={classes.editor}
                                label={config.title}
                                onBlur={e => { onReview(e.target.value, name); setRender(prev => prev + 1); }}
                                onChange={e => { setRender(prev => prev + 1); post[name] = e.target.value }}
                                inputComponent={TextareaAutosize}
                                {...config.inputProps}

                            />
                        </>
                        :
                        <OutlinedInput
                            type='textarea'
                            name={name}
                            rows={config.rows ?? 1}
                            multiline
                            value={valueInital}
                            className={classes.editor}
                            onBlur={e => { onReview(e.target.value, name); setRender(prev => prev + 1); }}
                            onChange={e => { setRender(prev => prev + 1); post[name] = e.target.value }}
                            inputComponent={TextareaAutosize}
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
            <Button variant='contained' onClick={() => {

                try {
                    onReview(JSON.stringify(JSON.parse(post[name]), undefined, 4), name);
                    setRender(prev => prev + 1);
                } catch (error) {
                    showMessage(__('Please enter the correct Json format'));
                }

            }}>{__('JSON format')}</Button>
        </Box>

    )
}, (props1, props2) => {

    if (props1.forceUpdate) {
        return false;
    }

    return props1.post[props1.name] === props2.post[props2.name];
})


