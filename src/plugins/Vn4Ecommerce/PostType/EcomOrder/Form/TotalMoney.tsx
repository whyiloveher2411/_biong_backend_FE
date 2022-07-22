import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';

import ListItemText from 'components/atoms/ListItemText';
import ListItemIcon from 'components/atoms/ListItemIcon';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import Menu from 'components/atoms/Menu';
import MenuItem from 'components/atoms/MenuItem';
import Typography from 'components/atoms/Typography';
import { moneyFormat } from 'plugins/Vn4Ecommerce/helpers/Money';
import React from 'react';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import { __p } from 'helpers/i18n';

export function calculateTotal(products: {
    items: JsonFormat[],
    total: number,
}, coupons: {
    items: JsonFormat[],
    total: number,
}, discount: {
    type: string,
    value: number,
}): number {

    let total = products.total - coupons.total
        - (discount.value ? discount.type === '%' ? Number((products.total * discount.value / 100).toFixed(2)) : discount.value : 0);

    if (total > 0) return total;

    return 0;
}

function TotalMoney(props: FieldFormItemProps) {
    const { post } = props;

    const [products, setProducts] = React.useState<{
        items: JsonFormat[],
        total: number,
    }>({ items: [], total: 0 });
    const [coupons, setCoupons] = React.useState({ items: [], total: 0 });

    const [discount, setDiscount] = React.useState({
        type: '$',
        value: 0
    });

    const [openDiscountForm, setOpenDiscountForm] = React.useState(false);

    React.useEffect(() => {

        let valueInital: {
            items: JsonFormat[],
            total: number,
        } = { items: [], total: 0 };

        try {
            if (post.products && typeof post.products === 'object') {
                valueInital = post.products;
            } else {
                if (post.products) {
                    valueInital = JSON.parse(post.products);
                }
            }
        } catch (error) {
            valueInital = { items: [], total: 0 };
        }

        let valueInitalDiscount = {
            type: '$',
            value: 0
        };

        try {
            if (post.discount && typeof post.discount === 'object') {
                valueInitalDiscount = post.discount;
            } else {
                if (post.discount) {
                    valueInitalDiscount = JSON.parse(post.discount);
                }
            }
        } catch (error) {
            valueInitalDiscount = {
                type: '$',
                value: 0
            };
        }

        if (!valueInitalDiscount.type) valueInitalDiscount.type = '$';

        setDiscount(valueInitalDiscount);
        setProducts(valueInital);

    }, [post.products]);

    React.useEffect(() => {

        let valueInital = { items: [], total: 0 };
        try {
            if (post.coupons && typeof post.coupons === 'object') {
                valueInital = post.coupons;
            } else {
                if (post.coupons) {
                    valueInital = JSON.parse(post.coupons);
                }
            }
        } catch (error) {
            valueInital = { items: [], total: 0 };
        }

        setCoupons(valueInital);

    }, [post.coupons]);

    const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);

    const onChangeDiscountType = (type = discount.type, value = discount.value) => {
        setDiscount(() => ({
            value: value,
            type: type
        }));
        props.onReview({
            value: value,
            type: type
        }, 'discount');
        setAnchorEl(null);
    }

    const handleApplyDiscount = () => {
        props.onReview({
            value: discount.value,
            type: discount.type
        }, 'discount');
        setOpenDiscountForm(false);
    }

    return (
        <>
            <Divider color="dark" style={{ marginBottom: 32 }} />
            <Box width={320} display="flex" alignItems="centeer" justifyContent="space-between">
                <Typography align="right" style={{ margin: '8px 0' }}>Items Subtotal: </Typography>
                <Typography align="right" style={{ margin: '8px 0' }}>{moneyFormat(products.total)}</Typography>

            </Box>
            <Box width={320} display="flex" alignItems="centeer" justifyContent="space-between">
                <Typography align="right" style={{ margin: '8px 0' }}>Coupons: </Typography>
                <Typography align="right" style={{ margin: '8px 0' }}>- {moneyFormat(coupons.total)}</Typography>

            </Box>
            <Box width={320} display="flex" alignItems="centeer" justifyContent="space-between">
                <Typography align="right" style={{ margin: '8px 0' }}>Discount:</Typography>
                {
                    openDiscountForm ?
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                flexWrap: "wrap",
                                gridGap: 8
                            }}
                        >
                            <FieldForm
                                style={{ marginLeft: 8 }}
                                component='number'
                                config={{
                                    title: false,
                                    forceRender: true,
                                    inputProps: {
                                        endAdornment: <InputAdornment style={{ cursor: 'pointer' }} onClick={(e: React.MouseEvent<HTMLDivElement>) => setAnchorEl(e.currentTarget)} position="end">
                                            <Icon icon="ArrowDropDownRounded" />
                                        </InputAdornment>,
                                        startAdornment: <InputAdornment style={{ cursor: 'pointer' }} onClick={(e: React.MouseEvent<HTMLDivElement>) => setAnchorEl(e.currentTarget)} position="start">
                                            {
                                                discount.type === '%' ? '%' : '$'
                                            }
                                        </InputAdornment>
                                    }
                                }}
                                post={discount}
                                name='value'
                                onReview={(value) => setDiscount(prev => ({ ...prev, value: value }))}
                            />
                            <Button onClick={handleApplyDiscount} variant="contained" color="primary">Apply</Button>
                        </Box>
                        :
                        discount.value ?
                            <Typography onClick={() => setOpenDiscountForm(true)} align="right" style={{ textDecoration: 'underline', cursor: 'pointer', margin: '8px 0' }}>-
                                {
                                    discount.type === '%' ?
                                        moneyFormat(Number((products.total * discount.value / 100).toFixed(2))) + ' (' + discount.value + '%)'
                                        :
                                        moneyFormat(discount.value)
                                }
                            </Typography>
                            :
                            <IconButton size="small" onClick={() => setOpenDiscountForm(true)} style={{ marginRight: -8 }}>
                                <Icon icon="AddRounded" />
                            </IconButton>
                }

            </Box>
            <Box width={320} display="flex" alignItems="centeer" justifyContent="space-between">
                <Typography align="right" style={{ margin: '8px 0' }}>Shipping:</Typography>
                <Typography align="right" style={{ margin: '8px 0' }}>{moneyFormat(0)}</Typography>
            </Box>
            <Box width={320} display="flex" alignItems="centeer" justifyContent="space-between">
                <Typography align="right" style={{ margin: '8px 0' }}>Total:</Typography>
                <Typography align="right" style={{ margin: '8px 0' }}>{moneyFormat(calculateTotal(products, coupons, discount))}
                </Typography>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem
                    onClick={() => onChangeDiscountType('%')}
                >
                    <ListItemIcon>
                        <Icon icon="PercentRounded" />
                    </ListItemIcon>
                    <ListItemText>{__p('Discount as a percentage of the total amount', PLUGIN_NAME)}</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => onChangeDiscountType('$')}
                >
                    <ListItemIcon>
                        <Icon icon="AttachMoneyRounded" />
                    </ListItemIcon>
                    <ListItemText>{__p('Fixed money reduction', PLUGIN_NAME)}</ListItemText>
                </MenuItem>
            </Menu>

        </>
    )
}

export default TotalMoney
