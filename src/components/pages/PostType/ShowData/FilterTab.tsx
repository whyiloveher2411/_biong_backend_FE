import { Box, Theme } from '@mui/material';
import Button from 'components/atoms/Button';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
// import Typography from 'components/atoms/Typography';
import { addClasses } from 'helpers/dom';
import React from 'react';
import { ShowPostTypeData } from '.';
import MoreButton from 'components/atoms/MoreButton';
import { fade } from 'helpers/mui4/color';
import { __ } from 'helpers/i18n';
import {
    getMergedCustomFilters,
    getPostTypeColorBackground,
    resolvePostTypeColor,
    type PostTypeCustomFilter,
} from 'helpers/postTypeColor';
import { POST_TYPE_QUERY_REFETCH_KEY } from 'hook/usePostTypeTableQueryUrl';

const useStyles = makeCSS((theme: Theme) => ({
    tabsItem: {
        padding: '6px 16px',
        whiteSpace: 'nowrap',
    },
    tabs: {
        background: theme.palette.body.background,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '--color': theme.palette.primary.main,
        '&>.indicator': {
            position: 'absolute',
            top: 0,
            right: 0,
            width: 2,
            height: 48,
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            background: 'var(--color)',
        },
        '&>button': {
            minWidth: 160,
            minHeight: 48,
            opacity: 0.7,
            '&.active': {
                background: 'var(--activeColor)',
            },
            // '&.active, &.active $counter, &.active $filterTitle': {
            // opacity: 1,
            // color: 'var(--color)',
            // fontWeight: 'bold',
            // },
        },
        '& .MuiButton-label': {
            justifyContent: 'left',
            display: 'flex',
            alignItems: 'flex-start'
        }
    },
    // filterTitle: {
    // width: '100%',
    // textAlign: 'left',
    // textTransform: 'none',
    // },
    // counter: {
    // lineHeight: '24.5px',
    // paddingLeft: 8
    // },
    tabsIcon: {
        '&>button': {
            minWidth: 0,
            minHeight: 0,
            height: 48,
        },
    },
}));

function FilterTab({ data, name, tabs, queryUrl, setQueryUrl, ...props }: {
    [key: string]: ANY,
    name: string,
    acctionPost: (payload: JsonFormat, success: undefined | ((result: JsonFormat) => void)) => void
    queryUrl: JsonFormat,
    data: false | ShowPostTypeData,
    setQueryUrl: React.Dispatch<React.SetStateAction<JsonFormat>>,
}) {

    const classes = useStyles();

    const [tabCurrent, setTableCurrent] = React.useState({
        [name]: queryUrl.filter,
    });

    const handleChangeTab = (i: string) => {
        setTableCurrent({ ...tabCurrent, [name]: i });
        if (props.onChangeTab) {
            props.onChangeTab(i);
        }
    };

    React.useEffect(() => {
        if (queryUrl.filter_saved_name) {
            return;
        }
        setTableCurrent({
            [name]: queryUrl.filter || 'all',
        });
    }, [name, queryUrl.filter, queryUrl.filter_saved_name]);

    const dataConfig = data !== false ? data.config : null;
    const filters = dataConfig?.filters ? Object.keys(dataConfig.filters).filter(key => dataConfig.filters[key].count > 0) : [];
    const mergedSavedFilters = getMergedCustomFilters(dataConfig);
    const selectedSavedFilter = mergedSavedFilters.find((item) => item.name === queryUrl.filter_saved_name);
    const selectedCustomFilterColor = resolvePostTypeColor(selectedSavedFilter?.color);
    const selectedSystemFilterColor = !selectedSavedFilter
        ? dataConfig?.filters?.[tabCurrent[name]]?.color
        : undefined;
    const filterButtonColor = selectedCustomFilterColor ?? selectedSystemFilterColor;
    const currentFilterTitle = selectedSavedFilter
        ? selectedSavedFilter.name
        : __(dataConfig?.filters?.[tabCurrent[name]]?.title ?? 'All');

    const defaultFilterGroupKey = '__all_filters__';
    const groupedFilterActions: Array<{
        [key: string]: {
            title: string,
            action: () => void,
            color?: string,
            backgroundColor?: string,
        }
    }> = [];
    const groupActionMap: {
        [key: string]: {
            [key: string]: {
                title: string,
                action: () => void,
                color?: string,
                backgroundColor?: string,
        }
        }
    } = {};

    const pushActionToGroup = (
        groupName: string | undefined,
        actionKey: string,
        actionValue: {
            title: string,
            action: () => void,
            color?: string,
            backgroundColor?: string,
        }
    ) => {
        const normalizedGroupName = groupName?.trim() ? groupName.trim() : defaultFilterGroupKey;
        if (!groupActionMap[normalizedGroupName]) {
            groupActionMap[normalizedGroupName] = {};
            groupedFilterActions.push(groupActionMap[normalizedGroupName]);
        }
        groupActionMap[normalizedGroupName][actionKey] = actionValue;
    };

    filters.forEach((item: string) => {
        const groupName = (dataConfig?.filters?.[item] as ANY)?.group;
        pushActionToGroup(groupName, `system-filter-${item}`, {
            title: `${__(dataConfig?.filters?.[item]?.title ?? item)} (${dataConfig?.filters?.[item]?.count ?? 0})`,
            action: () => {
                setQueryUrl({
                    ...queryUrl,
                    filter: item,
                    filter_saved_name: '',
                    filters: '',
                });
                handleChangeTab(item);
            }
        });
    });

    mergedSavedFilters.forEach((item: PostTypeCustomFilter, index: number) => {
        pushActionToGroup(item.group, `saved-filter-${index}`, {
            title: `[Custom] ${item.name}`,
            color: item.color ? resolvePostTypeColor(item.color) : undefined,
            backgroundColor: getPostTypeColorBackground(item.color, 0.15),
            action: () => {
                let sort = { sortKey: '', sortType: '' };
                try {
                    sort = JSON.parse(item.sort ?? '{"sortKey":"","sortType":""}');
                } catch (error) {
                    //
                }

                setQueryUrl(prev => ({
                    ...prev,
                    filter_saved_name: item.name,
                    filters: item.filters,
                    ...sort,
                }));
            }
        });
    });
    const selectedMenuKey = selectedSavedFilter
        ? `saved-filter-${mergedSavedFilters.findIndex((item: { name: string }) => item.name === selectedSavedFilter.name)}`
        : `system-filter-${tabCurrent[name]}`;

    const handleRefreshData = () => {
        setQueryUrl((prev) => ({
            ...prev,
            [POST_TYPE_QUERY_REFETCH_KEY]: Date.now(),
        }));
    };

    // const tabSelectedIndex = filters.findIndex(item => item === tabCurrent[name]);

    if (data !== false && Boolean(dataConfig?.filters)) {
        return (
            <div
                className={addClasses({
                    [classes.tabs]: true,
                    [classes.tabsIcon]: true,
                })}
            // style={{ ['--activeColor' as string]: data.config.filters[tabCurrent[name]]?.color ? fade(data.config.filters[tabCurrent[name]].color, 0.08) : 'rgba(228, 230, 235, 0.08)' }}
            >
                {/* {
                    filters.length > 0 &&
                    <span className='indicator' style={{ top: (tabSelectedIndex !== -1 ? tabSelectedIndex : 0) * 48 }}></span>
                } */}
                {/* {
                    filters.map((key: string) => (
                        <Button
                            key={key}
                            onClick={() => {
                                setQueryUrl({
                                    ...queryUrl,
                                    filter: key
                                });
                                handleChangeTab(key)
                            }}
                            className={addClasses({
                                [classes.tabsItem]: true,
                                active: tabCurrent[name] === key,
                            })}
                            startIcon={<Icon icon={data.config.filters[key].icon} />}
                            style={{ ['--color' as string]: data.config.filters[key].color }}
                            color="inherit"
                        >
                            <Typography noWrap className={classes.filterTitle} dangerouslySetInnerHTML={{ __html: data.config.filters[key].title }} />
                            <Typography className={classes.counter} variant='body2'>{data.config.filters[key].count}</Typography>
                        </Button>
                    ))
                } */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        className="refresh-post-type-data"
                        onClick={handleRefreshData}
                        title={__('Refresh')}
                        sx={{ minWidth: 36, px: 1 }}
                    >
                        <Icon icon='Refresh' />
                    </Button>
                    {
                        groupedFilterActions.length > 0 ?
                            <MoreButton
                                actions={groupedFilterActions}
                                selected={selectedMenuKey}
                            >
                                <Button
                                    size="small"
                                    startIcon={<Icon icon={selectedSavedFilter ? 'FilterListRounded' : (dataConfig?.filters?.[tabCurrent[name]]?.icon ?? 'PublicOutlined')} />}
                                    variant='contained'
                                    sx={{
                                        textTransform: 'none',
                                        backgroundColor: filterButtonColor ?? 'primary.main',
                                        '&:hover, &:active, &:focus': {
                                            backgroundColor: filterButtonColor
                                                ? fade(filterButtonColor, 0.9)
                                                : (selectedSavedFilter
                                                    ? 'primary.dark'
                                                    : (dataConfig?.filters?.[tabCurrent[name]]?.color
                                                        ? fade(dataConfig.filters[tabCurrent[name]].color, 0.9)
                                                        : 'primary.dark')),
                                        }
                                    }}
                                >
                                    {currentFilterTitle}
                                </Button>
                            </MoreButton>
                            :
                            <Button
                                size="small"
                                startIcon={<Icon icon={'PublicOutlined'} />}
                                variant='contained'
                                sx={{ textTransform: 'none' }}
                            >
                                {__('All')}
                            </Button>
                    }
                </Box>
            </div>
        )
    }

    return <></>

}

export default FilterTab
