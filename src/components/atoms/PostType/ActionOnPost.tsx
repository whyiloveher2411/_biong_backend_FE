import { Theme } from '@mui/material';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import Tooltip from 'components/atoms/Tooltip';
import Hook from 'components/function/Hook';
import { __ } from 'helpers/i18n';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useNavigate } from 'react-router-dom';

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
}
function ActionOnPost({ post, setConfirmDelete, acctionPost, postType, fromLayout }: ActionOnPostProps) {

    const classes = useStyles();

    const navigate = useNavigate();

    const permission = usePermission(
        post.type + '_edit',
        post.type + '_delete',
        post.type + '_restore',
        post.type + '_trash'
    )
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
                                    style={{ color: '#337ab7' }}
                                    onClick={(e) => { e.stopPropagation(); }}
                                    href={post._permalink} target="_blank"
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
            <Hook hook="PostType/Action" screen="list" post={post} postType={postType} />
        </div>
    )
}

export default ActionOnPost
