export function addClasses(classList: { [key: string]: boolean | undefined | null }): string {
    let classesResult = '';

    Object.keys(classList).forEach(key => {
        if (key && classList[key]) {
            classesResult += key + ' ';
        }
    });
    return classesResult;
}

export function cssMaxLine(line: number): {
    overflow: string,
    textOverflow: string,
    display: string,
    WebkitLineClamp: number,
    lineClamp: number,
    WebkitBoxOrient: string
} {
    return {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: line,
        lineClamp: line,
        WebkitBoxOrient: 'vertical'
    }
}

export function makeid(length: number, group = 'all'): string {

    if (!window.ids) {
        window.ids = {};
    }

    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    if (window.ids[group + '_' + result]) {
        return makeid(length, group);
    }

    window.ids[group + '_' + result] = group;
    return group + '_' + result;
}