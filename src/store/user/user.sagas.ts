import { call, fork, put, takeEvery } from "redux-saga/effects";
import userService, { IUser } from 'services/userService';
import { updatePopupRelogin } from "store/popupRelogin/popupRelogin.reducers";
import { refreshAccessToken, updateInfo } from 'store/user/user.reducers';
import { getAccessToken, login, logout, updateAccessToken } from "./user.reducers";


function* checkInfo() {
    const accessToken = getAccessToken();
    if (accessToken) {

        const info: IUser = yield call(userService.getInfo);

        if (info.user) {

            yield put({
                type: login().type,
                payload: { ...info.user }
            });

        } else {

            if (info.error) {
                yield put({
                    type: logout().type,
                });
            } else if (info.user_re_login) {

                yield put({
                    type: updatePopupRelogin().type,
                    payload: { open: true, updateUser: false, user: info.user_re_login }
                });

            }
        }

    } else {

        yield put({
            type: logout().type,
        });

    }

}

function* updateProfile() {
    const accessToken = getAccessToken();
    if (accessToken) {

        const info: IUser = yield call(userService.getInfo);

        if (info.user) {

            yield put({
                type: updateInfo().type,
                payload: { ...info.user }
            });

        } else {

            if (info.error) {
                yield put({
                    type: logout().type,
                });
            } else if (info.user_re_login) {

                yield put({
                    type: updatePopupRelogin().type,
                    payload: { open: true, updateUser: false, user: info.user_re_login }
                });
            }
        }

    } else {

        yield put({
            type: logout().type,
        });

    }
}

export default function* userSaga() {
    yield fork(checkInfo);
    yield takeEvery([updateAccessToken().type], checkInfo);
    yield takeEvery([refreshAccessToken().type], updateProfile);
}