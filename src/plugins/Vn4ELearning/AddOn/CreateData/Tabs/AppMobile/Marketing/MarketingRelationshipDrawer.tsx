import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import FieldForm from 'components/atoms/fields/relationship_onetomany_show/Form';
import useAjax from 'hook/useApi';
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';

export type MarketingRelationshipDrawerConfig = {
    drawerTitle: string;
    listTitle: string;
    object: string;
    field: string;
    rowsPerPage?: number;
};

type Props = {
    open: boolean;
    onClose: () => void;
    appMobileId?: number;
    config: MarketingRelationshipDrawerConfig;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

export default function MarketingRelationshipDrawer({ open, onClose, appMobileId, config }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [appMobileDetail, setAppMobileDetail] = React.useState<DataResultApiProps | null>(null);
    const [tableKey, setTableKey] = React.useState(0);

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
                setTableKey((k) => k + 1);
            },
            error: (err: unknown) => {
                setLoading(false);
                setError(parseApiMessage(err));
            },
        });
    }, [appMobileId]);

    React.useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, loadData]);

    const rowsPerPage = config.rowsPerPage ?? 5;

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={config.drawerTitle}
            width={1200}
            activeOnClose
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && appMobileDetail?.post && (
                <FieldForm
                    key={tableKey}
                    component="relationship_onetomany_show"
                    config={{
                        title: config.listTitle,
                        object: config.object,
                        field: config.field,
                        view: 'relationship_onetomany_show',
                        paginate: {
                            rowsPerPage,
                        },
                    }}
                    post={appMobileDetail.post}
                    name="app_mobile"
                    onReview={() => { }} // eslint-disable-line @typescript-eslint/no-empty-function
                />
            )}
        </DrawerCustom>
    );
}
