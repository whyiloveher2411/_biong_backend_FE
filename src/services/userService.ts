import { ajax } from 'hook/useApi';


export interface IUser {
    user: object,
    error?: boolean,
    user_re_login?: object,
}

const service = {

    getInfo: async (): Promise<IUser> => {
        let data = await ajax({
            url: 'user/info',
        });

        return data;
    }

}

export default service;