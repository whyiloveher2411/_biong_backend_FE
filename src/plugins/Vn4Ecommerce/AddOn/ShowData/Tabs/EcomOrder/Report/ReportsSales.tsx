import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import CardHeader from 'components/atoms/CardHeader';
import MoreButton from 'components/atoms/MoreButton';
import Skeleton from 'components/atoms/Skeleton';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';
import { ReportsProductDetailData } from '.';

function ReportsSales({ data, time }: { time: string, data: false | ReportsProductDetailData }) {

    if (data) {
        return (
            <Card>
                <CardHeader
                    action={
                        <MoreButton
                            title={__p('Change time', PLUGIN_NAME)}
                            actions={[data.time.time_report_more_button]}
                            selected={time}
                            autoFocus={false}
                        />
                    }
                    title="Reports Sales"
                    subheader={data.time.time_report_more_button[time].title}
                />
                <CardContent>
                    <div id="chart_reports_sales"></div>
                </CardContent>
            </Card>
        )
    }
    return (
        <Card>
            <CardHeader
                title={<Skeleton variant="rectangular" width={'100%'} style={{ marginBottom: 5 }} height={19} />}
                subheader={<Skeleton variant="rectangular" width={'100%'} height={17} />}
            />
            <CardContent>
                <Skeleton variant="rectangular" width={'100%'} height={200} />
            </CardContent>
        </Card>
    )
}

export default ReportsSales
