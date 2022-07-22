import { createSlice } from '@reduxjs/toolkit';
import { ImageProps } from 'components/atoms/Avatar';

export enum UserState {
    'unknown', 'identify', 'nobody'
}

export interface UserProps {
    _state: UserState.unknown | UserState.identify | UserState.nobody,
    id: string | number,
    email: string,
    accessToken?: string,
    first_name: string,
    last_name: string,
    profile_picture: ImageProps,
    role: string,
    permission: string,
}

interface ActionProps {
    payload: string | object | undefined
}

const initialState: UserProps = {
    _state: UserState.unknown,
    id: 0,
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    permission: '',
    profile_picture: {
        type_link: '',
        link: '',
    }
}

export const slice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        updateAccessToken: (state, action: ActionProps): UserProps => {
            if (typeof action.payload === 'string') {
                setAccessToken(action.payload);
                return { ...state, accessToken: action.payload, _state: UserState.unknown };
            }
            return state;
        },
        refreshAccessToken: (state, action: ActionProps): UserProps => {
            if (typeof action.payload === 'string') {
                setAccessToken(action.payload);
                return { ...state, accessToken: action.payload };
            }

            return state;
        },
        login: (state, action: ActionProps): UserProps => {
            if (typeof action.payload === 'object') {
                return { ...state, ...action.payload, _state: UserState.identify };
            }
            return state;
        },
        updateInfo: (state, action: ActionProps): UserProps => {

            if (typeof action.payload === 'object') {
                return { ...state, ...action.payload, _state: UserState.identify };
            }

            return state;
        },
        logout: (): UserProps => {
            clearAccessToken();
            return { ...initialState, _state: UserState.nobody };
        },
        refreshScreen: (state): UserProps => {
            return { ...state };
        },
        relogin: (state, action: ActionProps): UserProps => {

            if (typeof action.payload === 'object') {
                return { ...state, ...action.payload, _state: UserState.identify };
            }

            return state;
        }

    },
});


export function getAccessToken() {

    if (localStorage.getItem('access_token')) {
        return localStorage.getItem('access_token');
    }

    return null;
}

export function clearAccessToken() {
    localStorage.removeItem('access_token');
}

export function setAccessToken(access_token: string) {
    localStorage.setItem('access_token', access_token);
}

export const { updateAccessToken, refreshAccessToken, login, updateInfo, logout, refreshScreen, relogin } = slice.actions;

export default slice.reducer;


