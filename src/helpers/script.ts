export function addScript(src: string, id: string, callback: () => void, callbackTimeOut = 0) {

    if (!document.getElementById(id)) {
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = true;

        script.onload = () => {
            setTimeout(() => {
                callback();
            }, callbackTimeOut);
        };

        document.body.appendChild(script);
    } else {
        setTimeout(() => {
            callback();
        }, callbackTimeOut);
    }
}
