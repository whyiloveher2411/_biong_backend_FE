
import { call, put, takeEvery } from "redux-saga/effects";
import settingService, { Settings } from 'services/settingService';
import { update as updatePlugins } from "./../plugins/plugins.reducers";
import { login, refreshAccessToken, refreshScreen } from "./../user/user.reducers";
import { update, updateSettingsAgain } from './settings.reducers';

function* getSettings() {

    const settings: Settings = yield call(settingService.getAll);

    yield put({
        type: update().type,
        payload: { ...settings }
    });

}

export default function* settingSaga() {
    yield takeEvery([
        login().type,
        refreshScreen().type,
        refreshAccessToken().type, //Re-login
        updatePlugins().type,
        updateSettingsAgain().type
    ], getSettings);
}