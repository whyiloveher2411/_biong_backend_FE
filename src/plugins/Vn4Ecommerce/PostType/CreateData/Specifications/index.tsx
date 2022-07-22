import Box from 'components/atoms/Box';
import Chip from 'components/atoms/Chip';
import Typography from 'components/atoms/Typography';
import Grid from 'components/atoms/Grid';
import Divider from 'components/atoms/Divider';
import Skeleton from 'components/atoms/Skeleton';
import React from 'react'
import useAjax from 'hook/useApi';
import FieldForm from 'components/atoms/fields/FieldForm';
import NotFound from 'components/molecules/NotFound';
import { __p } from 'helpers/i18n';

function Specifications({ PLUGIN_NAME, ...props }: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    const { ajax, Loading, open } = useAjax({ loadingType: 'custom' });

    const [groupAttributes, setGroupAttributes] = React.useState<Array<{
        title: string,
        attributes: Array<{
            title: string,
            delete: number,
        }>,
        delete: number,
    }>>([]);

    React.useEffect(() => {

        if (props.post?._updatePost) {
            if (typeof props.post.specifications_values === 'string') {
                try {
                    props.post.specifications_values = JSON.parse(props.post.specifications_values);
                } catch (error) {
                    props.post.specifications_values = {};
                }
            }

            if (!props.post.specifications_values) {
                props.post.specifications_values = {};
            }

            console.log(props.post.specifications_values);

            loadAttributes(props.postDetail.ecom_prod_spec_sets);
        }

    }, [props.post?._updatePost]);

    const loadAttributes = (value: string) => {

        if (!value) {
            setGroupAttributes([]);
            return;
        }

        ajax({
            url: 'plugin/vn4-ecommerce/create-data/get-specifications-sets',
            method: 'POST',
            data: {
                value: value
            },
            success: (result) => {
                setGroupAttributes(result);
            }

        });
    }

    React.useEffect(() => {
        loadAttributes(props.postDetail.ecom_prod_spec_sets);
    }, [props.postDetail.ecom_prod_spec_sets]);

    if (props.post) {

        if (!props.postDetail.ecom_prod_spec_sets) {
            return <NotFound subTitle={__p('Please update the Specifications Sets before editing this section.', PLUGIN_NAME)} />
        }

        return (
            open ?
                <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Loading}
                </div>
                :
                <Grid
                    container
                    spacing={3}
                >
                    {
                        Boolean(groupAttributes[0]) &&
                        groupAttributes.map((group, index) => (
                            <Grid key={index} item md={12} xs={12}>
                                <Divider />

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center"
                                    }}
                                >
                                    <Typography style={{ margin: '16px 0' }} variant="h5">{group.title}</Typography>
                                    &nbsp;&nbsp;{Boolean(group.delete) && <Chip size="small" label="Deleted"
                                        color="secondary" />}
                                </Box>
                                <Grid
                                    container
                                    spacing={3}
                                >
                                    {
                                        group.attributes.map((attribute, index2) => (
                                            <Grid key={index2} item md={12} xs={12}>
                                                <FieldForm
                                                    component={'text'}
                                                    config={{ ...attribute, size: 'small', title: attribute.delete ? (attribute.title + ' (Deleted)') : attribute.title }}
                                                    post={props.post.specifications_values}
                                                    name={props.postDetail.ecom_prod_spec_sets + '_' + group.title + '_' + attribute.title}
                                                    onReview={(value, key) => {
                                                        props.onReview(props.post.specifications_values, 'specifications_values')
                                                    }}
                                                />
                                            </Grid>
                                        ))
                                    }
                                </Grid>
                            </Grid>
                        ))
                    }
                </Grid>
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
            </Grid>
            <Grid item md={12} xs={12}>
                <Grid
                    container
                    spacing={2}>
                    {Array.from(Array(12).keys()).map((item, index) =>
                        <Grid key={index} item md={12} xs={12}>
                            <Skeleton variant="rectangular" width={'100%'} height={32} />
                        </Grid>
                    )}
                </Grid>
            </Grid>
        </Grid>
    )
}

export default Specifications
