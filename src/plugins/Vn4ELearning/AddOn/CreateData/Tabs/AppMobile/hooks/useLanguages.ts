import React from 'react';
import useAjax from 'hook/useApi';

export interface Language {
    code: string;
    name: string;
    flag_code: string;
    icon_url?: string;
}

declare global {
    interface Window {
        __languages?: Language[];
        __languages_promise?: Promise<Language[]>;
    }
}

const useLanguages = () => {
    const useApi = useAjax();
    const [languages, setLanguages] = React.useState<Language[]>(window.__languages || []);

    React.useEffect(() => {
        if (window.__languages) {
            setLanguages(window.__languages);
            return;
        }

        if (!window.__languages_promise) {
            window.__languages_promise = new Promise((resolve) => {
                useApi.ajax({
                    url: "plugin/vn4-e-learning/app-mobile/localization/languages",
                    method: "POST",
                    data: {
                        action: "get",
                        id: window.__app_mobile_id,
                    },
                    success: (result: { success: boolean, data: { languages: Language[] } }) => {
                        if (result.success && result.data?.languages) {
                            window.__languages = result.data.languages;
                            resolve(result.data.languages);
                        } else {
                            resolve([]);
                        }
                    },
                    error: () => {
                        resolve([]);
                    }
                });
            });
        }

        window.__languages_promise.then((langs) => {
            setLanguages(langs);
        });

    }, []);

    return {
        languages
    };
};

export default useLanguages;
