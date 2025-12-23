import React from 'react';
import Box from 'components/atoms/Box';
import Typography from 'components/atoms/Typography';
import LoadingButton from 'components/atoms/LoadingButton';
import FieldForm from 'components/atoms/fields/FieldForm';
import useApi from 'hook/useApi';

interface DeviceTestProps {
    post: PostTypeProps;
}

export default function DeviceTest({ post }: DeviceTestProps) {
    const api = useApi();
    const [testTokens, setTestTokens] = React.useState<string>('');

    React.useEffect(() => {
        // Load test tokens on mount
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/push-notification/device-test-get',
            method: 'POST',
            data: {
                id: post.id
            },
            success: (res) => {
                if (res.tokens) {
                    setTestTokens(res.tokens);
                }
            }
        });
        //eslint-disable-next-line
    }, []);

    const handleSubmit = () => {
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/push-notification/device-test-set',
            method: 'POST',
            data: {
                id: post.id,
                tokens: testTokens
            },
            success: (res) => {
                if (res.status === 'success') {
                    // Success handling
                }
            }
        });
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Danh sách FCM Token để test
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nhập danh sách FCM token (mỗi dòng 1 token) để gửi thông báo test
            </Typography>
            <FieldForm
                component="textarea"
                config={{
                    title: "FCM Tokens",
                    rows: 10,
                    placeholder: "Nhập mỗi token trên một dòng...",
                    note: "Mỗi dòng là một FCM token"
                }}
                name="testTokens"
                post={{ testTokens }}
                onReview={(v) => setTestTokens(v)}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <LoadingButton
                    loading={api.open}
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                >
                    Lưu danh sách
                </LoadingButton>
            </Box>
        </Box>
    );
}
