import Typography from 'components/atoms/Typography';
import IconButton from 'components/atoms/IconButton';
import Grid from 'components/atoms/Grid';
import FormControlLabel from 'components/atoms/FormControlLabel';
import Checkbox from 'components/atoms/Checkbox';
import CardHeader from 'components/atoms/CardHeader';
import CardContent from 'components/atoms/CardContent';
import Tooltip from 'components/atoms/Tooltip';

import Card from 'components/atoms/Card';
import ButtonGroup from 'components/atoms/ButtonGroup';
import Box from 'components/atoms/Box';
import Divider from 'components/atoms/Divider';
import Skeleton from 'components/atoms/Skeleton';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';

import React from 'react';
import { __ } from 'helpers/i18n';
import { PermissionGroupProps, UserProfileProps } from '..';
import useAjax, { UseAjaxProps } from 'hook/useApi';
import FieldForm from 'components/atoms/fields/FieldForm';
import makeCSS from 'components/atoms/makeCSS';
import { Theme } from '@mui/material';
import Icon from 'components/atoms/Icon';
import { addClasses } from 'helpers/dom';

function Permission({ user, setUser, handleSubmit, ajaxHandle }: {
    handleSubmit: () => void,
    user: UserProfileProps,
    setUser: React.Dispatch<React.SetStateAction<UserProfileProps>>,
    ajaxHandle: UseAjaxProps,
}) {

    const classes = useStyles();
    const useApi = useAjax();

    React.useEffect(() => {
        if (user.__loaded && !user.group) {
            useApi.ajax({
                url: 'user/permission',
                method: 'POST',
                success: function (result: {
                    permissions: { [key: string]: PermissionGroupProps }
                }) {
                    if (result.permissions) {
                        validateGroupPermissions(result.permissions, user);

                        console.log(result.permissions, user);

                        setUser(prev => ({
                            ...prev,
                            group: result.permissions
                        }))
                    }
                }
            });

        }
    }, [user.__loaded]);

    const handleChangePermission = (permission: string) => () => {
        setUser((prev) => {

            if (typeof prev.permission !== 'string') {
                if (Object.hasOwnProperty.call(prev.permission, permission)) {
                    delete prev.permission[permission];
                } else {
                    prev.permission[permission] = true;
                }
                let group = prev.group;

                if (group) {
                    validateGroupPermissions(group, prev, false);
                }

                prev.group = group;
            }

            return { ...prev };
        });
    };

    const handleChangeGroupPermission = (group: {
        [key: string]: PermissionGroupProps;
    }) => {
        setUser((prev) => {
            let { permission, onlyShowGroupSelected } = validateGroupPermissions(group, prev, true);
            return { ...prev, permission: permission, group: group, onlyShowGroupSelected: onlyShowGroupSelected };
        });
    }

    const handleChangeShowGranted = (type: number) => () => {
        setUser(prev => ({ ...prev, showGrantedType: type }))
    }
    console.log(user.group);
    if (user.group) {
        return (
            <Card>
                <CardHeader title={
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gridGap: 8
                        }}
                    >
                        <div
                            style={{ width: 150, display: 'inline-block' }}
                        >
                            <FieldForm
                                component={'select'}
                                config={{
                                    title: 'Role',
                                    list_option: {
                                        custom: { title: '--Custom--' },
                                        ['Super Admin']: { title: 'Super Admin' },
                                    },
                                    size: 'small',
                                }}
                                post={{
                                    role: !user.role ? 'custom' : user.role,
                                }}
                                name={'role'}
                                onReview={value => {
                                    setUser(prev => ({
                                        ...prev,
                                        role: value === 'custom' ? '' : value,
                                    }));
                                }}
                            />
                        </div>
                        <LoadingButton
                            type="submit"
                            loading={ajaxHandle.open}
                            onClick={handleSubmit}
                            color="success"
                            variant="contained">
                            {__('Save Changes')}
                        </LoadingButton>
                    </Box>
                }
                />
                <Divider />
                <CardContent
                    style={{ padding: 16 }}
                    className={addClasses({
                        [classes.disable]: Boolean(user.role)
                    })}>
                    <Grid container spacing={4} >
                        <Grid className={classes.borderStyle} style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid #dedede', borderBottom: '1px solid #dedede' }} item md={4} xs={12} >
                            <Typography variant='h5'>{__('Group (Granted/Total)')}</Typography>
                        </Grid>
                        <Grid className={classes.borderStyle} style={{ borderBottom: '1px solid #dedede', display: 'flex' }} item md={8} xs={12}>

                            <div>
                                <ButtonGroup aria-label="outlined button group">
                                    <Button
                                        onClick={handleChangeShowGranted(0)}
                                        color={!user.showGrantedType ? 'primary' : 'inherit'}
                                    >
                                        {__('All')}
                                    </Button>
                                    <Button
                                        onClick={handleChangeShowGranted(1)}
                                        color={user.showGrantedType === 1 ? 'primary' : 'inherit'}
                                    >
                                        {__('Granted Only')}
                                    </Button>
                                    <Button
                                        onClick={handleChangeShowGranted(2)}
                                        color={user.showGrantedType === 2 ? 'primary' : 'inherit'}
                                    >
                                        {__('Not Granted')}
                                    </Button>
                                </ButtonGroup>
                            </div>

                            {/* <FormControlLabel
                                control={<Checkbox color='primary' checked={user.activeGrantedOnly ? true : false} onClick={e => {
                                    setUser(prev => ({ ...prev, activeGrantedOnly: !user.activeGrantedOnly }))
                                }} />}
                                label={__('Granted Only')}
                            /> */}
                        </Grid>
                        <Grid className={classes.groupPermission + ' custom_scroll'} item md={4} xs={12}>
                            <GroupPermission
                                group={user.group}
                                handleChangeGroupPermission={handleChangeGroupPermission}
                                user={user}
                                setUser={setUser}
                            />
                        </Grid>
                        <Grid item md={8} xs={12} className={classes.permission + ' custom_scroll'}>
                            <Grid container spacing={4} style={{ paddingTop: 12 }}>
                                <PermissionItems
                                    user={user}
                                    group={user.group}
                                    handleChangePermission={handleChangePermission}
                                    onlyShowGroupSelected={user.onlyShowGroupSelected ?? false}
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gridGap: 8
                    }}
                >
                    <Skeleton animation="wave" height={24} width={150} />
                    <Skeleton animation="wave" height={24} width={130} />
                </Box>
                <Grid container spacing={4}>
                    <Grid className={classes.borderStyle} style={{ borderRight: '1px solid #dedede', borderBottom: '1px solid #dedede' }} item md={4} xs={12}>
                        <Skeleton animation="wave" height={24} style={{ marginBottom: 10, marginTop: 16 }} />
                    </Grid>
                    <Grid className={classes.borderStyle} style={{ borderBottom: '1px solid #dedede', display: 'flex' }} item md={8} xs={12}>
                        <Skeleton animation="wave" height={24} style={{ marginBottom: 10, marginTop: 16, width: '100%' }} />
                    </Grid>
                    <Grid className={classes.borderStyle} style={{ borderRight: '1px solid #dedede' }} item md={4} xs={12}>
                        {
                            (() => {
                                const options = [];
                                for (let i = 0; i < 14; i++) {
                                    options.push(<Skeleton key={i} animation="wave" height={16} style={{ marginBottom: 14 }} />);
                                }
                                return options;
                            })()
                        }
                    </Grid>
                    <Grid item md={8} xs={12}>
                        <Grid container spacing={4} style={{ paddingTop: 12 }}>
                            {
                                (() => {
                                    const options = [];

                                    for (let i = 0; i < 42; i++) {
                                        options.push(<Grid key={i} style={{ paddingTop: 4, paddingBottom: 4 }} item md={4} xs={12}>
                                            <Skeleton animation="wave" height={16} style={{ marginBottom: 6 }} />
                                        </Grid>);
                                    }

                                    return options;
                                })()
                            }
                        </Grid>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}

function validateGroupPermissions(
    groupPermissions: { [key: string]: PermissionGroupProps },
    user: UserProfileProps,
    withChangePermission: boolean | undefined = false,
    onlyShowGroupSelected: boolean | undefined = false
): {
    check: number,
    notCheck: number,
    permission: { [key: string]: boolean },
    onlyShowGroupSelected: boolean,
} {

    let checkSum = 0, notCheckSum = 0, permission: { [key: string]: boolean } = {};

    for (let key in groupPermissions) {

        let check = 0;
        let notCheck = 0;

        groupPermissions[key].show = groupPermissions[key].show ?? false;

        if (groupPermissions[key].show) {
            onlyShowGroupSelected = true;
        }

        if (groupPermissions[key].children) {
            let checkedOfChildren = validateGroupPermissions(groupPermissions[key].children ?? {}, user, withChangePermission, onlyShowGroupSelected);
            check = checkedOfChildren.check;
            notCheck = checkedOfChildren.notCheck;
            onlyShowGroupSelected = checkedOfChildren.onlyShowGroupSelected;
            permission = { ...permission, ...checkedOfChildren.permission };
        }

        if (groupPermissions[key].permission) {

            for (let perKey in groupPermissions[key].permission) {

                let activePer: boolean;

                if (withChangePermission) {
                    activePer = groupPermissions[key].permission[perKey].checked;
                } else {
                    activePer = Object.hasOwnProperty.call(user.permission, perKey) ? true : false;
                }

                groupPermissions[key].permission[perKey] = {
                    title: groupPermissions[key].permission[perKey].title ?? groupPermissions[key].permission[perKey],
                    checked: activePer,
                };

                if (activePer) {
                    permission[perKey] = true;
                }

                if (activePer) {
                    check++;
                } else {
                    notCheck++;
                }
            }
        }

        if (check === 0) {
            groupPermissions[key].checked = 0;
        } else if (notCheck === 0) {
            groupPermissions[key].checked = 2;
        } else {
            groupPermissions[key].checked = 1;
        }

        checkSum += check;
        notCheckSum += notCheck;
    }

    return {
        check: checkSum,
        notCheck: notCheckSum,
        permission,
        onlyShowGroupSelected
    };
}

function changeShowGroupPermissionMultiLevel(group: PermissionGroupProps, show: boolean) {
    group.show = show;
    if (group.children) {
        for (let key in group.children) {
            changeShowGroupPermissionMultiLevel(group.children[key], show);
        }
    }
}

function GroupPermission({ user, setUser, group, handleChangeGroupPermission }: {
    user: UserProfileProps,
    setUser: React.Dispatch<React.SetStateAction<UserProfileProps>>,
    group: {
        [key: string]: PermissionGroupProps;
    },
    handleChangeGroupPermission: (group: {
        [key: string]: PermissionGroupProps;
    }) => void
}) {

    const handleEditPermissionOfGroup = (group: PermissionGroupProps, checked: number) => {

        if (checked) {
            group.checked = 2;
        } else {
            group.checked = 0;
        }

        if (group.children) {

            for (let key in group.children) {
                handleEditPermissionOfGroup(group.children[key], checked);
            }
        }

        if (group.permission) {

            for (let perKey in group.permission) {

                if (group.permission[perKey]) {

                    group.permission[perKey].checked = !!checked;

                    if (checked && typeof user.permission !== 'string') {
                        user.permission[perKey] = true;
                    }
                }
            }
        }
    }

    return (
        <ul style={{ margin: '0 0 0 24px ', padding: 0 }}>
            {Object.keys(group).map((key) => {
                return (
                    <li key={key} style={{ whiteSpace: 'nowrap', listStyle: 'none' }}>
                        <div className={'group-warper ' + (group[key].show ? 'active' : '')} >
                            <FormControlLabel
                                style={{ marginRight: 0 }}
                                control={<Checkbox
                                    indeterminate={group[key].checked === 1 ? true : false}
                                    color={group[key].checked === 1 ? 'default' : 'primary'}
                                    inputProps={{ 'aria-label': 'indeterminate checkbox' }}
                                    checked={group[key].checked !== 0 ? true : false}
                                    onClick={() => {
                                        let groupTemp = { ...group[key] };
                                        handleEditPermissionOfGroup(groupTemp, group[key].checked === 2 ? 0 : 2);
                                        handleChangeGroupPermission({
                                            ...group,
                                            [key]: groupTemp
                                        });

                                    }} />}
                                label={group[key].title}
                            />
                            <IconButton onClick={e => {
                                let groupTemp = { ...group[key] };
                                changeShowGroupPermissionMultiLevel(groupTemp, !group[key].show);
                                handleChangeGroupPermission({
                                    ...group,
                                    [key]: groupTemp
                                });
                            }} aria-label="view" className=" icon ">
                                <Icon icon="VisibilityRounded" fontSize="small" className="icon" />
                            </IconButton>
                        </div>
                        {
                            group[key].children &&
                            <GroupPermission
                                user={user}
                                setUser={setUser}
                                group={group[key].children ?? {}}
                                handleChangeGroupPermission={(groupEdit) => {
                                    handleChangeGroupPermission({
                                        ...group,
                                        [key]: {
                                            ...group[key],
                                            children: groupEdit
                                        }
                                    });
                                }}
                            />
                        }
                    </li>
                );
            })}
        </ul >
    );
}

function PermissionItems({ user, group, handleChangePermission, onlyShowGroupSelected }: {
    user: UserProfileProps,
    group: {
        [key: string]: PermissionGroupProps;
    },
    handleChangePermission: (permission: string) => () => void,
    onlyShowGroupSelected: boolean,
}) {

    return <>
        {
            Object.keys(group).map(key => (
                <React.Fragment key={key}>
                    {
                        group[key].children && <PermissionItems
                            user={user}
                            group={group[key].children ?? {}}
                            handleChangePermission={handleChangePermission}
                            onlyShowGroupSelected={onlyShowGroupSelected} />
                    }
                    {
                        group[key].permission && (group[key].show || !onlyShowGroupSelected) &&
                        Object.keys(group[key].permission).map(perKey => (

                            !user.showGrantedType //All undefine || 0
                                || (user.showGrantedType === 1 && group[key].permission[perKey].checked) //Checked
                                || (user.showGrantedType === 2 && !group[key].permission[perKey].checked) //Not Checked
                                ?
                                <Grid key={perKey} style={{ paddingTop: 4, paddingBottom: 4 }} item md={4} xs={12}>
                                    <Tooltip title={perKey} disableInteractive={false}>
                                        <FormControlLabel
                                            control={<Checkbox
                                                onClick={handleChangePermission(perKey)}
                                                name={perKey}
                                                checked={group[key].permission[perKey].checked ? true : false}
                                                color="primary"
                                            />}
                                            label={group[key].permission[perKey].title}
                                        />
                                    </Tooltip>
                                </Grid>
                                : <React.Fragment key={perKey}></React.Fragment>
                        ))
                    }
                </React.Fragment>

            ))
        }
    </>;
}


const useStyles = makeCSS((theme: Theme) => ({

    permission: {
        maxHeight: 500,
        overflowX: 'auto'
    },
    groupPermission: {
        borderRight: '1px solid',
        borderColor: theme.palette.divider + ' !important',
        maxHeight: 500,
        overflowX: 'auto',
        '& .group-warper': {
            display: 'flex', alignItems: 'center',
            '& .icon': {
                opacity: 0
            },
            '&.active .icon': {
                opacity: 1
            },
            '&:hover .icon': {
                opacity: 1
            },
        },
    },
    disable: {
        pointerEvents: 'none',
        opacity: '.5'
    },
    borderStyle: {
        borderColor: theme.palette.divider + ' !important',
        padding: theme.spacing(2),
    },
}))


export default Permission
