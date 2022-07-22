import { Theme, useTheme } from '@mui/material';
import Grid from 'components/atoms/Grid';
import makeCSS from 'components/atoms/makeCSS';
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import { addScript } from 'helpers/script';
import useAjax from 'hook/useApi';
import { moneyFormat } from 'plugins/Vn4Ecommerce/helpers/Money';
import React from 'react';
import Channel from './Channel';
import ReportsSales from './ReportsSales';
import ReturnRate from './ReturnRate';
import Revenue from './Revenue';
import Reviews from './Reviews';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        '& svg>g>g>g:nth-child(1) rect, & svg>g>g>g:nth-child(3) rect': {
            fill: theme.palette.divider + ' !important',
        },
        '& svg>text': {
            fill: theme.palette.text.primary
        },
        '& .google-visualization-tooltip-item': {
            whiteSpace: 'nowrap',
        }
    },
    titlePanel: {
        color: theme.palette.grey.A200,
        fontWeight: 'normal', marginBottom: 8,
        fontSize: 15
    },
    valuePanel: {
        marginBottom: 8,
        fontSize: 26
    },
}));

const createCustomHTMLContentReportsSales = (item: {
    [key: string]: string | number;
}) => {
    return `<ul class="google-visualization-tooltip-item-list">
            <li class="google-visualization-tooltip-item"><span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: bold;">${item.date}</span></li>
            <li class="google-visualization-tooltip-item">
                <div class="google-visualization-tooltip-square" style="background-color: #ff9900;"></div>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: none;"> Tax:</span>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: bold;"> ${moneyFormat(item.tax)} </span>
            </li>
            <li class="google-visualization-tooltip-item">
                <div class="google-visualization-tooltip-square" style="background-color: #dc3912;"></div>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: none;"> Profit:</span>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: bold;"> ${moneyFormat(item.profit)}</span>
            </li>
            <li class="google-visualization-tooltip-item">
                <div class="google-visualization-tooltip-square" style="background-color: #3366cc;"></div>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: none;"> Cost:</span>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: bold;"> ${moneyFormat(item.cost)}</span>
            </li>
            <li class="google-visualization-tooltip-item">
                <div class="google-visualization-tooltip-square" style="background-color: #fff;"></div>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: none;"> Revenue:</span>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: bold;"> ${moneyFormat(item.revenue)} </span>
            </li>
            <li class="google-visualization-tooltip-item">
                <div class="google-visualization-tooltip-square" style="background-color: #fff;"></div>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: none;"> Quantity:</span>
                <span style="font-family: Arial; font-size: 12px; color: #000000; opacity: 1; margin: 0; font-style: none; text-decoration: none; font-weight: bold;"> ${item.order_quantity} </span>
            </li>
        </ul>`
}

function Report(props: CreatePostAddOnProps) {

    const classes = useStyles();

    const theme = useTheme();

    const [dataApi, setDataApi] = React.useState<ReportsProductDetailData | false>(false);

    const [time, setTime] = React.useState('last1Year');

    const ajaxReport = useAjax();

    React.useEffect(() => {
        ajaxReport.ajax({
            url: 'plugin/vn4-ecommerce/reports/product-detail',
            data: {
                id: props.data.post.id,
                time: time
            },
            success: (result: ReportsProductDetailData) => {
                if (result.time) {
                    addChart(result);
                }
            },
        });
    }, [time]);

    const addChart = (dataFromApi: ReportsProductDetailData) => {

        addScript("https://www.gstatic.com/charts/loader.js", 'googleCharts', () => {

            let timeCustom: {
                [key: string]: {
                    title: string,
                    action: () => void,
                }
            } = {};

            Object.keys(dataFromApi.time.time_report).forEach(key => {
                timeCustom[key] = {
                    title: dataFromApi.time.time_report[key] as string,
                    action: () => { setTime(key) },
                };
            });

            setDataApi(() => ({
                ...dataFromApi,
                time: {
                    ...dataFromApi.time,
                    time_report_more_button: timeCustom
                }
            }));

            window.google.charts.load('current', { packages: ['corechart', 'line'] });
            window.google.charts.setOnLoadCallback(drawBasic);

            function drawBasic() {
                setTimeout(() => {
                    if (document.getElementById('chart_reports_sales')) {
                        let data = new window.google.visualization.DataTable();
                        data.addColumn('string', 'Date');
                        data.addColumn({ 'type': 'string', 'role': 'tooltip', 'p': { 'html': true } });
                        data.addColumn('number', 'Cost');
                        data.addColumn('number', 'Profit');
                        data.addColumn('number', 'Tax');

                        // data.addRows(dataApi.order.rows);

                        dataFromApi.order.rows.forEach(item => {
                            let itemdata = [
                                item.date,
                                createCustomHTMLContentReportsSales(item),
                                item.cost,
                                item.profit,
                                item.tax
                            ];
                            data.addRow(itemdata);
                        });

                        let options = {
                            backgroundColor: 'transparent',
                            legend: { position: 'top', textStyle: { color: theme.palette.text.secondary } },
                            crosshair: { orientation: 'vertical', trigger: 'focus', color: theme.palette.text.disabled },
                            curveType: 'function',
                            // colors: [colors.red[500], colors.green[500], colors.deepPurple[500]],
                            isStacked: true,
                            focusTarget: 'category',
                            tooltip: { isHtml: true, showColorCode: true },
                            chartArea: {
                                top: 10,
                                bottom: 10,
                                right: 0,
                                left: 30,
                                stroke: '#dedede',
                            },
                            hAxis: {
                                title: 'Date',
                                viewWindowMode: 'explicit',
                                viewWindow: {
                                    min: 0
                                },
                                gridlines: { count: 3, color: theme.palette.divider },
                                titleTextStyle: {
                                    color: theme.palette.text.secondary
                                },
                                textStyle: {
                                    color: theme.palette.text.secondary
                                }
                            },
                            vAxis: {
                                viewWindowMode: 'explicit',
                                viewWindow: {
                                    min: 0
                                },
                                format: 'short',
                                gridlines: { count: 3, color: theme.palette.divider },
                                titleTextStyle: {
                                    color: theme.palette.text.secondary
                                },
                                textStyle: {
                                    color: theme.palette.text.secondary
                                }
                            }
                        };

                        let chart = new window.google.visualization.ColumnChart(document.getElementById('chart_reports_sales'));

                        chart.draw(data, options);
                    }

                    if (document.getElementById('chart_channel')) {

                        let data = new window.google.visualization.DataTable();
                        data.addColumn('string', 'Chnnel');
                        data.addColumn('number', 'Count');

                        let colors: string[] = [];

                        Object.keys(dataFromApi.channels.rows).map(key => {
                            if (dataFromApi.channels.headers[key]) {
                                data.addRow([dataFromApi.channels.headers[key].title, dataFromApi.channels.rows[key]]);
                                colors.push(dataFromApi.channels.headers[key].color);
                            }
                        });

                        let options = {
                            backgroundColor: 'transparent',
                            fontSize: 13,
                            pieHole: 0.5,
                            pieSliceBorderColor: 'transparent',
                            colors: colors,
                            chartArea: {
                                height: 300,
                                width: 400,
                                left: 8,
                                top: 8,
                                right: 8,
                                bottom: 8
                            },
                            legend: { textStyle: { color: theme.palette.text.secondary } },
                        };

                        let chart = new window.google.visualization.PieChart(document.getElementById('chart_channel'));
                        chart.draw(data, options);
                    }

                    if (document.getElementById('chart_return_rate')) {
                        let data = new window.google.visualization.DataTable();
                        data.addColumn('string', 'Status');
                        data.addColumn('number', 'Rate');

                        let colors: string[] = [];
                        Object.keys(dataFromApi.status_rate.rows).map(key => {
                            if (dataFromApi.status_rate.headers[key]) {
                                data.addRow([dataFromApi.status_rate.headers[key].title, dataFromApi.status_rate.rows[key]]);
                                colors.push(dataFromApi.status_rate.headers[key].color);
                            }
                        });

                        let options = {
                            backgroundColor: 'transparent',
                            fontSize: 13,
                            pieSliceBorderColor: 'transparent',
                            colors: colors,
                            chartArea: {
                                height: 300,
                                width: 400,
                                left: 8,
                                top: 8,
                                right: 8,
                                bottom: 8
                            },
                            legend: { textStyle: { color: theme.palette.text.secondary } },
                        };

                        let chart = new window.google.visualization.PieChart(document.getElementById('chart_return_rate'));
                        chart.draw(data, options);
                    }

                    if (document.getElementById('chart_reviews')) {
                        let dataReview: Array<[string, number]> = [];

                        for (let i = 5; i > 0; i--) {
                            dataReview.push(['x' + i, dataFromApi.review.rows[i - 1] ?? 0]);
                        }

                        let data = window.google.visualization.arrayToDataTable([
                            ['Element', 'Count'],
                            ...dataReview
                        ]);
                        let options = {
                            backgroundColor: 'transparent',
                            titleTextStyle: { color: theme.palette.text.secondary },
                            width: '100%',
                            height: 209,
                            bar: { groupWidth: '95%' },
                            legend: { position: 'none' },
                            fontSize: 13,
                            hAxis: {
                                textStyle: {
                                    color: theme.palette.text.secondary
                                }
                            },
                            vAxis: {
                                textStyle: {
                                    color: theme.palette.text.secondary
                                }
                            },
                            chartArea: {
                                top: 16,
                                left: 20,
                                bottom: 20,
                                width: '100%'
                            }
                        };
                        let chart = new window.google.visualization.BarChart(document.getElementById('chart_reviews'));
                        chart.draw(data, options);
                    }
                }, 1);
            }
        });
    };

    return (
        <Grid container spacing={3} className={classes.root}>
            <Grid item md={4} xs={12}>
                <Grid container spacing={3}>
                    <Grid item md={12} xs={12}>
                        <Revenue
                            data={dataApi}
                            classes={classes}
                        />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Reviews
                            data={dataApi}
                            classes={classes}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item md={8} xs={12}>
                <Grid container spacing={3}>
                    <Grid item md={12} xs={12}>
                        <ReportsSales
                            time={time}
                            data={dataApi}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Channel
                            data={dataApi}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <ReturnRate
                            data={dataApi}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
}

export default Report


export interface ReportsProductDetailData {
    channels: {
        headers: {
            [key: string]: {
                color: string,
                title: string,
            }
        },
        rows: {
            [key: string]: number
        }
    },
    order: {
        count: number,
        pricing_detail: {
            headers: {
                [key: string]: string
            },
            rows: {
                [key: string]: number
            }
        },
        rows: Array<{
            [key: string]: number | string
        }>
    },
    review: {
        average: number,
        rows: number[],
        total: number
    },
    status_rate: {
        headers: {
            [key: string]: {
                color: string,
                title: string,
            },
        },
        rows: {
            [key: string]: number
        }
    },
    time: {
        endDate: string,
        startDate: string,
        time_report: {
            [key: string]: string
        },
        time_report_more_button: {
            [key: string]: {
                title: string,
                action: () => void
            }
        }
    }
}