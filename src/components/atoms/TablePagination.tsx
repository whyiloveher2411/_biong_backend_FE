import { Box, TablePaginationProps } from '@mui/material';
import { default as MuiTablePagination } from "@mui/material/TablePagination";
import { __ } from 'helpers/i18n';
import React from 'react';
import FieldForm from './fields/FieldForm';

function TablePagination({
    rowsPerPageOptions = [10, 25, 50, 100],
    rowsPerPage = 10,
    labelRowsPerPage = __('Rows per page:'),
    labelDisplayedRows = ({ from, to, count }) => `${from} - ${to} ${__('of')} ${count !== -1 ? count : `${__('more than')} ${to}`}`,
    onPageChange,
    onRowsPerPageChange,
    ...props
}: TablePaginationProps) {

    return <Box
        sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
        }}
    >
        <MuiTablePagination
            component={'div'}
            rowsPerPageOptions={rowsPerPageOptions}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage={labelRowsPerPage}
            labelDisplayedRows={labelDisplayedRows}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            {...props}
        />
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
            }}
        >{__('Jump to Page:')}
            <Box
                sx={{
                    maxWidth: 60
                }}
            >
                <FieldForm
                    component='number'
                    config={{
                        title: undefined,
                        size: 'small',
                        inputProps: {
                            onKeyPress: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                                if (e.key === 'Enter') {
                                    // alert(e.currentTarget.value);
                                }
                            }
                        }
                    }}
                    name="page"
                    post={{ page: props.page + 1 ? props.page + 1 : 1 }}
                    onReview={(value) => {
                        onPageChange(null, parseInt(value) - 1);
                    }}
                />
            </Box>
        </Box>
    </Box>
}

export default TablePagination;

export interface PaginationProps {
    [key: string]: ANY,
    current_page: number,
    data: JsonFormat[],
    first_page_url: string,
    last_page_url: string,
    next_page_url: null | string,
    prev_page_url: null | string,
    total: number,
    from: number,
    to: number,
    last_page: number,
    path: string,
    per_page: number,
}