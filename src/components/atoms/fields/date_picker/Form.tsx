import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import { dateTimeFormat } from 'helpers/date';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';
import moment from 'moment';

export default React.memo(function DatePickerForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    let valueInital = (post && post[name]) ? moment(post[name]) : null;

    const [openDataPicker, setOpenDataPicker] = React.useState<boolean>(Boolean(rest.open));
    const [, setRender] = React.useState(0);

    const onChange = (value: moment.Moment | null) => {
        let valueTemp = value ? dateTimeFormat(value.toDate()) : '';
        post[name] = valueTemp;
        onReview(valueTemp, name);
        setRender(prev => prev + 1);
    };

    // Remove conflicting props from rest
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { component, fullWidth, type, InputLabelProps, ...otherProps } = rest as any;

    return (
        <FormControl fullWidth variant="outlined">
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <MobileDatePicker
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

