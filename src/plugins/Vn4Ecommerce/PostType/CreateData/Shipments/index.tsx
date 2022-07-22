import Box from 'components/atoms/Box'
import Collapse from 'components/atoms/Collapse'
import FieldForm from 'components/atoms/fields/FieldForm'
import Grid from 'components/atoms/Grid'
import Skeleton from 'components/atoms/Skeleton'
import Typography from 'components/atoms/Typography'
import { __p } from 'helpers/i18n'
import React from 'react'

function Shipments({ post, onReview, PLUGIN_NAME }: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    if (post) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                }}
            >
                <FieldForm
                    component="true_false"
                    config={{
                        title: __p('Virtual product', PLUGIN_NAME),
                        isChecked: true
                    }}
                    post={post}
                    name="virtual_product"
                    onReview={(value) => onReview(value, 'virtual_product')}
                />

                <Collapse in={!post.virtual_product}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3
                        }}
                    >
                        <FieldForm
                            component='number'
                            config={{
                                title: __p('Weight (kg)', PLUGIN_NAME),
                                maxLength: 70
                            }}
                            post={post}
                            name='shipments_weight'
                            onReview={(value) => onReview(value, 'shipments_weight')}
                        />

                        <div>
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
                                        onReview={(value) => onReview(value, 'shipments_dimensions_length')}
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
                                        onReview={(value) => onReview(value, 'shipments_dimensions_width')}
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
                                        onReview={(value) => onReview(value, 'shipments_dimensions_height')}
                                    />
                                </Grid>
                            </Grid>
                        </div>
                    </Box>
                </Collapse>


            </Box>
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
                <Grid item md={12} xs={12}>
                    <Skeleton variant="text" width={'100%'} height={20} />
                    <br />
                    <Grid container spacing={2}>
                        <Grid item md={4} xs={12}>
                            <Skeleton variant="rectangular" width={'100%'} height={52} />
                        </Grid>

                        <Grid item md={4} xs={12}>
                            <Skeleton variant="rectangular" width={'100%'} height={52} />
                        </Grid>

                        <Grid item md={4} xs={12}>
                            <Skeleton variant="rectangular" width={'100%'} height={52} />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )

}

export default Shipments
