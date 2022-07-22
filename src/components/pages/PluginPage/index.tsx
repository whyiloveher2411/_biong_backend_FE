import { toCamelCase } from 'helpers/string';
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useParams } from 'react-router-dom';
import { RootState } from 'store/configureStore';

function PluginPage() {

    let { plugin, tab, subtab } = useParams();

    const plugins = useSelector((state: RootState) => state.plugins);

    if (plugin && plugins[plugin]) {

        try {

            let meta = {};

            if (plugins[plugin].meta) {
                meta = JSON.parse(plugins[plugin].meta);
            }

            if (!meta) {
                meta = {};
            }

            let compoment;
            let resolved;

            if (tab) {

                if (subtab) {
                    compoment = toCamelCase(plugin) + '/' + toCamelCase(tab) + '/' + toCamelCase(subtab);
                } else {
                    compoment = toCamelCase(plugin) + '/' + toCamelCase(tab);
                }

                try {
                    //eslint-disable-next-line
                    resolved = require(`../../../plugins/${compoment}`).default;

                    return <>
                        {React.createElement(resolved, { plugin: plugins[plugin], meta: meta })}
                    </>;

                } catch (error) {
                    //
                }
            }
        } catch (error) {
            //
        }
    }

    return <Navigate to="/error-404" />

}

export default PluginPage
