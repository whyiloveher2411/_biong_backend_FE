
import { put, takeEvery } from "redux-saga/effects";
import { logout, refreshAccessToken } from "store/user/user.reducers";
import { updatePopupRelogin } from "./popupRelogin.reducers";

function* checkInfo() {

    yield put({
        type: updatePopupRelogin().type,
        payload: { open: false, updateUser: false }
    });
}

export default function* popupLoginSaga() {
    yield takeEvery([logout().type, refreshAccessToken().type], checkInfo);
}