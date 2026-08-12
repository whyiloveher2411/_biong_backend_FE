import React from 'react';
import {
    Alert,
    Box,
    Button,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DrawerCustom from 'components/molecules/DrawerCustom';
import PostTypeTablePanel from 'components/atoms/PostType/PostTypeTablePanel';
import DataTable from 'components/atoms/PostType/DataTable';
import DrawerEditPost from 'components/atoms/PostType/DrawerEditPost';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';

const TRANSITION_TYPE = 'spacedev_app_marketing_whiteboard_transition';

type ShowDataResult = DataResultApiProps & {
    rows?: { data?: Array<Record<string, unknown>> };
    config?: Record<string, unknown>;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function WhiteboardTransitionManagerDrawer({ open, onClose }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const permission = usePermission(TRANSITION_TYPE + '_create');

    const [data, setData] = React.useState<ShowDataResult | false>(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [openAddDrawer, setOpenAddDrawer] = React.useState(false);
    const [addData, setAddData] = React.useState<DataResultApiProps | false>(false);

    const [queryUrl, setQueryUrl] = React.useState<Record<string, unknown>>({
        rowsPerPage: 10,
        page: 1,
        search: '',
        filter: 'all',
        object: TRANSITION_TYPE,
    });

    const loadData = React.useCallback(() => {
        setLoading(true);
        apiAjaxRef.current({
            url: `post-type/get-data/${TRANSITION_TYPE}`,
            method: 'POST',
            data: queryUrl,
            loading: false,
            success: (result: ShowDataResult) => {
                setLoading(false);
                setError(null);
                setData({ ...result, type: TRANSITION_TYPE });
            },
            error: () => {
                setLoading(false);
                setError('Không tải được danh sách hiệu ứng');
            },
        });
    }, [queryUrl]);

    React.useEffect(() => {
        if (open) {
            loadData();
        } else {
            setOpenAddDrawer(false);
            setAddData(false);
        }
    }, [open, loadData]);

    const handleAddOpen = () => {
        if (!data) {
            return;
        }
        const base = data as DataResultApiProps;
        setAddData({
            ...base,
            type: TRANSITION_TYPE,
            action: 'ADD_NEW',
            post: { meta: {} },
        } as DataResultApiProps);
        setOpenAddDrawer(true);
    };

    const handleAddSubmit = () => {
        if (!addData) {
            return;
        }
        apiAjaxRef.current({
            url: `post-type/post/${TRANSITION_TYPE}`,
            method: 'POST',
            data: { ...addData.post, _action: addData.action },
            loading: false,
            success: (result: { post?: { id?: number } }) => {
                setOpenAddDrawer(false);
                setAddData(false);
                loadData();
                if (!result?.post?.id) {
                    setError('Lưu hiệu ứng thất bại');
                }
            },
        });
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Quản lý hiệu ứng chuyển cảnh"
            width={900}
            activeOnClose
            restDialogContent={{
                sx: {
                    pt: 2.5,
                    px: 3,
                    pb: 2,
                    backgroundColor: 'body.background',
                },
            }}
        >
            <Stack spacing={2} sx={{ pb: 1 }}>
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading && <LinearProgress />}

                {data !== false && (
                    <PostTypeTablePanel
                        toolbar={
                            <Box
                                sx={{
                                    px: 2,
                                    py: 1.25,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1.5,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Danh sách hiệu ứng ({String(data?.rows?.data?.length ?? 0)})
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    disabled={!permission[TRANSITION_TYPE + '_create']}
                                    onClick={handleAddOpen}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Thêm hiệu ứng
                                </Button>
                            </Box>
                        }
                    >
                        <DataTable
                            rowClickMode="drawer"
                            setQueryUrl={setQueryUrl}
                            queryUrl={queryUrl}
                            data={data as never}
                            onEdit={loadData}
                            config={{ object: TRANSITION_TYPE }}
                            embeddedInPanel
                        />
                    </PostTypeTablePanel>
                )}

                {addData !== false && (
                    <DrawerEditPost
                        open={openAddDrawer}
                        openLoading={false}
                        onClose={() => {
                            setOpenAddDrawer(false);
                            setAddData(false);
                        }}
                        data={addData}
                        setData={setAddData}
                        handleSubmit={handleAddSubmit}
                    />
                )}
            </Stack>
        </DrawerCustom>
    );
}
