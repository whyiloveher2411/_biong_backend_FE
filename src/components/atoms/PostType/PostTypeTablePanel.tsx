import { Theme } from '@mui/material';
import Box from 'components/atoms/Box';

type Props = {
    toolbar: React.ReactNode;
    children: React.ReactNode;
    /** Dòng meta nhỏ giữa toolbar và bảng (vd: số bản ghi). */
    meta?: React.ReactNode;
};

/**
 * Khung chung bọc toolbar + bảng trong một card để header và table không bị tách thành 2 block rời.
 */
export default function PostTypeTablePanel({ toolbar, children, meta }: Props) {
    return (
        <Box
            data-post-type-table-panel=""
            sx={{
                mb: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'grey.50',
                }}
            >
                {toolbar}
            </Box>

            {meta ? (
                <Box
                    sx={{
                        px: 2,
                        py: 0.75,
                        borderTop: '1px solid',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    {meta}
                </Box>
            ) : null}

            <Box
                sx={{
                    borderTop: meta ? 'none' : '1px solid',
                    borderColor: 'divider',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

export const postTypeEmbeddedTableSx = {
    borderRadius: 0,
    boxShadow: 'none',
    border: 'none',
    '& .MuiTableHead-root .MuiTableRow-root': {
        bgcolor: (theme: Theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'grey.100',
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
        fontWeight: 600,
        borderBottom: '1px solid',
        borderColor: 'divider',
    },
};
