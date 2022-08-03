import { AutocompleteRenderInputParams } from '@mui/material';
import Autocomplete from 'components/atoms/Autocomplete';
import CircularProgress from 'components/atoms/CircularProgress';
import TextField from 'components/atoms/TextField';
import { convertListToTree, TreeProps } from 'helpers/array';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';


interface Option {
    [key: string]: ANY,
    id: string,
    new_post?: boolean,
    optionLabel: string
}


interface AutocompleteRenderInputParamsExtends extends AutocompleteRenderInputParams {
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export default React.memo(function RelationshipOneToManyForm({ config, post, onReview, name, renderInput, ...rest }: FieldFormItemProps) {

    const { ajax } = useAjax();

    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<TreeProps | false>(false);
    const loading = open && options === false;

    const [render, setRender] = React.useState(0);

    let valueInital: JsonFormat = config.valueDefault ? config.valueDefault : { id: 0, title: '' };

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

    const convertTitleToStructParent = (posts: TreeProps, spacing: string, spacingstandard: string) => {

        let result: TreeProps = [];

        posts.forEach(post => {

            post.optionLabel = spacing;

            result.push({ ...post });

            if (post.children) {
                result = [...result, ...convertTitleToStructParent(post.children, spacing + spacingstandard, spacingstandard)];
            }

        });

        return result;
    }

    //config.isRenderAfterOpen:
    React.useEffect(() => {

        if (options === false || (config.isRenderAfterOpen && open === true)) {
            let active = true;

            if (!loading && !(config.isRenderAfterOpen && open === true)) {
                return undefined;
            }

            setOptions(false);

            (async () => {
                ajax({
                    url: 'post-type/relationship/' + config.object,
                    success: function (result: { [key: string]: ANY }) {

                        if (result.rows && active) {
                            if (config.hierarchical) {
                                let tree = convertListToTree(result.rows);
                                let posts = convertTitleToStructParent(tree, '', (config.separator ?? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'));
                                setOptions(posts);
                            } else {
                                setOptions(result.rows);
                            }
                        }

                    }
                });
            })();

            return () => {
                active = false;
            };

        }

    }, [open]);

    const handleOnChange = (_e: React.SyntheticEvent<Element, Event>, value: { [key: string]: ANY, id: string }) => {
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

        setRender(render + 1);
    };


    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {

        if (e.key === 'Enter') {
            ajax({
                url: 'post-type/relationship/' + config.object,
                method: 'POST',
                data: {
                    key: (e.target as HTMLInputElement).value
                },
                success: function (result: { [key: string]: ANY }) {
                    if (config.hierarchical) {
                        let tree = convertListToTree(result.rows);
                        let posts = convertTitleToStructParent(tree, '', (config.separator ?? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'));
                        setOptions(posts);
                    } else {
                        setOptions(result.rows);
                    }
                }
            });
        }
    }

    return (
        <Autocomplete
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            disableClearable={config.disableClearable ? config.disableClearable : false}
            value={valueInital || { id: 0, title: '' }}
            size={config.size ?? 'medium'}
            defaultValue={valueInital || { id: 0, title: '' }}
            isOptionEqualToValue={(option: Option, value: Option) => option.id === value.id}
            getOptionLabel={(option: Option) => option.title + (option.new_post ? ' ' + __('(New Option)') : '')}
            onChange={handleOnChange}
            options={options !== false ? options : []}
            loading={loading || options === false}
            renderOption={(props, option: Option) => (
                <li {...props} key={option.id}>
                    <span dangerouslySetInnerHTML={{ __html: option.optionLabel }} />{option.title}&nbsp;{Boolean(option.new_post) && '(New Option)'}
                </li>
            )}
            renderInput={(params: AutocompleteRenderInputParamsExtends) => {

                params.onKeyPress = handleKeyPress;

                if (renderInput) return renderInput(params, valueInital, loading);

                return <> <TextField
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
                    <SpecialNotes specialNotes={config.special_notes} />
                </>

            }}
            {...config.inputProps}
            {...rest}
        />
    );
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})

