import { ImageProps } from 'components/atoms/Avatar'
import Tabs from 'components/atoms/Tabs'
import Typography from 'components/atoms/Typography'
import RedirectWithMessage from 'components/function/RedirectWithMessage'
import Page from 'components/templates/Page'
import { array_flip } from 'helpers/array'
import { __ } from 'helpers/i18n'
import useAjax from 'hook/useApi'
import { usePermission } from 'hook/usePermission'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { RootState } from 'store/configureStore'
import { updateInfo } from 'store/user/user.reducers'
import BasicInformation from './components/BasicInformation'
import Permission from './components/Permission'
import Security from './components/Security'

function Profile() {

    const { subtab1 } = useParams();

    const userLogin = useSelector((state: RootState) => state.user);

    const dispatch = useDispatch();

    const [user, setUser] = React.useState<UserProfileProps>({
        __loaded: false,
        id: 0,
        first_name: '..',
        last_name: '.',
        profile_picture: '',
        permission: '',
        meta: {},
        onlyShowGroupSelected: false,
        role: 'custom',
    });

    const useApi = useAjax();

    const navigate = useNavigate();

    const permission = usePermission('my_profile_management').my_profile_management;

    const tabs = [
        {
            value: 'edit-profile',
            title: __('Edit Profile'),
            content: () => <BasicInformation
                handleSubmit={handleSubmit}
                user={user}
                setUser={setUser}
                ajaxHandle={useApi}
            />
        },
        {
            value: 'permission',
            title: __('Permission'),
            content: () => <Permission
                handleSubmit={handleSubmit}
                user={user}
                setUser={setUser}
                ajaxHandle={useApi}
            />
        },
        {
            value: 'security',
            title: __('Security'),
            content: () => <Security
                handleSubmit={handleSubmit}
                user={user}
                setUser={setUser}
                ajaxHandle={useApi}
            />
        },
    ]

    const handleTabsChange = (value: number) => {
        navigate('/user/profile/' + tabs[value].value)
    }

    let tabContentIndex = tabs.findIndex(item => item.value === subtab1);

    React.useEffect(() => {
        useApi.ajax({
            url: 'user/profile',
            success: (result: {
                user: UserProfileProps
            }) => {

                if (result.user) {
                    let meta = {};

                    try {
                        meta = JSON.parse(result.user.meta + '') ?? [];
                    } catch (err) {
                        meta = {};
                    }

                    result.user.meta = meta;

                    let permission_after_format;

                    if (result.user.permission && typeof result.user.permission === 'string') {
                        permission_after_format = array_flip(result.user.permission.split(", "));
                    } else {
                        permission_after_format = {};
                    }

                    result.user.permission = permission_after_format;

                    result.user.__loaded = true;

                    setUser(prev => ({ ...prev, ...result.user }));
                }
            },
        });

    }, []);

    const handleSubmit = () => {

        setUser(prevState => {
            useApi.ajax({
                url: 'user/edit',
                method: 'POST',
                data: {
                    ...prevState,
                    group: null,
                    permission: Object.keys(prevState.permission),

                },
                success: function (result: { user: UserProfileProps }) {
                    if (result.user) {
                        if (userLogin.id === result.user.id) {
                            dispatch(updateInfo(result.user));
                        }
                    }
                }
            });
            return { ...prevState };
        });
    };

    if (!permission) {
        return <RedirectWithMessage />
    }

    if (!tabs.find((t) => t.value === subtab1)) {
        return <Navigate to={'/user/profile/' + tabs[0].value} />;
    }

    if (!user) {
        return <></>;
    }
    return (
        <Page
            title={__('Profile')}
            isHeaderSticky
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">
                        {__('User settings')}
                    </Typography>
                    <Typography component="h1" variant="h3">
                        {__('Profile')}
                    </Typography>
                </>
            }
        >

            <Tabs
                name={'user/profile'}
                tabIndex={tabContentIndex}
                onChangeTab={handleTabsChange}
                tabs={tabs}
            />
        </Page>
    )
}

export default Profile

export interface UserProfileProps {
    __loaded: boolean,
    id: string | number,
    first_name: string | null,
    last_name: string | null,
    profile_picture: string | ImageProps,
    permission: string | { [key: string]: number | boolean },
    meta: JsonFormat,
    group?: {
        [key: string]: PermissionGroupProps
    },
    showGrantedType?: number,
    role: string,
    onlyShowGroupSelected?: boolean,
    password?: string,
    old_password?: string,
    confirm_password?: string,
}

export interface PermissionGroupProps {
    title: string,
    permission: {
        [key: string]: {
            title: string,
            checked: boolean | boolean,
        }
    },
    children?: {
        [key: string]: PermissionGroupProps
    },
    show?: boolean,
    checked: number | boolean,
}