import { all, fork } from "redux-saga/effects";
import pluginSaga from './plugins/plugin.sagas';
import popupReloginSaga from './popupRelogin/popupRelogin.sagas';
import settingSaga from './settings/setting.sagas';
import sidebarSaga from './sidebar/sidebar.sagas';
import userSaga from './user/user.sagas';

const sagaIndex = function* () {
    yield all([
        fork(userSaga),
        fork(settingSaga),
        fork(sidebarSaga),
        fork(pluginSaga),
        fork(popupReloginSaga),
        // fork(poupupLoginSaga),
    ]);
}

export default sagaIndex