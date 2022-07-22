import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import FieldForm from 'components/atoms/fields/FieldForm';
import { __p } from 'helpers/i18n';
import React from 'react';

function Downloadable({ PLUGIN_NAME, post, handleOnReviewValue }: {
    PLUGIN_NAME: string,
    post: JsonFormat,
    handleOnReviewValue: (name: string) => (value: ANY) => void,
}) {

    return (
        <Card>
            <CardContent>
                <FieldForm
                    component="true_false"
                    config={{
                        title: __p('Downloadable product', PLUGIN_NAME),
                        isChecked: true
                    }}
                    post={post}
                    name="downloadable_product"
                    onReview={handleOnReviewValue('downloadable_product')}
                />
                {
                    Boolean(post.downloadable_product) &&
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            marginTop: 2,
                            gridGap: 24
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
                            onReview={handleOnReviewValue('downloadable_files')}
                        />
                        <FieldForm
                            component='number'
                            config={{
                                title: __p('Download limit', PLUGIN_NAME),
                                note: __p('Leave blank for unlimited re-downloads.', PLUGIN_NAME),
                            }}
                            post={post}
                            name='downloadable_limit'
                            onReview={handleOnReviewValue('downloadable_limit')}
                        />
                        <FieldForm
                            component={'number'}
                            config={{
                                title: __p('Download expiry', PLUGIN_NAME),
                                note: __p('Enter the number of days before a download link expires, or leave blank.', PLUGIN_NAME)
                            }}
                            post={post}
                            name={'downloadable_expiry'}
                            onReview={handleOnReviewValue('downloadable_expiry')}
                        />
                    </Box>
                }
            </CardContent>
        </Card>
    )
}

export default Downloadable
