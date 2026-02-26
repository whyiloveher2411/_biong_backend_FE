import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import { dateTimeFormat } from 'helpers/date';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';
import moment from 'moment';

export default React.memo(function DateTimeForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    let valueInital = (post && post[name]) ? moment(post[name]) : null;

    const [openDataPicker, setOpenDataPicker] = React.useState<boolean>(Boolean(rest.open));
    const [, setRender] = React.useState(0);

    const onChange = (value: moment.Moment | null) => {
        if (value) {
            let valueTemp = dateTimeFormat(value.toDate());
            post[name] = valueTemp;
            onReview(valueTemp, name);
        } else {
            post[name] = '';
            onReview('', name);
        }
        setRender(prev => prev + 1);
    };

    // Remove conflicting props from rest
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { component, fullWidth, type, InputLabelProps, ...otherProps } = rest as any;

    return (
        <FormControl fullWidth variant="outlined" {...config.formControlProps}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <MobileDateTimePicker
                    views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                    label={config.title}
                    value={valueInital}
                    onChange={onChange}
                    onAccept={onChange}
                    open={openDataPicker}
                    onClose={() => setOpenDataPicker(false)}
                    onOpen={() => setOpenDataPicker(true)}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            variant: 'outlined',
                            onClick: () => setOpenDataPicker(true),
                            ...otherProps
                        }
                    }}
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
