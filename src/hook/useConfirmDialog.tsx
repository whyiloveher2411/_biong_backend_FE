import ConfirmDialog from 'components/molecules/ConfirmDialog';
import React from 'react';

function useConfirmDialog(props?: {
    message?: string,
    title?: string,
}): UseConfirmDialogExportProps {

    const [open, setOpen] = React.useState(false);

    const [callback, setCallback] = React.useState<(() => void) | null>(null);

    return {
        open: open,
        setOpen: setOpen,
        onConfirm: (callbackConfirm: () => void) => {
            setOpen(true)
            setCallback(() => callbackConfirm);
        },
        component: <ConfirmDialog
            {...props}
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
    onConfirm: (callback: () => void) => void,
    component: JSX.Element
}