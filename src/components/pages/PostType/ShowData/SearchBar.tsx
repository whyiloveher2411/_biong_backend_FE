import Box from 'components/atoms/Box'
import Button from 'components/atoms/Button'
import makeCSS from 'components/atoms/makeCSS'
import React from 'react'
import { IconButton, InputAdornment, TextField, Theme, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { __ } from 'helpers/i18n'
import DrawerCustom from 'components/molecules/DrawerCustom'
import { globalActionsRequestSourceMain } from './globalActionsRequestSource'
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
import { groupActionsForMenu } from 'components/atoms/PostType/groupActionsForMenu'
const useStyles = makeCSS((theme: Theme) => ({
    root: {
        width: '100%',
    },
    toolbarRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: theme.spacing(1),
        width: '100%',
    },
    searchGroup: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing(1),
        flex: 1,
        minWidth: 0,
    },
    actionsGroup: {
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'center',
        flexShrink: 0,
        flexWrap: 'wrap',
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
        condition: '=' | '!=' | 'like',
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
        condition: '=' | '!=' | 'like',
        value: string,
    }>>([]);

    const paramUrl = useQuery({ filters: '', search: '', filter_saved_name: '', sortKey: '', sortType: '' });

    const [sortData, setSortData] = React.useState<{
        sortKey: string,
        sortType: string,
    }>({ sortKey: paramUrl.sortKey?.toString() ?? '', sortType: paramUrl.sortType?.toString() ?? '' });

    const [loadingStateButton, setLoadingStateButton] = React.useState<{ [key: number]: boolean }>({});
    const [progressButton, setProgressButton] = React.useState<{ [key: number]: number }>({});
    const maxVisibleGlobalActions = 0;

    const useAjaxAction = useAjax();
    const confirm = useConfirmDialog();

    const handleActionEvent = (item: IActionPostType, index: number) => () => {
        const globalActionPayload = {
            ...globalActionsRequestSourceMain,
            post_type: type,
        };
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
                data: globalActionPayload,
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
                            ...globalActionPayload,
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

        confirm.onConfirm(callApi, {
            title: item.confirm?.title,
            icon: item.confirm?.icon,
            numberConfirm: item.confirm?.number_confirm,
            message: item.confirm?.message || item.confirm_message || __('Bạn có chắc muốn "{{toolTitle}}" không?', {
                toolTitle: item.title,
            })
        });

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

    React.useEffect(() => {

        setInputValue(paramUrl.search + '');

        if (paramUrl.filters) {
            try {
                const filters = JSON.parse(paramUrl.filters.toString());
                setFilters(filters);
            } catch (error) {
                setFilters([]);
            }
        } else {
            setFilters([]);
        }

    }, [type]);

    const globalActions: IActionPostType[] = data && data.config?.global_actions ? data.config.global_actions : [];
    const hiddenGlobalActions = globalActions.slice(maxVisibleGlobalActions);

    return (<>
        <Box {...rest} className={`${classes.root} ${className}`.trim()}>
            <Box className={classes.toolbarRow}>
                <Box className={classes.searchGroup}>
                    <TextField
                        size="small"
                        placeholder={__('Enter something...')}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearch(inputValue);
                            }
                        }}
                        sx={{
                            flex: 1,
                            minWidth: { xs: '100%', sm: 200 },
                            maxWidth: { sm: 360 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                bgcolor: 'background.default',
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        onClick={() => onSearch(inputValue)}
                        color="inherit"
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'none', flexShrink: 0 }}
                    >
                        {__('Search')}
                    </Button>
                </Box>
                <Box className={classes.actionsGroup}>
                {
                    hiddenGlobalActions.length > 0 &&
                    <MoreButton
                        actions={groupActionsForMenu(hiddenGlobalActions.map((item: IActionPostType, index: number) => {
                            const actionIndex = index + maxVisibleGlobalActions;
                            const loading = loadingStateButton[actionIndex] ? '...' : '';
                            const progress = progressButton[actionIndex] !== undefined ? ` (${progressButton[actionIndex]}%)` : '';

                            return {
                                key: `global-action-${actionIndex}`,
                                group: (item as ANY).group,
                                title: `${item.title}${loading}${progress}`,
                                color: item.color,
                                action: handleActionEvent(item, actionIndex),
                            };
                        }))}
                    >
                        <Button
                            color="inherit"
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: 'none' }}
                        >
                            {__('Tools')}
                        </Button>
                    </MoreButton>
                }


                <Button
                    {...(filters.length ? {
                        color: "primary",
                        variant: 'contained',
                    } : {
                        color: "inherit",
                        variant: 'outlined',
                    })}
                    size="small"
                    sx={{ textTransform: 'none' }}
                    onClick={() => setOpenFilter(true)} >{__('Filter & Sort')}</Button>

                {moreButton}
                </Box>
            </Box>
        </Box>
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
                                            list_option: {
                                                status: { title: 'Trạng thái' },
                                                ...data.config.fields,
                                            }
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
                                            },
                                            'like': {
                                                title: 'like',
                                                action: () => {
                                                    setFilters(prev => {
                                                        prev[index].condition = 'like';
                                                        return [...prev];
                                                    });
                                                },
                                            },
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

                                                let compoment = toCamelCase(data.config.fields[item.key]?.view ?? '');
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

                                            data.config.fields.status = {
                                                title: 'Trạng thái',
                                                view: 'select',
                                                list_option: {
                                                    publish: { title: 'Publish' },
                                                    pending: { title: 'Pending' },
                                                    draft: { title: 'Draft' },
                                                    trash: { title: 'Trash' },
                                                }
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
