import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Box from 'components/atoms/Box';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import LoadingButton from 'components/atoms/LoadingButton';
import Button from 'components/atoms/Button';
import useAjax from 'hook/useApi';
import FieldForm from 'components/atoms/fields/FieldForm';
import Card from 'components/atoms/Card';
import CardHeader from 'components/atoms/CardHeader';
import CardContent from 'components/atoms/CardContent';
import { useSnackbar } from 'notistack';

function copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
}

function AppLocalNotification({ data }: { data: CreatePostTypeData }) {
    const useApi = useAjax();
    const { enqueueSnackbar } = useSnackbar();

    const handleSyncMessage = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/local-notification/sync",
            method: "POST",
            data: {
                action: "sync",
                app_id: data.post.id,
            },
            success: (result: { link?: string }) => {
                const link = result?.link;
                if (typeof link !== 'string' || !link) {
                    return;
                }
                enqueueSnackbar(
                    {
                        content: 'Đồng bộ tin nhắn thành công',
                        type: 'custom',
                        custom: (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Liên kết đã sẵn sàng. Nhấn nút bên dưới để sao chép.
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                        void copyTextToClipboard(link).then(() => {
                                            useApi.showMessage('Đã sao chép liên kết', 'success');
                                        });
                                    }}
                                >
                                    Sao chép liên kết
                                </Button>
                            </Box>
                        ),
                        options: {
                            preventDuplicate: false,
                            variant: 'success',
                            anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                        },
                    },
                    {
                        preventDuplicate: false,
                        variant: 'success',
                        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                    }
                );
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
