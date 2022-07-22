import { ClassNameMap } from '@mui/material';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Icon from 'components/atoms/Icon';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';
import { ReportsProductDetailData } from '.';

function Reviews({ classes, data }: { data: false | ReportsProductDetailData, classes: ClassNameMap }) {

    if (data) {
        return (
            <Card>
                <CardContent>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gridGap: 8,
                            marginBottom: 1
                        }}
                    >
                        <Icon icon="StarRounded" style={{ color: 'rgb(244, 180, 0)', fontSize: 32 }} />
                        <Typography variant="h3" className={classes.valuePanel} style={{ margin: 0, fontSize: 32 }}>{data.review.average}</Typography>
                    </Box>
                    <Typography variant="body2">{__p('based on {{total}} approved reviews', PLUGIN_NAME, {
                        total: data.review.total
                    })}</Typography>
                    <div id="chart_reviews"></div>
                </CardContent>
            </Card >
        )
    }

    return (
        <Card>
            <CardContent>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gridGap: 8,
                        marginBottom: 1
                    }}
                >
                    <Skeleton variant="rectangular" style={{ color: 'rgb(244, 180, 0)', fontSize: 32 }} width={32} height={32} />
                    <Skeleton variant="rectangular" className={classes.valuePanel} style={{ margin: 0, fontSize: 32 }} width={'100%'} height={32} />
                </Box>
                <Skeleton variant="rectangular" className={classes.titlePanel} width={'100%'} height={20} />
                <Skeleton variant="rectangular" width={'100%'} height={199} />
            </CardContent>
        </Card>
    )
}

export default Reviews
