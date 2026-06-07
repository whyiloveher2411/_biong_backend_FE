import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Typography,
} from '@mui/material';
import FieldForm from 'components/atoms/fields/relationship_onetomany_show/Form';
import useAjax from 'hook/useApi';
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';

type Props = {
    appMobileId?: number;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

export default function MarketingSourceTablesPanel({ appMobileId }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [appMobileDetail, setAppMobileDetail] = React.useState<DataResultApiProps | null>(null);

    const loadData = React.useCallback(() => {
        if (!appMobileId) {
            setError('Chưa xác định mobile_app');
            setAppMobileDetail(null);
            return;
        }

        setLoading(true);
        setError(null);

        apiAjaxRef.current({
            url: `post-type/detail/app_mobile/${appMobileId}`,
            method: 'POST',
            loading: false,
            success: (result: DataResultApiProps) => {
                setLoading(false);
                setAppMobileDetail(result);
            },
            error: (err: unknown) => {
                setLoading(false);
                setError(parseApiMessage(err));
            },
        });
    }, [appMobileId]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && appMobileDetail?.post && (
                <>
                    <Typography variant="subtitle2">Danh sách source item theo mobile app</Typography>
                    <Box data-marketing-source-item-list="1">
                        <FieldForm
                            component="relationship_onetomany_show"
                            config={{
                                title: 'Marketing Source Item',
                                object: 'spacedev_app_marketing_source_item',
                                field: 'app_mobile',
                                view: 'relationship_onetomany_show',
                                paginate: {
                                    rowsPerPage: 5,
                                },
                            }}
                            post={appMobileDetail.post}
                            name="app_mobile"
                            onReview={() => { }} // eslint-disable-line @typescript-eslint/no-empty-function
                        />
                    </Box>
                </>
            )}
        </Box>
    );
}
