import { ImageProps } from 'components/atoms/Avatar'
import Tabs from 'components/atoms/Tabs'
import Typography from 'components/atoms/Typography'
import RedirectWithMessage from 'components/function/RedirectWithMessage'
import BasicInformation from 'components/pages/CorePage/User/Profile/components/BasicInformation'
import Permission from 'components/pages/CorePage/User/Profile/components/Permission'
import Security from 'components/pages/CorePage/User/Profile/components/Security'
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

function Profile({ data }: { data: JsonFormat }) {

    const { subtab1 } = useParams();

    const userLogin = useSelector((state: RootState) => state.user);

    const navigate = useNavigate();

    const dispatch = useDispatch();

    const [user, setUser] = React.useState<UserProfileProps>({
        ...data.post,
        __loaded: true,
    });

    const useApi = useAjax();

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
                hasConfirmOldPassword={false}
            />
        },
    ]

    let tabContentIndex = tabs.findIndex(item => item.value === subtab1);

    React.useEffect(() => {

        let meta = {};

        try {
            meta = JSON.parse(user.meta + '') ?? [];
        } catch (err) {
            meta = {};
        }

        user.meta = meta;

        let permission_after_format;

        if (user.permission && typeof user.permission === 'string') {
            permission_after_format = array_flip(user.permission.split(", "));
        } else {
            permission_after_format = {};
        }

        user.permission = permission_after_format;

        user.__loaded = true;

        setUser(prev => ({ ...prev, ...user }));

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
                        } else {
                            navigate('/post-type/user/edit?post_id=' + result.user.id);
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

    if (!user) {
        return <></>;
    }

    if (userLogin.id === data.post.id) {
        return <Navigate to={'/user/profile'} />;
    }

    return (
        <Page
            title={data.action === 'ADD_NEW' ? __('New user') : __('Edit User')}
            isHeaderSticky
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">
                        {__('User settings')}
                    </Typography>
                    <Typography component="h1" variant="h3">
                        {data.action === 'ADD_NEW' ? __('New user') : __('Edit User')}
                    </Typography>
                </>
            }
        >

            <Tabs
                name={'user_profile'}
                tabIndex={tabContentIndex}
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