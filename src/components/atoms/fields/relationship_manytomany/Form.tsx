import { AutocompleteRenderInputParams, FormHelperText, IconButton } from '@mui/material';
import Autocomplete from 'components/atoms/Autocomplete';
import Box from 'components/atoms/Box';
import Checkbox from 'components/atoms/Checkbox';
import Chip from 'components/atoms/Chip';
import Icon from 'components/atoms/Icon';
import TextField from 'components/atoms/TextField';
import { convertListToTree, TreeProps } from 'helpers/array';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';
import CodeBlock from 'components/atoms/CodeBlock';
interface Option {
    [key: string]: ANY,
    id: string,
    new_post?: boolean,
    optionLabel?: string
}

interface AutocompleteRenderInputParamsExtends extends AutocompleteRenderInputParams {
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function RelationshipManyToManyFormForm({ config, post, onReview, name, ...rest }: FieldFormItemProps) {

    const { ajax } = useAjax();

    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<TreeProps | false>(false);

    const [loading, setLoading] = React.useState(false);
    const [render, setRender] = React.useState(0);

    let valueInital: Option[] = [];

    try {
        if (post[name] && typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }

        if (!Array.isArray(valueInital)) valueInital = [];
    } catch (error) {
        valueInital = [];
    }

    post[name] = valueInital;


    const convertTitleToStructParent = (posts: TreeProps, spacing: string, spacingstandard: string, titleParents: string[]) => {

        let result: TreeProps = [];


        posts.forEach(post => {

            post.optionLabel = spacing;
            post.titleParents = titleParents;

            result.push({ ...post });

            if (post.children) {
                result = [...result, ...convertTitleToStructParent(post.children, spacing + spacingstandard, spacingstandard, [...titleParents, post.title])];
            }

        });

        return result;
    }

    React.useEffect(() => {

        if (options === false) {

            if (!loading) {
                return undefined;
            }

            ajax({
                url: 'post-type/relationship/' + config.object,
                method: 'POST',
                data: config,
                success: function (result: JsonFormat) {

                    if (result.rows) {
                        if (config.hierarchical) {
                            let tree = convertListToTree(result.rows);
                            let posts = convertTitleToStructParent(tree, '', (config.separator ?? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'), []);
                            setOptions(posts);
                        } else {
                            setOptions(result.rows);
                        }

                    } else {
                        setOptions(false);
                    }
                    setLoading(false);
                }
            });
        }
        //eslint-disable-next-line
    }, [loading]);

    const handleOnChange = (_e: React.SyntheticEvent<Element, Event>, value: Array<JsonFormat>) => {

        let valueAfterHandle = value;
        if (Array.isArray(value)) {
            valueAfterHandle = value.map(item => ({
                id: item.id,
                title: item.title,
                slug: item.slug,
                new_post: item.new_post
            }));
        }

        post[name] = valueAfterHandle;
        onReview(valueAfterHandle);
        setRender(render + 1);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {

        if (e.key === 'Enter') {

            setOptions([]);

            ajax({
                url: 'post-type/relationship/' + config.object,
                method: 'POST',
                data: {
                    ...config,
                    key: (e.target as HTMLInputElement).value
                },
                success: function (result: JsonFormat) {
                    if (result.rows) {
                        if (config.hierarchical) {
                            let tree = convertListToTree(result.rows);
                            let posts = convertTitleToStructParent(tree, '', (config.separator ?? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'), []);
                            setOptions(posts);
                        } else {
                            setOptions(result.rows);
                        }
                    }
                }
            });
        }
    }

    const moveElement = (index: number, newIndex: number) => {

        let valueAfterHandle = [...valueInital];
        console.log(valueAfterHandle);
        valueAfterHandle.splice(newIndex, 0, valueAfterHandle.splice(index, 1)[0]);

        post[name] = valueAfterHandle;
        onReview(valueAfterHandle);
        setRender(render + 1);
    }

    console.log('render RELATIONSHIP MANY TO MANY');

    return (
        <>
            <Autocomplete
                multiple
                open={open}
                onOpen={() => { setOpen(true); setLoading(true); }}
                onClose={() => {
                    setOpen(false);
                }}
                disableClearable={config.disableClearable ? config.disableClearable : false}
                value={valueInital}
                options={options !== false ? options : []}
                disableCloseOnSelect
                isOptionEqualToValue={(option: Option, value: Option) => option.id === value.id}
                getOptionLabel={(option) => '[' + option.id + '] ' + option.title}
                loading={loading}
                onChange={handleOnChange}
                renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => (
                        <Chip
                            sx={{ height: 'auto' }}
                            label={
                                <>
                                    <IconButton size='small' onClick={() => moveElement(index, index - 1)}>
                                        <Icon icon='ArrowLeftRounded' />
                                    </IconButton>
                                    <IconButton size='small' onClick={() => moveElement(index, index + 1)}>
                                        <Icon icon='ArrowRightRounded' />
                                    </IconButton>
                                    {
                                        (option.titleParents?.length > 0 ? (option.titleParents.join(' -> ') + ' -> ') : '') + (option.new_post ? '' : '[' + option.id + '] ')
                                    }
                                    <CodeBlock component='span' sx={{ '& p': { m: 0 } }} html={option.title as string} />
                                    {
                                        Boolean(option.new_post) && <strong>&nbsp;{__('(New Option)')}</strong>
                                    }
                                </>
                            }
                            {...getTagProps({ index })}
                        />
                    ))
                }
                renderOption={(props, option: Option, { selected }) => (
                    <li {...props} key={option.id}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                width: 1
                            }}
                        >
                            {
                                Boolean(option.optionLabel) &&
                                <span dangerouslySetInnerHTML={{ __html: option.optionLabel ?? '' }} />
                            }
                            <Checkbox
                                icon={<Icon icon="CheckBoxOutlineBlank" fontSize="small" />}
                                checkedIcon={<Icon icon="CheckBox" fontSize="small" />}
                                style={{ marginRight: 8 }}
                                checked={selected}
                                color="primary"
                            />
                            {
                                option.new_post ? '' : '[' + option.id + ']'
                            }
                            &nbsp;<CodeBlock component='span' sx={{ '& p': { m: 0 } }} html={option.title as string} />
                            {Boolean(option.new_post) && <strong>&nbsp;{__('(New Option)')}</strong>}
                        </Box>
                    </li>
                )}
                renderInput={(params: AutocompleteRenderInputParamsExtends) => {

                    params.onKeyPress = handleKeyPress;

                    return <>
                        <TextField
                            {...params}
                            variant="outlined"
                            label={config.title ? config.title : undefined}
                            placeholder={config.placeholder ?? 'Add'}
                        />
                        <SpecialNotes specialNotes={config.special_notes} />
                    </>

                }}
                {...rest}
            />
            <FormHelperText><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
        </>
    );
}