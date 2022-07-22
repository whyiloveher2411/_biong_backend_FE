import { CircularProgressProps } from '@mui/material';
import Loading from 'components/atoms/Loading';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { SnackbarOrigin, VariantType } from 'notistack';
import React from 'react';
import { useDispatch } from 'react-redux';
import { updatePopupRelogin } from 'store/popupRelogin/popupRelogin.reducers';
import { UserProps } from 'store/user/user.reducers';
import { useFloatingMessages } from './useFloatingMessages';

const urlPrefixDefault = convertToURL(process.env.REACT_APP_HOST_API_KEY, '/api/admin/');

const language = getLanguage();
// const language = { code: 'vi' };

interface Props {
    loadingType?: false | 'custom',
    circularProps?: CircularProgressProps,
}

export default function useAjax(props?: Props): UseAjaxProps {

    const dispatch = useDispatch();

    const [open, setOpen] = React.useState(false);

    const { showMessage } = useFloatingMessages();

    const callbackSuccess = async (params: ParamsApiProps, response: Response) => {

        let { success } = params;

        if (!response.ok) {

            if (params.error) {
                params.error(response);
                return;
            }

            let result: ResultFromApiProps = await response.json();

            if (result.message) {

                showMessage(result.message);

                return;
            } else {
                throw Error(response.statusText);
            }
        }

        let result: ResultFromApiProps = await response.json();

        if (result.message) {
            showMessage(result.message);
        }

        if (result.require_login) {
            requestLogin(params.url, {
                callback: bind,
                params: params
            }, result.user_re_login);
        }

        if (success) {
            success(result);
        }

    }

    const requestLogin = (url: string | undefined, param: {
        callback: (params: ParamsApiProps) => void,
        params: ParamsApiProps
    }, user?: UserProps) => {

        if (!url) {
            url = window.location.href;
        }

        if (!window.__afterLogin) window.__afterLogin = {};
        window.__afterLogin[url] = param;

        dispatch(updatePopupRelogin({ open: true, updateUser: false, user: user }));

    }

    const callbackError = (error: ANY) => {
        showMessage(error.toString(), 'error');
    }

    const callbackFinally = (params: ParamsApiProps) => {
        if (params.finally) {
            params.finally();
        }
        setOpen(false);
    }

    const bind = (params: ParamsApiProps) => {

        let { url = '', urlPrefix = null, headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': '',
        }, method = 'POST', data = {}, loading = true } = params;

        if (localStorage.getItem('access_token')) {
            headers.Authorization = 'Bearer ' + localStorage.getItem('access_token');
        }

        if (loading) {
            setOpen(true);
        }

        if (!data) data = {};

        data.__l = window.btoa(language.code + '#' + Date.now());

        fetch(convertToURL((urlPrefix ?? urlPrefixDefault), url), {
            headers: headers,
            method: method,
            body: JSON.stringify(data)
        }).then(async (response) => {
            callbackSuccess(params, response);
        }).catch(function (error) {
            callbackError(error);
        }).finally(() => {
            callbackFinally(params);
        });
    };

    React.useEffect(() => {
        return () => setOpen(false);
    }, []);


    return {
        ajax: bind,
        open: open,
        setOpen: setOpen,
        Loading: <Loading open={open} isWarpper={props?.loadingType === 'custom'} circularProps={props?.circularProps} />,
        callbackSuccess: callbackSuccess,
        callbackError: callbackError,
        callbackFinally: callbackFinally,
        requestLogin: requestLogin,
        showMessage
    };
}



export interface UseAjaxProps {
    ajax: (params: ParamsApiProps) => void;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    Loading: JSX.Element;
    callbackSuccess: (params: ParamsApiProps, response: Response) => Promise<void>;
    callbackError: (error: ANY) => void;
    callbackFinally: (params: ParamsApiProps) => void;
    requestLogin: (url: string | undefined, param: ANY) => void;
    showMessage: (message: string | MessageFromApiProps, type?: VariantType, snackbarOrigin?: SnackbarOrigin | undefined) => void
}

export async function ajax(params: ANY) {

    let { url = '', urlPrefix = null, headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': '',
    }, method = 'POST', data = {} } = params;

    data.__l = window.btoa(language.code + '#' + Date.now());

    if (localStorage.getItem('access_token')) {
        headers.Authorization = 'Bearer ' + localStorage.getItem('access_token');
    }

    let paramForFetch: ANY = {
        headers: headers,
        method: method,
    };

    if (data) {
        paramForFetch.body = JSON.stringify(data);
    }

    const respon = await fetch( convertToURL( (urlPrefix ?? urlPrefixDefault) , url), paramForFetch)
        .then(async (response) => {
            return await response.json();
        }).catch(function (error) {
            return error;
        }).finally(() => {
            return params;
        });

    return respon;
}

export interface ParamsApiProps {
    url?: string,
    urlPrefix?: string,
    headers?: JsonFormat,
    method?: string,
    data?: JsonFormat,
    loading?: boolean,
    success?: (result: ANY) => void,
    error?: (response: Response) => void,
    finally?: () => void
}

export interface MessageFromApiProps {
    content: string,
    options: {
        variant: VariantType,
        anchorOrigin: SnackbarOrigin
    }
}

export interface ResultFromApiProps {
    message?: MessageFromApiProps,
    [key: string]: ANY,
}