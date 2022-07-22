import { useSnackbar } from 'notistack';
import React from 'react';
import { __ } from 'helpers/i18n';
import { Navigate } from 'react-router-dom';


interface RedirectWithMessageProps {
    to?: string,
    message?: string,
    code?: number,
    variant?: string,
}
function RedirectWithMessage({ to, message = __('You dont\'t have permission to access on this page'), code = 403, variant = 'error' }:

    RedirectWithMessageProps) {

    const { enqueueSnackbar } = useSnackbar();

    React.useEffect(() => {

        enqueueSnackbar({
            content: message,
            options: { variant: variant, anchorOrigin: { vertical: 'bottom', horizontal: 'left' } }
        });

    }, []);

    if (to) {
        return <Navigate to={to} />
    }

    return <Navigate to={'/error-' + code} />
}

export default RedirectWithMessage
