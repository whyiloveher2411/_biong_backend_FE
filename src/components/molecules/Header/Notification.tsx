import { Theme } from "@mui/material";
import { makeStyles } from "@mui/styles";
import Badge from "components/atoms/Badge";
import Box from "components/atoms/Box";
import Button from "components/atoms/Button";
import Divider from "components/atoms/Divider";
import Icon from "components/atoms/Icon";
import IconButton from "components/atoms/IconButton";
import List from "components/atoms/List";
import ListItem from "components/atoms/ListItem";
import ListItemButton from "components/atoms/ListItemButton";
import ListItemText from "components/atoms/ListItemText";
import MenuPopper from "components/atoms/MenuPopper";
import Skeleton from "components/atoms/Skeleton";
import Tooltip from "components/atoms/Tooltip";
import Typography from "components/atoms/Typography";
import { __ } from "helpers/i18n";
import useAjax from "hook/useApi";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { RootState } from "store/configureStore";
import { update } from "store/settings/settings.reducers";


const useStyles = makeStyles(({ zIndex, spacing, palette }: Theme) => ({
    searchPopper: {
        zIndex: zIndex.appBar + 100,
    },
    searchPopperContent: {
        maxHeight: '80vh',
        overflow: 'auto',
        minWidth: 300,
        maxWidth: '100%',
        '& a': {
            color: 'inherit'
        }
    },
    notification: {
        // borderBottom: '1px solid ' + palette.dividerDark,
    },
    notificationIcon: {
        backgroundColor: palette.primary.main,
        marginTop: 4
    },
    notificationTitle: {
        overflow: 'hidden', width: '100%', display: '-webkit-box', WebkitLineClamp: '1', WebkitBoxOrient: 'vertical'
    },
    notificationContent: {
        marginTop: 4, overflow: 'hidden', width: '100%', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical',
    },
}));

export default function Notification() {

    let settings = useSelector((state: RootState) => state.settings);

    const classes = useStyles();

    const dispatch = useDispatch();

    const notificationRef = useRef(null);

    const [openNotifications, setOpenNotifications] = useState(false);

    const useAjax1 = useAjax({ loadingType: 'custom' });

    const [notificationContent, setNotificationContent] = React.useState<{
        [key: string]: ANY
    }>({});

    const onClickShowNotification = () => {
        if (!openNotifications) {
            setOpenNotifications(true);
            useAjax1.ajax({
                url: 'global/get-notification',
                method: 'POST',
                success: (result: {
                    posts: {
                        [key: string]: ANY
                    }
                }) => {
                    if (result.posts) {
                        setNotificationContent(result);
                        updateNotificationLocal(result.posts.total);
                    }
                }
            });
        }
    };

    const updateNotificationLocal = (count: number) => {

        if (count !== settings.notification_count) {
            dispatch(update({
                notification_count: count
            }));
        }

    };

    return (
        <>
            <Tooltip title={__("Notification")}>
                <IconButton
                    color="inherit"
                    onClick={onClickShowNotification}
                    ref={notificationRef}
                    size="large"
                >
                    <Badge badgeContent={settings.notification_count ?? 0} max={10} color="secondary">
                        <Icon icon="NotificationsNoneOutlined" />
                    </Badge>
                </IconButton>
            </Tooltip>
            <MenuPopper
                anchorEl={notificationRef.current}
                className={classes.searchPopper}
                open={openNotifications}
                onClose={() => setOpenNotifications(false)}
                paperProps={{
                    style: { width: 400, maxWidth: '100%' },
                    className: classes.searchPopperContent + ' custom_scroll'
                }}
            >
                <List>
                    {
                        useAjax1.open ?
                            [1, 2, 3, 4].map(item => (
                                <ListItem
                                    onClick={() => setOpenNotifications(false)}
                                    className={classes.notification}
                                    key={item}
                                >
                                    <div style={{ width: '100%' }}>
                                        <Skeleton variant="text" height={20} width="100%" />
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: "flex-start",
                                                width: '100%',
                                                gridGap: 16
                                            }}
                                        >
                                            <div style={{ height: '100%' }}>
                                                <Skeleton variant="circular" width={40} style={{ marginTop: 8 }} height={40} />
                                            </div>
                                            <div style={{ width: '100%' }}>
                                                <Skeleton variant="text" height={22} width="100%" />
                                                <Skeleton variant="text" style={{ transform: 'scale(1)' }} height={40} width="100%" />
                                            </div>
                                        </Box>
                                    </div>
                                </ListItem>
                            ))
                            :
                            (notificationContent.posts && notificationContent.posts.data && notificationContent.posts.data.length > 0) ?
                                <>
                                    <Box sx={{ flexGrow: 1, padding: 2 }}>
                                        <Typography variant="subtitle1">{__("Notifications")}</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {__('You have {{totalUnRead}} unread messages', {
                                                totalUnRead: notificationContent.posts.total
                                            })}
                                        </Typography>
                                    </Box>

                                    {/* <Typography style={{ padding: '8px 16px 16px' }} variant="h5">{__("Notifications")}</Typography> */}
                                    <Divider color="dark" sx={{ borderStyle: 'dashed' }} />
                                    {
                                        notificationContent.posts.data.map((item: {
                                            [key: string]: string,
                                            id: string,
                                            title: string,
                                            created_diffForHumans: string,
                                            message: string
                                        }) => (
                                            <ListItemButton
                                                key={item.id}
                                                href={'/post-type/admin_notification/edit?post_id=' + item.id}
                                                className={classes.notification}
                                            >

                                                <ListItemText
                                                    primary={item.title}
                                                    secondary={
                                                        <>
                                                            <Typography className={classes.notificationContent} variant="body1" component="span" >{item.message}</Typography>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    mt: 0.5,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                }}
                                                            >
                                                                <Icon size="small" icon="AccessTimeRounded" />&nbsp;{item.created_diffForHumans}
                                                            </Typography>
                                                        </>
                                                    }
                                                />

                                                {/* <Box
                                                            sx={{
                                                                width: '100%',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gridGap: 4,
                                                                margin: '8px 0'
                                                            }}
                                                        >
                                                            <Typography className={classes.notificationTitle} variant="subtitle2">{item.title}</Typography>
                                                            <Typography className={classes.notificationContent} variant="body1" >{item.message}</Typography>
                                                            <Typography variant="body2">{item.created_diffForHumans}</Typography>
                                                        </Box> */}
                                            </ListItemButton>
                                        ))
                                    }
                                    <Divider color="dark" sx={{ borderStyle: 'dashed' }} />
                                    <Box sx={{ p: 1, paddingBottom: 0 }}>
                                        <Button color="success" href="/post-type/admin_notification/list" fullWidth disableRipple>
                                            {__('View All')}
                                        </Button>
                                    </Box>
                                    {/* {
                                                notificationContent.posts.data.length > 0 &&
                                                <Link to={'/post-type/admin_notification/list'}>
                                                    <ListItem
                                                        button
                                                        onClick={() => setOpenNotifications(false)}
                                                    >
                                                        <ListItemText primary={__('See All ({{count}} unread)', { count: notificationContent.posts.total })} />
                                                    </ListItem>
                                                </Link>
                                            } */}
                                </>
                                :
                                <Link to={'/post-type/admin_notification/list'}>
                                    <ListItem
                                        button
                                        onClick={() => setOpenNotifications(false)}
                                        className={classes.notification}
                                    >
                                        <Typography style={{ width: '100%', padding: '46px 0', fontSize: 20, fontWeight: 100 }} align="center" variant="body1">{__("No messages found")}</Typography>
                                    </ListItem>
                                </Link>
                    }
                </List>
            </MenuPopper>
        </>
    );
}
