import Typography from 'components/atoms/Typography';
import InputAdornment from 'components/atoms/InputAdornment';
import Grid from 'components/atoms/Grid';
import Skeleton from 'components/atoms/Skeleton';
import { calculatePricing, moneyFormat } from 'plugins/Vn4Ecommerce/helpers/Money';
import React from 'react';
import FieldForm from 'components/atoms/fields/FieldForm';
import { __p } from 'helpers/i18n';

function General(props: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    const { PLUGIN_NAME, postDetail } = props;

    if (props.post) {
        return (
            <Grid
                container
                spacing={3}>
                {
                    postDetail.product_type === 'external' &&
                    <Grid item md={12} xs={12}>
                        <FieldForm
                            component='text'
                            config={{
                                title: __p('Product URL', PLUGIN_NAME),
                                placeholder: 'https://'
                            }}
                            post={props.post}
                            name='product_url'
                            onReview={(value) => {
                                props.onReview(value, 'product_url', true);
                            }}
                        />
                    </Grid>
                }
                <Grid item md={6} xs={12}>
                    <FieldForm
                        component='number'
                        config={{
                            title: __p('Price', PLUGIN_NAME),
                            note: ' ',
                            maxLength: 70,
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={props.post}
                        name='price'
                        onReview={(value) => {
                            props.onReview((prev: JsonFormat) => (
                                [null, {
                                    ...calculatePricing({
                                        ...prev.post.ecom_prod_detail,
                                        price: value
                                    })
                                }]
                            ), null, true);
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
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={props.post}
                        name='compare_price'
                        onReview={(value) => {
                            props.onReview((prev: JsonFormat) => (
                                [null, {
                                    ...calculatePricing({
                                        ...prev.post.ecom_prod_detail,
                                        compare_price: value
                                    })
                                }]
                            ), null, true);
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
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={props.post}
                        name='cost'
                        onReview={(value) => {
                            props.onReview((prev: JsonFormat) => (
                                [null, {
                                    ...calculatePricing({
                                        ...prev.post.ecom_prod_detail,
                                        cost: value
                                    })
                                }]
                            ), null, true);
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




                <Grid item md={6} xs={12}>
                    <FieldForm
                        component='number'
                        config={{
                            title: __p('Price Offline', PLUGIN_NAME),
                            note: ' ',
                            maxLength: 70,
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={postDetail}
                        name='price_offline'
                        onReview={(value) => {
                            props.onReview(value, 'price_offline')
                        }}
                    />
                </Grid>

                <Grid item md={12} xs={12}>
                    <FieldForm
                        component='group'
                        config={{
                            title: __p('Discount Info', PLUGIN_NAME),
                            sub_fields:{
                                title: {
                                    title: 'Title',
                                    view: 'text',
                                },
                                start_time: {
                                    title: 'Start Time',
                                    view: 'date_time',
                                },
                                end_time: {
                                    title: 'End Time',
                                    view: 'date_time',
                                },
                                note: {
                                    title: 'Note',
                                    view: 'editor',
                                },
                            },
                            note: 'Những thông tin sẽ được xuất hiện để user có thể biết được thông tin khuyến mãi',
                        }}
                        post={postDetail}
                        name='discount_info'
                        onReview={(value) => {
                            props.onReview(value, 'discount_info')
                        }}
                    />
                </Grid>

                <Grid item md={6} xs={12}>
                    <FieldForm
                        component='number'
                        config={{
                            title: __p('Compare at price Offline', PLUGIN_NAME),
                            note: ' ',
                            maxLength: 70,
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={postDetail}
                        name='compare_price_offline'
                        onReview={(value) => {
                            props.onReview(value, 'compare_price_offline')
                        }}
                    />
                </Grid>


                <Grid item md={6} xs={12}>
                    <FieldForm
                        component='number'
                        config={{
                            title: __p('Price Online (Zoom)', PLUGIN_NAME),
                            note: ' ',
                            maxLength: 70,
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={postDetail}
                        name='price_online'
                        onReview={(value) => {
                            props.onReview(value, 'price_online')
                        }}
                    />
                </Grid>
                <Grid item md={6} xs={12}>
                    <FieldForm
                        component='number'
                        config={{
                            title: __p('Compare at price Online', PLUGIN_NAME),
                            note: ' ',
                            maxLength: 70,
                            inputProps: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }
                        }}
                        post={postDetail}
                        name='compare_price_online'
                        onReview={(value) => {
                            props.onReview(value, 'compare_price_online')
                        }}
                    />
                </Grid>



                {/* <Grid item md={12} xs={12}>
                    <FieldForm
                        compoment={'dateTime'}
                        config={{
                            title: 'Date of sale'
                        }}
                        post={props.post}
                        name={'general_date_of_sale'}
                        onReview={(value) => {
                            props.onReview(value, 'general_date_of_sale');
                        }}
                    />
                </Grid> */}
                {/* <Grid item md={12} xs={12}>
                    <FieldForm
                        compoment={'date_range'}
                        config={{
                            title: 'Special Price From',
                            names: ['general_special_price_from', 'general_special_price_to'],
                        }}
                        post={props.post}
                        name={'general_special_price'}
                        onReview={props.onReview}
                    />
                </Grid> */}

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
                            props.onReview((prev: JsonFormat) => (
                                [null, {
                                    ...calculatePricing({
                                        ...prev.post.ecom_prod_detail,
                                        enable_tax: value
                                    })
                                }]
                            ), null, true);
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
                                onReview={(_value, key: ANY) => {
                                    props.onReview((prev: JsonFormat) => {
                                        return [null, {
                                            ...calculatePricing({
                                                ...prev.post.ecom_prod_detail,
                                                ...key
                                            })
                                        }];
                                    }, null, true);
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
        )
    }

    return <Grid
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
}

export default General
