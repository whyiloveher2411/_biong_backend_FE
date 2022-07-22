import Box from 'components/atoms/Box';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import Skeleton from 'components/atoms/Skeleton';
import useAjax from 'hook/useApi';
import React from 'react';



function GoogleAuthenticatorSecretImg({ post, onReview, name, config }: FieldFormItemProps) {

    const [securityGoogleAuthenticatorSecret, setSecurityGoogleAuthenticatorSecret] = React.useState(post.security_google_authenticator_secret);
    const [securityGoogleAuthenticatorSecretImg, setSecurityGoogleAuthenticatorSecretImg] = React.useState({
        src: '',
        isLoaded: false
    });

    const { ajax } = useAjax();

    const randomGoogleAuthenticatorSecret = () => {
        ajax({
            url: 'settings/random-google-authenticator-secret',
            method: 'POST',
            data: {
                action: 'RANDOM_SECRET',
            },
            success: (result: {
                secret?: string,
                qrCodeUrl: string,
            }) => {
                if (result.secret) {
                    setSecurityGoogleAuthenticatorSecret(result.secret);
                    setSecurityGoogleAuthenticatorSecretImg({ src: result.qrCodeUrl, isLoaded: false });
                    onReview(result.secret, 'security_google_authenticator_secret');
                }
            }
        });
    }

    React.useEffect(() => {

        if (securityGoogleAuthenticatorSecret) {
            ajax({
                url: 'settings/random-google-authenticator-secret',
                method: 'POST',
                data: {
                    action: 'GET_IMAGE',
                    secret: securityGoogleAuthenticatorSecret,
                },
                success: (result: {
                    secret?: string,
                    qrCodeUrl: string,
                }) => {
                    if (result.secret) {
                        setSecurityGoogleAuthenticatorSecret(result.secret);
                        setSecurityGoogleAuthenticatorSecretImg({ src: result.qrCodeUrl, isLoaded: false });
                        onReview(result.secret, 'security_google_authenticator_secret');
                    }
                }
            });
        }
        //eslint-disable-next-line
    }, [])

    return (
        <>
            <FieldForm
                component={'text'}
                config={{
                    ...config,
                    title: '' + config.title,
                    inputProps: {
                        endAdornment: <InputAdornment position="end">
                            <IconButton
                                aria-label="random Google Authenticator Secret"
                                edge="end"
                                onClick={randomGoogleAuthenticatorSecret}
                                onMouseDown={(e) => { e.preventDefault(); }}
                            >
                                <Icon icon="Refresh" />
                            </IconButton>
                        </InputAdornment>
                    }
                }}

                post={{ security_google_authenticator_secret: securityGoogleAuthenticatorSecret }}
                name={'security_google_authenticator_secret'}
                onReview={(value: string) => { setSecurityGoogleAuthenticatorSecret(value); onReview(value, 'security_google_authenticator_secret'); }}
            />
            {
                securityGoogleAuthenticatorSecretImg ?
                    <Box display="flex">
                        <img
                            onLoad={() => {
                                setSecurityGoogleAuthenticatorSecretImg(prev => ({ ...prev, isLoaded: true }));
                            }}
                            alt="QR Code"
                            style={{
                                marginTop: 8,
                                opacity: securityGoogleAuthenticatorSecretImg.isLoaded ? 1 : 0,
                                position: securityGoogleAuthenticatorSecretImg.isLoaded ? 'initial' : 'absolute',
                            }}
                            src={securityGoogleAuthenticatorSecretImg.src}
                        />
                        {
                            securityGoogleAuthenticatorSecretImg.isLoaded === false &&
                            <Skeleton style={{ width: 200, height: 200, marginTop: 8, transform: 'scale(1, 1)' }} />
                        }
                    </Box>
                    :
                    <div>
                        <Skeleton style={{ width: 200, height: 200, marginTop: 8, transform: 'scale(1, 1)' }} />
                    </div>
            }
        </>
    )
}


export default GoogleAuthenticatorSecretImg
