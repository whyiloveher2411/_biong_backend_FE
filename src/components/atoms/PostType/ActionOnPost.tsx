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
import { useNavigate } from "react-router-dom";
import MoreButton from "../MoreButton";
import { IActionPostType } from "components/pages/PostType/CreateData/Form";
import useAjax from "hook/useApi";
import useConfirmDialog from "hook/useConfirmDialog";
import ToolActionProgressDialog, { ToolActionProgressState } from "components/molecules/ToolActionProgressDialog";
import { groupActionsForMenu } from "./groupActionsForMenu";

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

    const useAjaxAction = useAjax();
    const confirm = useConfirmDialog();

    const openLinkFromResult = (result?: JsonFormat) => {
        if (!result || typeof result.open_link !== "string" || !result.open_link) {
            return;
        }

        window.open(result.open_link, "_blank");
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

            if (item.check_progress) {
                setProgressButton((prev) => ({
                    ...prev,
                    [index]: 0,
                }));
            }
            openRunningDialog();

            useAjaxAction.ajax({
                url: item.link_api,
                method: "POST",
                data: actionPayload,
                success: (result) => {
                    openLinkFromResult(result);
                    setLoadingStateButton((prev) => ({
                        ...prev,
                        [index]: false,
                    }));
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

            if (item.check_progress) {
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
                    {rowActions.length > 5 ? (
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
                                    color: action.color,
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
                        rowActions.map((action, index) => (
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
                                    color={action.color as ANY}
                                >
                                    {action.title}
                                </Button>
                            </Box>
                        ))
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
        </div>
    );
}

export default ActionOnPost;
