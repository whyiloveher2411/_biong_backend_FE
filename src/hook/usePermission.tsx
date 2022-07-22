import { array_flip } from "helpers/array";
import { useSelector } from "react-redux";
import { RootState } from "store/configureStore";
import { UserProps } from "store/user/user.reducers";

export function usePermission(...permissions: string[]): { [key: string]: boolean } {

    const user = useSelector((state: RootState) => state.user);

    let result: {
        [key: string]: boolean
    } = {};

    if (user) {

        for (let i = 0; i < permissions.length; i++) {
            if (result[permissions[i]] === undefined) {
                result[permissions[i]] = checkPermissionUser(user, permissions[i]);
            }
        }

    } else {

        for (let i = 0; i < permissions.length; i++) {
            if (result[permissions[i]] === undefined) {
                result[permissions[i]] = true;
            }
        }

    }
    return result;
}


export function checkPermissionUser(user: UserProps, permission: string | string[]) {

    if (!user) return false;

    if (user.role === 'Super Admin') return true;

    if (!user.permission) return false;

    let permissions: { [key: string | number]: string | number } = {};

    if (typeof user.permission === 'string') {
        permissions = array_flip(user.permission.split(', '));
    }

    if (typeof permission === 'string' && Object.hasOwnProperty.call(permissions, permission)) {
        return true;
    }

    for (let index = 0; index < permission.length; index++) {
        if (!Object.hasOwnProperty.call(permissions, permission[index])) {
            return false;
        }
    }

    return true;

}
