import { Theme } from '@mui/material';
import Avatar from 'components/atoms/Avatar';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardActions from 'components/atoms/CardActions';
import CardContent from 'components/atoms/CardContent';
import Divider from 'components/atoms/Divider';
import Grid from 'components/atoms/Grid';
import makeCSS from 'components/atoms/makeCSS';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useDispatch } from 'react-redux';
import { update as updatePlugins } from 'store/plugins/plugins.reducers';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all .15s ease-in',
        cursor: 'pointer',
        '&:hover': {
            opacity: 1,
            transform: 'scale(1.02)',
            boxShadow: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
            '& $byVersion': {
                display: 'flex'
            }
        },
        '& a, & .link': {
            color: theme.palette.link,
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'center',
        },
        '&.notActive': {
            opacity: 0.4,
            '&:hover': {
                opacity: 1,
            }
        }
    },
    byVersion: {
        fontSize: 13,
        display: 'none',
        position: 'absolute',
        top: 8,
        width: '100%',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontWeight: 500,

    },
    description: {
        fontSize: 12,
        lineHeight: '16px',
        letterSpacing: 'normal',
        overflowWrap: 'normal',
        display: '-webkit-box',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        '-webkit-line-clamp': 3,
        '-webkit-box-orient': 'vertical',
        height: 48,
        maxWidth: 280,
    },
}));


function Plugins() {

    const classes = useStyles();

    const [data, setData] = React.useState<{
        [key: string]: {
            active: boolean,
            document: string,
            image: string,
            info: {
                name: string,
                description: string,
                author: string,
                author_url: string,
                priority: number,
                version: string,
            }
        }
    } | null>(null);

    const permission = usePermission('plugin_management').plugin_management;

    const { ajax, Loading } = useAjax();

    const dispatch = useDispatch();

    React.useEffect(() => {
        if (permission) {
            ajax({
                url: 'plugin/get-list',
                method: 'POST',
                success: (result) => {
                    setData(result.rows);
                }
            })
        }
    }, []);

    const changePlugin = (plugin: string) => {
        ajax({
            url: 'plugin/get-list',
            method: 'POST',
            data: {
                plugin: plugin,
                action: 'in-active-plugin',
            },
            success: (result) => {
                setData(result.rows);

                if (result.plugins) {
                    dispatch(updatePlugins(result.plugins));
                }
            }
        })
    };

    if (!permission) {
        return <RedirectWithMessage />
    }
    return (
        <Page
            title={__('Plugin')}
            isHeaderSticky
            header={
                <div>
                    <Typography component="h2" gutterBottom variant="overline">{__('Plugin')}</Typography>
                    <Typography component="h1" variant="h3">{__('Extend part or all of the functionality of the website')}</Typography>
                </div>
            }
        >
            {
                !data ?
                    <Grid container spacing={3}>
                        {
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <Grid key={i} item md={4} sm={6} xs={12}>
                                    <Card >
                                        <CardContent style={{
                                            display: 'flex', flexDirection: 'column', textAlign: 'center', alignItems: 'center'
                                        }}>
                                            <Skeleton style={{ height: 128, width: '100%', transform: 'scale(1, 1)' }} animation="wave" height={24} />
                                            <Skeleton animation="wave" height={24} style={{ margin: '8px 0', width: '100%', transform: 'scale(1, 1)' }} />
                                            <Skeleton animation="wave" height={40} style={{ width: '100%', transform: 'scale(1, 1)' }} />
                                        </CardContent>
                                        <Divider />
                                        <CardActions style={{ justifyContent: 'space-between' }}>
                                            <Skeleton animation="wave" height={40} style={{ width: '100%', transform: 'scale(1, 1)' }} />
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))
                        }
                    </Grid>
                    :
                    <Grid container spacing={3}>
                        {
                            Object.keys(data).map(plugin => (
                                <Grid key={plugin} item md={4} sm={6} xs={12}>
                                    <Card className={classes.root + ' ' + (!data[plugin].active ? 'notActive' : '')}>
                                        <CardContent style={{
                                            display: 'flex', flexDirection: 'column', textAlign: 'center', alignItems: 'center'
                                        }}>
                                            <div className={classes.byVersion}>
                                                <small>{__('By')}&nbsp;
                                                    <a href={data[plugin].info.author_url} target="_blank">{data[plugin].info.author}</a>
                                                </small>
                                                <small>(v{data[plugin].info.version})</small>
                                            </div>
                                            <div>
                                                <Avatar
                                                    variant='square'
                                                    style={{ height: 128, width: 'auto', marginBottom: 8, background: 'unset' }}
                                                    src={data[plugin].image}
                                                    name={__('Thumbnail')}
                                                />
                                                {/* <img style={{ height: 128, width: 'auto', marginBottom: 8 }} src={data[plugin].image} /> */}
                                            </div>
                                            <Typography gutterBottom variant="h5" component="h2">{data[plugin].info.name}</Typography>
                                            <Typography className={classes.description} variant="body2" color="textSecondary" component="p">{data[plugin].info.description}</Typography>
                                        </CardContent>
                                        <Divider />
                                        <CardActions style={{ justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <a href={data[plugin].document} target="_blank">{__('Read Docs')}</a>
                                                {/* {
                                                    data[plugin].active &&
                                                    <PluginHook plugin={plugin} hook='Custom/LinkSetting' />
                                                } */}
                                            </div>
                                            <Button
                                                variant="contained"
                                                onClick={e => changePlugin(plugin)}
                                                size="small"
                                                color={data[plugin].active ? 'primary' : 'inherit'}>
                                                {data[plugin].active ? __('Activated') : __('Activate')}
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))
                        }
                        {Loading}
                    </Grid>
            }
        </Page>
    )
}

export default Plugins
