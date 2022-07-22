import { Theme } from '@mui/material';
import { ImageProps } from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardActions from 'components/atoms/CardActions';
import CardContent from 'components/atoms/CardContent';
import CircularProgress from 'components/atoms/CircularProgress';
import makeCSS from 'components/atoms/makeCSS';
import Skeleton from 'components/atoms/Skeleton';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TablePagination, { PaginationProps } from 'components/atoms/TablePagination';
import TableRow from 'components/atoms/TableRow';
import NotFound from 'components/molecules/NotFound';
import { __p } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';
import ProductItem from './ProductItem';
import ProductVariable from './ProductVariable';


export const stock_status = {
    instock: { title: __p('In stock', PLUGIN_NAME), color: '#7ad03a' },
    outofstock: { title: __p('Out of stock', PLUGIN_NAME), color: '#a44' },
    onbackorder: { title: __p('On backorder', PLUGIN_NAME), color: '#eaa600' },
};


const useStyles = makeCSS((theme: Theme) => ({
    container: {
        maxHeight: 550,
    },
    content: {
        padding: 0,
    },
    actions: {
        padding: theme.spacing(1),
        justifyContent: 'flex-end',
    },
    iconLoading: {
        position: 'absolute',
        zIndex: 2,
        top: 'calc(50% - 20px)',
        left: 'calc(50% - 20px)',
    },
    cardWarper: {
        position: 'relative',
        '&>.MuiCardHeader-root>.MuiCardHeader-action': {
            margin: 0
        }
    },
    showLoading: {
        '&::before': {
            display: 'inline-block',
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            zIndex: 1,
        }
    },
}))

function Inventory() {

    const [products, setProducts] = React.useState<InventoryItem[]>([]);

    const classes = useStyles();

    const ajaxInventory = useAjax();

    const [paginate, setPaginate] = React.useState<{
        total: number,
        per_page: number,
        current_page: number,
        page: number,
    }>({
        total: 0,
        page: 0,
        per_page: 10,
        current_page: 0,
    });

    const handleUpdateData = () => {

        setPaginate(paginate => {
            ajaxInventory.ajax({
                url: 'plugin/vn4-ecommerce/inventory/product-listing',
                data: {
                    page: paginate.page,
                    per_page: paginate.per_page,
                },
                success: (result: {
                    products: InventoryItem[],
                    paginate: PaginationProps
                }) => {
                    if (result.products) {
                        setProducts(result.products);
                    }
                    if (result.paginate) {
                        setPaginate(prev => ({
                            ...prev,
                            ...result.paginate
                        }));
                    }
                },
            });

            return paginate;
        });

    }

    React.useEffect(() => {
        handleUpdateData();
    }, []);

    const handleClickSave = (product: InventoryItem, index: number) => {

        ajaxInventory.ajax({
            url: 'plugin/vn4-ecommerce/inventory/product-listing',
            data: {
                setQuantity: true,
                identifier: product.identifier,
                count: product.count,
                setType: (!product.setType || product.setType === 'add') ? 'add' : 'set',
            },
            success: (result) => {
                if (result.warehouse_quantity) {

                    setProducts(prev => {
                        if (prev) {
                            prev[index].count = '';
                            prev[index].warehouse_quantity = result.warehouse_quantity;
                            prev[index].warehouse_quantity_after_set = false;
                            prev[index].setType = 'add';
                            return [...prev];
                        }
                        return prev;
                    });
                }
            },
        });
    }

    const handleClickSaveVariable = (product: InventoryItem, index: number, indexVariable: number) => {
        ajaxInventory.ajax({
            url: 'plugin/vn4-ecommerce/inventory/product-listing',
            data: {
                setQuantity: true,
                identifier: product.identifier,
                count: product.count,
                setType: (!product.setType || product.setType === 'add') ? 'add' : 'set',
            },
            success: (result) => {
                if (result.warehouse_quantity) {

                    setProducts(prev => {

                        let variables = prev[index].variables;

                        if (variables) {
                            variables[indexVariable].count = '';
                            variables[indexVariable].warehouse_quantity = result.warehouse_quantity;
                            variables[indexVariable].warehouse_quantity_after_set = false;
                            variables[indexVariable].setType = 'add';
                        }
                        return [...prev];
                    });
                }
            },
        });
    }



    const handleChangeSetType = (type: 'add' | 'set', index: number) => {
        setProducts(prev => {

            prev[index].setType = type;
            if (!prev[index].setType || prev[index].setType === 'add') {
                prev[index].warehouse_quantity_after_set = parseInt(prev[index].warehouse_quantity) + (parseInt(prev[index].count as string) > 0 ? parseInt(prev[index].count as string) : 0);
            } else {
                prev[index].warehouse_quantity_after_set = parseInt(prev[index].count as string) > 0 ? parseInt(prev[index].count as string) : 0;
            }
            return [...prev];

        })
    }

    if (products) {

        return (
            <Card className={classes.cardWarper + ' ' + (ajaxInventory.open ? classes.showLoading : '')}>
                <CardContent className={classes.content}>
                    <TableContainer className={classes.container + ' custom_scroll'}>
                        <Table stickyHeader >
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{ width: 56 }}>
                                    </TableCell>
                                    <TableCell style={{ width: 56 }} padding='none'>
                                    </TableCell>
                                    <TableCell>
                                        {__p('Product', PLUGIN_NAME)}
                                    </TableCell>
                                    <TableCell>
                                        {__p('SKU', PLUGIN_NAME)}
                                    </TableCell>
                                    <TableCell>
                                        {__p('When sold out', PLUGIN_NAME)}
                                    </TableCell>
                                    <TableCell style={{ width: 200 }}>
                                        {__p('Available', PLUGIN_NAME)}
                                    </TableCell>
                                    <TableCell style={{ width: 300 }}>
                                        {__p('Edit quantity available', PLUGIN_NAME)}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {
                                    products.length > 0 ?
                                        products.map((product, index) => (
                                            <React.Fragment key={product.key}>
                                                <ProductItem
                                                    product={product}
                                                    index={index}
                                                    handleChangeSetType={handleChangeSetType}
                                                    setProducts={setProducts}
                                                    handleClickSave={handleClickSave}
                                                />
                                                {
                                                    product.product_type === 'variable' && product.variables?.length &&
                                                    product.variables.map((productVariable, index2) => (
                                                        <ProductVariable
                                                            key={index2}
                                                            product={productVariable}
                                                            index={index2}
                                                            handleChangeSetType={(type: "add" | "set") => {
                                                                setProducts(prev => {

                                                                    let variables = prev[index].variables;

                                                                    if (variables) {

                                                                        variables[index2].setType = type;

                                                                        if (!variables[index2].setType || variables[index2].setType === 'add') {
                                                                            variables[index2].warehouse_quantity_after_set = parseInt(variables[index2].warehouse_quantity as string)
                                                                                + (parseInt(variables[index2].count as string) > 0
                                                                                    ? parseInt(variables[index2].count as string)
                                                                                    : 0);
                                                                        } else {
                                                                            variables[index2].warehouse_quantity_after_set = parseInt(variables[index2].count as string) > 0
                                                                                ? parseInt(variables[index2].count as string)
                                                                                : 0;
                                                                        }
                                                                    }

                                                                    return [...prev];
                                                                });

                                                            }}
                                                            onReview={(value: number) => {

                                                                setProducts(prev => {

                                                                    let variables = prev[index].variables;

                                                                    if (variables) {

                                                                        variables[index2].count = value;

                                                                        if (!variables[index2].setType || variables[index2].setType === 'add') {
                                                                            variables[index2].warehouse_quantity_after_set = parseInt(variables[index2].warehouse_quantity as string) + parseInt(value + '');
                                                                        } else {
                                                                            variables[index2].warehouse_quantity_after_set = value;
                                                                        }
                                                                    }
                                                                    return [...prev];
                                                                });
                                                            }}
                                                            handleClickSave={() => {
                                                                setProducts(prev => {
                                                                    let variables = prev[index].variables;
                                                                    if (variables) {
                                                                        handleClickSaveVariable(variables[index2], index, index2)
                                                                    }
                                                                    return prev;
                                                                })
                                                            }}
                                                        />
                                                    ))
                                                }
                                            </React.Fragment>
                                        ))
                                        :
                                        <TableRow>
                                            <TableCell colSpan={100}>
                                                <NotFound />
                                            </TableCell>
                                        </TableRow>
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
                <CardActions className={classes.actions}>
                    <TablePagination
                        count={paginate.total ? paginate.total * 1 : 0}
                        onPageChange={(_event, v) => {
                            setPaginate(prev => {
                                prev.page = v + 1;
                                return { ...prev };
                            });
                            handleUpdateData();
                        }}
                        onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            setPaginate(prev => ({ ...prev, per_page: Number(event.target.value) }));
                            handleUpdateData();
                        }}
                        page={paginate.current_page ? paginate.current_page - 1 : 0}
                        rowsPerPage={paginate.per_page ? paginate.per_page * 1 : 10}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </CardActions>
                {ajaxInventory.open && <CircularProgress value={75} className={classes.iconLoading} />}
            </Card>
        )
    }

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell style={{ width: 56 }} padding='none'>
                            <Skeleton height={23} width={'100%'} />
                        </TableCell>
                        <TableCell>
                            <Skeleton height={23} width={'100%'} />
                        </TableCell>
                        <TableCell>
                            <Skeleton height={23} width={'100%'} />
                        </TableCell>
                        <TableCell>
                            <Skeleton height={23} width={'100%'} />
                        </TableCell>
                        <TableCell>
                            <Skeleton height={23} width={'100%'} />
                        </TableCell>
                        <TableCell style={{ width: 300 }}>
                            <Skeleton height={23} width={'100%'} />
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>

                    {
                        [...Array(10)].map((_key, index) => (
                            <TableRow key={index}>
                                <TableCell padding='none'>
                                    <Skeleton height={56} width={56} variant="rectangular" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton height={20} width={'100%'} />
                                    <Skeleton height={20} width={'100%'} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton height={36} width={'100%'} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton height={36} width={'100%'} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton height={36} width={'100%'} />
                                </TableCell>
                                <TableCell>
                                    <Box
                                        sx={{
                                            width: 1,
                                            alignItems: "center",
                                            display: "flex",
                                            gridGap: 4
                                        }}
                                    >
                                        <Skeleton width={'100%'} height={36} />
                                        <Skeleton width={'100%'} height={36} />
                                        <Skeleton width={'100%'} height={36} />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </TableContainer>
    )

}

export default Inventory



export interface InventoryItem {
    identifier: {
        id: ID,
        variationKey?: string,
    },
    product_type: string,
    featured_image: ImageProps,
    key: string,
    sku: string,
    stock_status: keyof typeof stock_status,
    title: string,
    variationLabel: false | string,
    warehouse_manage_stock: number,
    warehouse_quantity: string,
    when_sold_out: string,
    count?: number | string,
    warehouse_quantity_after_set?: number | false,
    setType?: 'add' | 'set'
    variables?: InventoryItem[]
}