import React from 'react'
import { SnackbarProvider } from 'notistack';
import CustomSnackbar from 'components/molecules/CustomSnackbar';

interface Props {
    children: React.ReactNode
}

function NotistackProvider({ children }: Props) {
    return (
        <SnackbarProvider
            maxSnack={5}
            content={(key, message) => (
                <CustomSnackbar id={key} message={message} />
            )}
        >
            {children}
        </SnackbarProvider>
    )
}

export default NotistackProvider
