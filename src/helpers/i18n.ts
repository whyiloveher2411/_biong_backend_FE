import { getCookie, setCookie } from "./cookie";
import { toCamelCase } from "./string";
import { plugins } from "./plugin";

export interface LanguageProps {
    flag: string,
    code: string,
    shortCode?: string,
    note: string,
    label: string,
}

let languageDefault: LanguageProps = {
    "flag": "US",
    "code": "en_US",
    "note": "United States",
    "label": "English"
};

export function init() {

    let language = getLanguage();
    window.language = language;

    try {
        window.__i18 = require('./i18n/' + language.code);

        window.__i18.__p = {};

    } catch (error) {
        window.__i18 = { __p: {} };
    }
}

export function changeLanguage(data: {
    code: string
}) {
    if (data) {
        setCookie('language', JSON.stringify(data));
        delete window.language;
        init();
    }
}

export function getLanguage(): LanguageProps {

    if (window.language) return window.language;

    let languages = getLanguages();

    let language = getCookie("language", true) as LanguageProps | null;

    let languageBowser: LanguageProps | boolean = false;

    if (language) {
        let isCheck = false;
        for (let i = 0; i < languages.length; i++) {
            if (language.code === languages[i].code) {
                isCheck = true;
            }

            if (navigator.language === languages[i].shortCode) {
                languageBowser = languages[i];
            }
        }
        if (isCheck) {
            return language;
        }
    } else {
        for (let i = 0; i < languages.length; i++) {
            if (navigator.language === languages[i].shortCode) {
                languageBowser = languages[i];
                break;
            }
        }
    }

    if (typeof languageBowser !== 'boolean') {
        setCookie('language', JSON.stringify(languageBowser), 365);
        return languageBowser;
    }

    setCookie('language', JSON.stringify(languageDefault), 365);
    return languageDefault;
}

export function __(transText: string, param?: { [key: string]: string | number }) {

    let result = transText;

    if (window.__i18[transText]) {
        result = window.__i18[transText];
    }

    if (param) {

        let find = Object.keys(param);
        let replace = Object.values(param);

        for (let i = 0; i < find.length; i++) {
            result = result.replace('{{' + find[i] + '}}', replace[i] as string);
        }
    }

    return result;
}

export function __i18n(transText: string, param?: { [key: string]: string | number }) {
    return __(transText, param);
}


export function __p(transText: string, pluginKey: string, param?: { [key: string]: string | number }) {

    let result = transText;

    if (!window.__i18.__p[pluginKey]) {

        let language = getLanguage();

        let pluginList = plugins();

        if (pluginList[pluginKey]) {
            try {
                window.__i18.__p[pluginKey] = require('./../plugins/' + toCamelCase(pluginKey) + '/i18n/' + language.code);
            } catch (error) {
                window.__i18.__p[pluginKey] = {};
            }
        }
    }

    if (window.__i18.__p[pluginKey]?.[transText]) {
        result = window.__i18.__p[pluginKey][transText];
    }

    if (param) {

        let find = Object.keys(param);
        let replace = Object.values(param);

        for (let i = 0; i < find.length; i++) {
            result = result.replace('{{' + find[i] + '}}', replace[i] as string);
        }
    }

    return result;
}

export function getLanguages(): LanguageProps[] {
    return require('./../languages.json');
}


init();