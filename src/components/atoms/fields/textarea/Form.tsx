import React from 'react'
import OutlinedInput from 'components/atoms/OutlinedInput';
import InputLabel from 'components/atoms/InputLabel';
import FormHelperText from 'components/atoms/FormHelperText';
import FormControl from 'components/atoms/FormControl';
import { FieldFormItemProps } from '../type';
import { makeStyles } from '@mui/styles';
import { TextareaAutosize } from '@mui/material';
import SpecialNotes from '../SpecialNotes';
import TooltipAiSuggest, { useTooltipAiSuggest } from '../TooltipAiSuggest';


const useStyles = makeStyles({
    editor: {
        '&>.MuiInputLabel-outlined.MuiInputLabel-shrink': {
            transform: 'translate(14px, -11px) scale(0.75)'
        },
        '&>.MuiInputBase-root>textarea, &>label': {
            lineHeight: 2.2
        },
        '& .MuiInputBase-root': {
            width: '100%',
        },
        '& textarea': {
            width: '100% !important',
            boxSizing: 'border-box',
            paddingTop: 30,
            paddingBottom: 30,
        },
        lineHeight: '24px',
        width: '100%',
    },
    textareaContainer: {
        position: 'relative',
        width: '100%',
    },
    collapsedTextarea: {
        '& textarea': {
            maxHeight: 180,
            overflow: 'hidden !important',
        },
    },
    fadeOverlay: {
        position: 'absolute',
        left: 1,
        right: 1,
        bottom: 1,
        height: 54,
        pointerEvents: 'none',
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 65%, rgba(255,255,255,1) 100%)',
    },
    toggleButtonWrap: {
        position: 'absolute',
        right: 12,
        top: 8,
        zIndex: 1,
    },
    toggleButton: {
        border: 'none',
        background: 'transparent',
        color: '#1976d2',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        padding: 0,
    },
})


export default React.memo(function TextareaForm({ dataPostType, ...props }: FieldFormItemProps) {

    const { config, post, name, onReview } = props;
    const classes = useStyles()

    const valueInital = post && post[name] ? post[name] : '';
    const [, setRender] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const hasInitCollapseRef = React.useRef(false);
    const [canCollapse, setCanCollapse] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);

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

    React.useLayoutEffect(() => {
        const textareaElement = textareaRef.current;

        if (!textareaElement) {
            return;
        }

        const tooLong = textareaElement.scrollHeight > 184;
        setCanCollapse(tooLong);

        // Chi thu gon tu dong 1 lan khi du lieu vua co gia tri tu API.
        if (!hasInitCollapseRef.current && valueInital) {
            hasInitCollapseRef.current = true;
            setIsExpanded(!tooLong);
        }
    }, [valueInital]);

    const textareaProps = {
        type: 'textarea' as const,
        name,
        rows: config.rows ?? 1,
        multiline: true,
        value: valueInital,
        className: `${classes.editor} ${canCollapse && !isExpanded ? classes.collapsedTextarea : ''}`,
        onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => { onReview(e.target.value, name); setRender(prev => prev + 1); },
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => { setRender(prev => prev + 1); post[name] = e.target.value },
        inputComponent: TextareaAutosize,
        inputRef: textareaRef,
        ...config.inputProps,
    };

    return (
        <TooltipAiSuggest {...tooltipAiSuggest.tooltipAiSuggestProps}>
            <FormControl fullWidth variant="outlined">
                {
                    config.title ?
                        <>
                            <InputLabel {...config.labelProps}>{config.title}</InputLabel>
                            <div className={classes.textareaContainer}>
                                <OutlinedInput
                                    {...textareaProps}
                                    label={config.title}
                                    startAdornment={tooltipAiSuggest.startAdornment}
                                />
                                {canCollapse && !isExpanded && <div className={classes.fadeOverlay}></div>}
                                {canCollapse &&
                                    <div className={classes.toggleButtonWrap}>
                                        <button
                                            type='button'
                                            className={classes.toggleButton}
                                            onClick={() => setIsExpanded(prev => !prev)}
                                        >
                                            {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                                        </button>
                                    </div>
                                }
                            </div>
                        </>
                        :
                        <div className={classes.textareaContainer}>
                            <OutlinedInput
                                {...textareaProps}
                                endAdornment={tooltipAiSuggest.startAdornment}
                            />
                            {canCollapse && !isExpanded && <div className={classes.fadeOverlay}></div>}
                            {canCollapse &&
                                <div className={classes.toggleButtonWrap}>
                                    <button
                                        type='button'
                                        className={classes.toggleButton}
                                        onClick={() => setIsExpanded(prev => !prev)}
                                    >
                                        {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                                    </button>
                                </div>
                            }
                        </div>
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
        </TooltipAiSuggest>
    )
}, (props1, props2) => {

    if (props1.forceUpdate) {
        return false;
    }

    return props1.post[props1.name] === props2.post[props2.name]
        && props1.config?.inputProps?.disabled === props2.config?.inputProps?.disabled
        && props1.config?.inputProps?.disable === props2.config?.inputProps?.disable;
})


