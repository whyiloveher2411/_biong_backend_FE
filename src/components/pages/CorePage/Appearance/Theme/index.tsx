import { Theme as MuiTheme } from '@mui/material';
import Avatar from 'components/atoms/Avatar';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardActionArea from 'components/atoms/CardActionArea';
import CardActions from 'components/atoms/CardActions';
import CardContent from 'components/atoms/CardContent';
import CardMedia from 'components/atoms/CardMedia';
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
import { updateSidebarAgain } from 'store/sidebar/sidebar.reducers';

const useStyles = makeCSS((theme: MuiTheme) => ({
    root: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all .15s ease-in',
        '&:hover': {
            opacity: 1,
            transform: 'scale(1.02)',
            boxShadow: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
        },
        '&.notActive': {
            opacity: 0.4,
            '&:hover': {
                opacity: 1,
            }
        }
    },
    media: {
        width: '100%',
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

function Theme() {

    const classes = useStyles();

    const permission = usePermission('theme_management').theme_management;

    const [data, setData] = React.useState<{
        [key: string]: {
            active: boolean,
            image: string,
            info: {
                name: string,
                description: string,
                author: string,
                author_url: string,
                tags: string,
                version: string,
            }
        }
    } | null>(null);

    const { ajax, Loading } = useAjax();

    const dispatch = useDispatch();

    React.useEffect(() => {

        if (permission) {
            ajax({
                url: 'appearance/theme',
                method: 'POST',
                success: (result) => {
                    if (result.rows) {
                        setData(result.rows);
                    }
                }
            })
        }

        //eslint-disable-next-line
    }, []);

    const changeTheme = (theme: string) => {
        ajax({
            url: 'appearance/theme/change-theme',
            method: 'POST',
            data: {
                theme: theme
            },
            success: (result) => {
                if (result.rows) {
                    setData(result.rows);
                }
                dispatch(updateSidebarAgain());
            }
        })
    };

    if (!permission) {
        return <RedirectWithMessage />
    }

    if (!data) {
        return (
            <Page
                title={__('Theme')}
                isContentCenter
                header={
                    <>
                        <Typography component="h2" gutterBottom variant="overline">
                            {__('Appearance')}
                        </Typography>
                        <Typography component="h1" variant="h3">
                            {__('Theme')}
                        </Typography>
                    </>
                }
            >
                <Typography component="h2" gutterBottom variant="overline">
                    {__('Theme')}
                </Typography>
                <Grid container spacing={4}>
                    {
                        [1, 2, 3, 4, 5, 6].map(i => (
                            <Grid key={i} item md={4} sm={6} xs={12}>
                                <Card className={classes.root}>
                                    <CardActionArea>
                                        <Skeleton className={classes.media} animation="wave" height={24} style={{ transform: 'scale(1, 1)', height: 160 }} />
                                        <CardContent style={{ paddingBottom: 0 }}>
                                            <Skeleton animation="wave" height={22} style={{ width: '100%', transform: 'scale(1, 1)', marginBottom: 16 }} />
                                            <Skeleton animation="wave" height={32} style={{ width: '100%', transform: 'scale(1, 1)' }} />
                                        </CardContent>
                                    </CardActionArea>
                                    <CardActions>
                                        <Skeleton animation="wave" height={32} style={{ width: '100%', transform: 'scale(1, 1)' }} />
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))
                    }
                </Grid>
            </Page>

        );
    }
    return (
        <Page
            title={__('Theme')}
            isContentCenter
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">
                        {__('Appearance')}
                    </Typography>
                    <Typography component="h1" variant="h3">
                        {__('Theme')}
                    </Typography>
                </>
            }
        >

            <Grid container spacing={4}>
                {
                    Object.keys(data).map(theme => (
                        <Grid key={theme} item md={4} sm={6} xs={12}>
                            <Card className={classes.root + ' ' + (!data[theme].active ? 'notActive' : '')}>
                                <CardActionArea>
                                    {
                                        data[theme].image ?
                                            <CardMedia
                                                className={classes.media}
                                                image={data[theme].image}
                                                title={data[theme].info.name}
                                            />
                                            :
                                            <div className={classes.media}>
                                                <Avatar
                                                    variant='square'
                                                    style={{ height: 128, width: 128, background: 'unset' }}
                                                    name={__('Thumbnail Default')}
                                                />
                                            </div>
                                    }

                                    <CardContent>
                                        <Typography gutterBottom variant="h5" component="h2">{data[theme].info.name} <small style={{ fontSize: '65%' }}>(v{data[theme].info.version})</small></Typography>
                                        <Typography variant="body2" color="textSecondary" component="p">{data[theme].info.description}</Typography>
                                    </CardContent>
                                </CardActionArea>
                                <CardActions style={{ justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="contained"
                                        onClick={e => changeTheme(theme)}
                                        color={data[theme].active ? 'primary' : 'inherit'}
                                        size="small"
                                    >
                                        {data[theme].active ? __('Activated') : __('Activate')}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))
                }
            </Grid>
            {Loading}
        </Page>
    )
}

export default Theme
