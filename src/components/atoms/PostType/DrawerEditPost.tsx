import { useTheme } from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Box from 'components/atoms/Box';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Form from 'components/pages/PostType/CreateData/Form';
import { HandleUpdateDataProps } from 'hook/useForm';
import React from 'react';
import { DataResultApiProps } from '../fields/relationship_onetomany_show/Form';

function DrawerEditPost({ data, setData, open, onClose, handleSubmit, handleAfterDelete, children, openLoading }: {
    open: boolean,
    openLoading: boolean,
    onClose: () => void,
    data: DataResultApiProps,
    setData: React.Dispatch<React.SetStateAction<false | DataResultApiProps>>,
    handleSubmit: () => void,
    children?: ANY,
    handleAfterDelete?: () => void,
}) {

    const theme = useTheme();

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
            title={"Edit " + (data?.config?.title ?? "Post")}
            open={open}
            onClose={onClose}
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
