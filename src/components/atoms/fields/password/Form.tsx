import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import InputLabel from 'components/atoms/InputLabel';
import OutlinedInput from 'components/atoms/OutlinedInput';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

export default React.memo(function PasswordForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    console.log('render PASSWORD');

    const [values, setValues] = React.useState<{
        [key: string]: string | boolean
    }>({
        password: post['_' + name] ? post['_' + name] : '',
        showPassword: false,
    });

    const handleChange = (prop: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValues({ ...values, [prop]: event.currentTarget.value });
    };

    const handleClickShowPassword = () => {
        setValues({ ...values, showPassword: !values.showPassword });
    };

    const handleMouseDownPassword = (event: React.MouseEvent) => {
        event.preventDefault();
    };

    const randomPassword = () => {

        let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz!@#$%^&*()_+<>?~";
        let string_length = 24;
        let randomstring = '';
        for (let i = 0; i < string_length; i++) {
            let rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }

        setValues({ ...values, password: randomstring });

        onReview(null, {
            [name]: randomstring,
            ['_' + name]: randomstring,
        });
    };

    return (
        <FormControl fullWidth variant="outlined" {...config.formControlProps}>
            <InputLabel {...config.labelProps} htmlFor="outlined-adornment-password">{config.title}</InputLabel>
            <OutlinedInput
                type={values.showPassword ? 'text' : 'password'}
                value={values.password}
                onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => { onReview(e.target.value) }}
                onChange={handleChange('password')}
                endAdornment={
                    <InputAdornment position="end">
                        {
                            (typeof config.generator === undefined || config.generator) ?
                                <IconButton
                                    aria-label="generator password"
                                    onClick={randomPassword}
                                    size="large"
                                >
                                    <Icon icon="Refresh" />
                                </IconButton>
                                : null
                        }
                        <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            size="large"
                        >
                            {values.showPassword ? <Icon icon="Visibility" /> : <Icon icon="VisibilityOff" />}
                        </IconButton>
                    </InputAdornment>
                }
                label={config.title}
                error={config.error ? config.error : false}
                {...config.inputProps}
            />
            {
                Boolean(config.note) &&
                <FormHelperText error={config.error ? config.error : false}><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            }
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )
}, (props1, props2) => {
    return !props1.config.forceRender && props1.post[props1.name] === props2.post[props2.name];
})
