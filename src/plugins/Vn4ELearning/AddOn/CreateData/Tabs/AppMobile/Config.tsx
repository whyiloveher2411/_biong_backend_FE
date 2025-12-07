import React from "react";
import Box from "components/atoms/Box";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/FieldForm";
import useApi from "hook/useApi";
import Card from "components/atoms/Card";
import CardContent from "components/atoms/CardContent";
import LoadingButton from "components/atoms/LoadingButton";
import Typography from "components/atoms/Typography";
import Alert from "components/atoms/Alert";

function Config({ data }: { data: CreatePostTypeData }) {
    const [serviceAccountGoogle, setServiceAccountGoogle] =
        React.useState<string>("");
    const [projectId, setProjectId] = React.useState<string>("");
    const apiPostConfig = useApi();

    const handleGetData = () => {
        apiPostConfig.ajax({
            url: "plugin/vn4-e-learning/app-mobile/config/get",
            method: "POST",
            data: {
                action: "GET_CONFIG",
                id: data.post.id,
            },
            success: (result: {
                service_account_google: string;
                project_id: string;
            }) => {
                setServiceAccountGoogle(result.service_account_google);
                setProjectId(result.project_id);
            },
        });
    };

    const handleUpdate = () => {
        apiPostConfig.ajax({
            url: "plugin/vn4-e-learning/app-mobile/config/update",
            method: "POST",
            data: {
                action: "UPDATE_CONFIG",
                id: data.post.id,
                service_account_google: serviceAccountGoogle,
                project_id: projectId,
            },
            success: (result) => {
                //
            },
        });
    };

    React.useEffect(() => {
        handleGetData();
    }, []);

    return (
        <>
            <Card>
                <CardContent>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                      <Typography variant="h3">
                        Connect to Google Cloud
                      </Typography>
                        <FieldForm
                            data={data}
                            component="json"
                            config={{
                                title: "Service Account Google",
                            }}
                            name="service_account_google"
                            post={{
                                service_account_google: serviceAccountGoogle,
                            }}
                            onReview={(service_account_google) => {
                                setServiceAccountGoogle(service_account_google);
                            }}
                        />
                        <Alert severity="info">
                            <Typography variant="h6">Hướng dẫn tạo Service Account Google</Typography>
                            <Typography variant="body1">
                                1. Đăng nhập vào Google Cloud Console
                                <br />
                                2. Tạo mới một project hoặc chọn project đã tạo
                                <br />
                                3. Tạo mới một service account bằng cách click vào "Create Service Account"
                                <br />
                                4. Tạo mới một key cho service account bằng cách click vào "Create Key"
                                <br />
                                5. Tải xuống key cho service account bằng cách click vào "Download"
                            </Typography>
                        </Alert>
                        <FieldForm
                            data={data}
                            component="text"
                            config={{
                                title: "Project ID",
                            }}
                            name="project_id"
                            post={{ project_id: projectId }}
                            onReview={(project_id) => {
                                setProjectId(project_id);
                            }}
                        />
                    </Box>
                </CardContent>
            </Card>
            <Box
                sx={{
                    pt: 3,
                    display: "flex",
                    justifyContent: "flex-end",
                }}
            >
                <LoadingButton
                    loading={apiPostConfig.open}
                    variant="contained"
                    color="success"
                    onClick={handleUpdate}
                >
                    Cập nhật
                </LoadingButton>
            </Box>
        </>
    );
}

export default Config;
