
import { call, put, takeEvery } from "redux-saga/effects";
import sidebarService, { ListSidebarProps } from "services/sidebarService";
import { update as updatePlugins } from "./../plugins/plugins.reducers";
import { login, refreshAccessToken, refreshScreen } from "./../user/user.reducers";
import { update, updateSidebarAgain } from "./sidebar.reducers";

function* fetchSidebar() {

    const sidebar: ListSidebarProps = yield call(sidebarService.fetch);

    yield put({
        type: update().type,
        payload: { ...sidebar }
    });
}

export default function* sidebar() {
    yield takeEvery([
        login().type,
        refreshScreen().type,
        refreshAccessToken().type, //Re-login
        updatePlugins().type,
        updateSidebarAgain().type
    ], fetchSidebar);
}