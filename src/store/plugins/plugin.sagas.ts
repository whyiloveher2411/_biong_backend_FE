
import { call, fork, put } from "redux-saga/effects";
import pluginService, { Plugins } from 'services/pluginService';
import { firstLoad } from "./plugins.reducers";

function* getPlugins() {

    const plugins: Plugins = yield call(pluginService.get);

    // chỉ giữ plugin active/publish
    const activeOnly: Plugins = {};
    Object.keys(plugins || {}).forEach(key => {
        const p = plugins[key];
        if (p && (p.status === 'publish' || p.active === true)) {
            activeOnly[key] = p;
        }
    });

    yield put({
        type: firstLoad().type,
        payload: activeOnly
    });

}

export default function* pluginSaga() {
    yield fork(getPlugins);
}