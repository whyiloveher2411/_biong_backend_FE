import { useTheme } from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Box from 'components/atoms/Box';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Form from 'components/pages/PostType/CreateData/Form';
import { HandleUpdateDataProps } from 'hook/useForm';
import useAjax from 'hook/useApi';
import React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { DataResultApiProps } from '../fields/relationship_onetomany_show/Form';

function DrawerEditPost({ data, setData, open, onClose, handleSubmit, handleAfterDelete, children, openLoading, headerAction, showCopyPostJson }: {
    open: boolean,
    openLoading: boolean,
    onClose: () => void,
    data: DataResultApiProps,
    setData: React.Dispatch<React.SetStateAction<false | DataResultApiProps>>,
    handleSubmit: () => void,
    children?: ANY,
    handleAfterDelete?: () => void,
    headerAction?: React.ReactNode,
    showCopyPostJson?: boolean,
}) {

    const theme = useTheme();
    const { ajax } = useAjax();
    const [refreshingPost, setRefreshingPost] = React.useState(false);

    const reloadPostFromServer = React.useCallback(() => {
        const postId = data?.post?.id;
        const postType = data?.type;
        if (!postId || !postType) {
            return;
        }

        setRefreshingPost(true);
        ajax({
            url: `post-type/detail/${postType}/${postId}`,
            method: 'POST',
            success: (result: CreatePostTypeData) => {
                unstable_batchedUpdates(() => {
                    setRefreshingPost(false);
                    if (!result.post) {
                        return;
                    }
                    setData((prev) => {
                        if (!prev) {
                            return prev;
                        }
                        return {
                            ...prev,
                            post: result.post,
                            author: result.author ?? prev.author,
                            editor: result.editor ?? prev.editor,
                            updatePost: new Date(),
                        };
                    });
                });
            },
            error: () => {
                setRefreshingPost(false);
            },
        });
    }, [ajax, data?.post?.id, data?.type, setData]);

    const rawTitle = data?.post?.title;

    let postTitle: ANY = '';

    let parsedTitle: ANY = rawTitle;

    if (typeof rawTitle === 'string') {
        try {
            const json = JSON.parse(rawTitle);
            parsedTitle = json;
        } catch (error) {
            parsedTitle = rawTitle;
        }
    }

    if (typeof parsedTitle === 'object' && parsedTitle !== null) {
        if (Array.isArray(parsedTitle)) {
            postTitle = parsedTitle[0];
        } else {
            const values = Object.values(parsedTitle);
            postTitle = values[0];
        }
    } else {
        postTitle = parsedTitle;
    }

    const dialogContentRaw = data?.config?.dialogContent as Record<string, ANY> | undefined;
    const { disableCloseOnSave: _omitDisableCloseOnSave, ...dialogContentForDrawer } = dialogContentRaw ?? {};
    void _omitDisableCloseOnSave;

    const onUpdateData = (value: ANY, key: ANY) => {

        setData(prev => {

            if (prev) {
                if (value instanceof Function) {
                    return { ...value(prev) };
                } else {
                    if (typeof key === 'object' && key !== null) {
                        prev = {
                            ...prev,
                            ...key
                        };
                    } else {
                        prev[key as keyof typeof prev] = value;
                    }
                }

                return { ...prev };
            }
            return prev;

        });
    }

    return (
        <DrawerCustom
            restDialogContent={
                {
                    style: {
                        background: theme.palette.body.background,
                        paddingTop: 0,
                    }
                }
            }
            width={1300}
            {...dialogContentForDrawer}
            title={( (data.post?.id ? "Edit " : "Create ") + (data?.config?.title ?? "Post ") + (postTitle ? ` - "${postTitle}" --- ID: [${data?.post?.id}]` : ""))}
            open={open}
            onClose={onClose}
            headerAction={headerAction}
        >
            <Box
                sx={{
                    paddingTop: 3,
                    paddingBottom: 3,
                }}
            >
                {data &&
                    <Form
                        data={data as CreatePostTypeData}
                        postType={data.type}
                        onUpdateData={onUpdateData as HandleUpdateDataProps}
                        handleSubmit={handleSubmit}
                        handleAfterDelete={handleAfterDelete}
                        open={openLoading}
                        showCopyPostJson={showCopyPostJson}
                        onRefreshPost={reloadPostFromServer}
                        refreshingPost={refreshingPost}
                    />
                }
            </Box>
            {children}
        </DrawerCustom>
    )
}

export default DrawerEditPost
