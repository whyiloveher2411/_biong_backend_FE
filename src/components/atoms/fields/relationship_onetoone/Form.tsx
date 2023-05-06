import Autocomplete from 'components/atoms/Autocomplete';
import CircularProgress from 'components/atoms/CircularProgress';
import TextField from 'components/atoms/TextField';
import useAjax from 'hook/useApi';
import React from 'react';
import { FieldFormItemProps } from '../type';

export default function RelationshipOneToManyForm({ config, post, onReview, name }: FieldFormItemProps) {

    const { ajax } = useAjax();

    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState([]);
    const loading = open && options.length === 0;
    // const [render, setRender] = React.useState(0);

    let valueInital = { id: 0, title: '' };

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

    post[name] = valueInital?.id;

    React.useEffect(() => {

        if (options.length === 0) {
            let active = true;

            if (!loading) {
                return undefined;
            }

            (async () => {
                ajax({
                    url: 'post-type/relationship/' + config.object,
                    success: function (result: ANY) {
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

    }, [loading]);

    const handleOnChange = (_e: React.SyntheticEvent<Element, Event>, value: {
        id: number;
        title: string;
    } | null) => {

        if (value !== null) {

            post[name] = value.id;
            post[name + '_detail'] = {
                id: value.id,
                title: value.title,
            };

            onReview(null, {
                [name]: value.id,
                [name + '_detail']: {
                    id: value.id,
                    title: value.title,
                }
            });

        } else {
            onReview(null, {
                [name]: null,
                [name + '_detail']: null
            });
        }
        // setRender(render + 1);

    };
    console.log('render RELATIONSHIP ONE TO ONE');
    return (
        <Autocomplete
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            value={valueInital || { id: 0, title: '' }}
            defaultValue={valueInital || { id: 0, title: '' }}
            isOptionEqualToValue={(option: JsonFormat, value: JsonFormat) => option.id === value.id}
            getOptionLabel={(option) => option.title}
            disableClearable
            onChange={handleOnChange}
            options={options}
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
    );
}