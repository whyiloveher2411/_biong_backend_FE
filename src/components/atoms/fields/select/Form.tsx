import Box from 'components/atoms/Box';
import Alert from 'components/atoms/Alert';
import Autocomplete from 'components/atoms/Autocomplete';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import makeCSS from 'components/atoms/makeCSS';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import React from 'react';
import { FieldFormItemProps } from '../type';
import SpecialNotes from '../SpecialNotes';

const useStyles = makeCSS({
    selectItem: {
        whiteSpace: 'unset'
    },
    pointSelect: {
        display: 'inline-block',
        width: 8,
        height: 8,
        marginRight: 8,
        borderRadius: '50%',
        backgroundColor: 'var(--bg)',
    },
    image: {
        display: 'inline-block',
        width: 'var(--width, 20px)',
        marginRight: 8,
        height: 'auto',
        borderRadius: 3,
    }
})

interface Option {
    title: string,
    _key: string,
    color?: string,
    image?: string,
    width?: string,
    description?: string,
}

export default React.memo(function SelectForm({ config, post, onReview, name }: FieldFormItemProps) {

    const [, setRender] = React.useState(0);

    const [listOption, setListOption] = React.useState<{
        _key: string,
        title: string,
        description?: string,
        color?: string
    }[]>([]);

    React.useEffect(() => {

        if (config.list_option) {
            setListOption(config.list_option ?
                Object.keys(config.list_option).map((key) => ({ ...config.list_option[key], _key: key }))
                :
                []);
        }

    }, [config.list_option]);

    const classes = useStyles();

    let valueInital: { [key: string]: string } | null = null;

    if (post && post[name] && config.list_option && config.list_option[post[name]]) {
        valueInital = { ...config.list_option[post[name]], _key: post[name] };
    } else if (config.defaultValue) {
        valueInital = { ...config.list_option[config.defaultValue], _key: config.defaultValue };
        post[name] = config.defaultValue;
    } else {
        valueInital = null;
    }

    const onChange = (_e: React.ChangeEvent, value: Option) => {

        let valueUpdate: string;

        if (value) {
            valueUpdate = value._key;
        } else {
            valueUpdate = config.defaultValue ? config.defaultValue : '';
        }

        onReview(valueUpdate, name);
        setRender(prev => prev + 1);

    }

    return (
        <FormControl fullWidth variant="outlined">
            <Autocomplete
                options={listOption}
                getOptionLabel={(option: Option) => option.title ? option.title : ''}
                disableClearable
                size={config.size ?? 'medium'}
                renderInput={(params) => {
                    if (valueInital && typeof valueInital.color === 'string') {
                        params.InputProps.startAdornment = <span
                            className={classes.pointSelect}
                            style={{ ['--bg' as string]: valueInital.color, marginLeft: 8 }}
                        >
                        </span>;
                    }

                    if (valueInital && typeof valueInital.image === 'string') {
                        params.InputProps.startAdornment = <img
                            style={{
                                ['--width' as string]: valueInital.width ? valueInital.width : '20px',
                                marginRight: 2,
                                marginLeft: 6,
                            }}
                            className={classes.image}
                            alt='select option'
                            src={valueInital.image}
                        />;
                    }

                    return <>
                        <TextField
                            {...params}
                            label={config.title}
                            variant="outlined"
                        />
                        {
                            Boolean(config.note) &&
                            <FormHelperText ><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
                        }
                        <SpecialNotes specialNotes={config.special_notes} />
                        {
                            Boolean(valueInital && valueInital.description && !config.disableAlert) &&
                            <Alert severity="info" sx={{ marginTop: 0.5 }}>
                                <Typography variant="body2">{valueInital?.description}</Typography>
                            </Alert>
                        }
                    </>
                }}
                onChange={onChange}
                value={valueInital}
                isOptionEqualToValue={(option: Option, value: Option) => option._key === value._key}
                renderOption={(props, option: Option) => (
                    <li {...props} key={option._key}>
                        <div className={classes.selectItem}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                {
                                    Boolean(option.color) &&
                                    <Typography style={{ ['--bg' as string]: option.color }} component="span" className={classes.pointSelect} ></Typography>
                                }
                                {
                                    Boolean(option.image) &&
                                    <img
                                        style={{
                                            ['--width' as string]: option.width ? option.width : '20px'
                                        }}
                                        className={classes.image}
                                        alt='select option'
                                        src={option.image as string}
                                    />
                                }
                                {option.title}
                            </Box>
                            {
                                Boolean(option.description) &&
                                <Typography variant="body2">{option.description}</Typography>
                            }
                        </div>
                    </li>
                )}
                {...config.inputProps}
            />
        </FormControl>

    );

}, (props1, props2) => {

    if (props1.forceUpdate) {
        return false;
    }

    return props1.post[props1.name] === props2.post[props2.name] && JSON.stringify(props1.config.list_option) === JSON.stringify(props2.config.list_option);
})

