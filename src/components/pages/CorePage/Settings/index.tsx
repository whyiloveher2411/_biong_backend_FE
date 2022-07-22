import { Theme } from '@mui/material';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import CircularProgress from 'components/atoms/CircularProgress';
import Collapse from 'components/atoms/Collapse';
import FieldForm from 'components/atoms/fields/FieldForm';
import Icon, { IconFormat } from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import Tabs from 'components/atoms/Tabs';
import Typography from 'components/atoms/Typography';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { update } from 'store/settings/settings.reducers';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        flexGrow: 1,
        marginTop: theme.spacing(3),
        position: 'relative',
        minHeight: 250
    },
}));




const TabContent = ({ title, description, post, onReview, groupFields }: {
    title: string,
    description?: string,
    post: JsonFormat,
    onReview: (value: ANY, key: ANY) => void,
    groupFields: JsonFormat,
    keyTab: string,
    keySubTab?: string,
    data: SettingDataProps
}) => {

    return (
        <>
            <Typography variant='h4' style={{ marginBottom: 8 }}>
                {title}
            </Typography>
            <Typography style={{ marginBottom: 24 }}>
                {description}
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gridGap: 24
                }}
            >
                {
                    Array.isArray(groupFields) && groupFields.map((group, index) => (
                        group.template && group.template === 'BLANK' ?
                            <Box key={index}
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gridGap: 24
                                }}
                            >
                                {
                                    Boolean(group.fields) && Object.keys(group.fields).map(keyField => (
                                        !group.fields[keyField].hidden ?
                                            <Collapse
                                                key={keyField}
                                                style={{ marginTop: -24 }}
                                                in={group.fields[keyField].active ? Boolean(post[group.fields[keyField].active]) : true}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gridGap: 1,
                                                        marginTop: 3
                                                    }}
                                                >
                                                    {
                                                        group.fields[keyField].view !== 'custom' ?
                                                            <FieldForm
                                                                component={group.fields[keyField].view}
                                                                config={group.fields[keyField]}
                                                                post={post}
                                                                name={keyField}
                                                                onReview={(value, key = keyField) => onReview(value, key)}
                                                            />
                                                            :
                                                            (() => {
                                                                // try {

                                                                //eslint-disable-next-line
                                                                let resolved = require(`./${group.fields[keyField].component}`).default;
                                                                return React.createElement(resolved, {
                                                                    config: group.fields[keyField],
                                                                    post: post,
                                                                    name: keyField,
                                                                    onReview: (value: ANY, key = keyField) => onReview(value, key)
                                                                });
                                                                // } catch (error) {

                                                                // }
                                                            })()
                                                    }
                                                </Box>
                                            </Collapse>
                                            :
                                            <React.Fragment key={keyField}></React.Fragment>
                                    ))
                                }
                            </Box>
                            :
                            <Card key={index} >
                                <CardContent>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gridGap: 24
                                        }}
                                    >
                                        {
                                            Boolean(group.fields) && Object.keys(group.fields).map(keyField => (
                                                !group.fields[keyField].hidden ?
                                                    <Collapse key={keyField} style={{ marginTop: -24 }} in={group.fields[keyField].active ? Boolean(post[group.fields[keyField].active]) : true}>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gridGap: 1,
                                                                marginTop: 3
                                                            }}
                                                        >
                                                            {
                                                                group.fields[keyField].view !== 'custom' ?
                                                                    <FieldForm
                                                                        component={group.fields[keyField].view}
                                                                        config={group.fields[keyField]}
                                                                        post={post}
                                                                        name={keyField}
                                                                        onReview={(value, key = keyField) => onReview(value, key)}
                                                                    />
                                                                    :
                                                                    (() => {
                                                                        // try {

                                                                        //eslint-disable-next-line
                                                                        let resolved = require(`./${group.fields[keyField].component}`).default;
                                                                        return React.createElement(resolved, {
                                                                            config: group.fields[keyField],
                                                                            post: post,
                                                                            name: keyField,
                                                                            onReview: (value: ANY, key = keyField) => onReview(value, key)
                                                                        });
                                                                        // } catch (error) {

                                                                        // }
                                                                    })()
                                                            }
                                                        </Box>
                                                    </Collapse>
                                                    :
                                                    <React.Fragment key={keyField}></React.Fragment>
                                            ))
                                        }
                                    </Box>
                                </CardContent>
                            </Card>
                    ))
                }
            </Box>
        </>
    )
}

function Settings() {

    const { tab, subtab1 } = useParams();

    const navigate = useNavigate();

    const dispatch = useDispatch();

    const classes = useStyles();

    const [data, setData] = React.useState<SettingDataProps>({
        config: [],
        row: {},
        tabs: {}
    });

    const permission = usePermission('settings_management').settings_management;

    const { ajax, Loading } = useAjax();

    const [tabs, setTabs] = React.useState<Array<TabItemProps>>([]);

    const handleValidateTabsFromApi = (dataFromApi: SettingDataProps) => {

        let result: Array<TabItemProps> = [];

        Object.keys(dataFromApi.tabs).forEach(key => {

            let tabItem: TabItemProps = {
                title: dataFromApi.tabs[key].title,
                buttonProps: {
                    startIcon: <Icon icon={dataFromApi.tabs[key].icon} />
                },
                value: key,
                content: () => (key === tab && !subtab1) ?
                    <TabContent
                        keyTab={key}
                        title={dataFromApi.tabs[key].title}
                        description={dataFromApi.tabs[key].description}
                        post={dataFromApi.row || {}}
                        data={dataFromApi}
                        onReview={onReview}
                        groupFields={dataFromApi.config}
                    />
                    : <></>
            };

            if (dataFromApi.tabs[key].subTab) {

                let subTab: {
                    title: string,
                    buttonProps: {
                        startIcon: React.ReactNode
                    },
                    value: string,
                    content: () => React.ReactNode
                }[] = [];

                let subTabTemp = dataFromApi.tabs[key].subTab ?? {};

                Object.keys(subTabTemp).forEach((keySubTab: string) => {
                    subTab.push({
                        title: subTabTemp[keySubTab].title,
                        buttonProps: {
                            startIcon: <Icon icon={subTabTemp[keySubTab].icon} />
                        },
                        value: keySubTab,
                        content: () => (key === tab && keySubTab === subtab1) ?
                            <TabContent
                                keyTab={key}
                                keySubTab={keySubTab}
                                title={subTabTemp[keySubTab].title}
                                description={subTabTemp[keySubTab].description}
                                post={dataFromApi.row || {}}
                                data={dataFromApi}
                                onReview={onReview}
                                groupFields={dataFromApi.config}
                            />
                            : <></>
                    });
                });

                tabItem.subTab = subTab;
            }

            result.push(tabItem);
        });

        setTabs(result);

    }

    React.useEffect(() => {
        if (permission && tab) {
            ajax({
                url: 'settings/get',
                method: 'POST',
                data: {
                    group: tab,
                    subGroup: subtab1,
                },
                success: function (result: SettingDataProps) {
                    setData(result);
                }
            });
        }
        //eslint-disable-next-line
    }, [tab, subtab1]);

    const onReview = (value: ANY, key: ANY) => {

        setData(prev => {

            if (typeof key === 'object' && key !== null) {
                prev.row = {
                    ...prev.row,
                    ...key
                };
            } else {
                prev.row = {
                    ...prev.row,
                    [key]: value,
                };
            }

            return { ...prev };
        });
    };

    React.useEffect(() => {
        if (data.tabs) {
            handleValidateTabsFromApi(data);
        }
        //eslint-disable-next-line
    }, [data]);

    const handleTabsChange = (index: number, subTab: number | null = null) => {

        if (subTab !== null && tabs[index].subTab !== undefined) {
            let tab = tabs[index].subTab;
            if (tab) {
                navigate('/settings/' + tabs[index].value + '/' + tab[subTab].value);
            }
        } else {
            navigate('/settings/' + tabs[index].value);
        }
    }

    const handleSubmit = () => {

        setData(prev => {
            console.log(prev);
            return prev;
        });

        ajax({
            url: 'settings/post',
            method: 'POST',
            data: {
                settings: data.row,
                group: tab,
                subGroup: subtab1,
            },
            success: function (result: JsonFormat) {
                if (result.row) {
                    dispatch(update(result.row));
                }
            }
        });
    };

    if (!tab) {
        return <Navigate to={'/settings/general'} />;
    }

    if (!permission) {
        return <RedirectWithMessage />
    }

    if (tabs[0] === undefined) {
        return <CircularProgress style={{
            left: '50%',
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%,-50%)'
        }} />;
    }

    let tabContentIndex = tabs.findIndex(item => item.value === tab);
    // tabs.find(t => t.value === tab);

    if (tabContentIndex < 0) {
        return <Navigate to={'/settings/' + tabs[0].value} />;
    }

    if (subtab1) {

        if (tabs[tabContentIndex].subTab && !tabs[tabContentIndex].subTab?.find(t => t.value === subtab1)) {
            let subtab = tabs[tabContentIndex]?.subTab;
            if (subtab) {
                return <Navigate to={'/settings/' + tabs[tabContentIndex].value + '/' + subtab[0].value} />;
            }
        }

        if (!tabs[tabContentIndex].subTab) {
            return <Navigate to={'/settings/' + tabs[tabContentIndex].value} />;
        }

    }

    return (
        <Page
            title={__("Settings")}
            isHeaderSticky
            header={
                <div>
                    <Typography component="h2" gutterBottom variant="overline">
                        {__("Settings")}
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between"
                        }}
                    >
                        <Typography component="h1" variant="h3">
                            {__("Change settings that affect the entire website")}
                        </Typography>
                        <Button
                            type="submit"
                            onClick={handleSubmit}
                            color="success"
                            variant="contained">
                            {__('Save Changes')}
                        </Button>
                    </Box>
                </div>
            }
        >
            <div className={classes.root}>
                <Tabs
                    name={'settings_page'}
                    orientation='vertical'
                    tabWidth={300}
                    tabIndex={tabContentIndex}
                    onChangeTab={handleTabsChange}
                    tabs={tabs}
                    subTabIndex={subtab1 ? tabs[tabContentIndex].subTab?.findIndex(t => t.value === subtab1) : -1}
                    activeIndicator={false}
                />
            </div>
            {Loading}
        </Page>
    );
}

export default Settings




interface SettingDataProps {
    config: Array<{
        fields: {
            [key: string]: {
                title: string,
                view: string,
                component?: string,
                hidden?: boolean,
                active?: string,
            }
        }
    }>,
    row: {
        [key: string]: ANY,
    },
    tabs: {
        [key: string]: TabItemFromApiProps
    }
}

interface TabItemFromApiProps {
    title: string,
    icon: IconFormat,
    description?: string,
    subTab?: {
        [key: string]: TabItemFromApiProps
    }
}

interface TabItemProps {
    title: string,
    buttonProps: {
        startIcon: React.ReactNode
    },
    value: string,
    content: () => React.ReactNode,
    subTab?: Array<{
        title: string,
        buttonProps: {
            startIcon: React.ReactNode
        },
        value: string,
        content: () => React.ReactNode
    }>
}