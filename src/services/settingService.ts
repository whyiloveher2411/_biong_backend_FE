import { ajax } from 'hook/useApi';

export interface Settings {
    [key: string]: ANY
}

const settingService = {

    getAll: async (): Promise<Settings> => {
        let data = await ajax({
            url: 'settings/all',
        });

        return data;
    },
    getLoginConfig: async (): Promise<ANY> => {
        let data = await ajax({
            url: 'login/settings',
        });
        return data;
    }

}

export default settingService;