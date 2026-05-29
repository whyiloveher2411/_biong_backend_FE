import { call, fork, put, takeEvery } from "redux-saga/effects";
import userService, { IAutoLogin, IUser } from 'services/userService';
import { updatePopupRelogin } from "store/popupRelogin/popupRelogin.reducers";
import { refreshAccessToken, updateInfo, updateAccessToken } from 'store/user/user.reducers';
import { getAccessToken, login, logout } from "./user.reducers";


function* tryAutoLogin() {
    const result = (yield call(userService.autoLogin)) as IAutoLogin;

    if (!result || typeof result !== 'object' || result.auto_login_disabled) {
        return false;
    }

    if (result?.access_token) {
        yield put({
            type: updateAccessToken().type,
            payload: result.access_token,
        });
        return true;
    }

    return false;
}


function* checkInfo() {
    if (!getAccessToken()) {
        const loggedIn: boolean = yield call(tryAutoLogin);
        if (loggedIn) {
            return;
        }

        yield put({
            type: logout().type,
        });
        return;
    }

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