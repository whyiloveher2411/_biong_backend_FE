import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Checkbox from 'components/atoms/Checkbox';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormGroup from 'components/atoms/FormGroup';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import { addScript } from 'helpers/script';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import React from 'react';
import { useDispatch } from 'react-redux';
import settingService from 'services/settingService';
import { updateAccessToken, UserProps } from 'store/user/user.reducers';

const useStyles = makeCSS({
    googleBtn: {
        width: '100%',
        height: 42,
        backgroundColor: '#4285f4',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 3px 4px 0 rgba(0,0,0,.25)',
        display: 'inline-flex',
        cursor: 'pointer',
        position: 'relative',
        '& .google-icon-wrapper': {
            position: 'absolute',
            marginTop: 1,
            marginLeft: 1,
            width: 40,
            height: 40,
            backgroundColor: '#fff',
            borderRadius: '8px 0 0 8px',
        },
        '& .google-icon': {
            position: 'absolute',
            marginTop: 11,
            marginLeft: 11,
            width: 18,
            height: 18
        },
        '& .btn-text': {
            color: '#fff',
            fontSize: 14,
            letterSpacing: '0.2px',
            fontFamily: "Roboto",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            width: '100%',
        },
        '&:hover': {
            boxShadow: '0 0 6px #4285f4'
        },
        '&:active': {
            background: '#1669F2'
        }
    },
    orSeperator: {
        marginTop: 10,
        marginBottom: 10,
    },
});

interface SettingsLogin {
    _loaded: boolean,
    security: {
        [key: string]: ANY,
    }
}

function FormLogin({ callback, user }: {
    callback?: (access_token: string) => void,
    user?: UserProps
}) {

    const classes = useStyles();

    const [showVerificationCode, setShowVerificationCode] = React.useState<boolean>(false);

    const { showMessage } = useFloatingMessages();

    const dispatch = useDispatch();

    const { ajax, Loading } = useAjax();

    const [settings, setSettings]: [SettingsLogin | false, ANY] = React.useState<SettingsLogin>({
        _loaded: false,
        security: {
            security_active_recaptcha_google: 0
        }
    });


    const [formData, setFormData] = React.useState<{
        username: string,
        password: string,
        _password: string,
        verification_code: string,
        remember_me: 0 | 1,
        readOnlyEmail: boolean,
    }>({
        // username: 'dangthuyenquan@gmail.com',
        // password: 'dangthuyenquan',
        // _password: 'dangthuyenquan',

        username: user?.email ?? '',
        password: '',
        _password: '',

        readOnlyEmail: user?.email ? true : false,

        verification_code: '',
        remember_me: 0
    })

    React.useEffect(() => {

        if (!settings._loaded) {
            (async () => {

                let config: SettingsLogin = await settingService.getLoginConfig();

                Object.keys(config.security).forEach(key => {
                    if (config.security[key] === '') {
                        config.security[key] = settings.security[key];
                    }
                });

                setSettings({ ...config, _loaded: true });

            })();
        }

    }, [settings]);

    React.useEffect(() => {
        if (settings._loaded) {

            if (settings.security.security_active_recaptcha_google * 1 === 1) {
                addScript('https://www.google.com/recaptcha/api.js', 'recaptcha', () => {
                    window.capcha_login = window.grecaptcha?.render('recaptcha-login', {
                        'sitekey': settings.security.security_recaptcha_sitekey
                    });
                }, 500);
            }


            if (settings.security.security_active_signin_with_google_account) {

                addScript('https://apis.google.com/js/platform.js', 'apis_google_com_platform', () => {

                    window.gapi.load('auth2', function () {
                        let auth2 = window.gapi.auth2.init({
                            client_id: settings.security.security_google_oauth_client_id,
                            cookiepolicy: 'single_host_origin',
                            scope: 'email'
                        });

                        let element = document.getElementById('googleSignIn');

                        auth2.attachClickHandler(element, { theme: 'dark' },
                            function (googleUser: ANY) {

                                handleEmailResponse(
                                    { loginByEmail: googleUser.getAuthResponse().access_token }
                                );

                            }, function (error: ANY) {
                                showMessage(__('Sign-in error:') + error.error, 'error');
                            },
                            function (error: ANY) {
                                showMessage(__('Sign-in error:') + error.error, 'error');
                            }
                        );
                    });

                }, 500);
            }

        }
        // eslint-disable-next-line
    }, [settings]);

    const handleEmailResponse = (data: JsonFormat) => {

        setFormData(prevState => {
            ajax({
                url: 'login/check',
                method: 'POST',
                data: {
                    ...data,
                    remember_me: prevState.remember_me
                },
                success: (result: {
                    requiredVerificationCode?: boolean,
                    access_token?: string
                }) => {
                    if (result.requiredVerificationCode) {
                        setShowVerificationCode(true);
                    } else if (result.access_token) {

                        if (callback) {
                            callback(result.access_token);
                        } else {
                            dispatch(updateAccessToken(result.access_token));
                        }
                    }

                    if (window.grecaptcha) {
                        window.grecaptcha.reset(window.capcha_login);
                    }
                }
            });

            return prevState;
        })
    }


    const onClickLogin = () => {
        let data = {
            ...formData,
            showVerificationCode: showVerificationCode,
            'g-recaptcha-response': null,
        };

        if (settings.security.security_active_recaptcha_google * 1 === 1 && window.grecaptcha) {

            let recaptcha = window.grecaptcha.getResponse(window.capcha_login);

            if (!recaptcha) {
                showMessage(__('The g-recaptcha-response field is required.'), 'error');
                return;
            }

            data['g-recaptcha-response'] = recaptcha;
        }

        handleEmailResponse(data);
    };

    if (!settings._loaded) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
            }}
        >
            {
                !showVerificationCode &&
                <>
                    <div>
                        <FieldForm
                            component={'text'}
                            config={{
                                title: __('Email or phone number'),
                                inputProps: {
                                    readOnly: formData.readOnlyEmail
                                }
                            }}
                            required
                            post={formData}
                            name={'username'}
                            onReview={value => { setFormData(prev => ({ ...prev, username: value })) }}
                        />
                    </div>
                    <div>
                        <FieldForm
                            component={'password'}
                            config={{
                                title: __('Enter your password'),
                                generator: false
                            }}
                            post={formData}
                            name={'password'}
                            onReview={value => { setFormData(prev => ({ ...prev, password: value })) }}
                        />
                    </div>
                </>
            }
            {
                showVerificationCode &&
                <div>
                    <Typography variant="h4">{__('2-Step Verification')}</Typography>

                    <Grid container spacing={2} style={{ margin: '10px 0 30px 0' }}>
                        <Grid item xs={12} md={2}>
                            <Icon icon="MobileFriendly" style={{ fontSize: 65, color: 'rgb(154 154 154)' }} />
                        </Grid>
                        <Grid item xs={12} md={7}>
                            <Typography style={{ fontWeight: 500 }} variant="body1">{__('Enter the verification code generated by your mobile application.')}</Typography>
                        </Grid>
                    </Grid>

                    <FieldForm
                        component={'text'}
                        config={{
                            title: __('Verification Code'),
                            generator: false
                        }}
                        post={formData}
                        name={'verification_code'}
                        onReview={value => { formData.verification_code = value; }}
                    />
                </div>
            }
            {
                settings.security.security_active_recaptcha_google * 1 === 1 &&
                <div >
                    <div className="recaptcha-login" id="recaptcha-login"></div>
                </div>
            }

            {
                settings.security.security_enable_remember_me &&
                <div >
                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox
                                onClick={() => {
                                    setFormData(prevState => {
                                        if (formData.remember_me) {
                                            return { ...prevState, remember_me: 0 };
                                        } else {
                                            return { ...prevState, remember_me: 1 };
                                        }
                                    });

                                }} checked={Boolean(formData.remember_me)} color="primary" />}
                            label={__('Remember Me')}
                        />
                    </FormGroup>
                </div>
            }

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column' }}>
                <Button style={{ width: '100%' }} variant="contained" color="primary" disableElevation onClick={onClickLogin}>
                    {__('Sign in')}
                </Button>
                {Loading}
                {
                    Boolean(settings.security.security_active_signin_with_google_account) &&
                    <div>
                        <div className={classes.orSeperator}>
                            <Divider>{__('OR')}</Divider>
                        </div>
                        <div >
                            <div id="googleSignIn" className={classes.googleBtn}>
                                <div className="google-icon-wrapper">
                                    <img className="google-icon" alt="Login With Google Account" src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" />
                                </div>
                                <p className="btn-text"><b>{__('Sign in with google')}</b></p>
                            </div>
                        </div>
                    </div>
                }
            </Box>
        </Box>
    )
}

export default FormLogin
