import { ClassNameMap, colors } from '@mui/material';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import CardHeader from 'components/atoms/CardHeader';
import LinearProgress from 'components/atoms/LinearProgress';
import makeCSS from 'components/atoms/makeCSS';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import { __p } from 'helpers/i18n';
import { fade } from 'helpers/mui4/color';
import { moneyFormat, precentFormat } from 'plugins/Vn4Ecommerce/helpers/Money';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';
import { ReportsProductDetailData } from '.';

const useStyles = makeCSS({
    linear: {
        backgroundColor: 'var(--main)',
        '& .MuiLinearProgress-bar': {
            backgroundColor: 'var(--bar)',
        }
    }
});

function Revenue({ classes, data }: { data: false | ReportsProductDetailData, classes: ClassNameMap }) {
    const classes2 = useStyles();

    if (data) {
        return (
            <Card>
                <CardHeader
                    style={{ display: 'block' }}
                    title={__p('Revenue', PLUGIN_NAME)}
                />
                <CardContent style={{ padding: '16px 24px 16px' }}>
                    <Box
                        sx={{
                            display: "flex",
                            gridGap: 8,
                            alignItems: "baseline"
                        }}
                    >
                        <Typography variant="h3" className={classes.valuePanel}>{moneyFormat(data.order.pricing_detail.rows.revenue + '')}</Typography>
                        {
                            data.order.pricing_detail.rows.order_quantity > 0 &&
                            <Typography style={{ opacity: .7 }}>
                                ({__p('{{quantity}} sold products', PLUGIN_NAME, {
                                    quantity: data.order.pricing_detail.rows.order_quantity
                                })})
                            </Typography>
                        }
                    </Box>
                    <Typography variant="body2">{__p('based on {{total}} completed orders', PLUGIN_NAME, {
                        total: data.status_rate.rows.completed ? data.status_rate.rows.completed : 0
                    })}</Typography>
                    {
                        (() => {
                            return [
                                {
                                    title: __p('Cost', PLUGIN_NAME),
                                    value: data.order.pricing_detail.rows.cost,
                                    precent: data.order.pricing_detail.rows.cost * 100 / (data.order.pricing_detail.rows.revenue > 0 ? data.order.pricing_detail.rows.revenue : 1),
                                    colorLinearProgress: colors.red[500]
                                },
                                {
                                    title: __p('Profit', PLUGIN_NAME),
                                    value: data.order.pricing_detail.rows.profit,
                                    precent: data.order.pricing_detail.rows.profit * 100 / (data.order.pricing_detail.rows.revenue > 0 ? data.order.pricing_detail.rows.revenue : 1),
                                    colorLinearProgress: colors.green[500]
                                },
                                {
                                    title: __p('Tax', PLUGIN_NAME),
                                    value: data.order.pricing_detail.rows.tax,
                                    precent: data.order.pricing_detail.rows.tax * 100 / (data.order.pricing_detail.rows.revenue > 0 ? data.order.pricing_detail.rows.revenue : 1),
                                    colorLinearProgress: colors.deepPurple[500]
                                },
                                {
                                    title: __p('Discount', PLUGIN_NAME),
                                    value: data.order.pricing_detail.rows.discount,
                                    precent: data.order.pricing_detail.rows.discount * 100 / (data.order.pricing_detail.rows.revenue > 0 ? data.order.pricing_detail.rows.revenue : 1),
                                    colorLinearProgress: colors.yellow[500]
                                },
                            ].map((item, index) => (
                                <React.Fragment key={index} >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gridGap: 16,
                                            marginTop: 2,
                                            marginBottom: 1
                                        }}
                                    >
                                        <Typography>{item.title}</Typography>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gridGap: 6,
                                                alignItems: "center"
                                            }}
                                        >
                                            <Typography>{moneyFormat(item.value ? item.value + '' : '0')}</Typography>
                                            <Typography variant='body2'>({precentFormat(item.precent ? item.precent + '' : '0')})</Typography>
                                        </Box>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={item.precent ? item.precent : 0}
                                        className={classes2.linear}
                                        style={{
                                            ['--bar' as string]: item.colorLinearProgress,
                                            ['--main' as string]: fade(item.colorLinearProgress, 0.2),
                                        }}
                                    />
                                </React.Fragment>
                            ))
                        })()
                    }
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent style={{ padding: '16px 24px' }}>
                <Skeleton variant="rectangular" className={classes.titlePanel} width={'100%'} height={20} />
                <Skeleton variant="rectangular" className={classes.valuePanel} width={'100%'} height={28} />
                <Skeleton variant="rectangular" className={classes.valuePanel} width={'100%'} height={15} />
                <Skeleton variant="rectangular" className={classes.titlePanel} width={'100%'} height={20} />
                <Skeleton variant="rectangular" className={classes.valuePanel} width={'100%'} style={{ marginTop: 24 }} height={32} />
                <Skeleton variant="rectangular" className={classes.valuePanel} width={'100%'} style={{ marginTop: 20 }} height={32} />
                <Skeleton variant="rectangular" className={classes.valuePanel} width={'100%'} style={{ marginTop: 20 }} height={32} />
            </CardContent>
        </Card>
    )
}

export default Revenue
