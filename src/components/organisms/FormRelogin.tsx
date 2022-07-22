import { Alert, Box } from '@mui/material'
import Button from 'components/atoms/Button'
import Dialog from 'components/molecules/Dialog'
import FormLogin from 'components/pages/Login/FormLogin'
import { __ } from 'helpers/i18n'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from 'store/configureStore'
import { logout, refreshAccessToken } from 'store/user/user.reducers'

function FormRelogin() {

    const popupRelogin = useSelector((state: RootState) => state.popupRelogin);

    const dispatch = useDispatch();

    return (
        <Dialog
            open={popupRelogin.open}
            onClose={() => {
                //
            }}
            title={<Box
                sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
            >
                {__('Sign in')}
                <Button variant="contained" color="inherit" style={{color: 'initial'}} onClick={() => {
                    dispatch(logout());
                }}>
                    {__('Logout')}
                </Button>
            </Box>}
        >
            <Box
                sx={{
                    display: 'flex', flexDirection: 'column', gap: 3
                }}
            >
                <Alert icon={false} severity="info">
                    {__('Your session has expired. Please log in to continue where you let off.')}
                </Alert>

                <FormLogin user={popupRelogin.user} callback={(access_token) => {

                    dispatch(refreshAccessToken(access_token));

                    if (window.__afterLogin) {

                        Object.keys(window.__afterLogin).forEach(key => {
                            window.__afterLogin[key].callback(window.__afterLogin[key].params);
                        });

                        window.__afterLogin = {};
                    }

                    if (popupRelogin.callback) {
                        popupRelogin.callback();
                    }

                }} />
            </Box>
        </Dialog>
    )
}

export default FormRelogin