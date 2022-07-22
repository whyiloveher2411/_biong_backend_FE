import Avatar, { ImageProps } from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import ButtonGroup from 'components/atoms/ButtonGroup';
import FieldForm from 'components/atoms/fields/FieldForm';
import Icon from 'components/atoms/Icon';
import Skeleton from 'components/atoms/Skeleton';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import NotFound from 'components/molecules/NotFound';
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import { __p } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';

const stock_status = {
    instock: { title: __p('In stock', PLUGIN_NAME), color: '#7ad03a' },
    outofstock: { title: __p('Out of stock', PLUGIN_NAME), color: '#a44' },
    onbackorder: { title: __p('On backorder', PLUGIN_NAME), color: '#eaa600' },
};

function Inventory({ data }: CreatePostAddOnProps) {

    const [products, setProducts] = React.useState<Array<InventoryItem> | false>(false);

    const ajaxInventory = useAjax();

    React.useEffect(() => {
        ajaxInventory.ajax({
            url: 'plugin/vn4-ecommerce/inventory/product-detail',
            data: {
                id: data.post.id,
            },
            success: (result: {
                products: Array<InventoryItem>
            }) => {
                if (result.products) {
                    setProducts(result.products);
                }
            },
        });
    }, []);

    const handleClickSave = (product: InventoryItem, index: number) => {
        ajaxInventory.ajax({
            url: 'plugin/vn4-ecommerce/inventory/product-detail',
            data: {
                id: data.post.id,
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

    const handleChangeSetType = (type: 'add' | 'set', index: number) => {
        setProducts(prev => {

            if (prev && prev[index]) {
                prev[index].setType = type;
                if (!prev[index].setType || prev[index].setType === 'add') {
                    prev[index].warehouse_quantity_after_set = parseInt(prev[index].warehouse_quantity) + (parseInt(prev[index].count + '') > 0 ? parseInt(prev[index].count + '') : 0);
                } else {
                    prev[index].warehouse_quantity_after_set = parseInt(prev[index].count + '') > 0 ? parseInt(prev[index].count + '') : 0;
                }

                return [...prev];
            }
            return prev;

        })
    }

    if (products) {

        return (
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
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
                                    <TableRow key={product.key}>
                                        <TableCell padding='none'>
                                            <Avatar variant="square" style={{ width: 56, height: 56 }} image={product.featured_image} name={product.title} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant='h6'>{product.title}</Typography>
                                            {
                                                product.variationLabel !== false &&
                                                <Typography>{product.variationLabel}</Typography>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {product.sku}
                                        </TableCell>
                                        <TableCell>
                                            {
                                                Boolean(product.warehouse_manage_stock) &&
                                                <>
                                                    {
                                                        product.when_sold_out === 'no' ?
                                                            __p('Stop selling', PLUGIN_NAME) :
                                                            __p('Continue selling', PLUGIN_NAME)
                                                    }
                                                </>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gridGap: 4
                                                }}
                                            >

                                                {
                                                    product.warehouse_manage_stock ?
                                                        <>
                                                            {product.warehouse_quantity}
                                                            {
                                                                Boolean(product.warehouse_quantity_after_set !== false && !isNaN(product.warehouse_quantity_after_set as number) && parseInt(product.warehouse_quantity_after_set + '') !== parseInt(product.warehouse_quantity)) &&
                                                                <>
                                                                    <Icon icon={{ custom: '<path d="M8 16a.999.999 0 0 1-.707-1.707L11.586 10 7.293 5.707a.999.999 0 1 1 1.414-1.414l5 5a.999.999 0 0 1 0 1.414l-5 5A.997.997 0 0 1 8 16z"></path>' }} />
                                                                    <Typography style={{ borderRadius: 4, backgroundColor: '#ffea8a', color: 'rgb(32, 34, 35)', padding: '0 4px', display: 'inline-block' }}>
                                                                        {product.warehouse_quantity_after_set}
                                                                    </Typography>
                                                                </>
                                                            }
                                                        </>
                                                        :
                                                        <>
                                                            {stock_status[product.stock_status]?.title}
                                                        </>
                                                }
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {
                                                Boolean(product.warehouse_manage_stock) &&
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gridGap: 4
                                                    }}
                                                >
                                                    <ButtonGroup size="small" aria-label="small outlined button group">
                                                        <Button
                                                            style={(!product.setType || product.setType === 'add') ? { width: 60, backgroundColor: '#e0e0e0', color: 'black' } : { width: 60 }}
                                                            key="one"
                                                            onClick={() => {
                                                                handleChangeSetType('add', index);
                                                            }}
                                                        >
                                                            {__p('Add', PLUGIN_NAME)}
                                                        </Button>
                                                        <Button
                                                            style={product.setType === 'set' ? { width: 60, backgroundColor: '#e0e0e0', color: 'black' } : { width: 60 }}
                                                            color="inherit"
                                                            key="two"
                                                            onClick={() => {
                                                                handleChangeSetType('set', index);
                                                            }}
                                                        >
                                                            {__p('Set', PLUGIN_NAME)}
                                                        </Button>
                                                    </ButtonGroup>
                                                    <div style={{ width: 75 }}>
                                                        <FieldForm
                                                            component="number"
                                                            config={{
                                                                title: false,
                                                                size: 'small',
                                                                forceRender: true,
                                                            }}
                                                            post={{ count: product.count ? product.count : 0 }}
                                                            name="count"
                                                            onReview={(value) => {
                                                                setProducts(prev => {
                                                                    if (prev) {
                                                                        prev[index].count = value;

                                                                        if (!prev[index].setType || prev[index].setType === 'add') {
                                                                            prev[index].warehouse_quantity_after_set = parseInt(prev[index].warehouse_quantity) + parseInt(value);
                                                                        } else {
                                                                            prev[index].warehouse_quantity_after_set = value;
                                                                        }

                                                                        return [...prev];
                                                                    }
                                                                    return prev;
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <Button
                                                        size="small"
                                                        disabled={!(product.warehouse_quantity_after_set !== false && !isNaN(product.warehouse_quantity_after_set as number) && parseInt(product.warehouse_quantity_after_set + '') !== parseInt(product.warehouse_quantity))}
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={() => handleClickSave(product, index)}
                                                    >
                                                        {__p('Save', PLUGIN_NAME)}
                                                    </Button>
                                                </Box>
                                            }
                                        </TableCell>
                                    </TableRow>
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
            </TableContainer >
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

interface InventoryItem {
    identifier: {
        id: ID,
        variationKey?: string,
    },
    key: string,
    sku: string,
    stock_status: keyof typeof stock_status,
    featured_image: ImageProps,
    title: string,
    variationLabel: false | string,
    warehouse_manage_stock: number,
    warehouse_quantity: string,
    when_sold_out: string,
    count?: number | string,
    warehouse_quantity_after_set?: number | false,
    setType?: 'add' | 'set'
}