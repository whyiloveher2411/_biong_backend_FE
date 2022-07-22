import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import CardHeader from 'components/atoms/CardHeader';
import Skeleton from 'components/atoms/Skeleton';
import React from 'react';
import { ReportsProductDetailData } from '.';

function ReturnRate({ data }: {
    data: false | ReportsProductDetailData
}) {
    if (data) {
        return (
            <Card>
                <CardHeader
                    title="Status Rate"
                />
                <CardContent>
                    <div className="google-chart" id="chart_return_rate"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title={<Skeleton variant="rectangular" width={'100%'} style={{ marginBottom: 5 }} height={19} />}
            />
            <CardContent>
                <Box display="flex" alignItems="flex-start">
                    <Skeleton variant="circular" width={196} height={196} style={{ flexShrink: 0, marginRight: 8 }} />
                    <Box display='flex' width={1} flexDirection="column" alignItems="center" >
                        <Skeleton variant="text" width={100} height={15} style={{ marginBottom: 5 }} />
                        <Skeleton variant="text" width={100} height={15} style={{ marginBottom: 5 }} />
                        <Skeleton variant="text" width={100} height={15} style={{ marginBottom: 5 }} />
                        <Skeleton variant="text" width={100} height={15} style={{ marginBottom: 5 }} />
                        <Skeleton variant="text" width={100} height={15} style={{ marginBottom: 5 }} />
                        <Skeleton variant="text" width={100} height={15} style={{ marginBottom: 5 }} />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}

export default ReturnRate
