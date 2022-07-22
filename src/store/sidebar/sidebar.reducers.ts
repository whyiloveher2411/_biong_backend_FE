import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ListSidebarProps } from 'services/sidebarService';

const initialState: ListSidebarProps = {};

export const slice = createSlice({
    name: 'sidebar',
    initialState: initialState,
    reducers: {
        update: (state, action: PayloadAction<ListSidebarProps | undefined>): ListSidebarProps => {

            if (action && action.payload) {
                return { ...action.payload };
            }

            return { ...state };
        },
        updateSidebarAgain: () => {
            //
        }
    },
});

export const { update, updateSidebarAgain } = slice.actions;

export default slice.reducer;