import React from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { LoadingButton, type LoadingButtonProps } from '@mui/lab';
import CheckIcon from '@mui/icons-material/Check';
import ImageIcon from '@mui/icons-material/Image';
import {
    copyStoreScreenshotImageToClipboard,
    copyTextToClipboard,
} from '../StoreScreenshots/storeScreenshotClipboard';

const FEEDBACK_MS = 5000;

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
    onCopied?: () => void;
};

export function MarketingCopyPromptButton({
    promptText,
    disabled,
    children = 'Sao chép prompt',
    startIcon,
    color,
    variant = 'outlined',
    onCopied,
    ...rest
}: CopyButtonProps) {
    const { success, flash } = useSuccessFlash();

    const handleClick = async () => {
        if (!String(promptText || '').trim() || disabled) return;
        await copyTextToClipboard(promptText);
        flash();
        onCopied?.();
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
            {success ? 'Đã sao chép prompt' : children}
        </Button>
    );
}

type CopyImageButtonProps = Omit<ButtonProps, 'onClick'> & {
    imageUrl?: string;
    getImageBlob?: () => Promise<Blob>;
    /** Không fallback fetch URL khi API proxy lỗi (logo local hay bị CORS). */
    proxyOnly?: boolean;
    onCopyNotice?: (message: string) => void;
};

export function MarketingCopyImageButton({
    imageUrl,
    getImageBlob,
    proxyOnly = false,
    onCopyNotice,
    disabled,
    children = 'Sao chép ảnh',
    variant = 'outlined',
    ...rest
}: CopyImageButtonProps) {
    const { success, flash } = useSuccessFlash();
    const [loading, setLoading] = React.useState(false);

    const handleClick = async () => {
        const url = String(imageUrl || '').trim();
        if ((!url && !getImageBlob) || disabled || loading || success) return;

        setLoading(true);
        try {
            await copyStoreScreenshotImageToClipboard({
                ...(url && !proxyOnly ? { imageUrl: url } : {}),
                getImageBlob,
                proxyOnly: proxyOnly || (!url && Boolean(getImageBlob)),
            });
            flash();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không copy được ảnh';
            onCopyNotice?.(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            disabled={disabled || success || loading || (!String(imageUrl || '').trim() && !getImageBlob)}
            color={success ? 'success' : rest.color}
            startIcon={success ? <CheckIcon fontSize="small" /> : <ImageIcon fontSize="small" />}
            onClick={handleClick}
            {...rest}
        >
            {success ? 'Đã sao chép ảnh' : loading ? 'Đang copy…' : children}
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
