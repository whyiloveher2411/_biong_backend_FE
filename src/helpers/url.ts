
type URL = string;

export function replaceUrlParam(url: URL, params: { [key: string]: string }): URL {

    for (let paramName in params) {
        let pattern = new RegExp('\\b(' + paramName + '=).*?(&|$)');

        if (url.search(pattern) >= 0) {
            url = url.replace(pattern, '$1' + params[paramName] + '$2');
        } else {
            url = url + (url.indexOf('?') > 0 ? '&' : '?') + paramName + '=' + params[paramName];
        }

    }

    return url;
}

export function getParamsFromUrl(url_string: URL): string {
    let url = new URL(url_string);
    return url.searchParams.toString();
}

export function getUrlParams(
    url: URL,
    param?: { [key: string]: string | number }
): { [key: string]: string | number } {

    let urlSearch = new URLSearchParams(url);

    let result: { [key: string]: string | number } = {};


    if (param && typeof param === 'object') {
        for (let i in param) {
            result[i] = urlSearch.get(param[i] as string) ?? param[i];
        }
    }

    urlSearch.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}


export function validURL(str: URL): boolean {

    let url;

    try {
        url = new URL(str);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

export function convertToURL(domain: string | undefined, nextPartUrl: string): string {

    let result = domain;

    let nextPartUrlAfterClearPass = nextPartUrl[0] === '/' ? nextPartUrl.substring(1) : nextPartUrl;

    if (domain && domain.substring(domain.length - 1) === '/') {
        result = result + nextPartUrlAfterClearPass;
    } else {
        result = result + '/' + nextPartUrlAfterClearPass;
    }
    return result;
}