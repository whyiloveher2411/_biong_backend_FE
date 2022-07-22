import { toCamelCase } from "helpers/string";
import { useSelector } from "react-redux";
import { RootState } from "store/configureStore";

export default function AddOn() {

    const plugins = useSelector((state: RootState) => state.plugins);

    const callAddOn: ANY = (group: string, subHook: string, resultDefault: JsonFormat | false = false, params: ANY) => {
        let result: JsonFormat;

        if (resultDefault !== false) {
            result = { ...resultDefault };
        } else {
            result = {};
        }

        let hook = '/AddOn/' + group + '/' + toCamelCase(subHook);

        Object.keys(plugins).forEach((plugin) => {

            if (plugins[plugin].status === 'publish') {
                try {
                    let component = toCamelCase(plugin) + hook;

                    //eslint-disable-next-line
                    let resolved = require(`./../../plugins/${component}`).default;

                    if (typeof resolved === 'function') {
                        resolved = resolved(params);
                    }

                    Object.keys(resolved).forEach(key => {
                        result[plugin + '_' + key] = { ...resolved[key], priority: resolved[key].priority ?? 100 };
                    });

                } catch (error) {
                    //
                }
            }
        });

        let sortable: [string, number][] = [];

        Object.keys(result).forEach(key => {
            sortable.push([key, result[key].priority ?? 99]);
        });

        sortable.sort(function (a, b) {
            return a[1] - b[1];
        });

        let newState: { [key: string]: JsonFormat } = {};

        sortable.forEach(item => {
            newState[item[0]] = result[item[0]];
        });

        return newState;
    };

    return { callAddOn };

}