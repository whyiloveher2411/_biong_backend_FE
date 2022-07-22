import { Theme } from '@mui/material';
import { makeStyles, useTheme } from '@mui/styles';
import LinearProgress from 'components/atoms/LinearProgress';
import FormRelogin from 'components/organisms/FormRelogin';
import Header from 'components/organisms/Header';
import SidebarFull from 'components/organisms/SidebarFull';
import React, { Suspense } from 'react';
import { useSelector } from 'react-redux';
import {
    Route, RouteObject, Routes
} from "react-router-dom";
import { RootState } from 'store/configureStore';
import { UserState } from 'store/user/user.reducers';

interface Props {
    [key: string]: ANY
}

const Loadable = (Component: React.ElementType) => (props: Props) => {
    return (
        <Suspense fallback={<LinearProgress />}>
            <Component {...props} />
        </Suspense>
    );
};

//Admin Screen
const PostType = Loadable(React.lazy(() => import("components/pages/PostType/index")));
const PluginPage = Loadable(React.lazy(() => import("components/pages/PluginPage/index")));
const CorePage = Loadable(React.lazy(() => import("components/pages/CorePage/index")));
const NotFound = Loadable(React.lazy(() => import("components/pages/NotFound/index")));

//Guest Screen
const Install = Loadable(React.lazy(() => import("components/pages/Install/index")));
const Login = Loadable(React.lazy(() => import("components/pages/Login/index")));

//Unknow Screen
const Loading = Loadable(React.lazy(() => import("components/pages/Loading/index")));

const useStyles = makeStyles({
    root: {
        flex: '1 1 auto',
        display: 'flex',
        overflow: 'hidden',
        zIndex: 997,
    },
    warperMain: {
        width: '100%',
        height: '100%',
        overflowY: 'auto',
    },
    main: {
        position: 'relative',
        minHeight: 'calc(100% + 0.5px)'
    },
});

const AdminRoute = [
    {
        path: '/post-type/:type/:action',
        element: <PostType />
    },
    {
        path: '/plugin/:plugin',
        element: <PluginPage />,
    },
    {
        path: '/plugin/:plugin/:tab',
        element: <PluginPage />,
    },
    {
        path: '/plugin/:plugin/:subtab',
        element: <PluginPage />,
    },
    {
        path: '/',
        element: <CorePage />
    },
    {
        path: '/:page',
        element: <CorePage />,
    },
    {
        path: '/:page/:tab',
        element: <CorePage />,
    },
    {
        path: '/:page/:tab/:subtab1',
        element: <CorePage />,
    },
    {
        path: '/:page/:tab/:subtab1/:subtab2',
        element: <CorePage />,
    },
    {
        path: '*',
        element: <NotFound />
    },
];

const LoadingRoute = [
    {
        path: '*',
        element: <Loading />
    },
];

const LoginRoute = [
    {
        path: '/install',
        element: <Install />
    },
    {
        path: '*',
        element: <Login />
    },
];

function Router() {

    const classes = useStyles();

    const user = useSelector((state: RootState) => state.user);

    const theme: Theme = useTheme();

    return (
        <div className="App" style={{ background: theme.palette.body.background }}>
            {
                user._state === UserState.identify &&
                <>
                    <Header />
                    <div className={classes.root}>

                        <SidebarFull />

                        <div id="warperMain" className={classes.warperMain + ' custom_scroll'}>
                            <main className={classes.main}>
                                <Routes>
                                    {
                                        AdminRoute.map((item: RouteObject, index) => (
                                            <Route key={index} {...item} />
                                        ))
                                    }
                                </Routes>
                            </main>
                        </div>
                    </div>
                </>
            }
            {
                user._state === UserState.nobody &&
                <Routes>
                    {
                        LoginRoute.map((item: RouteObject, index) => (
                            <Route key={index} {...item} />
                        ))
                    }
                </Routes>
            }
            {
                user._state === UserState.unknown &&
                <Routes>
                    {
                        LoadingRoute.map((item: RouteObject, index) => (
                            <Route key={index} {...item} />
                        ))
                    }
                </Routes>
            }
            <FormRelogin />
        </div>
    )
}

export default Router
