import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import InputAdornment from 'components/atoms/InputAdornment';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import { __p } from 'helpers/i18n';
import { calculatePricing, moneyFormat } from 'plugins/Vn4Ecommerce/helpers/Money';
import React from 'react';

function Pricing(props: {
    PLUGIN_NAME: string,
    post: JsonFormat,
    onReview: (value: ANY, key?: ANY) => void
}) {

    const { PLUGIN_NAME } = props;

    if (props.post) {
        return (
            <Card>
                <CardContent>
                    <Grid
                        container
                        spacing={3}>
                        <Grid item md={12} xs={12}>
                            <Typography variant="subtitle1" style={{ marginBottom: 8 }}>{__p('Pricing', PLUGIN_NAME)}</Typography>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <FieldForm
                                component='number'
                                config={{
                                    title: __p('Price', PLUGIN_NAME),
                                    note: ' ',
                                    maxLength: 70,
                                    inputProps:{
                                        startAdornment:<InputAdornment position="start">$</InputAdornment>
                                    }
                                }}
                                post={props.post}
                                name='price'
                                onReview={(value) => {
                                    props.onReview((prev: ProductVariableProps) => (
                                        [null, {
                                            ...calculatePricing({
                                                ...prev,
                                                price: value
                                            })
                                        }]
                                    ));
                                }}
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <FieldForm
                                component='number'
                                config={{
                                    title: __p('Compare at price', PLUGIN_NAME),
                                    note: ' ',
                                    maxLength: 70,
                                    inputProps:{
                                        startAdornment:<InputAdornment position="start">$</InputAdornment>
                                    }
                                }}
                                post={props.post}
                                name='compare_price'
                                onReview={(value) => {
                                    props.onReview((prev: ProductVariableProps) => (
                                        [null, {
                                            ...calculatePricing({
                                                ...prev,
                                                compare_price: value
                                            })
                                        }]
                                    ));
                                }}
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <FieldForm
                                component='number'
                                config={{
                                    title: __p('Cost per item', PLUGIN_NAME),
                                    note: __p('Customers won’t see this', PLUGIN_NAME),
                                    maxLength: 70,
                                    inputProps:{
                                        startAdornment:<InputAdornment position="start">$</InputAdornment>
                                    }
                                }}
                                post={props.post}
                                name='cost'
                                onReview={(value) => {
                                    props.onReview((prev: ProductVariableProps) => (
                                        [null, {
                                            ...calculatePricing({
                                                ...prev,
                                                cost: value
                                            })
                                        }]
                                    ));
                                }}
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Grid container spacing={3}>
                                <Grid item md={4} xs={12}>
                                    <Typography variant="body2">{__p('Margin', PLUGIN_NAME)}</Typography>
                                    <Typography variant="body1">
                                        {props.post.profit_margin ?
                                            props.post.profit_margin + '%'
                                            :
                                            '-'
                                        }
                                    </Typography>
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Typography variant="body2">{__p('Profit', PLUGIN_NAME)}</Typography>
                                    <Typography variant="body1">
                                        {props.post.profit ?
                                            moneyFormat(props.post.profit)
                                            :
                                            '-'
                                        }
                                    </Typography>
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Typography variant="body2">{__p('Percent discount', PLUGIN_NAME)}</Typography>
                                    <Typography variant="body1">
                                        {props.post.percent_discount ?
                                            props.post.percent_discount + '%'
                                            :
                                            '-'
                                        }
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item md={12} xs={12}>
                            <FieldForm
                                component={'true_false'}
                                config={{
                                    title: __p('Charge tax on this product', PLUGIN_NAME),
                                    defaultValue: true,
                                }}
                                post={props.post}
                                name={'enable_tax'}
                                onReview={(value) => {
                                    props.onReview((prev: ProductVariableProps) => (
                                        [null, {
                                            ...calculatePricing({
                                                ...prev,
                                                enable_tax: value
                                            })
                                        }]
                                    ));
                                }}
                            />
                        </Grid>
                        {
                            Boolean(props.post.enable_tax === undefined || props.post.enable_tax) &&
                            <>
                                <Grid item md={6} xs={12}>
                                    <FieldForm
                                        component={'relationship_onetomany'}
                                        config={{
                                            title: __p('Tax class', PLUGIN_NAME),
                                            object: 'ecom_tax',
                                        }}
                                        post={props.post}
                                        getOptionLabel={(option: JsonFormat) => {
                                            if (option?.id) {
                                                return option.title + (option.percentage ? ' (' + Number((parseFloat(option.percentage)).toFixed(6)) + '%)' : '')
                                            }
                                            return '';
                                        }}
                                        renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option: JsonFormat) => (
                                            <li {...props} key={option.id} >
                                                {option.title} {option.percentage && '(' + Number((parseFloat(option.percentage)).toFixed(6)) + '%)'}
                                            </li>
                                        )}
                                        name={'tax_class'}
                                        onReview={(_value, key) => {
                                            props.onReview((prev: ProductVariableProps) => {
                                                return [null, {
                                                    ...calculatePricing({
                                                        ...prev,
                                                        ...key as JsonFormat
                                                    })
                                                }];
                                            });
                                        }}
                                    />
                                </Grid>
                                <Grid item md={6} xs={12}>
                                    <Typography variant="body2">{__p('Price after tax', PLUGIN_NAME)}</Typography>
                                    <Typography variant="body1">
                                        {props.post.price_after_tax ?
                                            moneyFormat(props.post.price_after_tax)
                                            :
                                            '-'
                                        }
                                    </Typography>
                                </Grid>
                            </>
                        }
                    </Grid>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent>
                <Grid
                    container
                    spacing={3}>
                    <Grid item md={6} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={52} />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={52} />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={52} />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={52} />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={52} />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}

export default Pricing

interface ProductVariableProps {
    [key: string]: ANY,
    price: number,
    compare_price: number,
    cost: number,
    enable_tax: boolean,
    tax_class_detail: string | {
        percentage: number
    },
    tax_class: string
}