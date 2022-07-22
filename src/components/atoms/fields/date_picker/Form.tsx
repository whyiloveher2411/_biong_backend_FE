import AdapterMoment from '@mui/lab/AdapterMoment';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import MobileDatePicker from '@mui/lab/MobileDatePicker';
import { Theme } from '@mui/material';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import makeCSS from 'components/atoms/makeCSS';
import TextField from 'components/atoms/TextField';
import { dateTimeFormat } from 'helpers/date';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';




const useStyles = makeCSS((theme: Theme) => ({
    root: {
        '& .MuiPickersToolbar-dateTitleContainer .MuiTypography-h4': {
            color: theme.palette.primary.contrastText
        }
    },
}))

export default React.memo(function DatePickerForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    let valueInital = (post && post[name]) ? (post[name] instanceof Date ? post[name] : new Date(post[name])) : new Date;

    const classes = useStyles();

    const [openDataPicker, setOpenDataPicker] = React.useState(rest.open);
    const [, setRender] = React.useState(0);

    const onChange = (value: ANY) => {
        let valueTemp = dateTimeFormat(value);
        post[name] = valueTemp;
        onReview(valueTemp, name);
        setRender(prev => prev + 1);
    };

    console.log('render DATETIME');

    return (
        <FormControl fullWidth variant="outlined">
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <MobileDatePicker
                    clearable
                    value={valueInital}
                    className={classes.root}
                    label={config.title}
                    renderInput={(params) => <TextField {...params} onClick={() => setOpenDataPicker(true)} variant="outlined" />}
                    open={openDataPicker}
                    InputAdornmentProps={{ position: "end" }}
                    onAccept={onChange}
                    onChange={onChange}
                    onClose={() => { setOpenDataPicker(true) }}
                    {...rest}
                />
            </LocalizationProvider>
            <FormHelperText><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )

}, (props1, props2) => {

    if (props1.post[props1.name] === props2.post[props2.name]) {

        if (props1.open === props2.open) {
            return true;
        }

    }

    return false;
})

