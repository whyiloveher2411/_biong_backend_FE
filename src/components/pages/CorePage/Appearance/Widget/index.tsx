import { colors, Theme } from '@mui/material';
import Button from 'components/atoms/Button';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldConfigProps } from 'components/atoms/fields/type';
import Grid from 'components/atoms/Grid';
import makeCSS from 'components/atoms/makeCSS';
import Paper from 'components/atoms/Paper';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import NotFound from 'components/molecules/NotFound';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        flexGrow: 1,
        marginTop: theme.spacing(3),
    },
    divider: {
        backgroundColor: colors.grey[300],
    },
    tabs: {
        position: 'sticky',
        top: 0,
        backgroundColor: '#f4f6f8',
        zIndex: 2
    },
    tabsItem: {
        whiteSpace: 'nowrap',
    },
    paper: {
        padding: 16,
        marginBottom: 24
    },
    textOverflow: {
        overflow: 'hidden',
        width: '100%',
        display: '-webkit-box',
        '-webkit-line-clamp': 2,
        '-webkit-box-orient': 'vertical'
    }
}));


function SidebarItem({ className, sidebar, widgets }: {
    className: string,
    sidebar: SidebarItemProps,
    widgets: ResultApiWidgetGet['widgets']
}) {
    console.log(sidebar);
    return <Paper className={className} >
        <Typography variant="h5">{sidebar.title}</Typography>
        <Typography variant="body2">{sidebar.description}</Typography>

        {
            (() => {

                let templates = JSON.parse(JSON.stringify(widgets));

                if (sidebar.fieldsDefault) {

                    let fieldsDefault: {
                        [key: string]: FieldConfigProps
                    } = {};

                    for (let key in sidebar.fieldsDefault) {
                        fieldsDefault['_' + key] = sidebar.fieldsDefault[key];
                    }

                    Object.keys(templates).forEach(key => {
                        templates[key].items = { ...fieldsDefault, ...templates[key].items };
                    });
                }

                return (
                    <FieldForm
                        component='flexible'
                        config={{
                            title: '',
                            templates: templates
                        }}
                        post={sidebar}
                        name='post'
                        onReview={(value) => { sidebar.post = value }}
                    />
                )
            })()
        }

    </Paper>

}

function Widget() {

    const classes = useStyles();

    const { ajax, Loading } = useAjax();

    const [widgets, setWidgets] = React.useState<ResultApiWidgetGet['widgets']>({});

    const [sidebars, setSidebars] = React.useState<{
        [key: string]: SidebarItemProps
    } | false>(false);

    React.useEffect(() => {

        ajax({
            url: 'widget/get',
            method: 'POST',
            success: (result: ResultApiWidgetGet) => {

                if (result.widgets) {

                    for (let key in result.widgets) {
                        result.widgets[key].items = result.widgets[key].fields;
                    }

                    setWidgets(result.widgets);
                }

                if (result.sidebars) {

                    Object.keys(result.sidebars).forEach(key => {

                        if (result.sidebars[key].post) {

                            result.sidebars[key].post.forEach((item, index) => {
                                console.log(result.sidebars[key].post[index], { ...item, ...item.data });
                                result.sidebars[key].post[index] = { ...item, ...item.data };
                            });
                        }
                    });

                    setSidebars(result.sidebars);
                }

            }
        })

        //eslint-disable-next-line
    }, []);

    const handleSubmit = () => {

        ajax({
            url: 'widget/post',
            method: 'POST',
            data: {
                sidebars: sidebars
            },
            success: (result) => {
                console.log(result);
            }
        })

    }

    if (sidebars === false) {
        return (
            <Page
                title={__('Widget')}
                isHeaderSticky
                header={
                    <>
                        <Typography component="h2" gutterBottom variant="overline">
                            {__('Appearance')}
                        </Typography>
                        <Typography component="h1" variant="h3">
                            {__('Widget')}
                        </Typography>
                    </>
                }
            >
                <br />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        {
                            [0, 1].map((key) => (
                                <Paper key={key} className={classes.paper} >
                                    <Skeleton style={{ height: 20, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 18, marginTop: 5, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 48, marginTop: 16, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 48, marginTop: 10, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 36, marginTop: 10, transform: 'scale(1, 1)' }} animation="wave" />
                                </Paper>
                            ))
                        }
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {
                            [0, 1].map((key) => (
                                <Paper key={key} className={classes.paper} >
                                    <Skeleton style={{ height: 20, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 18, marginTop: 5, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 48, marginTop: 16, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 48, marginTop: 10, transform: 'scale(1, 1)' }} animation="wave" />
                                    <Skeleton style={{ height: 36, marginTop: 10, transform: 'scale(1, 1)' }} animation="wave" />
                                </Paper>
                            ))
                        }
                    </Grid>
                </Grid>
            </Page>
        );
    }

    let ObjectSidebars = Object.keys(sidebars);

    if (ObjectSidebars.length) {
        return (
            <Page
                title={__('Widget')}
                isHeaderSticky
                header={
                    <>
                        <Typography component="h2" gutterBottom variant="overline">
                            {__('Appearance')}
                        </Typography>
                        <Typography component="h1" variant="h3">
                            {__('Widget')}
                        </Typography>
                    </>
                }
            >
                <br />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        {
                            ObjectSidebars.map((key, i) => (
                                i % 2 === 0 ?
                                    <SidebarItem
                                        key={key}
                                        className={classes.paper}
                                        sidebar={sidebars[key]}
                                        widgets={widgets}
                                    />
                                    : <React.Fragment key={i}></React.Fragment>
                            ))
                        }
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {
                            ObjectSidebars.map((key, i) => (
                                i % 2 === 1 ?
                                    <SidebarItem
                                        key={key}
                                        className={classes.paper}
                                        sidebar={sidebars[key]}
                                        widgets={widgets}
                                    />
                                    : <React.Fragment key={i}></React.Fragment>
                            ))
                        }
                    </Grid>

                </Grid>
                <Button
                    onClick={handleSubmit}
                    type="submit"
                    color="success"
                    variant="contained">
                    {__('Save Changes')}
                </Button>
                {Loading}
            </Page>
        )
    }

    return <>
        <br />
        <NotFound />
    </>
}

export default Widget


interface SidebarItemProps {
    title: string,
    description: string,
    post: Array<{
        [key: string]: ANY,
        title: string,
        type: string,
        delete: number,
        open: boolean,
    }>,
    fieldsDefault?: {
        [key: string]: FieldConfigProps
    }
}

interface ResultApiWidgetGet {
    sidebars: {
        [key: string]: SidebarItemProps
    },
    widgets: {
        [key: string]: {
            title: string,
            description: string,
            fields: {
                [key: string]: FieldConfigProps
            },
            items: {
                [key: string]: FieldConfigProps
            }
        }
    }
}