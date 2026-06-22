import { Box, Button, Theme } from "@mui/material";
import Icon from "components/atoms/Icon";
import IconButton from "components/atoms/IconButton";
import makeCSS from "components/atoms/makeCSS";
import Tooltip from "components/atoms/Tooltip";
import Hook from "components/function/Hook";
import { ShowPostTypeData } from "components/pages/PostType/ShowData";
import { __ } from "helpers/i18n";
import { usePermission } from "hook/usePermission";
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MoreButton from "../MoreButton";
import { IActionPostType } from "components/pages/PostType/CreateData/Form";
import useAjax from "hook/useApi";
import useConfirmDialog from "hook/useConfirmDialog";
import ToolActionProgressDialog, { ToolActionProgressState } from "components/molecules/ToolActionProgressDialog";
import { groupActionsForMenu } from "./groupActionsForMenu";
import PostTypeClientActionDrawers, {
    buildCreatePostTypeDataFromListRow,
    PostTypeClientDrawerAction,
} from "./PostTypeClientActionDrawers";
import { openMarketingXaiTtsWorkflow } from "helpers/marketingXaiTtsWorkflow";
import { openExternalTabViaExtension } from "helpers/openExternalTabViaExtension";
import { openMarketingPostAudioUrls } from "helpers/marketingPostAudioUrls";
import {
    getPostTypeActionButtonColorProps,
    resolvePostTypeColor,
} from "helpers/postTypeColor";
import {
    parseShortVideoEditIdFromSearch,
    setShortVideoEditIdInSearchParams,
} from "helpers/shortVideoEditDrawerUrl";

const useStyles = makeCSS((theme: Theme) => ({
    actionPost: {
        position: "absolute",
        top: "50%",
        right: "0",
        minWidth: "100%",
        paddingLeft: 10,
        backgroundColor: theme.palette.background.default,
        transform: "translateY(-50%)",
        opacity: 0,
        pointerEvents: "none",
        display: "flex",
        zIndex: 9999,
        justifyContent: "flex-end",
        "&>*": {
            minWidth: "auto",
            "&:last-child": {
                border: "none",
            },
        },
    },
    trash: {
        color: "#a00",
    },
    restore: {
        color: "#43a047",
    },
    delete: {
        color: "red",
    },
}));

interface ActionOnPostProps {
    post: JsonFormat;
    fromLayout: string;
    setConfirmDelete: React.Dispatch<React.SetStateAction<number>>;
    acctionPost: (
        payload: JsonFormat,
        success?: ((result: JsonFormat) => void) | undefined
    ) => void;
    postType: string;
    config: ShowPostTypeData["config"];
}
function ActionOnPost({
    post,
    setConfirmDelete,
    acctionPost,
    postType,
    fromLayout,
    config,
}: ActionOnPostProps) {
    const classes = useStyles();

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const permission = usePermission(
        post.type + "_edit",
        post.type + "_delete",
        post.type + "_restore",
        post.type + "_trash"
    );

    const rowActions: IActionPostType[] | undefined = Array.isArray(post._row_actions)
        ? (post._row_actions as IActionPostType[])
        : config.actions;

    const [loadingStateButton, setLoadingStateButton] = React.useState<{
        [key: number]: boolean;
    }>({});
    const [progressButton, setProgressButton] = React.useState<{
        [key: number]: number;
    }>({});
    const [toolProgressDialog, setToolProgressDialog] = React.useState<ToolActionProgressState>({
        open: false,
        title: "",
        progress: 0,
        status: "idle",
    });
    const retryToolActionRef = React.useRef<(() => void) | null>(null);
    const [activeClientDrawer, setActiveClientDrawer] = React.useState<PostTypeClientDrawerAction | null>(null);

    const drawerData = React.useMemo(
        () => buildCreatePostTypeDataFromListRow(post, postType, config),
        [post, postType, config]
    );

    const closeClientDrawer = React.useCallback(() => {
        setActiveClientDrawer(null);
        const editId = parseShortVideoEditIdFromSearch(searchParams.toString());
        if (editId && Number(post.id) === editId) {
            const next = setShortVideoEditIdInSearchParams(searchParams, null);
            setSearchParams(next, { replace: true });
        }
    }, [post.id, searchParams, setSearchParams]);

    React.useEffect(() => {
        const editId = parseShortVideoEditIdFromSearch(searchParams.toString());
        if (!editId || Number(post.id) !== editId) {
            return;
        }
        setActiveClientDrawer('drawer:ShortVideoEdit');
    }, [post.id, searchParams]);

    const useAjaxAction = useAjax();
    const confirm = useConfirmDialog();

    const openLinkFromResult = (result?: JsonFormat, item?: IActionPostType) => {
        const link = typeof result?.open_link === "string" ? result.open_link.trim() : "";
        if (!link) {
            if (item?.open_browser_tab) {
                window.alert(
                    result?.message ||
                        __("Không nhận được link mở xAI Playground. Kiểm tra extension Chrome đã bật.")
                );
            }
            return;
        }

        openExternalTabViaExtension(link);
    };

    const maybeRefreshAfterAction = (item: IActionPostType) => {
        if (item.auto_refresh) {
            acctionPost({});
        }
    };

    const handleActionEvent = (
        id: ID,
        item: IActionPostType,
        index: number
    ) => {
        if (item.client_action === 'open_post_audios') {
            openMarketingPostAudioUrls(post);
            return;
        }

        if (item.client_action === 'open_post_link') {
            const detailLink = String(post.link || '').trim();
            if (!detailLink) {
                window.alert(__('Không có link bài viết'));
                return;
            }
            openExternalTabViaExtension(detailLink);
            return;
        }

        if (item.client_action?.startsWith('drawer:')) {
            if (!id) {
                return;
            }
            setActiveClientDrawer(item.client_action);
            if (item.client_action === 'drawer:ShortVideoEdit') {
                const next = setShortVideoEditIdInSearchParams(searchParams, Number(id));
                setSearchParams(next, { replace: true });
            }
            return;
        }

        if (item.client_action === 'xai_tts:open') {
            if (!id) {
                return;
            }
            const runXaiTts = async () => {
                setLoadingStateButton((prev) => ({
                    ...prev,
                    [index]: true,
                }));
                try {
                    await openMarketingXaiTtsWorkflow({
                        postId: Number(id),
                    });
                    maybeRefreshAfterAction(item);
                } catch (e) {
                    window.alert(e instanceof Error ? e.message : String(e));
                } finally {
                    setLoadingStateButton((prev) => ({
                        ...prev,
                        [index]: false,
                    }));
                }
            };
            if (item.skip_confirm) {
                void runXaiTts();
            } else {
                confirm.onConfirm(() => {
                    void runXaiTts();
                }, {
                    title: item.confirm?.title,
                    icon: item.confirm?.icon,
                    numberConfirm: item.confirm?.number_confirm,
                    message: item.confirm?.message || item.confirm_message || __('Bạn có chắc muốn "{{toolTitle}}" không?', {
                        toolTitle: item.title,
                    }),
                });
            }
            return;
        }

        const actionPayload = {
            id,
            post_type: postType || post.type,
        };
        const showProgressDialog = !item.skip_confirm;

        const openRunningDialog = () => {
            if (!showProgressDialog) {
                return;
            }
            setToolProgressDialog({
                open: true,
                title: item.title,
                progress: 0,
                status: "running",
            });
        };

        const updateDialogProgress = (progress: number) => {
            if (!showProgressDialog) {
                return;
            }
            setToolProgressDialog((prev) => ({
                ...prev,
                progress,
            }));
        };

        const markDialogDone = () => {
            if (!showProgressDialog) {
                return;
            }
            setToolProgressDialog((prev) => ({
                ...prev,
                progress: 100,
                status: "done",
            }));
        };

        const markDialogError = () => {
            if (!showProgressDialog) {
                return;
            }
            setToolProgressDialog((prev) => ({
                ...prev,
                status: "error",
            }));
        };

        const runApi = () => {
            setLoadingStateButton((prev) => ({
                ...prev,
                [index]: true,
            }));

            if (item.check_progress && !item.open_browser_tab && !item.skip_progress) {
                setProgressButton((prev) => ({
                    ...prev,
                    [index]: 0,
                }));
            }
            if (!item.open_browser_tab && !item.skip_progress) {
                openRunningDialog();
            }

            useAjaxAction.ajax({
                url: item.link_api,
                method: "POST",
                data: actionPayload,
                success: (result) => {
                    openLinkFromResult(result, item);
                    setLoadingStateButton((prev) => ({
                        ...prev,
                        [index]: false,
                    }));
                    if (item.open_browser_tab || item.skip_progress) {
                        markDialogDone();
                        maybeRefreshAfterAction(item);
                        return;
                    }
                    if (!item.check_progress) {
                        markDialogDone();
                        maybeRefreshAfterAction(item);
                    }
                },
                error: () => {
                    setLoadingStateButton((prev) => ({
                        ...prev,
                        [index]: false,
                    }));
                    markDialogError();
                },
            });

            if (item.check_progress && !item.open_browser_tab && !item.skip_progress) {
                const callCheckProgress = () => {
                    useAjaxAction.ajax({
                        url: item.link_api,
                        method: "POST",
                        data: {
                            ...actionPayload,
                            check_progress: true,
                        },
                        success: (result) => {
                            if (result.progress !== undefined) {
                                setProgressButton((prev) => ({
                                    ...prev,
                                    [index]: result.progress,
                                }));
                                updateDialogProgress(result.progress);
                                setTimeout(() => {
                                    callCheckProgress();
                                }, 1000);
                            } else {
                                setProgressButton((prev) => {
                                    delete prev[index];
                                    return { ...prev };
                                });
                                setLoadingStateButton((prev) => ({
                                    ...prev,
                                    [index]: false,
                                }));
                                markDialogDone();
                                maybeRefreshAfterAction(item);
                            }
                        },
                        error: () => {
                            setLoadingStateButton((prev) => ({
                                ...prev,
                                [index]: false,
                            }));
                            markDialogError();
                        },
                    });
                };

                callCheckProgress();
            }
        };

        const callApi = () => {
            retryToolActionRef.current = runApi;
            runApi();
        };

        if (item.skip_confirm) {
            callApi();
        } else {
            confirm.onConfirm(callApi, {
                title: item.confirm?.title,
                icon: item.confirm?.icon,
                numberConfirm: item.confirm?.number_confirm,
                message: item.confirm?.message || item.confirm_message || __('Bạn có chắc muốn "{{toolTitle}}" không?', {
                    toolTitle: item.title,
                }),
            });
        }
    };

    const handleRetryToolAction = () => {
        if (toolProgressDialog.status === "running") {
            return;
        }
        if (retryToolActionRef.current) {
            retryToolActionRef.current();
        }
    };

    const handleCloseToolProgressDialog = () => {
        if (toolProgressDialog.status === "running") {
            return;
        }

        setToolProgressDialog({
            open: false,
            title: "",
            progress: 0,
            status: "idle",
        });
        retryToolActionRef.current = null;
    };

    return (
        <div className={classes.actionPost + " actionPost"}>
             {rowActions?.length ? (
                <Box
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    sx={{
                        display: "flex",
                        gap: 1,
                        pr: 1,
                    }}
                >
                    {rowActions.length > 15 ? (
                        <MoreButton
                            actions={(() => {
                                return groupActionsForMenu(rowActions.map((action, index) => ({
                                    key: `${action.link_api || action.title}-${index}`,
                                    group: action.group,
                                    title:
                                        action.title +
                                        (progressButton[index] !== undefined
                                            ? ` (${progressButton[index]}%)`
                                            : ""),
                                    color: resolvePostTypeColor(action.color),
                                    icon: loadingStateButton[index]
                                        ? "LoopRounded"
                                        : undefined,
                                    action: (e) => {
                                        e.stopPropagation();
                                        handleActionEvent(
                                            post.id,
                                            action,
                                            index
                                        );
                                    },
                                })));
                            })()}
                        >
                            <IconButton size="large">
                                <Icon icon="MoreVert" />
                            </IconButton>
                        </MoreButton>
                    ) : (
                        rowActions.map((action, index) => {
                            const actionColorProps = getPostTypeActionButtonColorProps(action.color);

                            return (
                            <Box key={index} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Button
                                    key={index}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();

                                        if(action.link) {
                                            navigate(action.link);
                                            return;
                                        }

                                        handleActionEvent(post.id, action, index);
                                    }}
                                    variant="contained"
                                    color={actionColorProps.color}
                                    sx={actionColorProps.sx}
                                >
                                    {action.title}
                                </Button>
                            </Box>
                            );
                        })
                    )}
                </Box>
            ) : null}
            {/* {permission[post.type + "_edit"] && (
                <Tooltip title={__("Edit")} aria-label="edit">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                                `/post-type/${post.type}/edit?post_id=${post.id}`
                            );
                        }}
                        aria-label={__("Edit")}
                        size="large"
                    >
                        <Icon icon="EditOutlined" />
                    </IconButton>
                </Tooltip>
            )} */}
            {post.status === "trash" ? (
                <>
                    {permission[post.type + "_delete"] && (
                        <Tooltip
                            title={__("Permanently Deleted")}
                            aria-label="permanently-deleted"
                        >
                            <IconButton
                                className={classes.delete}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDelete(post.id);
                                }}
                                aria-label={__("Permanently Deleted")}
                                size="large"
                            >
                                <Icon icon="ClearRounded" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {permission[post.type + "_restore"] && (
                        <Tooltip title={__("Restore")} aria-label="restore">
                            <IconButton
                                className={classes.restore}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    acctionPost({ restore: [post.id] });
                                }}
                                aria-label={__("Restore")}
                                size="large"
                            >
                                <Icon icon="RestoreRounded" />
                            </IconButton>
                        </Tooltip>
                    )}
                </>
            ) : (
                <>
                    {Boolean(post._permalink) && (
                        <Tooltip title={__("View post")} aria-label="view-post">
                            <IconButton
                                size="large"
                                sx={{ color: "#337ab7" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(post._permalink, "_blank");
                                }}
                            >
                                <Icon icon="LinkRounded" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {permission[post.type + "_trash"] && (
                        <Tooltip title={__("Trash")} aria-label="Trash">
                            <IconButton
                                className={classes.trash}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    acctionPost({ trash: [post.id] });
                                }}
                                aria-label="Trash"
                                size="large"
                            >
                                <Icon icon="DeleteRounded" />
                            </IconButton>
                        </Tooltip>
                    )}
                </>
            )}
           
            <Box
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {confirm.component}
                <ToolActionProgressDialog
                    state={toolProgressDialog}
                    onClose={handleCloseToolProgressDialog}
                    onRetry={handleRetryToolAction}
                />
            </Box>
            <Hook
                hook="PostType/Action"
                screen="list"
                post={post}
                postType={postType}
            />
            <PostTypeClientActionDrawers
                postType={postType || String(post.type)}
                data={drawerData}
                activeDrawer={activeClientDrawer}
                onClose={closeClientDrawer}
                onRefreshPost={() => acctionPost({})}
            />
        </div>
    );
}

export default ActionOnPost;
