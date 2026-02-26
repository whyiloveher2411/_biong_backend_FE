import Typography from "components/atoms/Typography";
import Box from "components/atoms/Box";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import React from 'react';
import { compareDate, dateFormat } from "helpers/date";
import { FieldFormItemProps } from "../type";
import { __ } from "helpers/i18n";
import SpecialNotes from "../SpecialNotes";
import moment from 'moment';

export default function DateRangeForm({ config, post, onReview, name, inputProp, onOpen = false, ...rest }: FieldFormItemProps) {

    let startInital = post && config.names && post[config.names[0]] ? moment(post[config.names[0]]) : null;
    let endInital = post && config.names && post[config.names[1]] ? moment(post[config.names[1]]) : null;

    const [render, setRender] = React.useState(0);

    const onChangeDate = (startOrEnd: 0 | 1) => (value: moment.Moment | null) => {
        let formattedVal = value ? dateFormat(value.toDate()) : '';
        post[config.names[startOrEnd]] = formattedVal;

        if (post[config.names[0]] && post[config.names[1]]) {
            if (!compareDate(new Date(post[config.names[0]]), new Date(post[config.names[1]]))) {
                const temp = post[config.names[0]];
                post[config.names[0]] = post[config.names[1]];
                post[config.names[1]] = temp;
            }
        }

        onReview(null, {
            [config.names[0]]: post[config.names[0]],
            [config.names[1]]: post[config.names[1]]
        });
        setRender(render + 1);
    };

    // Remove conflicting props from rest
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { component, fullWidth, type, InputLabelProps, ...otherProps } = rest as any;

    return (
        <Box>
            <Typography variant="body1" style={{ marginBottom: 8 }}>{config.title}</Typography>
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <DatePicker
                        label={config.startDateLabel ?? "Start Date"}
                        value={startInital}
                        onChange={onChangeDate(0)}
                        slotProps={{
                            textField: { fullWidth: true, ...otherProps }
                        }}
                    />
                    <Box sx={{ mx: 2 }}> {__('to')} </Box>
                    <DatePicker
                        label={config.endDateLabel ?? "End Date"}
                        value={endInital}
                        onChange={onChangeDate(1)}
                        slotProps={{
                            textField: { fullWidth: true, ...otherProps }
                        }}
                    />
                </div>
            </LocalizationProvider>
            <SpecialNotes specialNotes={config.special_notes} />
        </Box>
    );
}
