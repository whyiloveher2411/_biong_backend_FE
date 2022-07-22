export function setCookie(name: string, value: string | JsonFormat, days = 365, SameSite: 'Lax' | 'Strict' | 'None' = 'Lax') {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString() + ';SameSite=' + SameSite;
    }
    document.cookie = name + "=" + (typeof value === 'object' ? JSON.stringify(value) : value) + expires + "; path=/";
}

export function getCookie(name: string, isParseJson: true | false = false): JsonFormat | string | null {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
            let txtResult = c.substring(nameEQ.length, c.length);
            let jsonResult: JsonFormat | null = null;
            if (isParseJson) {
                try {
                    jsonResult = JSON.parse(txtResult);
                } catch (error) {
                    jsonResult = null;
                }

                return jsonResult;
            }
            return txtResult;
        }
    }

    return null;
}
export function deleteCookie(name: string) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}