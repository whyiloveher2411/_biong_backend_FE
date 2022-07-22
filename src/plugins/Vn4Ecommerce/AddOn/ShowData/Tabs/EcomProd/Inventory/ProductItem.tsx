
import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import ButtonGroup from 'components/atoms/ButtonGroup';
import FieldForm from 'components/atoms/fields/FieldForm';
import Icon from 'components/atoms/Icon';
import TableCell from 'components/atoms/TableCell';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';
import { InventoryItem, stock_status } from '.';



const ProductItem = ({ product, index, handleChangeSetType, setProducts, handleClickSave }: {
    product: InventoryItem,
    index: number,
    handleChangeSetType: (type: 'add' | 'set', index: number) => void,
    setProducts: React.Dispatch<React.SetStateAction<InventoryItem[]>>,
    handleClickSave: (product: InventoryItem, index: number) => void,
}) => {
    return (
        <TableRow key={product.key}>
            <TableCell>
                <Avatar variant="square" style={{ width: 56, height: 56 }} image={product.featured_image} name={product.title} />
            </TableCell>
            <TableCell padding='none'></TableCell>
            <TableCell>
                <Typography variant="body2">#{product.identifier.id}</Typography>
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
                                {stock_status[product.stock_status as keyof typeof stock_status]?.title}
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
                                color="inherit"
                                onClick={() => {
                                    handleChangeSetType('add', index);
                                }}
                            >
                                {__p('Add', PLUGIN_NAME)}
                            </Button>
                            <Button
                                style={product.setType === 'set' ? { width: 60, backgroundColor: '#e0e0e0', color: 'black' } : { width: 60 }}
                                key="two"
                                color="inherit"
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
                                    setProducts((prev: InventoryItem[]) => {

                                        prev[index].count = value;

                                        if (!prev[index].setType || prev[index].setType === 'add') {
                                            prev[index].warehouse_quantity_after_set = parseInt(prev[index].warehouse_quantity) + parseInt(value);
                                        } else {
                                            prev[index].warehouse_quantity_after_set = value;
                                        }

                                        return [...prev];
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
    )
}

export default ProductItem;