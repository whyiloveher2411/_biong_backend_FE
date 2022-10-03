import { Theme } from "@mui/material";
import { default as MuiTab, TabProps as MuiTabProps } from "@mui/material/Tab";
import { default as MuiTabs, TabsProps as MuiTabsProps } from "@mui/material/Tabs";
import { withStyles } from "@mui/styles";
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Collapse from 'components/atoms/Collapse';
import Divider from 'components/atoms/Divider';
import { addClasses } from 'helpers/dom';
import { fade } from "helpers/mui4/color";
import { getParamsFromUrl, getUrlParams, replaceUrlParam } from "helpers/url";
import useQuery from "hook/useQuery";
import React from 'react';
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import makeCSS from "./makeCSS";

const StyledTabs = withStyles({
    indicator: {
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        '& > span': {
            width: '100%',
            backgroundColor: 'var(--color)',
        },
    },
})((props: MuiTabsProps) => <MuiTabs {...props} TabIndicatorProps={{ children: <span /> }} />);

const StyledTab = withStyles((theme) => ({
    root: {
        textTransform: 'none',
        fontWeight: theme.typography.fontWeightRegular,
        fontSize: theme.typography.pxToRem(15),
        marginRight: theme.spacing(1),
        '&:focus': {
            opacity: 1,
        },
    },
}))((props: MuiTabProps) => <MuiTab disableRipple {...props} />);



const useStyles = makeCSS((theme: Theme) => ({
    root: {
        '& .tab-content': {
            marginTop: 16
        }
    },
    tabContent: {
        marginTop: 16
    },
    tabs2Root: {
        flexGrow: 1,
        display: 'flex',
        minHeight: 224,
        '& .MuiButton-startIcon': {
            marginBottom: '5px'
        }
    },
    tabWarper: {
        position: 'sticky',
        top: 0,
        zIndex: 1030,
        background: 'var(--backgroundTabWarper, transparent)',
    },
    displayNone: {
        display: 'none'
    },
    tabs1: {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        '& .Mui-selected': {
            color: 'var(--color)',
        },
        '& .MuiTabs-indicator': {
            left: 'var(--left) !important',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
        }
    },
    tabsItem: {
        padding: '6px 16px',
        whiteSpace: 'nowrap',
    },
    subTabsItem: {
        padding: '6px 16px 6px 40px',
        whiteSpace: 'initial',
        justifyContent: 'flex-start',
        width: 'var(--tabWidth)',
        minWidth: 160,
        minHeight: 48,
        opacity: 0.7,
        textAlign: 'left',
        '&.active': {
            backgroundColor: fade(theme.palette.text.primary, 0.06)
        }
    },
    tabs: {
        background: theme.palette.body.background,
        display: 'flex',
        width: 'var(--tabWidth)',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.dividerDark}`,
        position: 'relative',
        '--color': theme.palette.primary.main,
        '&>.indicator': {
            position: 'absolute',
            right: 0,
            width: 2,
            height: 48,
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            background: 'var(--color)',
        },
        '&>button': {
            width: 'var(--tabWidth)',
            minWidth: 160,
            minHeight: 48,
            opacity: 0.7,
            justifyContent: 'flex-start',
            '&:not($hasSubTab).active': {
                opacity: 1,
                color: 'var(--color)',
            },
        },
        '& .MuiButton-label': {
            justifyContent: 'left',
            display: 'flex',
            alignItems: 'flex-start'
        }
    },
    tabsIcon: {
        '&>button': {
            minWidth: 0,
            minHeight: 0,
            height: 48,
        },
        '& .MuiButton-label': {
            justifyContent: 'center'
        }
    },
    hasSubTab: {

    },
    indicatorInline: {
        '& $tabsItem.active:not($hasSubTab):after, & $subTabsItem.active:after': {
            content: '""',
            position: 'absolute',
            right: 0,
            width: 2,
            height: 48,
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            background: 'var(--color)',
        },
        '& $subTabsItem.active': {
            opacity: 1,
            color: 'var(--color)',
        },
    },
    tabHorizontal: {
        textTransform: 'unset',
        width: 'auto',
        minWidth: 'auto',
        margin: '0 16px',
    },
    tabHorizontalDense: {
        paddingLeft: 0,
        paddingRight: 0,
    },
    dense: {
        '--color': theme.palette.primary.main,
        '& $tabHorizontal:first-child': {
            marginLeft: 0
        }
    },
    scrollable: {
        '& .MuiTabScrollButton-root.Mui-disabled': {
            opacity: .2,
        }
    }

}));

export interface TabProps {
    title: React.ReactNode,
    content: (propContent: any) => React.ReactNode,//eslint-disable-line
    hidden?: boolean,
    subTab?: TabProps[],
    buttonProps?: any,//eslint-disable-line
    restTitle?: any,//eslint-disable-line
    key?: string,
}

interface TabsProps {
    [key: string]: any, //eslint-disable-line
    name: string,
    tabs: TabProps[],
    tabIndex?: number,
    subTabIndex?: number,
    tabIcon?: boolean,
    orientation?: 'horizontal' | 'vertical',
    activeIndicator?: boolean,
    tabWidth?: number,
    propsContent?: any,//eslint-disable-line
    disableDense?: boolean,
    isDenseLabel?: boolean,
    activeAutoScrollToTab?: boolean,
    onChangeTab?: (tab: number, subTab: number | undefined | null) => void,
    isTabSticky?: boolean,
    backgroundTabWarper?: string,
}

function Tabs({
    name,
    tabs,
    tabIcon,
    orientation = "horizontal",
    activeIndicator = true,
    tabWidth = 250,
    tabIndex = -1,
    subTabIndex = -1,
    propsContent,
    disableDense,
    isDenseLabel = true,
    isTabSticky = false,
    activeAutoScrollToTab = false,
    backgroundTabWarper = 'transparent',
    onChangeTab,
    ...props
}: TabsProps) {

    const classes = useStyles();

    const tabRef = React.useRef<HTMLDivElement>(null);
    //start Load tab current from url

    const tabsOnUrl = useQuery({
        ['tab_' + name]: 0,
        ['subtab_' + name]: 0
    });

    const loadTabCurrentFromUrl = (): {
        tabIndex: number,
        subtabIndex: number,
    } => {

        let tabIndex2 = tabIndex, subtabIndex2 = subTabIndex;

        let tabsOnUrl = getUrlParams(window.location.search, {
            ['tab_' + name]: 0,
            ['subtab_' + name]: 0
        });

        if (tabsOnUrl['tab_' + name]) {

            let index = tabs.findIndex((item, index) => (item.key && item.key === tabsOnUrl['tab_' + name]) || index === Number(tabsOnUrl['tab_' + name]));

            if (index > -1) {
                tabIndex2 = index;
            }
        }

        if (tabIndex > -1) {

            let subTabsContent = tabs[tabIndex]?.subTab;

            if (tabsOnUrl['subtab_' + name] && subTabsContent) {

                let index = subTabsContent.findIndex((item, index) => (item.key && item.key === tabsOnUrl['subtab_' + name]) || index === Number(tabsOnUrl['subtab_' + name]));

                if (index > -1) {
                    subtabIndex2 = index;
                }
            }
        }

        if (tabIndex2 < 0) tabIndex2 = 0;
        if (subtabIndex2 < 0) subtabIndex2 = 0;

        return {
            tabIndex: tabIndex2,
            subtabIndex: subtabIndex2
        }
    }

    const tabCurrentFormUrl = loadTabCurrentFromUrl();

    const [tabCurrent, setTableCurrent] = React.useState<{
        [key: string]: number,
    }>({
        [name]: tabCurrentFormUrl.tabIndex,
        [name + '_subTab']: tabCurrentFormUrl.subtabIndex,
    });

    const navigate = useNavigate();

    const [openSubTab, setOpenSubTab] = React.useState<{ [key: number]: boolean }>({});

    const handleChangeTab = (i: number, subTabKey: number | undefined | null = null) => {
        if (tabs[i].subTab) {
            if (subTabKey !== null) {
                setTableCurrent({ ...tabCurrent, [name]: i, [name + '_subTab']: subTabKey });
                if (onChangeTab) {
                    onChangeTab(i, subTabKey);
                } else {
                    changeTabOnUrl(i, subTabKey);
                }
            } else {
                setOpenSubTab(prev => ({ ...prev, [i]: !prev[i] }));
            }
        } else {
            setTableCurrent({ ...tabCurrent, [name]: i, [name + '_subTab']: -1 });
            if (onChangeTab) {
                onChangeTab(i, subTabKey);
            } else {
                changeTabOnUrl(i, subTabKey);
            }
        }
        if (activeAutoScrollToTab) {
            tabRef.current?.scrollIntoView({
                behavior: 'smooth'
            });
        }
    };

    const changeTabOnUrl = (tab: number, subTab: number | undefined | null) => {

        let tabKey = tabs[tab].key ?? tab, subTabKey = '';

        let subTabContent = tabs[tab].subTab;

        if (typeof subTab === 'number' && subTab > -1 && subTabContent && subTabContent[subTab].key) {

            subTabKey = subTabContent[subTab].key as string;

            navigate('?' + getParamsFromUrl(replaceUrlParam(window.location.href, {
                ['tab_' + name]: tabKey as string,
                ['subtab_' + name]: subTabKey as string,
            })));

        } else {
            navigate('?' + getParamsFromUrl(replaceUrlParam(window.location.href, {
                ['tab_' + name]: tabKey as string,
            })));
        }
    }

    // React.useEffect(() => {

    // }, [tabCurrent])

    const getIndexFirstShow = (index: number): number => {
        if (tabs[index] && tabs[index].hidden) {
            return getIndexFirstShow(index + 1);
        }
        return index;
    }

    React.useEffect(() => {

        let tabCurrentFormUrl = loadTabCurrentFromUrl();

        setTableCurrent({
            [name]: tabCurrentFormUrl.tabIndex,
            [name + '_subTab']: tabCurrentFormUrl.subtabIndex,
        });

        setOpenSubTab(prev => {
            tabs.forEach((item, index) => {
                if (index === tabCurrent[name] && item.subTab) {
                    prev[index] = true;
                } else {
                    prev[index] = false;
                }
            });

            return { ...prev };
        });

        // eslint-disable-next-line
    }, [name, tabIndex, tabsOnUrl]);

    if (tabs.length < 1) {
        return null;
    }

    if (orientation === 'vertical') {
        return (
            <Box ref={tabRef} className={classes.tabs2Root} style={{ ['--tabWidth' as string]: (!tabIcon ? tabWidth : 58) + 'px' }} {...props}>
                <div className={addClasses({
                    [classes.tabs]: true,
                    [classes.tabsIcon]: tabIcon,
                    [classes.indicatorInline]: !activeIndicator,
                    tabItems: true,
                })}>
                    {
                        activeIndicator &&
                        <span className='indicator' style={{ top: ((tabCurrent[name] ?? -1) - tabs.filter((item, index) => index < (tabCurrent[name] ?? -1) && item.hidden).length) * 48 }}></span>
                    }
                    {
                        tabs.map((tab, i: number) => (
                            !tab.hidden ?
                                <React.Fragment key={i}>
                                    <Button
                                        {...tab.buttonProps}
                                        onClick={() => handleChangeTab(i)}
                                        className={addClasses({
                                            subTabItem: true,
                                            [classes.tabsItem]: true,
                                            active: tabCurrent[name] === i,
                                            [classes.hasSubTab]: Boolean(tab.subTab)
                                        })}
                                        color="inherit"
                                        {...tab.restTitle}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                width: 1,
                                                justifyContent: "space-between"
                                            }}
                                        >
                                            {tab.title}
                                            {
                                                Boolean(tab.subTab) &&
                                                (
                                                    openSubTab[i] ? <Icon icon="ExpandLess" /> : <Icon icon="ExpandMore" />
                                                )
                                            }
                                        </Box>
                                    </Button>
                                    {
                                        typeof tab.subTab !== undefined &&
                                        <Collapse in={openSubTab[i]} timeout="auto" unmountOnExit>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column"
                                                }}
                                            >
                                                {
                                                    tab.subTab && tab.subTab.map((subTabItem, indexSubTab) => (
                                                        <Button
                                                            {...subTabItem.buttonProps}
                                                            key={indexSubTab}
                                                            onClick={() => handleChangeTab(i, indexSubTab)}
                                                            className={classes.subTabsItem + ((tabCurrent[name] === i && tabCurrent[name + '_subTab'] === indexSubTab) ? ' active' : '')}
                                                            color="inherit"
                                                            {...subTabItem.restTitle}
                                                        >
                                                            {subTabItem.title}
                                                        </Button>
                                                    ))
                                                }
                                            </Box>
                                        </Collapse>
                                    }
                                </React.Fragment>
                                : <React.Fragment key={i}></React.Fragment>
                        ))
                    }
                </div>
                <div style={{ paddingLeft: 24, width: 'calc( 100% - var(--tabWidth) )' }}>
                    {
                        (() => {
                            if (typeof tabCurrent[name] === 'number' && tabs[tabCurrent[name]] !== undefined && !tabs[tabCurrent[name]].hidden) {
                                if (tabCurrent[name + '_subTab'] !== null
                                    && tabs[tabCurrent[name]].subTab
                                    //eslint-disable-next-line
                                    //@ts-ignore
                                    && tabs[tabCurrent[name]].subTab[tabCurrent[name + '_subTab']]
                                ) {
                                    //eslint-disable-next-line
                                    //@ts-ignore
                                    return (tabs[tabCurrent[name]].subTab[tabCurrent[name + '_subTab']].content)(propsContent);
                                }
                                return (tabs[tabCurrent[name]].content)(propsContent);
                            } else {
                                setTableCurrent({ ...tabCurrent, [name]: getIndexFirstShow(0), [name + '_subTab']: -1 });
                            }
                        })()
                    }
                </div>
            </Box >
        )
    }

    return (
        <Box ref={tabRef} className={classes.scrollable} {...props}>
            <div className={isTabSticky ? classes.tabWarper : ''} style={{ ['--backgroundTabWarper' as string]: backgroundTabWarper }}>
                <StyledTabs
                    scrollButtons="auto"
                    variant="scrollable"
                    value={Number(tabCurrent[name])}
                    textColor="primary"
                    className={addClasses({
                        [classes.dense]: !disableDense,
                        tabItems: true,
                    })}
                    onChange={(_e, v: number) => handleChangeTab(v)}
                >
                    {tabs.map((tab, i) => (
                        <StyledTab
                            className={addClasses({
                                [classes.tabHorizontal]: true,
                                [classes.tabHorizontalDense]: isDenseLabel,
                                [classes.displayNone]: tab.hidden,
                            })}
                            key={i}
                            label={tab.title}
                            value={i}
                        />
                    ))}
                </StyledTabs>
                <Divider color="dark" />
            </div>
            <div className={classes.tabContent}>
                {
                    (() => {
                        if (tabs[tabCurrent[name]] && !tabs[tabCurrent[name]].hidden) {
                            return (tabs[tabCurrent[name]].content)(propsContent);
                        } else {
                            setTableCurrent({ ...tabCurrent, [name]: getIndexFirstShow(0), [name + '_subTab']: -1 });
                        }
                    })()
                }
            </div>
        </Box>
    )
}

export default Tabs
