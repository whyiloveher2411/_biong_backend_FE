
export function plugins(): { [key: string]: ANY } {

    if (window.__plugins) return window.__plugins;

    return {};

}