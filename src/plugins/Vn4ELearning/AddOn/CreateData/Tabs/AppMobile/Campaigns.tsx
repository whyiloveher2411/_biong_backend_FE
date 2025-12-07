import React from 'react';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Typography from 'components/atoms/Typography';
import TextField from 'components/atoms/TextField';
import Button from 'components/atoms/Button';
import Table from 'components/atoms/Table';
import TableHead from 'components/atoms/TableHead';
import TableBody from 'components/atoms/TableBody';
import TableRow from 'components/atoms/TableRow';
import TableCell from 'components/atoms/TableCell';
import TablePagination from 'components/atoms/TablePagination';
import Chip from 'components/atoms/Chip';
import IconButton from 'components/atoms/IconButton';
import Tooltip from 'components/atoms/Tooltip';
import { DeleteOutline, FileCopyOutlined, Refresh, Search } from '@mui/icons-material';
import useApi from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';

interface CampaignItem {
    id: string | number;
    name: string;
    createdAt: string;
    scheduledAt?: string | null;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
    targets: string;
    sentCount?: number;
    openRate?: number;
}

export default function Campaigns({ data }: { data: CreatePostTypeData }) {
    const api = useApi();
    const confirm = useConfirmDialog({ title: 'Xác nhận' });

    const [keyword, setKeyword] = React.useState('');
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [rows, setRows] = React.useState<CampaignItem[]>([]);
    const [total, setTotal] = React.useState(0);

    const fetchList = React.useCallback(() => {
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/campaign/list',
            method: 'POST',
            data: {
                id: data.post.id,
                keyword,
                page: page + 1,
                perPage: rowsPerPage,
            },
            success: (res) => {
                setRows(res.data || []);
                setTotal(res.total || 0);
            },
            error: () => {
                // tránh thay đổi state không cần thiết gây re-render liên tục khi lỗi
            }
        });
    }, [data.post.id, keyword, page, rowsPerPage]);

    React.useEffect(() => {
        fetchList();
        // chỉ gọi lại khi keyword/page/rowsPerPage hoặc id thay đổi; không phụ thuộc api để tránh lặp vô hạn
    }, [data.post.id, keyword, page, rowsPerPage, fetchList]);

    const handleDuplicate = (row: CampaignItem) => {
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/campaign/duplicate',
            method: 'POST',
            data: { id: data.post.id, campaignId: row.id },
            success: () => fetchList()
        });
    };

    const handleDelete = (row: CampaignItem) => {
        confirm.onConfirm(() => {
            api.ajax({
                url: 'plugin/vn4-e-learning/app-mobile/campaign/delete',
                method: 'POST',
                data: { id: data.post.id, campaignId: row.id },
                success: () => fetchList()
            });
        }, { message: 'Bạn chắc chắn muốn xoá campaign này?' });
    };

    return (
        <Box>
            {confirm.component}
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Search fontSize='small' />
                        <TextField size='small' placeholder='Tìm theo tên, trạng thái, topic...' value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                        <Button variant='outlined' startIcon={<Refresh />} onClick={fetchList}>Tải lại</Button>
                    </Box>

                    <Table size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tên</TableCell>
                                <TableCell>Thời gian tạo</TableCell>
                                <TableCell>Lịch gửi</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Mục tiêu</TableCell>
                                <TableCell align='right'>Gửi/Opened</TableCell>
                                <TableCell align='right'>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={600}>{row.name}</Typography>
                                    </TableCell>
                                    <TableCell>{row.createdAt}</TableCell>
                                    <TableCell>{row.scheduledAt || '-'}</TableCell>
                                    <TableCell>
                                        <Chip size='small' label={row.status} color={row.status === 'failed' ? 'error' : row.status === 'sent' ? 'success' : row.status === 'scheduled' ? 'warning' : 'default'} />
                                    </TableCell>
                                    <TableCell>{row.targets}</TableCell>
                                    <TableCell align='right'>
                                        {row.sentCount ?? 0} / {Math.round((row.openRate ?? 0) * 100)}%
                                    </TableCell>
                                    <TableCell align='right'>
                                        <Tooltip title='Duplicate'>
                                            <IconButton size='small' onClick={() => handleDuplicate(row)}>
                                                <FileCopyOutlined fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title='Delete'>
                                            <IconButton size='small' color='error' onClick={() => handleDelete(row)}>
                                                <DeleteOutline fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <TablePagination
                        count={total}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    />
                </CardContent>
            </Card>
        </Box>
    );
}


