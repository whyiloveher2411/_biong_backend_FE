import Autocomplete from 'components/atoms/Autocomplete';
import CircularProgress from 'components/atoms/CircularProgress';
import TextField from 'components/atoms/TextField';
import useAjax from 'hook/useApi';
import React from 'react';
import SpecialNotes from '../SpecialNotes';

interface Options {
    id: string | number,
    title: string,
}

export default React.memo(function RelationshipOneToManyForm({ config, post, onReview, name }: import('../type').FieldFormItemProps) {

    console.log('render MENU');

    let valueInital: Options = { id: 0, title: '' };

    try {
        if (post[name + '_detail'] && typeof post[name + '_detail'] === 'object') {
            valueInital = post[name + '_detail'];
        } else {
            if (post[name] && post[name + '_detail']) {
                valueInital = JSON.parse(post[name + '_detail']);
            }
        }
    } catch (error) {
        valueInital = { id: 0, title: '' };
    }
    console.log(valueInital);
    const { ajax } = useAjax();

    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState([]);
    const loading = open && options.length === 0;

    React.useEffect(() => {

        if (options.length === 0) {
            let active = true;

            if (!loading) {
                return undefined;
            }

            (async () => {

                ajax({
                    url: 'menu/get',
                    success: function (result: JsonFormat) {
                        if (active) {
                            setOptions(result.rows);
                        }
                    }
                });

            })();

            return () => {
                active = false;
            };

        }
        //eslint-disable-next-line
    }, [loading]);

    const handleOnChange = (_e: React.SyntheticEvent<Element, Event>, value: Options | null): void => {
        if (value) {
            post[name] = value.id;
            post[name + '_detail'] = value;
            onReview(null, {
                [name]: value.id,
                [name + '_detail']: value
            });
        } else {
            post[name] = null;
            post[name + '_detail'] = null;
            onReview(null, {
                [name]: null,
                [name + '_detail']: null
            });
        }
    };
    return (
        <>
            <Autocomplete
                open={open}
                onOpen={() => {
                    setOpen(true);
                }}
                onClose={() => {
                    setOpen(false);
                }}
                disableClearable
                value={valueInital ?? { id: 0, title: '' }}
                defaultValue={valueInital ?? { id: 0, title: '' }}
                isOptionEqualToValue={(option: Options, value: Options) => option.id === value.id}
                getOptionLabel={(option: Options) => option.title}
                options={options}
                onChange={handleOnChange}
                loading={loading}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={config.title}
                        variant="outlined"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <React.Fragment>
                                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </React.Fragment>
                            ),
                        }}
                    />
                )}
            />
            <SpecialNotes specialNotes={config.special_notes} />
        </>
    );
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
