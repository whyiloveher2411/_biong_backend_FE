import Grid from 'components/atoms/Grid'
import makeCSS from 'components/atoms/makeCSS'
import Box from 'components/atoms/Box'
import Icon from 'components/atoms/Icon'
import Input from 'components/atoms/Input'
import Paper from 'components/atoms/Paper'
import Button from 'components/atoms/Button'
import React from 'react'
import { IconButton, TextField, Theme, Typography } from '@mui/material'
import { __ } from 'helpers/i18n'
import DrawerCustom from 'components/molecules/DrawerCustom'
import FieldForm from 'components/atoms/fields/FieldForm'
import MoreButton from 'components/atoms/MoreButton'
import { ShowPostTypeData } from '.'
import useQuery from 'hook/useQuery'
import { toCamelCase } from 'helpers/string'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { IActionPostType } from '../CreateData/Form'
import useConfirmDialog from 'hook/useConfirmDialog'
import useAjax from 'hook/useApi'
import Dialog from 'components/molecules/Dialog'
const useStyles = makeCSS((theme: Theme) => ({
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    searchInput: {
        flexGrow: 1,
        fontSize: 14,
        height: 36,
        maxWidth: '100%',
        width: 160,
        "& input::placeholder": {
            opacity: .6,
            color: "inherit",
        },
    },
    searchIcon: {
        color: theme.palette.icon,
    },
    search: {
        flexGrow: 1,
        height: 42.5,
        gap: theme.spacing(2),
        padding: theme.spacing(0, 2),
        display: 'flex',
        borderRadius: theme.spacing(1),
        alignItems: 'center',
    },
}))

interface SearchBarProps {
    type: string,
    data: ShowPostTypeData | false,
    onSearch: (value: string) => void,
    value: undefined | string,
    className?: string,
    onFilter: (filter: Array<{
        key: string,
        condition: '=' | '!=',
        value: string,
    }>) => void,
    moreButton?: React.ReactNode,
    setQueryUrl: React.Dispatch<React.SetStateAction<JsonFormat>>,
}

const SearchBar = ({ type, data, onSearch, onFilter, className = '', value, moreButton, setQueryUrl, ...rest }: SearchBarProps) => {

    const classes = useStyles();

    const saveFilterApi = useAjax();

    const [openDialogSaveFilter, setOpenDialogSaveFilter] = React.useState(false);

    const [nameFilter, setNameFilter] = React.useState('');

    const [openFilter, setOpenFilter] = React.useState(false);

    const [inputValue, setInputValue] = React.useState('');

    const [filters, setFilters] = React.useState<Array<{
        key: string,
        condition: '=' | '!=',
        value: string,
    }>>([]);

    const paramUrl = useQuery({ filters: '', search: '', filter_saved_name: '', sortKey: '', sortType: '' });

    const [sortData, setSortData] = React.useState<{
        sortKey: string,
        sortType: string,
    }>({ sortKey: paramUrl.sortKey?.toString() ?? '', sortType: paramUrl.sortType?.toString() ?? '' });

    const [stateFilterSavedName, setStateFilterSavedName] = React.useState(paramUrl.filter_saved_name);

    const [loadingStateButton, setLoadingStateButton] = React.useState<{ [key: number]: boolean }>({});
    const [progressButton, setProgressButton] = React.useState<{ [key: number]: number }>({});

    const useAjaxAction = useAjax();
    const confirm = useConfirmDialog();

    const handleActionEvent = (item: IActionPostType, index: number) => () => {
        const callApi = () => {
            setLoadingStateButton(prev => ({
                ...prev,
                [index]: true,
            }));

            setProgressButton(prev => ({
                ...prev,
                [index]: 0
            }))

            useAjaxAction.ajax({
                url: item.link_api,
                method: 'POST',
                success: () => {
                    setLoadingStateButton(prev => ({
                        ...prev,
                        [index]: false,
                    }));
                }
            });

            if (item.check_progress) {

                const callCheckProgress = () => {
                    useAjaxAction.ajax({
                        url: item.link_api,
                        method: 'POST',
                        data: {
                            check_progress: true
                        },
                        success: (result) => {
                            if (result.progress !== undefined) {
                                setProgressButton(prev => ({
                                    ...prev,
                                    [index]: result.progress
                                }));
                                setTimeout(() => {
                                    callCheckProgress();
                                }, 1000);
                            } else {
                                setProgressButton(prev => {
                                    delete prev[index];
                                    return { ...prev };
                                })
                            }
                        }
                    });
                };

                callCheckProgress();
            }
        };

        if (item.confirm_message) {
            confirm.onConfirm(callApi, {
                message: item.confirm_message
            });
            return;
        }

        callApi();

    }

    const handleSaveFilter = () => {
        saveFilterApi.ajax({
            url: '/post-type/save-filter',
            method: 'POST',
            data: {
                name: nameFilter,
                filters: JSON.stringify(filters),
                sort: JSON.stringify(sortData),
                post_type: type,
            }
        });
    }

    const handleDeleteFilterSaved = (index: number) => {
        saveFilterApi.ajax({
            url: '/post-type/delete-filter-saved',
            method: 'POST',
            data: {
                post_type: type,
                index: index,
            }
        });
    }

    React.useEffect(() => {

        setInputValue(paramUrl.search + '');

        if (paramUrl.filters) {
            const filters = JSON.parse(paramUrl.filters.toString());
            setFilters(filters);
        } else {
            setFilters([]);
        }

        setStateFilterSavedName(paramUrl.filter_saved_name);

    }, [type]);

    return (<>
        <Grid
            {...rest}
            className={classes.root + ' ' + className}
            container
            spacing={3}>
            <Grid item>
                <Box sx={{
                    display: 'flex',
                    gap: 2
                }}>
                    {
                        data && data.config.filters_saved && data.config.filters_saved.length ?
                            data.config.filters_saved.map((item, index) => (
                                <Button variant='contained' color={(stateFilterSavedName === item.name) ? 'primary' : 'inherit'} onClick={() => {
                                    setStateFilterSavedName(name => {
                                        if (name === item.name) {
                                            onFilter([]);
                                            setFilters([]);
                                            setQueryUrl(prev => {
                                                return { ...prev, filter_saved_name: '', sortKey: '', sortType: '' };
                                            });
                                            return '';
                                        }

                                        onFilter(JSON.parse(item.filters));
                                        setFilters(JSON.parse(item.filters));
                                        let sort = { sortKey: '', sortType: '' };
                                        try {
                                            sort = JSON.parse(item.sort);
                                        } catch (error) {
                                            //
                                        }
                                        setSortData(sort);
                                        setQueryUrl(prev => {
                                            return {
                                                ...prev,
                                                ...sort,
                                                filter_saved_name: item.name,
                                            }
                                        });
                                        return item.name;
                                    });
                                }} key={index}
                                    endIcon={<Icon icon='ClearRounded'
                                        color="error"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            confirm.onConfirm(() => {
                                                handleDeleteFilterSaved(index);
                                            }, {
                                                message: 'Hành động này sẽ xóa filter đã lưu vĩnh viễn, bạn có chắc chắn muốn xóa filter này?'
                                            });
                                        }}
                                    />}
                                >{item.name}</Button>
                            ))
                            : null
                    }
                    <Paper className={classes.search} elevation={2}>
                        <Icon icon="Search" className={classes.searchIcon} />
                        <Input
                            className={classes.searchInput}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
                                setInputValue(e.target.value);
                            }}
                            onKeyPress={e => {
                                if (e.key === 'Enter') {
                                    onSearch(inputValue);
                                }
                            }}
                            disableUnderline
                            placeholder={__('Enter something...')}
                            value={inputValue}
                        />
                    </Paper>
                    <Button
                        onClick={() => {
                            onSearch(inputValue);
                        }}
                        color="inherit"
                        size="large"
                        variant="contained">
                        {__('Search')}
                    </Button>
                </Box>
            </Grid>
            <Grid item sx={{

                display: 'flex',
                gap: 1,
            }}>

                {
                    data && data.config?.global_actions?.map((item: IActionPostType, index) => (
                        <Button
                            key={index}
                            color="inherit"
                            variant="contained"
                            disabled={loadingStateButton[index] ? true : false}
                            onClick={handleActionEvent(item, index)}
                        >
                            {item.title} {progressButton[index] !== undefined ? ` (${progressButton[index]}%)` : ''}
                        </Button>
                    ))
                }



                <Button
                    {...(filters.length ? {
                        color: "primary",
                        variant: 'contained',
                    } : {
                        color: "inherit",
                        variant: 'outlined',
                    })}
                    onClick={() => setOpenFilter(true)} >{__('Filter & Sort')}</Button>

                {moreButton}
            </Grid>
        </Grid>
        <DrawerCustom
            title="Filter"
            open={openFilter}
            activeOnClose
            width={900}
            onClose={() => setOpenFilter(false)}
            restDialogContent={{
                sx: {
                    pt: '24px !important'
                }
            }}
            headerAction={<>
                <Button
                    onClick={() => {
                        setOpenDialogSaveFilter(true);
                    }}
                    variant='contained'>Lưu filter</Button>
            </>}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                {
                    data && filters.length ?
                        filters.map((item, index) => (
                            <Box key={index}
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    alignItems: 'center',
                                }}
                            >
                                <Box sx={{ width: '100%' }}>
                                    <FieldForm
                                        component='select'
                                        config={{
                                            title: 'Key',
                                            list_option: data.config.fields
                                        }}
                                        post={item}
                                        name='key'
                                        onReview={(value) => {
                                            setFilters(prev => {
                                                prev[index].key = value;
                                                return [...prev];
                                            });
                                        }}
                                    />
                                </Box>
                                <MoreButton
                                    actions={[
                                        {
                                            '=': {
                                                title: '=',
                                                action: () => {
                                                    setFilters(prev => {
                                                        prev[index].condition = '=';
                                                        return [...prev];
                                                    });
                                                },
                                            },
                                            '!=': {
                                                title: '!=',
                                                action: () => {
                                                    setFilters(prev => {
                                                        prev[index].condition = '!=';
                                                        return [...prev];
                                                    });
                                                },
                                            }
                                        }
                                    ]}

                                >
                                    <Button sx={{ fontSize: 20, fontWeight: 600, flexShrink: 0, width: 100 }}>
                                        {item.condition}
                                    </Button>
                                </MoreButton>
                                <Box sx={{ width: '100%' }}>
                                    {
                                        (() => {
                                            try {
                                                let compoment = toCamelCase(data.config.fields[item.key].view ?? '');
                                                //eslint-disable-next-line
                                                let resolved = require('./FieldFiter/' + compoment).default;
                                                return React.createElement(resolved, {
                                                    config: data.config.fields[item.key],
                                                    data: item,
                                                    onReview: (value: ANY) => {
                                                        setFilters(prev => {
                                                            prev[index] = { ...prev[index], ...value };
                                                            return [...prev];
                                                        });
                                                    }
                                                });
                                            } catch (error) {
                                                //
                                            }

                                            return <FieldForm
                                                component={data.config.fields[item.key]?.view ?? 'text'}
                                                config={data.config.fields[item.key]}
                                                post={item}
                                                name='value'
                                                onReview={(value) => {
                                                    setFilters(prev => {
                                                        prev[index].value = value;
                                                        return [...prev];
                                                    });
                                                }}
                                            />
                                        })()
                                    }
                                </Box>
                                <IconButton
                                    onClick={() => {
                                        setFilters(prev => {
                                            return prev.filter((item, i) => i !== index);
                                        });
                                    }}
                                    color="error"
                                    sx={{
                                        flexShrink: 0,
                                        width: 40,
                                        height: 40,
                                    }}
                                >
                                    <ClearRoundedIcon />
                                </IconButton>
                            </Box>
                        ))
                        : null

                }
            </Box>
            {
                data &&
                <Box>
                    <Typography variant='h4' sx={{ mb: 2, mt: 3 }}>Sort</Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                        }}
                    >
                        <Box sx={{ width: '100%' }}>
                            <FieldForm
                                component='select'
                                config={{
                                    title: 'Key',
                                    list_option: {
                                        'id': { title: 'ID' },
                                        'order': { title: 'Sắp xếp' },
                                        'created_at': { title: 'Ngày tạo' },
                                        'updated_at': { title: 'Ngày cập nhật' },
                                        ...data.config.fields
                                    }
                                }}
                                post={sortData}
                                name='sortKey'
                                onReview={(value) => {
                                    setQueryUrl(prev => {
                                        return { ...prev, sortKey: value };
                                    });
                                    setSortData(prev => ({
                                        ...prev,
                                        sortKey: value,
                                    }));
                                }}
                            />
                        </Box>
                        <Box sx={{ width: '100%' }}>
                            <FieldForm
                                component='select'
                                config={{
                                    title: 'Sắp xếp',
                                    list_option: {
                                        '0': { title: 'Giảm dần' },
                                        '1': { title: 'Tăng dần' },
                                    }
                                }}
                                post={sortData}
                                name='sortType'
                                onReview={(value) => {
                                    setQueryUrl(prev => {
                                        return { ...prev, sortType: value };
                                    });
                                    setSortData(prev => ({
                                        ...prev,
                                        sortType: value,
                                    }));
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
            }
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mt: 3,
                }}
            >
                <Button
                    onClick={() => {
                        setFilters(prev => [...prev, { key: data ? Object.keys(data.config.fields)[0] : '', condition: '=', value: '' }]);
                    }}
                    variant='contained'>Thêm điều kiện</Button>
                <Button
                    variant='contained'
                    color='success'
                    onClick={() => {
                        onFilter(filters);
                        setOpenFilter(false);
                    }}
                >Apply Filter</Button>

            </Box>
        </DrawerCustom>

        <Dialog
            open={openDialogSaveFilter}
            onClose={() => setOpenDialogSaveFilter(false)}
            title='Lưu filter'
            action={
                <>
                    <Button variant='contained' color='inherit' onClick={() => setOpenDialogSaveFilter(false)}>Hủy</Button>
                    <Button variant='contained' color='success' onClick={() => {
                        handleSaveFilter();
                        setOpenDialogSaveFilter(false);
                    }}>Lưu</Button>
                </>
            }
        >
            <TextField
                fullWidth
                label='Tên filter'
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
            />
        </Dialog>
        {confirm.component}
    </>)
}

export default SearchBar
