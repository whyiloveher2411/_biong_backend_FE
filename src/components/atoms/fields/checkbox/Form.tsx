import Checkbox from 'components/atoms/Checkbox'
import FormControl from 'components/atoms/FormControl'
import FormControlLabel from 'components/atoms/FormControlLabel'
import FormGroup from 'components/atoms/FormGroup'
import FormHelperText from 'components/atoms/FormHelperText'
import FormLabel from 'components/atoms/FormLabel'
import Autocomplete from 'components/atoms/Autocomplete'
import TextField from 'components/atoms/TextField'
import React from 'react'
import SpecialNotes from '../SpecialNotes'
import { FieldFormItemProps } from '../type'
import { Paper, Box, Button } from '@mui/material'

export default React.memo(function CheckboxForm({ config, name, post, onReview }: FieldFormItemProps) {

    let valueInital: string[] = [];

    try {
        if (typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post && post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }
    } catch (error) {
        valueInital = [];
    }

    post[name] = valueInital;

    const [value, setValue] = React.useState(0);

    const handleOnClick = (e: React.ChangeEvent<HTMLInputElement>) => {

        let checked = e.target.checked;
        let key = e.target.name;

        if (checked) {
            valueInital.push(key);
        } else {
            let index = valueInital.indexOf(key);
            if (index > -1) {
                valueInital.splice(index, 1);
            }
        }

        post[name] = valueInital;
        onReview(post[name]);
        setValue(value + 1);
    };

    if (config.type === 'select') {
        return (
            <FormControl fullWidth>
                {config.title && <FormLabel>{config.title}</FormLabel>}
                <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={Object.keys(config.list_option || {})}
                    getOptionLabel={(key) => config.list_option[key]?.title || key}
                    value={valueInital}
                    onChange={(_event, newValue) => {
                        post[name] = newValue;
                        onReview(newValue);
                        setValue(value + 1);
                    }}
                    size={config.size ?? 'medium'}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="outlined"
                            placeholder={config.placeholder || ''}
                            sx={{ mt: 1 }}
                        />
                    )}
                    PaperComponent={(paperProps) => {
                        const { children, ...rest } = paperProps;
                        return (
                            <Paper {...rest}>
                                {children}
                                <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                    <Button
                                        size="small"
                                        fullWidth
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            const allKeys = Object.keys(config.list_option || {});
                                            post[name] = allKeys;
                                            onReview(allKeys);
                                            setValue(value + 1);
                                            if (document.activeElement instanceof HTMLElement) {
                                                document.activeElement.blur();
                                            }
                                        }}
                                    >
                                        Chọn tất cả
                                    </Button>
                                </Box>
                            </Paper>
                        );
                    }}
                />
                {
                    Boolean(config.note) &&
                    <FormHelperText>{config.note}</FormHelperText>
                }
                <SpecialNotes specialNotes={config.special_notes} />
            </FormControl>
        );
    }

    return (
        <FormControl >
            <FormLabel>{config.title}</FormLabel>
            <FormGroup>
                {
                    Object.keys(config.list_option).map(key =>
                        <FormControlLabel
                            key={key}
                            control={<Checkbox value={key} onChange={handleOnClick} checked={valueInital && valueInital.indexOf(key) !== -1} color="primary" name={key} />}
                            label={config.list_option[key].title}
                        />
                    )
                }
            </FormGroup>
            {
                Boolean(config.note) &&
                <FormHelperText>{config.note}</FormHelperText>
            }
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
