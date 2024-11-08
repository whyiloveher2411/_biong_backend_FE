import { Theme } from '@mui/material';
import Button from 'components/atoms/Button';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
// import Typography from 'components/atoms/Typography';
import { addClasses } from 'helpers/dom';
import React from 'react';
import { ShowPostTypeData } from '.';
import MoreButton from 'components/atoms/MoreButton';
import { fade } from 'helpers/mui4/color';

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
        setTableCurrent({
            [name]: queryUrl.filter,
        });
    }, [name, queryUrl.filter]);

    const filters = data !== false && data.config.filters ? Object.keys(data.config.filters).filter(key => data.config.filters[key].count > 0) : [];

    // const tabSelectedIndex = filters.findIndex(item => item === tabCurrent[name]);

    if (data !== false && Boolean(data.config.filters)) {
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
                <MoreButton
                    actions={[filters.reduce((acc: {[key: string]: { title: string, action: () => void }}, item: string) => {
                        acc[item] = {
                            title: data.config.filters[item].title + ' (' + data.config.filters[item].count + ')',
                            action: () => {
                                setQueryUrl({ ...queryUrl, filter: item });
                                handleChangeTab(item);
                            }
                        }
                        return acc;
                    }, {})]}
                >
                    <Button
                        size="large"
                        startIcon={<Icon icon={data.config.filters[tabCurrent[name]].icon} />}
                        variant='contained'
                        sx={{
                            backgroundColor: data.config.filters[tabCurrent[name]].color ?? 'primary.main',
                            '&:hover, &:active, &:focus': {
                                backgroundColor: data.config.filters[tabCurrent[name]].color ? fade(data.config.filters[tabCurrent[name]].color, 0.9) : 'primary.dark',
                            }
                        }}
                    >
                        {data.config.filters[tabCurrent[name]].title}
                   </Button>
                </MoreButton>
            </div>
        )
    }

    return <></>

}

export default FilterTab
