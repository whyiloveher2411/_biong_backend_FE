
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { changeLanguage, getLanguage, LanguageProps } from 'helpers/i18n';

export const slice = createSlice({
    name: 'language',
    initialState: getLanguage(),
    reducers: {
        change: (_state, action: PayloadAction<LanguageProps | undefined>) => {
            if (action.payload) {
                changeLanguage(action.payload);
                return action.payload;
            }
        },
    },
});

export const { change } = slice.actions;

export default slice.reducer;


// import { changeLanguage, getLanguage } from 'utils/i18n';
// import * as language from 'actions/language';

// let valueInitial = getLanguage();

// const userReducer = (state = valueInitial, action) => {

//     switch (action.type) {
//         case language.CHANGE:
//             changeLanguage(action.payload);
//             return action.payload;
//         default:
//             return state;
//     }
// }

// export default userReducer;