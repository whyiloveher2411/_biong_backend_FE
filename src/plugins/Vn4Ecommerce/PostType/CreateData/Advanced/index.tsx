import React from 'react'
import Grid from 'components/atoms/Grid'
import Skeleton from 'components/atoms/Skeleton'
import FieldForm from 'components/atoms/fields/FieldForm'
import { __p } from 'helpers/i18n'

function Advanced({ PLUGIN_NAME, ...props }: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    if (props.post) {
        return (
            <Grid
                container
                spacing={3}>
                <Grid item md={12} xs={12}>
                    <FieldForm
                        component='textarea'
                        config={{
                            title: __p('Purchase note', PLUGIN_NAME),
                        }}
                        post={props.post}
                        name='advanced_purchase_note'
                        onReview={(value) => props.onReview(value, 'advanced_purchase_note')}
                    />
                </Grid>
                <Grid item md={12} xs={12}>
                    <FieldForm
                        component='true_false'
                        config={{
                            title: __p('Enable reviews', PLUGIN_NAME),
                            maxLength: 70,
                            layout: 'table',
                        }}
                        post={props.post}
                        name='advanced_enable_reviews'
                        onReview={(value) => props.onReview(value, 'advanced_enable_reviews')}
                    />
                </Grid>
            </Grid>
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
                <Skeleton variant="rectangular" width={'100%'} style={{ marginTop: 5 }} height={20} />
            </Grid>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
            </Grid>
        </Grid>
    )
}

export default Advanced
