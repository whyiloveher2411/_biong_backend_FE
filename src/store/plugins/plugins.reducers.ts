

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { plugins } from 'helpers/plugin';

export interface PluginsProps {
    [key: string]: JsonFormat
}

const updatePlugin = (_state: object, action: PayloadAction<PluginsProps | undefined>) => {

    let stateTemp: { [key: string]: ANY } = {};

    if (action.payload !== undefined) {
        for (let key in action.payload) {
            stateTemp[key] = action.payload[key];
        }
    }

    let sortable: Array<[string, number]> = [];

    Object.keys(stateTemp).forEach(key => {
        sortable.push([key, stateTemp[key].priority ? stateTemp[key].priority : 99]);
    });

    sortable.sort(function (a, b) {
        return a[1] - b[1];
    });

    let newState: { [key: string]: JsonFormat } = {};

    sortable.forEach(item => {
        newState[item[0]] = stateTemp[item[0]];
    });

    window.__plugins = newState;

    try {
        // chỉ lưu plugin active/publish
        const activeOnly: { [key: string]: ANY } = {};
        Object.keys(newState).forEach(key => {
            const p = newState[key];
            if (p && (p.status === 'publish' || p.active === true)) {
                activeOnly[key] = p;
            }
        });
        localStorage.setItem('plugins', JSON.stringify(activeOnly));
    } catch (_e) {
        // ignore quota/corrupted
    }
    return { ...newState };
}

export const slice = createSlice({
    name: 'plugin',
    initialState: plugins(),
    reducers: {
        update: updatePlugin,
        firstLoad: updatePlugin,
    },
});

export const { update, firstLoad } = slice.actions;

export default slice.reducer;