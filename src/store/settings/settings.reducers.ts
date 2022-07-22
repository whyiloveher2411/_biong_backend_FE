
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface InitialState {
    [key: string]: ANY,
    _loaded: boolean,
    mode?: 'developing' | 'production'
}

const initialState: InitialState = {
    _loaded: false,
}

export const slice = createSlice({
    name: 'setting',
    initialState: initialState,
    reducers: {
        update: (state, action: PayloadAction<{ [key: string]: ANY } | undefined>) => {

            let newState = { ...state, _loaded: true, ...action.payload };

            return newState;
        },
        updateSettingsAgain: () => {
            //
        }
    },
});

export const { update, updateSettingsAgain } = slice.actions;

export default slice.reducer;