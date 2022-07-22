import Box from 'components/atoms/Box';
import LoadingButton from 'components/atoms/LoadingButton';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import { FieldConfigProps } from 'components/atoms/fields/type';
import Tabs, { TabProps } from 'components/atoms/Tabs';
import Typography from 'components/atoms/Typography';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import CircularCenter from 'components/molecules/CircularCenter';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import TabContent from './TabContent';
import Page from 'components/templates/Page';


export default function ThemeOptions() {

    const [tabs, setTabs] = React.useState<Array<TabProps>>([]);

    const [loaded, setLoaded] = React.useState(false);

    const permission = usePermission('theme_options_management').theme_options_management;

    const { subtab1 } = useParams();

    const navigate = useNavigate();

    const [dataPost, setDataPost] = React.useState({});

    const { ajax, open } = useAjax();

    React.useEffect(() => {

        if (permission) {
            ajax({
                url: 'appearance/theme-options',
                method: 'POST',
                success: (result: ResultApiThemeOptions) => {

                    // let tab = getUrlParams(window.location.search, 'tab');

                    if (result.rows) {

                        let tabsTemp: TabProps[] = [];

                        for (let key in result.rows) {
                            tabsTemp.push({
                                title: result.rows[key].title,
                                key: key,
                                content: () => <Card>
                                    <CardContent>
                                        <TabContent data={result.rows[key]} onReview={(value) => {
                                            setDataPost(prevState => ({
                                                ...prevState,
                                                [key]: value
                                            }));
                                        }} />
                                    </CardContent>
                                </Card>
                            });
                        }

                        setTabs(tabsTemp);
                    }
                },
                finally: () => setLoaded(true),
            })
        }
        //eslint-disable-next-line
    }, []);

    const handleSubmitForm = () => {
        ajax({
            url: 'appearance/theme-options/post',
            method: 'POST',
            data: {
                options: dataPost
            }
        })
    };

    const handleTabsChange = (index: number, subTab: number | null = null) => {
        navigate(`/appearance/theme-options/${tabs[index].key}`);
    }

    if (!permission) {
        return <RedirectWithMessage />
    }

    if (!loaded) {
        return (
            <div style={{ position: 'relative', minHeight: 350 }}>
                <CircularCenter />
            </div>
        );
    }

    let tabContentIndex = tabs.findIndex(item => item.key === subtab1);

    if (tabContentIndex < 0 && tabs[0]) {
        return <Navigate to={`/appearance/theme-options/${tabs[0].key}`} />;
    }

    return (
        <Page
            title={__('Theme Options')}
            isHeaderSticky
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">
                        {__('Appearance')}
                    </Typography>
                    <Box display="flex" justifyContent="space-between">
                        <Typography component="h1" variant="h3">
                            {__('Theme Options')}
                        </Typography>
                        <LoadingButton
                            type="submit"
                            onClick={handleSubmitForm}
                            disabled={Object.keys(dataPost).length < 1}
                            loading={open}
                            color="success"
                            variant="contained">
                            {__('Save Changes')}
                        </LoadingButton>
                    </Box>
                </>
            }
        >
            <Tabs
                tabIndex={tabContentIndex}
                name="theme-options"
                tabs={tabs}
                orientation="vertical"
                onChangeTab={handleTabsChange}
            />
        </Page >
    );
}


interface ThemeOptionItem {
    title: string,
    fields: {
        [key: string]: FieldConfigProps
    },
    value: JsonFormat
}

interface ResultApiThemeOptions {
    rows: {
        [key: string]: ThemeOptionItem
    }
}