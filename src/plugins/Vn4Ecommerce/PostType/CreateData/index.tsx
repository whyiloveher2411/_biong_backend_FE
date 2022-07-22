import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import CardHeader from 'components/atoms/CardHeader';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import Tabs from 'components/atoms/Tabs';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import AddOn from 'components/function/AddOn';
import { HookCreateDataProps } from 'components/pages/PostType/CreateData/Form';
import { __p } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import { PLUGIN_NAME } from '../../helpers/plugin';
import Advanced from './Advanced';
import Connectedproducts from './Connectedproducts';
import Downloadable from './Downloadable';
import General from './General';
import Overview from './Overview';
import Properties from './Properties';
import QuestionAndAnswer from './QuestionAndAnswer';
import Shipments from './Shipments';
import Specifications from './Specifications';
import Warehouse from './Warehouse';

const useStyles = makeCSS({
    cardTitle: {
        alignItems: 'center', display: 'flex',
        '& .MuiFormGroup-root': {
            display: 'flex',
            width: '100%',
            flexDirection: 'row',
            marginLeft: 32
        }
    }
});

const ecomName = {
    simple: 'simple',
    grouped: 'grouped',
    external: 'external',
    variable: 'variable',
    // downloadable: 'downloadable',
    // virtual: 'virtual',

    prodType: 'ecom_prod',
}

function CreateData(props: HookCreateDataProps) {

    const { post } = props.data;

    const classes = useStyles();

    const useAjax1 = useAjax();

    const { callAddOn } = AddOn();

    // const [tabCurrent, setTabCurrent] = React.useState({ index: 0 });

    React.useEffect(() => {
        if (props.postType === ecomName.prodType) {

            if (!props.data?.post?.ecom_prod_detail?._updatePost) {
                useAjax1.ajax({
                    url: 'plugin/vn4-ecommerce/create-data/get-product-detail',
                    data: {
                        ...post
                    },
                    success: function (result) {
                        if (result.post) {
                            result.post._updatePost = new Date();
                            props.onUpdateData((prev) => {
                                prev.post.ecom_prod_detail = result.post;
                                return prev;
                            });
                        }
                    }
                });

                try {
                    if (post.meta) {
                        if (typeof post.meta === 'string') {
                            post.meta = JSON.parse(post.meta);
                        }
                    }
                } catch (error) {
                    post.meta = {};
                }

                if (post.meta === null || typeof post.meta !== 'object') {
                    post.meta = {};
                }
            }
        }

    }, [props.data.updatePost]);

    const onReview = (value: ANY, key: ANY, updateToPostMain = false) => {

        props.onUpdateData(prev => {

            if (value instanceof Function) {
                [value, key] = value(prev);
            }

            if (updateToPostMain) {
                if (typeof key === 'object' && key !== null) {
                    prev.post = {
                        ...prev.post,
                        ecom_prod_detail: { ...prev.post.ecom_prod_detail, ...key },
                        ...key,
                    };
                } else {
                    prev.post = {
                        ...prev.post,
                        ecom_prod_detail: { ...prev.post.ecom_prod_detail, [key]: value },
                        [key]: value,
                    };
                }

            } else {

                if (typeof key === 'object' && key !== null) {

                    prev.post = {
                        ...prev.post,
                        ecom_prod_detail: { ...prev.post.ecom_prod_detail, ...key },
                    };

                } else {
                    prev.post = {
                        ...prev.post,
                        ecom_prod_detail: { ...prev.post.ecom_prod_detail, [key]: value },
                    };
                }
            }

            return prev;
        });
    };

    if (props.postType === ecomName.prodType) {
        return (
            <Grid item md={12} xs={12}>
                <Card>
                    <CardHeader
                        style={{ whiteSpace: 'nowrap' }}
                        title={
                            <div className={classes.cardTitle}>
                                <Typography variant="h5" >
                                    {__p('Product Data', PLUGIN_NAME)}
                                </Typography>
                                <div style={{ maxWidth: 260, width: '100%', marginLeft: 16 }}>
                                    <FieldForm
                                        component='select'
                                        config={{
                                            title: __p('Product type', PLUGIN_NAME),
                                            list_option: {
                                                simple: { title: __p('Simple Product', PLUGIN_NAME) },
                                                grouped: { title: __p('Grouped product', PLUGIN_NAME) },
                                                external: { title: __p('External/Affiliate product', PLUGIN_NAME) },
                                                variable: { title: __p('Variable product', PLUGIN_NAME) },
                                                // virtual: { title: __p('Virtual product', PLUGIN_NAME) },
                                                // downloadable: { title: __p('Downloadable product', PLUGIN_NAME) },
                                            },
                                            size: "small",
                                            defaultValue: 'simple',
                                        }}
                                        post={post}
                                        name='product_type'
                                        onReview={(value) => {
                                            // setRender(prev => prev + 1);
                                            onReview(value, 'product_type', true);
                                        }}
                                    />
                                </div>
                            </div>}
                    />
                    <Divider />
                    <CardContent>
                        <Tabs
                            name="vn4ecom_createdata"
                            orientation='vertical'
                            tabIcon={true}
                            // onChangeTab={(i) => { setTabCurrent({ index: i }); }}
                            // tabIndex={tabCurrent.index}
                            tabs={
                                (() => {
                                    let tabs = callAddOn(
                                        'CreateData/Ecommerce',
                                        'Tabs',
                                        {
                                            general: {
                                                title: <Tooltip title={__p('Pricing', PLUGIN_NAME)}><Icon icon="AttachMoneyRounded" /></Tooltip>,
                                                content: () => <General
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                // <General PLUGIN_NAME={PLUGIN_NAME} onReview={onReview} postDetail={post} post={post.ecom_prod_detail} />,
                                                hidden: post.product_type === ecomName.variable || post.product_type === ecomName.grouped,
                                                priority: 1,
                                                // hidden: post.product_type === ecomName.variable,
                                            },
                                            overview: {
                                                title: <Tooltip title={__p('Overview', PLUGIN_NAME)}><Icon icon="InfoOutlined" /></Tooltip>,
                                                content: () => <Overview
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                priority: 2,
                                            },
                                            downloadable: {
                                                title: <Tooltip title={__p('Downloadable', PLUGIN_NAME)}><Icon icon="CloudDownloadOutlined" /></Tooltip>,
                                                content: () => <Downloadable
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                // hidden: !post.ecom_prod_detail?.downloadable_product || post.product_type !== ecomName.simple,
                                                hidden: post.product_type !== ecomName.simple,
                                                priority: 3,
                                            },
                                            warehouse: {
                                                title: <Tooltip title={__p('Warehouse', PLUGIN_NAME)}><Icon icon="HomeWorkOutlined" /></Tooltip>,
                                                content: () => <Warehouse
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                hidden: post.product_type !== ecomName.simple,
                                                priority: 4,
                                            },
                                            properties: {
                                                title: <Tooltip title={__p('Properties', PLUGIN_NAME) + (post.product_type === ecomName.variable ? (' & ' + __p('Variations', PLUGIN_NAME)) : '')}><Icon icon="AppsRounded" /></Tooltip>,
                                                content: () => <Properties
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail}
                                                />,
                                                priority: 5,
                                            },
                                            shipments: {
                                                title: <Tooltip title={__p('Shipments', PLUGIN_NAME)}><Icon icon="LocalShippingOutlined" /></Tooltip>,
                                                content: () => <Shipments
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                // hidden: (Boolean(post.ecom_prod_detail?.virtual_product)
                                                //     && post.product_type === ecomName.simple)
                                                //     || post.product_type !== ecomName.simple,
                                                hidden: post.product_type !== ecomName.simple,
                                                // ['', ecomName.simple, ecomName.variable].indexOf(post.product_type ?? '') === -1,
                                                // hidden: post.product_type === ecomName.variable,
                                                priority: 6,
                                            },
                                            connectedproducts: {
                                                title: <Tooltip title={__p('Connected products', PLUGIN_NAME)}><Icon icon="ShoppingCartOutlined" /></Tooltip>,
                                                content: () => <Connectedproducts
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                priority: 7,
                                            },
                                            specifications: {
                                                title: <Tooltip title={__p('Specifications', PLUGIN_NAME)}><Icon icon="BuildOutlined" /></Tooltip>,
                                                content: () => <Specifications
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                priority: 8,
                                            },
                                            question_and_answer: {
                                                title: <Tooltip title={__p('Question and Answer', PLUGIN_NAME)}><Icon icon="HelpOutlineOutlined" /></Tooltip>,
                                                content: () => <QuestionAndAnswer
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                priority: 9,
                                            },
                                            advanced: {
                                                title: <Tooltip title={__p('Advanced', PLUGIN_NAME)}><Icon icon="SettingsOutlined" /></Tooltip>,
                                                content: () => <Advanced
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={onReview}
                                                    postDetail={post}
                                                    post={post.ecom_prod_detail} />,
                                                priority: 10,
                                            },

                                        },
                                        {
                                            updatePost: props.data.updatePost,
                                            onReview: onReview,
                                            postDetail: post,
                                            post: post.ecom_prod_detail
                                        });

                                    return Object.keys(tabs).map(key => {
                                        tabs[key].key = key;
                                        return tabs[key];
                                    });
                                })()
                            }
                        />
                    </CardContent>
                </Card>
            </Grid >
        )
    }

    return null;
}

const exp = {
    priority: 0,
    content: CreateData
};

export default exp

