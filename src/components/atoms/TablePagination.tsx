import {
    Box,
    Button,
    MenuItem,
    Select,
    SelectChangeEvent,
    TablePaginationProps,
    Typography,
} from '@mui/material';
import { alpha, Theme } from '@mui/material/styles';
import { __ } from 'helpers/i18n';
import React from 'react';
import FieldForm from './fields/FieldForm';

type PaginationItem = number | 'ellipsis';

/** Trang hiển thị (1-based). Dưới 7 trang: hiện hết; từ 7 trang: ellipsis theo vị trí trang hiện tại. */
export function buildPaginationRange(
    currentPageZeroIndexed: number,
    totalPages: number
): PaginationItem[] {
    if (totalPages <= 0) {
        return [];
    }
    if (totalPages < 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const current = currentPageZeroIndexed + 1;

    if (current <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (current >= totalPages - 3) {
        return [
            1,
            'ellipsis',
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
}

type RowsPerPageOption = number | { value: number; label: string };

function getRowsPerPageOptionValue(option: RowsPerPageOption): number {
    return typeof option === 'object' && option !== null ? option.value : option;
}

/** Thêm rowsPerPage hiện tại vào options nếu nơi gọi truyền giá trị ngoài danh sách mặc định. */
export function mergeRowsPerPageOptions(
    options: readonly RowsPerPageOption[],
    rowsPerPage: number
): RowsPerPageOption[] {
    const merged = [...options];
    const current = Number(rowsPerPage);

    if (
        Number.isFinite(current) &&
        current > 0 &&
        !merged.some((option) => getRowsPerPageOptionValue(option) === current)
    ) {
        merged.push(current);
    }

    return merged.sort(
        (a, b) => getRowsPerPageOptionValue(a) - getRowsPerPageOptionValue(b)
    );
}

const PAGE_NUMBER_SIZE = 44;
const NAV_BUTTON_HEIGHT = 44;

const paginationGroupSx = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1,
} as const;

const PAGINATION_BORDER_WIDTH = '1.5px';

function navButtonSx(theme: Theme, disabled: boolean) {
    const borderColor = disabled
        ? theme.palette.action.disabledBackground
        : theme.palette.primary.main;

    return {
        minWidth: 'auto',
        height: NAV_BUTTON_HEIGHT,
        px: 2.25,
        borderRadius: '8px',
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.8125rem',
        letterSpacing: '0.02em',
        boxShadow: 'none',
        boxSizing: 'border-box',
        borderWidth: PAGINATION_BORDER_WIDTH,
        borderStyle: 'solid',
        borderColor,
        color: disabled ? theme.palette.text.disabled : theme.palette.primary.main,
        backgroundColor: theme.palette.background.paper,
        '&:hover': {
            boxShadow: 'none',
            borderWidth: PAGINATION_BORDER_WIDTH,
            borderStyle: 'solid',
            borderColor: disabled ? borderColor : theme.palette.primary.dark,
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
        },
        '&.Mui-focusVisible': {
            borderWidth: PAGINATION_BORDER_WIDTH,
        },
        '&.MuiButton-outlined': {
            borderWidth: PAGINATION_BORDER_WIDTH,
        },
        '&.MuiButton-outlined:hover': {
            borderWidth: PAGINATION_BORDER_WIDTH,
        },
        '&.Mui-disabled': {
            borderWidth: PAGINATION_BORDER_WIDTH,
            borderColor: theme.palette.action.disabledBackground,
            color: theme.palette.text.disabled,
            backgroundColor: theme.palette.action.hover,
        },
    };
}

function pageNumberButtonSx(theme: Theme, active: boolean) {
    const borderColor = active
        ? theme.palette.primary.main
        : theme.palette.divider;

    return {
        minWidth: PAGE_NUMBER_SIZE,
        width: PAGE_NUMBER_SIZE,
        height: PAGE_NUMBER_SIZE,
        p: 0,
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.875rem',
        lineHeight: 1,
        boxShadow: 'none',
        textTransform: 'none',
        flexShrink: 0,
        boxSizing: 'border-box',
        borderWidth: PAGINATION_BORDER_WIDTH,
        borderStyle: 'solid',
        borderColor,
        color: active ? theme.palette.primary.contrastText : theme.palette.text.primary,
        backgroundColor: active
            ? theme.palette.primary.main
            : theme.palette.background.paper,
        '&:hover': {
            boxShadow: 'none',
            borderWidth: PAGINATION_BORDER_WIDTH,
            borderStyle: 'solid',
            borderColor: active ? theme.palette.primary.dark : theme.palette.primary.main,
            backgroundColor: active
                ? theme.palette.primary.dark
                : alpha(theme.palette.primary.main, 0.06),
        },
        '&.Mui-focusVisible': {
            borderWidth: PAGINATION_BORDER_WIDTH,
        },
    };
}

const ellipsisSx = {
    width: 28,
    height: PAGE_NUMBER_SIZE,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'text.secondary',
    fontSize: '1.125rem',
    fontWeight: 600,
    letterSpacing: 2,
    userSelect: 'none',
    flexShrink: 0,
} as const;

const rowsPerPageSelectSx = {
    minWidth: 76,
    height: 36,
    borderRadius: '8px',
    fontSize: '0.875rem',
    '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: 1.5,
    },
} as const;

const jumpInputWrapperSx = {
    width: 56,
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px',
        height: 36,
        fontSize: '0.875rem',
        fontWeight: 600,
        backgroundColor: 'background.paper',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: 1.5,
    },
} as const;

function TablePagination({
    rowsPerPageOptions = [10, 25, 50, 100],
    rowsPerPage = 10,
    labelRowsPerPage = __('Rows per page:'),
    labelDisplayedRows = ({ from, to, count }) =>
        `${from} - ${to} ${__('of')} ${count !== -1 ? count : `${__('more than')} ${to}`}`,
    onPageChange,
    onRowsPerPageChange,
    count = 0,
    page = 0,
    sx,
}: TablePaginationProps) {
    const resolvedRowsPerPage = Number(rowsPerPage) || 10;
    const resolvedRowsPerPageOptions = React.useMemo(
        () => mergeRowsPerPageOptions(rowsPerPageOptions, resolvedRowsPerPage),
        [rowsPerPageOptions, resolvedRowsPerPage]
    );

    const totalPages =
        count === -1
            ? Math.max(page + 1, 1)
            : Math.max(0, Math.ceil(count / resolvedRowsPerPage));
    const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;
    const from = count === 0 ? 0 : safePage * resolvedRowsPerPage + 1;
    const to =
        count === -1
            ? (safePage + 1) * resolvedRowsPerPage
            : count === 0
              ? 0
              : Math.min(count, (safePage + 1) * resolvedRowsPerPage);
    const displayedLabel = labelDisplayedRows({ from, to, count, page: safePage });
    const pageItems = buildPaginationRange(safePage, totalPages);
    const showJumpToPage = totalPages > 50;

    const goToPage = (targetPage: number) => {
        if (!onPageChange || totalPages <= 0) {
            return;
        }
        const clamped = Math.max(0, Math.min(targetPage, totalPages - 1));
        if (clamped !== safePage) {
            onPageChange(null, clamped);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 2, md: 3 },
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                py: 1.5,
                px: 2,
                ...sx,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: { xs: 1.5, sm: 2.5 },
                    alignItems: 'center',
                }}
            >
                {resolvedRowsPerPageOptions.length > 1 && onRowsPerPageChange && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                        >
                            {labelRowsPerPage}
                        </Typography>
                        <Select
                            size="small"
                            variant="outlined"
                            value={resolvedRowsPerPage}
                            onChange={(e: SelectChangeEvent<number>) => {
                                onRowsPerPageChange(
                                    e as unknown as React.ChangeEvent<HTMLInputElement>
                                );
                            }}
                            sx={rowsPerPageSelectSx}
                        >
                            {resolvedRowsPerPageOptions.map((option) => {
                                const value =
                                    typeof option === 'object' && option !== null
                                        ? option.value
                                        : option;
                                const label =
                                    typeof option === 'object' && option !== null
                                        ? option.label
                                        : String(option);
                                return (
                                    <MenuItem key={value} value={value}>
                                        {label}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </Box>
                )}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
                >
                    {displayedLabel}
                </Typography>
            </Box>

            {totalPages > 0 && (
                <Box sx={paginationGroupSx}>
                    <Button
                        variant="outlined"
                        color="primary"
                        disableElevation
                        disabled={safePage <= 0}
                        onClick={() => goToPage(safePage - 1)}
                        sx={(theme) => navButtonSx(theme, safePage <= 0)}
                    >
                        {__('Previous')}
                    </Button>

                    {pageItems.map((item, index) => {
                        if (item === 'ellipsis') {
                            return (
                                <Typography
                                    key={`ellipsis-${index}`}
                                    component="span"
                                    aria-hidden
                                    sx={ellipsisSx}
                                >
                                    …
                                </Typography>
                            );
                        }

                        const isActive = item === safePage + 1;
                        return (
                            <Button
                                key={item}
                                variant="text"
                                disableElevation
                                onClick={() => goToPage(item - 1)}
                                aria-label={`${__('Page')} ${item}`}
                                aria-current={isActive ? 'page' : undefined}
                                sx={(theme) => pageNumberButtonSx(theme, isActive)}
                            >
                                {item}
                            </Button>
                        );
                    })}

                    <Button
                        variant="outlined"
                        color="primary"
                        disableElevation
                        disabled={safePage >= totalPages - 1}
                        onClick={() => goToPage(safePage + 1)}
                        sx={(theme) => navButtonSx(theme, safePage >= totalPages - 1)}
                    >
                        {__('Next')}
                    </Button>

                    {showJumpToPage && (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1.25,
                                alignItems: 'center',
                                pl: { xs: 0, sm: 1.5 },
                                ml: { xs: 0, sm: 0.5 },
                            }}
                        >
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                noWrap
                                sx={{ fontWeight: 500 }}
                            >
                                {__('Jump to Page:')}
                            </Typography>
                            <Box sx={jumpInputWrapperSx}>
                                <FieldForm
                                    component="number"
                                    config={{
                                        title: undefined,
                                        size: 'small',
                                        inputProps: {
                                            min: 1,
                                            max: totalPages,
                                            onKeyPress: (
                                                e: React.KeyboardEvent<
                                                    HTMLInputElement | HTMLTextAreaElement
                                                >
                                            ) => {
                                                if (e.key === 'Enter') {
                                                    const value = parseInt(
                                                        e.currentTarget.value,
                                                        10
                                                    );
                                                    if (
                                                        !Number.isNaN(value) &&
                                                        value >= 1 &&
                                                        value <= totalPages
                                                    ) {
                                                        goToPage(value - 1);
                                                    }
                                                }
                                            },
                                        },
                                    }}
                                    name="page"
                                    post={{ page: safePage + 1 }}
                                    onReview={(value) => {
                                        const parsed = parseInt(value, 10);
                                        if (
                                            !Number.isNaN(parsed) &&
                                            parsed >= 1 &&
                                            parsed <= totalPages
                                        ) {
                                            goToPage(parsed - 1);
                                        }
                                    }}
                                />
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}

export default TablePagination;

export interface PaginationProps {
    [key: string]: ANY;
    current_page: number;
    data: JsonFormat[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: null | string;
    prev_page_url: null | string;
    total: number;
    from: number;
    to: number;
    last_page: number;
    path: string;
    per_page: number;
}
