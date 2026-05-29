import { ajax } from 'hook/useApi';


export interface IUser {
    user: object,
    error?: boolean,
    user_re_login?: object,
}

export interface IAutoLogin {
    access_token?: string,
    auto_login_disabled?: boolean,
    message?: { content: string },
}

const service = {

    getInfo: async (): Promise<IUser> => {
        let data = await ajax({
            url: 'user/info',
        });

        return data;
    },

    autoLogin: async (): Promise<IAutoLogin> => {
        return ajax({
            url: 'login/auto',
            method: 'POST',
        });
    },

}

export default service;