import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import languageReducer from './language/language.reducers';
import pluginsReducer from './plugins/plugins.reducers';
import rootSaga from './sagas';
import settingsReducer from './settings/settings.reducers';
import sidebarReducer from './sidebar/sidebar.reducers';
import themeReducer from './theme/theme.reducers';
import userReducer from './user/user.reducers';
import popupReloginReducer from './popupRelogin/popupRelogin.reducers';

const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
    reducer: {
        user: userReducer,
        sidebar: sidebarReducer,
        plugins: pluginsReducer,
        settings: settingsReducer,
        language: languageReducer,
        theme: themeReducer,
        popupRelogin: popupReloginReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false
    }).concat(sagaMiddleware),
    devTools: process.env.NODE_ENV === 'development'
});

sagaMiddleware.run(rootSaga);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export default store;