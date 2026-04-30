import ConfirmDialog from 'components/molecules/ConfirmDialog';
import { __ } from 'helpers/i18n';
import React from 'react';

function useConfirmDialog(props?: {
    message?: string,
    title?: string,
    icon?: string,
}): UseConfirmDialogExportProps {

    const [open, setOpen] = React.useState(false);
    const [messageState, setMessageState] = React.useState(props?.message);
    const [titleState, setTitleState] = React.useState(props?.title);
    const [iconState, setIconState] = React.useState<string | undefined>(props?.icon);
    const [numberConfirmState, setNumberConfirmState] = React.useState(1);
    const [confirmStepState, setConfirmStepState] = React.useState(1);

    const [callback, setCallback] = React.useState<(() => void) | null>(null);

    return {
        open: open,
        setOpen: setOpen,
        onConfirm: (callbackConfirm: () => void, options?: { message?: string, title?: string, icon?: string, numberConfirm?: number }) => {
            const numberConfirmParsed = Number(options?.numberConfirm ?? 1);
            const numberConfirm = Number.isFinite(numberConfirmParsed) ? Math.max(1, Math.floor(numberConfirmParsed)) : 1;
            setOpen(true);
            setMessageState(options?.message ?? props?.message);
            setTitleState(options?.title ?? props?.title);
            setIconState(options?.icon ?? props?.icon);
            setNumberConfirmState(numberConfirm);
            setConfirmStepState(1);
            setCallback(() => callbackConfirm);
        },
        // onConfirm: (callbackConfirm: () => void) => {
        //     setOpen(true)
        //     setCallback(() => callbackConfirm);
        // },
        component: <ConfirmDialog
            {...props}
            title={titleState}
            message={messageState}
            icon={iconState}
            confirmStepText={numberConfirmState > 1 ? __('Xác nhận lần {{step}}/{{total}}', {
                step: confirmStepState,
                total: numberConfirmState,
            }) : undefined}
            open={open}
            onClose={() => {
                setOpen(false);
                setConfirmStepState(1);
                setNumberConfirmState(1);
            }}
            onConfirm={() => {
                if (confirmStepState < numberConfirmState) {
                    setConfirmStepState(prev => prev + 1);
                    return;
                }
                if (callback) {
                    callback();
                }
                setOpen(false);
                setConfirmStepState(1);
                setNumberConfirmState(1);
            }}
        />
    };
}

export default useConfirmDialog;

export interface UseConfirmDialogExportProps {
    open: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    onConfirm: (callback: () => void, options?: { message?: string, title?: string, icon?: string, numberConfirm?: number }) => void,
    component: JSX.Element
}