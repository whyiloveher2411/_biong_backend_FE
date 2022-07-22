import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import Typography from 'components/atoms/Typography';
import { __p } from 'helpers/i18n';
import React from 'react';

function Shipping({ PLUGIN_NAME, post, handleOnReviewValue }: {
    PLUGIN_NAME: string,
    post: JsonFormat,
    handleOnReviewValue: (name: string) => (value: ANY) => void,
}) {

    return (
        <Card>
            <CardContent>
                <Grid container spacing={3}>
                    <Grid item md={12}>
                        <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>{__p('Shipping', PLUGIN_NAME)}</Typography>
                        <FieldForm
                            component="true_false"
                            config={{
                                title: __p('Virtual product', PLUGIN_NAME),
                                isChecked: true
                            }}
                            post={post}
                            name="virtual_product"
                            onReview={handleOnReviewValue('virtual_product')}
                        />
                    </Grid>
                    {
                        !post.virtual_product &&
                        <>
                            <Grid item md={12} xs={12}>
                                <FieldForm
                                    component='number'
                                    config={{
                                        title: __p('Weight (kg)', PLUGIN_NAME),
                                        maxLength: 70
                                    }}
                                    post={post}
                                    name='shipments_weight'
                                    onReview={handleOnReviewValue('shipments_weight')}
                                />
                            </Grid>
                            <Grid item md={12} xs={12}>
                                <Typography variant="body1" sx={{ marginBottom: 2 }}>{__p('Dimensions (cm)', PLUGIN_NAME)}</Typography>
                                <Grid container spacing={2}>
                                    <Grid item md={4} xs={12}>
                                        <FieldForm
                                            component='number'
                                            config={{
                                                title: __p('Length', PLUGIN_NAME),
                                                maxLength: 70
                                            }}
                                            post={post}
                                            name='shipments_dimensions_length'
                                            onReview={handleOnReviewValue('shipments_dimensions_length')}
                                        />
                                    </Grid>

                                    <Grid item md={4} xs={12}>
                                        <FieldForm
                                            component='number'
                                            config={{
                                                title: __p('Width', PLUGIN_NAME),
                                                maxLength: 70
                                            }}
                                            post={post}
                                            name='shipments_dimensions_width'
                                            onReview={handleOnReviewValue('shipments_dimensions_width')}
                                        />
                                    </Grid>

                                    <Grid item md={4} xs={12}>
                                        <FieldForm
                                            component='number'
                                            config={{
                                                title: __p('Height', PLUGIN_NAME),
                                                maxLength: 70
                                            }}
                                            post={post}
                                            name='shipments_dimensions_height'
                                            onReview={handleOnReviewValue('shipments_dimensions_height')}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                        </>
                    }
                </Grid>
            </CardContent>
        </Card>
    )
}

export default Shipping

