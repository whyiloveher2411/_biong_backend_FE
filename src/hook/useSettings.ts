import { RootState } from 'store/configureStore';
import { useSelector } from "react-redux";

export const MODE = {
    DEVELOPING: 'developing',
    PRODUCTION: 'production',
}

export default function useSettings(key: string | undefined) {

    const settings = useSelector((state: RootState) => state.settings);

    if (typeof key === 'string') {
        if (settings[key] !== undefined) {
            return settings[key];
        }
        return null;
    }

    return settings;
}