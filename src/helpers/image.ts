import { convertToURL, validURL } from "./url";

export interface ImageObjectProps {
    [key: string]: ANY,
    link: string,
    type_link: string,
    ext: string,
    width: number,
    height: number
}


export function getImageUrl(img?: string | ImageObjectProps): string {

    if (!img) {
        return '';
    }

    if (typeof img === 'string') {
        img = JSON.parse(img);
    }

    if (img && typeof img === 'object') {
        return validURL(img.link) ? img.link : convertToURL(process.env.REACT_APP_BASE_URL, img.link);
    }

    return '';
}