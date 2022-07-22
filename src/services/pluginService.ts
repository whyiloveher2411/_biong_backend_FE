import { ajax } from 'hook/useApi';

export interface Plugins {
    [key: string]: JsonFormat
}

const service = {

    get: async (): Promise<Plugins> => {
        let data = await ajax({
            url: 'plugin/get-all',
        });

        return data.plugins;
    }

}

export default service;