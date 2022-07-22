import Typography from "components/atoms/Typography";
import TextField from "components/atoms/TextField";
import Box from "components/atoms/Box";

import LocalizationProvider from '@mui/lab/LocalizationProvider';
import DateRangePicker from '@mui/lab/DateRangePicker';


import AdapterMoment from '@mui/lab/AdapterMoment';

import React from 'react';
import { compareDate, dateFormat } from "helpers/date";
import { FieldFormItemProps } from "../type";
import { __ } from "helpers/i18n";
import { DateRange } from "@mui/lab/DateRangePicker/RangeTypes";
import SpecialNotes from "../SpecialNotes";

export default function DatePickerForm({ config, post, onReview, name, inputProp, onOpen = false, ...rest }: FieldFormItemProps) {

    let valueInital: DateRange<Date | null> = (post && config.names && post[config.names[0]] && post[config.names[1]]) ? [new Date(post[config.names[0]]), new Date(post[config.names[1]])] : [
        null,
        null,
    ];
    // const [value, setValue] = React.useState(valueInital);

    const [openDataPicker, setOpenDataPicker] = React.useState<number | false>(false);

    const [render, setRender] = React.useState(0);

    const onClosePicker = () => {
        setOpenDataPicker(false);
    }

    const onAccept = (newValue: DateRange<Date | null>) => {

        if (newValue && newValue[0] && newValue[1]) {

            if (!compareDate(newValue[0], newValue[1])) {
                newValue.reverse();
            }

            post[config.names[0]] = dateFormat(newValue[0]);
            post[config.names[1]] = dateFormat(newValue[1]);

            onReview(null, {
                [config.names[0]]: dateFormat(newValue[0]),
                [config.names[1]]: dateFormat(newValue[1])
            });
        } else {
            onReview(null, {
                [config.names[0]]: '',
                [config.names[1]]: ''
            });
        }

        setRender(render + 1);
    }

    console.log('render DATE RANGE');

    return (
        <LocalizationProvider dateAdapter={AdapterMoment}>
            <Typography variant="body1" style={{ marginBottom: 8 }}>{config.title}</Typography>
            <DateRangePicker
                startText={config.startDateLabel ?? "Start Date"}
                endText={config.endDateLabel ?? "End Date"}
                disableCloseOnSelect={false}
                disableAutoMonthSwitching
                value={valueInital}
                open={openDataPicker !== false}
                onClose={onClosePicker}
                onAccept={onAccept}
                onChange={() => {
                    //
                }}
                renderInput={(startProps, endProps) => (
                    <>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <TextField onClick={() => { if (onOpen) onOpen(); setOpenDataPicker(0); }} style={{ width: '100%' }} {...startProps} />
                            <Box sx={{ mx: 2 }}> {__('to')} </Box>
                            <TextField onClick={() => { if (onOpen) onOpen(); setOpenDataPicker(1) }} style={{ width: '100%' }} {...endProps} />
                        </div>
                        <SpecialNotes specialNotes={config.special_notes} />
                    </>
                )}
                {...rest}
            />
        </LocalizationProvider>
    );
}
