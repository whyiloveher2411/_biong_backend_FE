import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Box from 'components/atoms/Box';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import LoadingButton from 'components/atoms/LoadingButton';
import useAjax from 'hook/useApi';
import FieldForm from 'components/atoms/fields/FieldForm';
import Card from 'components/atoms/Card';
import CardHeader from 'components/atoms/CardHeader';
import CardContent from 'components/atoms/CardContent';

function AppLocalNotification({ data }: { data: CreatePostTypeData }) {
    const useApi = useAjax();

    const handleSyncMessage = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/local-notification/sync",
            method: "POST",
            data: {
                action: "sync",
                app_id: data.post.id,
            },
            success: (result) => {
                // 
            },
        });
    };

    return (
        <Card>
            <CardHeader
                sx={{ '.MuiCardHeader-action': { alignSelf: 'center' } }}
                title={
                    <Typography variant="h5" gutterBottom>
                        App Local Notification
                    </Typography>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary">
                        Quản lý thông báo nội bộ
                    </Typography>
                }
                action={
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <LoadingButton
                            variant="contained"
                            color="primary"
                            onClick={handleSyncMessage}
                            loading={useApi.open}
                            size="small"
                        >
                            Sync message
                        </LoadingButton>
                    </Box>
                }
            />
            <Divider />
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "App Local Notification",
                        object: "app_local_notification",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"app_mobile"}
                    onReview={() => { }} // eslint-disable-line @typescript-eslint/no-empty-function
                />
            </CardContent>
        </Card>
    )
}

export default AppLocalNotification
