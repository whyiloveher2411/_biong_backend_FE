import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useTheme } from '@mui/system';
import Grid from 'components/atoms/Grid';
import Hidden from 'components/atoms/Hidden';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import { themes } from 'helpers/theme';
import React from 'react';
import { Helmet } from 'react-helmet';
import { useDispatch } from 'react-redux';
import settingService from 'services/settingService';
import { changeMode } from 'store/theme/theme.reducers';
import FormLogin from './FormLogin';

const useStyles = makeStyles(({ breakpoints }: Theme) => ({
    root: {
        minHeight: '100vh',
    },
    mid: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    colLeft: {
        minHeight: '100vh',
        color: 'white',
    },
    colRight: {
        minHeight: '100vh',
    },
    contentLeft: {
        maxWidth: 430,
        margin: '0 auto',
        fontSize: 77,
        lineHeight: '77px',
        fontWeight: 'bold',
        textAlign: 'left',
        textShadow: '7px 7px 9px rgba(0, 0, 0, 0.5)'
    },
    form: {
        padding: '20px 60px',
        margin: 0,
        width: 536,
        maxWidth: '100%',
        position: 'initial',
        top: 'auto',
        [breakpoints.down('md')]: {
            padding: '20px 15px',
        },
    },
    viewMode: {
        position: 'fixed',
        top: 8,
        right: 8,
    }
}));

interface SettingsLogin {
    _loaded: boolean,
    template: {
        [key: string]: ANY,
        admin_template_slogan: ANY,
        admin_template_color_left: ANY,
    },
    security: {
        [key: string]: ANY,
    }
}

function Login() {

    const classes = useStyles();

    const theme: Theme = useTheme();

    const dispatch = useDispatch();

    const [settings, setSettings]: [SettingsLogin | false, ANY] = React.useState<SettingsLogin>({
        _loaded: false,
        template: {
            admin_template_slogan: 'do <br /> something<br /><span style="color:#18b797;font-size: 85px;">you love</span><br /> today</>',
            admin_template_color_left: '#582979'
        },
        security: {
            security_active_recaptcha_google: 0
        }
    });

    React.useEffect(() => {

        if (!settings._loaded) {
            (async () => {

                let config: SettingsLogin = await settingService.getLoginConfig();

                Object.keys(config.template).forEach(key => {
                    if (config.template[key] === '') {
                        config.template[key] = settings.template[key];
                    }
                });

                Object.keys(config.security).forEach(key => {
                    if (config.security[key] === '') {
                        config.security[key] = settings.security[key];
                    }
                });

                setSettings({ ...config, _loaded: true });

            })();
        }

    }, [settings]);


    const handleUpdateViewMode = (mode: string) => () => {
        dispatch(changeMode(mode));
    }

    if (!settings._loaded) {
        return null;
    }

    return (
        <>
            <Helmet>
                <title>{__('Login')}</title>
            </Helmet>
            <Grid container className={classes.root} spacing={0}>

                <Hidden smDown>
                    <Grid item md={8} className={classes.mid + ' ' + classes.colLeft} style={{ background: settings.template.admin_template_color_left }}>
                        <p className={classes.contentLeft} dangerouslySetInnerHTML={{
                            __html: settings.template.admin_template_slogan
                        }} >
                        </p>
                    </Grid>
                </Hidden>

                <Grid item xs={12} md={4} className={classes.mid + ' ' + classes.colRight}>
                    <div className={classes.form}>
                        <Typography
                            component="h1"
                            style={{
                                fontWeight: 'bold',
                                fontSize: 24,
                                marginBottom: 32
                            }}
                            gutterBottom
                            dangerouslySetInnerHTML={{ __html: settings.template && settings.template['admin_template_headline-right'] ? settings.template['admin_template_headline-right'] : __('Sign in') }} />
                        <FormLogin />
                    </div>
                </Grid>
                <IconButton className={classes.viewMode} onClick={handleUpdateViewMode(theme.palette.mode === 'light' ? 'dark' : 'light')}>
                    <Icon icon={themes[theme.palette.mode]?.icon} />
                </IconButton>
            </Grid>
        </>
    )
}

export default Login
