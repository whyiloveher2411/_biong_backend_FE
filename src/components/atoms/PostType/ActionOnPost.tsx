import { Box, Theme } from '@mui/material';
import Icon, { IconFormat } from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import Tooltip from 'components/atoms/Tooltip';
import Hook from 'components/function/Hook';
import { ShowPostTypeData } from 'components/pages/PostType/ShowData';
import { __ } from 'helpers/i18n';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MoreButton from '../MoreButton';
import { IActionPostType } from 'components/pages/PostType/CreateData/Form';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';

const useStyles = makeCSS((theme: Theme) => ({
    actionPost: {
        position: 'absolute',
        top: '50%',
        right: '0',
        minWidth: '100%',
        backgroundColor: theme.palette.background.default,
        transform: 'translateY(-50%)',
        opacity: 0,
        display: 'flex',
        zIndex: 9999,
        justifyContent: 'flex-end',
        '&>*': {
            minWidth: 'auto',
            '&:last-child': {
                border: 'none',
            }
        },
    },
    trash: {
        color: '#a00'
    },
    restore: {
        color: '#43a047'
    },
    delete: {
        color: 'red',
    },
}))

interface ActionOnPostProps {
    post: JsonFormat,
    fromLayout: string,
    setConfirmDelete: React.Dispatch<React.SetStateAction<number>>,
    acctionPost: (payload: JsonFormat, success?: ((result: JsonFormat) => void) | undefined) => void,
    postType: string,
    config: ShowPostTypeData['config'],
}
function ActionOnPost({ post, setConfirmDelete, acctionPost, postType, fromLayout, config }: ActionOnPostProps) {

    const classes = useStyles();

    const navigate = useNavigate();

    const permission = usePermission(
        post.type + '_edit',
        post.type + '_delete',
        post.type + '_restore',
        post.type + '_trash'
    )

    const [loadingStateButton, setLoadingStateButton] = React.useState<{ [key: number]: boolean }>({});
    const [progressButton, setProgressButton] = React.useState<{ [key: number]: number }>({});

    const useAjaxAction = useAjax();
    const confirm = useConfirmDialog();

    const handleActionEvent = (id: ID, item: IActionPostType, index: number) => {
        const callApi = () => {
            setLoadingStateButton(prev => ({
                ...prev,
                [index]: true,
            }));

            setProgressButton(prev => ({
                ...prev,
                [index]: 0
            }))

            useAjaxAction.ajax({
                url: item.link_api,
                method: 'POST',
                data: {
                    id
                },
                success: () => {
                    setLoadingStateButton(prev => ({
                        ...prev,
                        [index]: false,
                    }));
                }
            });

            if (item.check_progress) {

                const callCheckProgress = () => {
                    useAjaxAction.ajax({
                        url: item.link_api,
                        method: 'POST',
                        data: {
                            id,
                            check_progress: true
                        },
                        success: (result) => {
                            if (result.progress !== undefined) {
                                setProgressButton(prev => ({
                                    ...prev,
                                    [index]: result.progress
                                }));
                                setTimeout(() => {
                                    callCheckProgress();
                                }, 1000);
                            } else {
                                setProgressButton(prev => {
                                    delete prev[index];
                                    return { ...prev };
                                })
                            }
                        }
                    });
                };

                callCheckProgress();
            }
        };

        if (item.confirm_message) {
            confirm.onConfirm(callApi, {
                message: item.confirm_message
            });
            return;
        }

        callApi();

    }

    return (
        <div className={classes.actionPost + ' actionPost'}>

            {
                permission[post.type + '_edit'] &&
                <Tooltip title={__('Edit')} aria-label="edit">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/post-type/${post.type}/edit?post_id=${post.id}`);
                        }}
                        aria-label={__('Edit')}
                        size="large"
                    >
                        <Icon icon="EditOutlined" />
                    </IconButton>
                </Tooltip>
            }
            {
                post.status === 'trash' ?
                    <>
                        {
                            permission[post.type + '_delete'] &&
                            <Tooltip title={__('Permanently Deleted')} aria-label="permanently-deleted">
                                <IconButton
                                    className={classes.delete}
                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(post.id) }}
                                    aria-label={__('Permanently Deleted')}
                                    size="large"
                                >
                                    <Icon icon="ClearRounded" />
                                </IconButton>
                            </Tooltip>
                        }
                        {
                            permission[post.type + '_restore'] &&
                            <Tooltip title={__('Restore')} aria-label="restore">
                                <IconButton
                                    className={classes.restore}
                                    onClick={(e) => { e.stopPropagation(); acctionPost({ restore: [post.id] }); }}
                                    aria-label={__('Restore')}
                                    size="large"
                                >
                                    <Icon icon="RestoreRounded" />
                                </IconButton>
                            </Tooltip>
                        }
                    </>
                    :
                    <>
                        {
                            Boolean(post._permalink) &&
                            <Tooltip title={__('View post')} aria-label="view-post">
                                <IconButton
                                    size="large"
                                    sx={{ color: '#337ab7' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(post._permalink, '_blank');
                                    }}
                                >
                                    <Icon icon="LinkRounded" />
                                </IconButton>
                            </Tooltip>
                        }
                        {
                            permission[post.type + '_trash'] &&
                            <Tooltip title={__('Trash')} aria-label="Trash">
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
                        }
                    </>
            }
            {
                config.actions ?
                    <Box
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <MoreButton
                            actions={
                                (() => {
                                    const menuMoreAction: Array<{
                                        [key: string]: {
                                            title: string,
                                            action: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void,
                                            icon?: IconFormat
                                        }
                                    }> = []
                                    config.actions.forEach((action, index) => {
                                        menuMoreAction.push({
                                            [action.link_api]: {
                                                title: action.title + (progressButton[index] !== undefined ? ` (${progressButton[index]}%)` : ''),
                                                icon: loadingStateButton[index] ? 'LoopRounded' : undefined,
                                                action: (e) => {
                                                    e.stopPropagation();
                                                    handleActionEvent(post.id, action, index);
                                                },
                                            }
                                        })
                                    })
                                    return menuMoreAction;
                                })()
                            }

                        >
                            <IconButton
                                size="large"
                            >
                                <Icon icon="MoreVert" />
                            </IconButton>
                        </MoreButton>
                    </Box>
                    :
                    null
            }
            <Box
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {confirm.component}
            </Box>
            <Hook hook="PostType/Action" screen="list" post={post} postType={postType} />
        </div >
    )
}

export default ActionOnPost
