import ConfirmDialog from 'components/molecules/ConfirmDialog';
import React from 'react';

function useConfirmDialog(props?: {
    message?: string,
    title?: string,
}): UseConfirmDialogExportProps {

    const [open, setOpen] = React.useState(false);
    const [messageState, setMessageState] = React.useState(props?.message);

    const [callback, setCallback] = React.useState<(() => void) | null>(null);

    return {
        open: open,
        setOpen: setOpen,
        onConfirm: (callbackConfirm: () => void, options?: { message: string }) => {
            setOpen(true);
            if (options?.message) {
                setMessageState(options.message);
            }
            setCallback(() => callbackConfirm);
        },
        // onConfirm: (callbackConfirm: () => void) => {
        //     setOpen(true)
        //     setCallback(() => callbackConfirm);
        // },
        component: <ConfirmDialog
            {...props}
            message={messageState}
            open={open}
            onClose={() => setOpen(false)}
            onConfirm={() => {
                if (callback) {
                    callback();
                }
                setOpen(false);
            }}
        />
    };
}

export default useConfirmDialog;

export interface UseConfirmDialogExportProps {
    open: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    onConfirm: (callback: () => void, options?: { message: string }) => void,
    component: JSX.Element
}