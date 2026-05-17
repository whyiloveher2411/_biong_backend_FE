import React from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { LoadingButton, type LoadingButtonProps } from '@mui/lab';
import CheckIcon from '@mui/icons-material/Check';

const FEEDBACK_MS = 5000;

async function copyTextToClipboard(text: string): Promise<void> {
    const value = String(text || '').trim();
    if (!value) return;
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function useSuccessFlash() {
    const [success, setSuccess] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const flash = React.useCallback(() => {
        setSuccess(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setSuccess(false);
            timerRef.current = null;
        }, FEEDBACK_MS);
    }, []);

    React.useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    return { success, flash };
}

type CopyButtonProps = Omit<ButtonProps, 'onClick'> & {
    promptText: string;
};

export function MarketingCopyPromptButton({
    promptText,
    disabled,
    children = 'Sao chép prompt',
    startIcon,
    color,
    variant = 'outlined',
    ...rest
}: CopyButtonProps) {
    const { success, flash } = useSuccessFlash();

    const handleClick = async () => {
        if (!String(promptText || '').trim() || disabled) return;
        await copyTextToClipboard(promptText);
        flash();
    };

    return (
        <Button
            variant={variant}
            disabled={disabled || success}
            color={success ? 'success' : color}
            startIcon={success ? <CheckIcon fontSize="small" /> : startIcon}
            onClick={handleClick}
            {...rest}
        >
            {success ? 'Đã sao chép' : children}
        </Button>
    );
}

type ReloadButtonProps = Omit<LoadingButtonProps, 'onClick' | 'loading'> & {
    loading: boolean;
    onReload: () => void;
};

export function MarketingReloadPromptButton({
    loading,
    onReload,
    disabled,
    children = 'Tải lại prompt',
    variant = 'outlined',
    startIcon,
    color,
    ...rest
}: ReloadButtonProps) {
    const { success, flash } = useSuccessFlash();
    const reloadRequestedRef = React.useRef(false);
    const prevLoadingRef = React.useRef(loading);

    React.useEffect(() => {
        if (reloadRequestedRef.current && prevLoadingRef.current && !loading) {
            reloadRequestedRef.current = false;
            flash();
        }
        prevLoadingRef.current = loading;
    }, [loading, flash]);

    const handleClick = () => {
        if (disabled || loading || success) return;
        reloadRequestedRef.current = true;
        onReload();
    };

    return (
        <LoadingButton
            variant={variant}
            loading={loading && !success}
            disabled={disabled || success}
            color={success ? 'success' : color}
            startIcon={success ? <CheckIcon fontSize="small" /> : startIcon}
            onClick={handleClick}
            {...rest}
        >
            {success ? 'Đã tải lại prompt' : children}
        </LoadingButton>
    );
}
