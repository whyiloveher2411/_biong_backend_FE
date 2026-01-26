import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Box from 'components/atoms/Box';
import Typography from 'components/atoms/Typography';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import useAjax from 'hook/useApi';
import Card from 'components/atoms/Card';
import DrawerCustom from 'components/molecules/DrawerCustom';
import CardHeader from 'components/atoms/CardHeader';
import CardContent from 'components/atoms/CardContent';

function Asset({ data }: { data: CreatePostTypeData }) {

    const useApi = useAjax();

    const [open, setOpen] = React.useState(false);

    const [type, setType] = React.useState("lottie");

    const [assetJson, setAssetJson] = React.useState("");

    const handleClose = () => {
        setOpen(false);
    };

    const handleSaveAsset = () => {
        useApi.ajax({
            url: type === "lottie" ? "plugin/vn4-e-learning/app-mobile/asset/submit-lottie" : "plugin/vn4-e-learning/app-mobile/asset/submit-image",
            method: "POST",
            data: {
                action: type === "lottie" ? "submit-lottie" : "submit-image",
                app_id: data.post.id,
                asset_json: assetJson,
            },
            success: (result) => {
                // 
            },
        });
    };

    const handleSyncAsset = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/asset/sync",
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
                title={
                    <Typography variant="h5" gutterBottom>
                        Asset
                    </Typography>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary">
                        Quản lý tài nguyên ứng dụng
                    </Typography>
                }
            />
            <Divider />
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box
                        sx={{ display: "flex", gap: 1 }}
                    >
                        <Button variant="outlined" color="primary" onClick={() => { setOpen(true); setType("lottie"); }}>
                            Load Lottie
                        </Button>
                        <Button variant="outlined" color="primary" onClick={() => { setOpen(true); setType("image"); }}>
                            Load Image
                        </Button>
                    </Box>
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        onClick={handleSyncAsset}
                        loading={useApi.open}
                    >
                        Sync asset
                    </LoadingButton>
                </Box>
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Asset",
                        object: "app_asset",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"app_mobile"}
                    onReview={(value) => { setAssetJson(value); }} //eslint-disable-line
                />
                <DrawerCustom
                    open={open} onClose={handleClose}
                    title="Asset Json"
                    activeOnClose
                    children={<Box
                        sx={{
                            height: "100%",
                            overflow: "auto",
                            py: 3
                        }}
                    >
                        <FieldForm
                            component={"textarea"}
                            config={{
                                title: "Asset",
                                object: "app_asset",
                                field: "app_mobile",
                                view: "relationship_onetomany_show",
                                paginate: {
                                    rowsPerPage: 10,
                                },
                            }}
                            post={data.post}
                            name={"app_mobile"}
                            onReview={(value) => { setAssetJson(value); }} //eslint-disable-line
                        />
                    </Box>}
                    headerAction={
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Button variant="contained" color="success" onClick={handleSaveAsset}>
                                Subscribe
                            </Button>
                        </Box>
                    }
                />
            </CardContent>
        </Card>
    )
}

export default Asset