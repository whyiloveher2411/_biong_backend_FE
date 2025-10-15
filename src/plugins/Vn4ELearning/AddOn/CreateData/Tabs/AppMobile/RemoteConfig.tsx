import React from "react";
import Box from "components/atoms/Box";
import useAjax from "hook/useApi";
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import FieldForm from "components/atoms/fields/FieldForm";
import { LoadingButton } from "@mui/lab";
import { Card, CardContent, CircularProgress, InputAdornment, IconButton, Tooltip } from "@mui/material";
import { Warning } from "@mui/icons-material";

function RemoteConfig({ data }: { data: CreatePostTypeData }) {

    const useApi = useAjax();
    const [remoteConfig, setRemoteConfig] = React.useState<JsonFormat>({});
    const [templates, setTemplates] = React.useState<JsonFormat>({});
    const [isLoadData, setIsLoadData] = React.useState<boolean>(false);

    const handleGetData = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/remote-config/remote-config",
            method: "POST",
            data: {
                action: 'get',
                id: data.post.id,
            },
            success: (result) => {
                setRemoteConfig(result.data);
                setTemplates(result.templates);
                setIsLoadData(true);
            },
        });
    }

    React.useEffect(() => {
        handleGetData();
    }, []);

    const handleUpdate = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/remote-config",
            method: "POST",
            data: {
                action: 'update',
                id: data.post.id,
                data: remoteConfig
            },
            success: (result) => {
                //    
            },
        });

    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
            }}
        >
            <Card>
                <CardContent
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                    }}
                >
                    {
                        isLoadData ? (
                            <>
                                {/* Render các trường có trong template */}
                                {Object.keys(templates).map((key: string) => (
                                    <FieldForm
                                        component={templates[key].view ? templates[key].view : 'text'}
                                        config={{
                                            ...templates[key],
                                        }}
                                        name={key}
                                        post={remoteConfig}
                                        onReview={(value) => {
                                            setRemoteConfig((prev) => ({
                                                ...prev,
                                                [key]: value,
                                            }))
                                        }}
                                    />
                                ))}
                                
                                {/* Render các trường không có trong template */}
                                {Object.keys(remoteConfig).filter(key => !templates[key]).map((key: string) => (
                                    <FieldForm
                                        component="textarea"
                                        config={{
                                            title: `${key} ⚠️ (Chưa config template)`,
                                            view: "textarea",
                                            placeholder: "Giá trị hiện tại...",
                                            inputProps: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <Tooltip title="Trường chưa được config template - hiển thị dưới dạng textarea">
                                                            <IconButton size="small" color="warning">
                                                                <Warning fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                        name={key}
                                        post={remoteConfig}
                                        onReview={(value) => {
                                            setRemoteConfig((prev) => ({
                                                ...prev,
                                                [key]: value,
                                            }))
                                        }}
                                    />
                                ))}
                            </>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
                                <CircularProgress size={20} />
                            </Box>
                        )
                    }
                </CardContent>
            </Card>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <LoadingButton loading={useApi.open} variant="contained" color="success" onClick={handleUpdate}>
                    Update
                </LoadingButton>
            </Box>
        </Box>
    );
}

export default RemoteConfig;
