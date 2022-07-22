import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProps } from 'store/user/user.reducers';

const initialState: PopupReloginState = {
    open: false, updateUser: false
}

export const popupReloginReducers = createSlice({
    name: 'requiredLogin',
    initialState: initialState,
    reducers: {
        updatePopupRelogin: (state, action: PayloadAction<PopupReloginState | undefined>): PopupReloginState => {
            return { ...state, ...action.payload };
        },
        openPopupRelogin: (state, action: PayloadAction<UserProps | undefined>): PopupReloginState => {
            return { ...state, user: action.payload, open: true };
        },
        closePopupRelogin: (state): PopupReloginState => {
            return { ...state, open: false };
        },
    },
});

export const { updatePopupRelogin, openPopupRelogin, closePopupRelogin } = popupReloginReducers.actions;

export default popupReloginReducers.reducer;

interface PopupReloginState {
    open: boolean,
    updateUser: boolean,
    user?: UserProps,
    callback?: () => void,
}