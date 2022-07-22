import { FieldFormItemProps } from 'components/atoms/fields/type'
import FormControl from 'components/atoms/FormControl'
import FormControlLabel from 'components/atoms/FormControlLabel'
import FormHelperText from 'components/atoms/FormHelperText'
import FormLabel from 'components/atoms/FormLabel'
import Radio from 'components/atoms/Radio'
import RadioGroup from 'components/atoms/RadioGroup'
import TextField from 'components/atoms/TextField'
import { __ } from 'helpers/i18n'
import useAjax from 'hook/useApi'
import React from 'react'

function DateTimeFormat(props: FieldFormItemProps) {
    const { config, name, post, onReview } = props;

    const { ajax } = useAjax();

    const [value, setValue] = React.useState('');
    const [isCustom, setIsCustom] = React.useState(false);
    const [label, setLable] = React.useState('');

    React.useEffect(() => {
        setValue((post && post[name]) ? post[name] : '');
        setIsCustom(!(config.list_option && config.list_option[post[name]]));
        setLable(config.list_option && config.list_option[post[name]] ? config.list_option[post[name]] : (config.labelCustom ?? ''));
        //eslint-disable-next-line
    }, [post]);

    const changeValue = (newValue: string, newIsCustom: boolean, newLabel: string) => {

        setValue(prev => {

            setIsCustom(newIsCustom);
            setLable(newLabel);

            if (prev !== newValue) {
                onReview(newValue);
            }

            return newValue;
        });
    };

    const changeValueCustom = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {

        setValue(e.target.value);

        onReview(e.target.value);

        ajax({
            url: 'settings/get',
            method: 'POST',
            data: {
                renderDate: e.target.value
            },
            success: function (result: {
                date: string
            }) {
                changeValue(e.target.value, true, result.date);
            }
        });

    };

    return (
        <div>
            <FormControl component="fieldset">
                <FormLabel component="legend">{config.title}</FormLabel>
                <RadioGroup aria-label={'' + config.title} name={name} value={value}>
                    {
                        config.list_option
                        && Object.keys(config.list_option).map(key =>
                            <FormControlLabel onClick={() => changeValue(key, false, config.list_option[key])} key={key} value={key} control={<Radio checked={value === key && !isCustom} color="primary" />} label={config.list_option[key]} />
                        )
                    }
                    <FormControlLabel
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => changeValue(value, true, label)}
                        value={value}
                        label={'' + config.title}
                        control={<>
                            <Radio
                                checked={isCustom}
                                color="primary" />
                            {__('Custom')}
                            <TextField
                                size="small"
                                style={{ marginLeft: 8, marginRight: 8 }}
                                fullWidth
                                required
                                variant="outlined"
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                onChange={changeValueCustom}
                                name={name}
                                value={value}
                                label={config.title}
                                helperText={config.note}
                            /> {label}</>} />
                </RadioGroup>
                <FormHelperText>{config.note}</FormHelperText>
            </FormControl>
        </div>
    )
}

export default DateTimeFormat
