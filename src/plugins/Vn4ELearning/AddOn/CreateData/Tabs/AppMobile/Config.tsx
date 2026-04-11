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
import type { Theme } from "@mui/material/styles";

function configSubGroupSurface(theme: Theme) {
    return {
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider" as const,
        bgcolor:
            theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
        display: "flex",
        flexDirection: "column" as const,
        gap: 1.5,
    };
}

function Config({ data }: { data: CreatePostTypeData }) {
    const [serviceAccountProd, setServiceAccountProd] =
        React.useState<string>("");
    const [serviceAccountDev, setServiceAccountDev] =
        React.useState<string>("");
    const apiPostConfig = useApi();
    const [environmentCurrent, setEnvironmentCurrent] = React.useState<string>("");
    const [s3BucketNameProd, setS3BucketNameProd] = React.useState<string>("");
    const [s3BucketNameDev, setS3BucketNameDev] = React.useState<string>("");
    const [mongodbUrlProd, setMongodbUrlProd] = React.useState<string>("");
    const [mongodbUrlDev, setMongodbUrlDev] = React.useState<string>("");
    const [mongodbDatabaseProd, setMongodbDatabaseProd] = React.useState<string>("");
    const [mongodbDatabaseDev, setMongodbDatabaseDev] = React.useState<string>("");

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
                mongodb_url_prod?: string;
                mongodb_url_dev?: string;
                mongodb_database_prod?: string;
                mongodb_database_dev?: string;
            }) => {
                setServiceAccountProd(result.service_account_prod);
                setServiceAccountDev(result.service_account_dev);
                setEnvironmentCurrent(result.environment_current);
                setS3BucketNameProd(result.s3_bucket_name_prod ?? "");
                setS3BucketNameDev(result.s3_bucket_name_dev ?? "");
                setMongodbUrlProd(result.mongodb_url_prod ?? "");
                setMongodbUrlDev(result.mongodb_url_dev ?? "");
                setMongodbDatabaseProd(result.mongodb_database_prod ?? "");
                setMongodbDatabaseDev(result.mongodb_database_dev ?? "");
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
                mongodb_url_prod: mongodbUrlProd,
                mongodb_url_dev: mongodbUrlDev,
                mongodb_database_prod: mongodbDatabaseProd,
                mongodb_database_dev: mongodbDatabaseDev,
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
                            <Box sx={(theme) => configSubGroupSurface(theme)}>
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
                        </Box>

                        <Divider />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                Amazon S3
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tên bucket dùng cho localize và tài nguyên app mobile theo từng môi trường.
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <Box sx={(theme) => configSubGroupSurface(theme)}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Production
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="S3 bucket"
                                        name="s3_bucket_name_prod"
                                        value={s3BucketNameProd}
                                        onChange={(e) => setS3BucketNameProd(e.target.value)}
                                        placeholder="vd: my-app-prod-bucket"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                                <Box sx={(theme) => configSubGroupSurface(theme)}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Development
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="S3 bucket"
                                        name="s3_bucket_name_dev"
                                        value={s3BucketNameDev}
                                        onChange={(e) => setS3BucketNameDev(e.target.value)}
                                        placeholder="vd: my-app-dev-bucket"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>
                        </Box>

                        <Divider />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                MongoDB
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Chuỗi kết nối và tên database MongoDB theo từng môi trường.
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <Box sx={(theme) => configSubGroupSurface(theme)}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Production
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="MongoDB URL"
                                        name="mongodb_url_prod"
                                        value={mongodbUrlProd}
                                        onChange={(e) => setMongodbUrlProd(e.target.value)}
                                        placeholder="mongodb://..."
                                        size="small"
                                        variant="outlined"
                                    />
                                    <TextField
                                        fullWidth
                                        label="MongoDB database"
                                        name="mongodb_database_prod"
                                        value={mongodbDatabaseProd}
                                        onChange={(e) => setMongodbDatabaseProd(e.target.value)}
                                        placeholder="vd: my_app_prod"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                                <Box sx={(theme) => configSubGroupSurface(theme)}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Development
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="MongoDB URL"
                                        name="mongodb_url_dev"
                                        value={mongodbUrlDev}
                                        onChange={(e) => setMongodbUrlDev(e.target.value)}
                                        placeholder="mongodb://..."
                                        size="small"
                                        variant="outlined"
                                    />
                                    <TextField
                                        fullWidth
                                        label="MongoDB database"
                                        name="mongodb_database_dev"
                                        value={mongodbDatabaseDev}
                                        onChange={(e) => setMongodbDatabaseDev(e.target.value)}
                                        placeholder="vd: my_app_dev"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>
                        </Box>

                        <Divider />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                                Google Cloud
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                JSON Service Account dùng cho tích hợp Google theo từng môi trường.
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <Box sx={(theme) => configSubGroupSurface(theme)}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Production
                                    </Typography>
                                    <FieldForm
                                        data={data}
                                        component="json"
                                        config={{
                                            title: "Service Account Google",
                                        }}
                                        name="service_account_google"
                                        post={{
                                            service_account_google: serviceAccountProd,
                                        }}
                                        onReview={(service_account_google) => {
                                            setServiceAccountProd(service_account_google);
                                        }}
                                    />
                                </Box>
                                <Box sx={(theme) => configSubGroupSurface(theme)}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Development
                                    </Typography>
                                    <FieldForm
                                        data={data}
                                        component="json"
                                        config={{
                                            title: "Service Account Google",
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
                            </Box>
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
