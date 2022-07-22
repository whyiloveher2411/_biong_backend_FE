import Checkbox from 'components/atoms/Checkbox';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import FormControl from 'components/atoms/FormControl';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormGroup from 'components/atoms/FormGroup';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import Skeleton from 'components/atoms/Skeleton';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import NotFound from 'components/molecules/NotFound';
import { __p } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import Variations from './Variations';
// import Variations from './Variations';

function Properties({ post, postDetail, onReview, PLUGIN_NAME }: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    const { ajax, Loading, open } = useAjax({
        loadingType: 'custom'
    });

    const [valuesAttributes, setValuesAttributes] = React.useState<{
        [key: string]: Array<AttrValueItemProps>
    }>({});

    const [listValuesAttributes, setListValuesAttributes] = React.useState<{
        [key: string]: ValuesOfAttributesProps
    }>({});

    const getValuesAttribute = (value: ID[]) => {

        if (value && value.length) {
            ajax({
                url: 'plugin/vn4-ecommerce/create-data/get-values-attribute',
                method: 'POST',
                data: {
                    ids: value
                },
                success: (result: {
                    attributes: {
                        [key: string]: {
                            id: ID,
                            title: string,
                            values: Array<AttrValueItemProps>
                        }
                    }
                }) => {
                    if (result.attributes) {
                        setListValuesAttributes({ ...result.attributes });
                    } else {
                        setListValuesAttributes({});
                        setValuesAttributes({});
                    }
                }
            });
        } else {
            setListValuesAttributes({});
            setValuesAttributes({});
        }
    }

    const parstPropertiesAttributesValues = (value: string | Array<AttrValueItemProps>) => {

        let result: {
            [key: string]: AttrValueItemProps
        } = {};

        if (value && typeof value === 'object') return value;

        if (typeof value === 'string') {
            try {
                result = JSON.parse(value);
            } catch (error) {
                result = {};
            }
        }

        let temp: Array<AttrValueItemProps> = [];

        for (let key in result) {
            temp.push(result[key]);
        }

        temp.sort((a, b) => a.id > b.id ? 1 : -1);

        return temp;
    };


    React.useEffect(() => {

        if (post) {

            getValuesAttribute(post.properties_attributes?.map(((item: AttrItemProps) => item.id)));

            if (typeof post.properties_attributes_values === 'string') {

                try {
                    post.properties_attributes_values = JSON.parse(post.properties_attributes_values);
                } catch (error) {
                    post.properties_attributes_values = [];
                }

            }

            const loadAttributeValue = () => {
                post.attributesValues = [];

                if (!post.properties_attributes_values) post.properties_attributes_values = [];

                post.properties_attributes_values.forEach((item: AttrValueItemProps) => {

                    if (item.ecom_prod_attr) {

                        if (!post.attributesValues['attributes_' + item.ecom_prod_attr]) post.attributesValues['attributes_' + item.ecom_prod_attr] = [];

                        post.attributesValues['attributes_' + item.ecom_prod_attr].push(item);

                        post.attributesValues['attributes_' + item.ecom_prod_attr].sort((a: AttrValueItemProps, b: AttrValueItemProps) => a.id > b.id ? 1 : -1);
                    }

                });

                setValuesAttributes({ ...post.attributesValues });
            }

            loadAttributeValue();
        }
    }, [post?._updatePost]);

    const onChangeAttributesValues = (value: AttrValueItemProps, attribute: JsonFormat, checked: boolean) => {

        if (checked) {

            if (!post.attributesValues) post.attributesValues = {};

            if (!post.attributesValues['attributes_' + attribute.id]) post.attributesValues['attributes_' + attribute.id] = [];

            post.attributesValues['attributes_' + attribute.id].push(value);

            post.attributesValues['attributes_' + attribute.id].sort((a: AttrValueItemProps, b: AttrValueItemProps) => a.id > b.id ? 1 : -1);

            post.properties_attributes_values = parstPropertiesAttributesValues(post.properties_attributes_values);
            post.properties_attributes_values.push(value);

        } else {
            post.attributesValues['attributes_' + attribute.id] = post.attributesValues['attributes_' + attribute.id].filter((item: AttrValueItemProps) => item.id != value.id);

            post.properties_attributes_values = parstPropertiesAttributesValues(post.properties_attributes_values);

            post.properties_attributes_values = post.properties_attributes_values.filter((item: AttrValueItemProps) => item.id !== value.id);
        }

        onReview(null, {
            properties_attributes_values: post.properties_attributes_values,
            attributesValues: post.attributesValues
        });
        setValuesAttributes({ ...post.attributesValues })

    }

    if (post) {
        return (
            <Grid
                container
                spacing={3}>
                <Grid item md={12} xs={12}>
                    <Typography variant="h4">{__p('Properties', PLUGIN_NAME)}</Typography>
                    <br />
                    <FieldForm
                        component='relationship_manytomany'
                        config={{
                            title: __p('Add product attribute', PLUGIN_NAME),
                            object: 'ecom_prod_attr',
                            placeholder: ''
                        }}
                        renderTags={() => null}
                        post={post}
                        name='properties_attributes'
                        onReview={(value) => {
                            onReview(value, 'properties_attributes');
                            getValuesAttribute(value.map((item: AttrValueItemProps) => item.id));
                        }}
                    />
                </Grid>
                <Grid item md={12} xs={12}>
                    {
                        open ?
                            <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {Loading}
                            </div>
                            :
                            <Grid
                                container
                                spacing={2}
                            >
                                {
                                    (() => {

                                        if (typeof post.properties_attributes === 'string') {

                                            try {
                                                post.properties_attributes = JSON.parse(post.properties_attributes);
                                            } catch (error) {
                                                post.properties_attributes = [];
                                            }
                                        }
                                        if (Array.isArray(post.properties_attributes) && post.properties_attributes.length > 0) {

                                            return <Grid item md={12} xs={12} style={{ marginBottom: 24 }}>
                                                <Table size="small" >
                                                    <TableBody>
                                                        {
                                                            post.properties_attributes.map((attribute: AttrItemProps) => {

                                                                if (!listValuesAttributes['id_' + attribute.id]) return null;

                                                                return (
                                                                    <TableRow key={attribute.id}>
                                                                        <TableCell style={{ width: 48, whiteSpace: 'nowrap' }}>
                                                                            {attribute.title}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <FormControl style={{ width: '100%' }} >
                                                                                <FormGroup row>
                                                                                    {
                                                                                        listValuesAttributes['id_' + attribute.id].values?.map(value => (<FormControlLabel
                                                                                            key={value.id}
                                                                                            control={<Checkbox
                                                                                                checked={Boolean(valuesAttributes
                                                                                                    && valuesAttributes['attributes_' + attribute.id]
                                                                                                    && valuesAttributes['attributes_' + attribute.id].filter(item => item.id === value.id).length > 0)}
                                                                                                value={value.id}
                                                                                                onChange={(e) => { onChangeAttributesValues(value, attribute, e.target.checked) }}
                                                                                                color="primary"
                                                                                            />}
                                                                                            label={value.title}
                                                                                        />
                                                                                        ))
                                                                                    }
                                                                                </FormGroup>
                                                                            </FormControl>
                                                                        </TableCell>
                                                                        <TableCell style={{ width: 48 }}>
                                                                            <IconButton onClick={() => {
                                                                                let attributes = post.properties_attributes.filter((item: AttrItemProps) => item.id !== attribute.id);

                                                                                onReview(attributes, 'properties_attributes');
                                                                                getValuesAttribute(attributes.map((item: AttrItemProps) => item.id));
                                                                            }}>
                                                                                <Icon icon="ClearRounded" />
                                                                            </IconButton>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })
                                                        }
                                                    </TableBody>
                                                </Table>
                                            </Grid>
                                        }
                                        return null;
                                    })()

                                }
                                {
                                    postDetail.product_type === 'variable' &&
                                    (
                                        Object.keys(valuesAttributes).length > 0 ?
                                            <Grid item md={12} xs={12}>
                                                <Variations
                                                    PLUGIN_NAME={PLUGIN_NAME}
                                                    onReview={(value: JsonFormat) => {
                                                        onReview(value, 'variations')
                                                    }}
                                                    post={post}
                                                    postDetail={postDetail}
                                                    valuesAttributes={valuesAttributes}
                                                    attributes={post.properties_attributes}
                                                    listValuesAttributes={listValuesAttributes}
                                                />
                                            </Grid>
                                            :
                                            < Grid item md={12} xs={12}>
                                                <NotFound
                                                    subTitle={__p('No matching variants found for properties', PLUGIN_NAME)}
                                                />
                                            </Grid>
                                    )
                                }
                            </Grid>
                    }

                </Grid>
            </Grid >
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                <Skeleton variant="text" width={'100%'} height={32} />
                <br />
                <Skeleton variant="rectangular" width={'100%'} height={52} />
            </Grid>
            <Grid item md={12} xs={12}>
                <Grid
                    container
                    spacing={2}
                >
                    <Grid item md={12} xs={12}>
                        <Divider />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Divider />
                    </Grid>
                    < Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                    </Grid>
                </Grid>
            </Grid>
        </Grid >
    )
}

export default Properties

export interface AttrValueItemProps {
    id: ID,
    title: string,
    ecom_prod_attr: ID,
    slug?: string,
    type?: string,
}

export interface AttrItemProps {
    id: ID,
    title: string,
    sku_code: string,
    slug: string,
    type: string,
}

export interface ValuesOfAttributesProps {
    id: ID,
    title: string,
    values: Array<AttrValueItemProps>
}