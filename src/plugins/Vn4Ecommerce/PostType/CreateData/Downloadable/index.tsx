import Box from 'components/atoms/Box';
import Collapse from 'components/atoms/Collapse';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import Skeleton from 'components/atoms/Skeleton';
import { __p } from 'helpers/i18n';
import React from 'react';

function Downloadable({ post, PLUGIN_NAME, onReview }: {
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
                        title: __p('Downloadable product', PLUGIN_NAME),
                        isChecked: true
                    }}
                    post={post}
                    name="downloadable_product"
                    onReview={(value) => onReview(value, 'downloadable_product')}
                />

                <Collapse in={Boolean(post.downloadable_product)}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3
                        }}
                    >
                        <FieldForm
                            component='repeater'
                            config={{
                                title: __p('Downloadable files', PLUGIN_NAME),
                                sub_fields: {
                                    name: { title: __p('Name', PLUGIN_NAME) },
                                    fileDetail: { title: 'Field Detail', view: 'asset-file' },
                                }
                            }}
                            post={post}
                            name='downloadable_files'
                            onReview={(value) => onReview(value, 'downloadable_files')}
                        />
                        <FieldForm
                            component='number'
                            config={{
                                title: __p('Download limit', PLUGIN_NAME),
                                note: __p('Leave blank for unlimited re-downloads.', PLUGIN_NAME),
                            }}
                            post={post}
                            name='downloadable_limit'
                            onReview={(value) => onReview(value, 'downloadable_limit')}
                        />

                        <FieldForm
                            component={'number'}
                            config={{
                                title: __p('Download expiry', PLUGIN_NAME),
                                note: __p('Enter the number of days before a download link expires, or leave blank.', PLUGIN_NAME)
                            }}
                            post={post}
                            name={'downloadable_expiry'}
                            onReview={(value) => onReview(value, 'downloadable_expiry')}
                        />

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
            </Grid>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
            </Grid>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
            </Grid>
        </Grid>
    )
}

export default Downloadable
