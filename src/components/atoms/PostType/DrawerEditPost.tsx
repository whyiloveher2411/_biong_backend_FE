import { useTheme } from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Box from 'components/atoms/Box';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Form from 'components/pages/PostType/CreateData/Form';
import { HandleUpdateDataProps } from 'hook/useForm';
import React from 'react';
import { DataResultApiProps } from '../fields/relationship_onetomany_show/Form';

function DrawerEditPost({ data, setData, open, onClose, handleSubmit, handleAfterDelete, children, openLoading, headerAction }: {
    open: boolean,
    openLoading: boolean,
    onClose: () => void,
    data: DataResultApiProps,
    setData: React.Dispatch<React.SetStateAction<false | DataResultApiProps>>,
    handleSubmit: () => void,
    children?: ANY,
    handleAfterDelete?: () => void,
    headerAction?: React.ReactNode,
}) {

    const theme = useTheme();

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
            {...data?.config?.dialogContent}
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
                    />
                }
            </Box>
            {children}
        </DrawerCustom>
    )
}

export default DrawerEditPost
