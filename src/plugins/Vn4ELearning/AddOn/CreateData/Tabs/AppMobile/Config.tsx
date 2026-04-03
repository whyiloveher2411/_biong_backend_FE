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
import TextField from "components/atoms/TextField";
import { Divider } from "@mui/material";

function Config({ data }: { data: CreatePostTypeData }) {
    const [serviceAccountProd, setServiceAccountProd] =
        React.useState<string>("");
    const [serviceAccountDev, setServiceAccountDev] =
        React.useState<string>("");
    const apiPostConfig = useApi();
    const [environmentCurrent, setEnvironmentCurrent] = React.useState<string>("");
    const [s3BucketNameProd, setS3BucketNameProd] = React.useState<string>("");
    const [s3BucketNameDev, setS3BucketNameDev] = React.useState<string>("");

    const handleGetData = () => {
        apiPostConfig.ajax({
            url: "plugin/vn4-e-learning/app-mobile/config/get",
            method: "POST",
            data: {
                action: "GET_CONFIG",
                id: data.post.id,
            },
            success: (result: {
                service_account_prod: string;
                service_account_dev: string;
                environment_current: string;
                s3_bucket_name_prod?: string;
                s3_bucket_name_dev?: string;
            }) => {
                setServiceAccountProd(result.service_account_prod);
                setServiceAccountDev(result.service_account_dev);
                setEnvironmentCurrent(result.environment_current);
                setS3BucketNameProd(result.s3_bucket_name_prod ?? "");
                setS3BucketNameDev(result.s3_bucket_name_dev ?? "");
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
                service_account_prod: serviceAccountProd,
                service_account_dev: serviceAccountDev,
                environment_current: environmentCurrent,
                s3_bucket_name_prod: s3BucketNameProd,
                s3_bucket_name_dev: s3BucketNameDev,
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
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                Môi trường
                            </Typography>
                            <FieldForm
                                data={data}
                                component="select"
                                config={{
                                    title: "Environment",
                                    list_option: {
                                        production: {
                                            title: "Production",
                                        },
                                        development: {
                                            title: "Development",
                                        },
                                    },
                                }}
                                name="environment_current"
                                post={{
                                    environment_current: environmentCurrent,
                                }}
                                onReview={(environment_current) => {
                                    setEnvironmentCurrent(environment_current);
                                }}
                            />
                        </Box>

                        <Divider />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                Amazon S3
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tên bucket dùng cho localize và tài nguyên app mobile theo từng môi trường.
                            </Typography>
                            <TextField
                                fullWidth
                                label="S3 bucket (Production)"
                                name="s3_bucket_name_prod"
                                value={s3BucketNameProd}
                                onChange={(e) => setS3BucketNameProd(e.target.value)}
                                placeholder="vd: my-app-prod-bucket"
                                size="small"
                                variant="outlined"
                            />
                            <TextField
                                fullWidth
                                label="S3 bucket (Development)"
                                name="s3_bucket_name_dev"
                                value={s3BucketNameDev}
                                onChange={(e) => setS3BucketNameDev(e.target.value)}
                                placeholder="vd: my-app-dev-bucket"
                                size="small"
                                variant="outlined"
                            />
                        </Box>

                        <Divider />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                Google Cloud
                            </Typography>
                            <FieldForm
                                data={data}
                                component="json"
                                config={{
                                    title: "Service Account Google (Production)",
                                }}
                                name="service_account_google"
                                post={{
                                    service_account_google: serviceAccountProd,
                                }}
                                onReview={(service_account_google) => {
                                    setServiceAccountProd(service_account_google);
                                }}
                            />

                            <FieldForm
                                data={data}
                                component="json"
                                config={{
                                    title: "Service Account Google (Development)",
                                }}
                                name="service_account_google"
                                post={{
                                    service_account_google: serviceAccountDev,
                                }}
                                onReview={(service_account_google) => {
                                    setServiceAccountDev(service_account_google);
                                }}
                            />
                        </Box>

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
                    </Box>
                </CardContent>
            </Card>
            <Box
                sx={{
                    py: 3,
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
