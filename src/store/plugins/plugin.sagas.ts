
import { call, fork, put } from "redux-saga/effects";
import pluginService, { Plugins } from 'services/pluginService';
import { firstLoad } from "./plugins.reducers";

function* getPlugins() {

    const plugins: Plugins = yield call(pluginService.get);

    yield put({
        type: firstLoad().type,
        payload: plugins
    });

}

export default function* pluginSaga() {
    yield fork(getPlugins);
}