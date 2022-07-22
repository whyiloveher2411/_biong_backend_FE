import React from 'react'
import { Vn4seoTabsProps } from '../CreateData';
import Icon from 'components/atoms/Icon';
import Tabs from 'components/atoms/Tabs';
import Box from 'components/atoms/Box';
import FieldForm from 'components/atoms/fields/FieldForm';

function Social({ data, onReview }: Vn4seoTabsProps) {
    return (
        <Tabs
            tabIcon={true}
            name="vn4seo_createdata_share"
            tabs={[
                {
                    title: <Icon icon="Facebook" />, content: () => <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            marginTop: 3,
                        }}
                    >
                        <FieldForm
                            component='text'
                            config={{
                                title: 'Title'
                            }}
                            post={data}
                            name='plugin_vn4seo_facebook_title'
                            onReview={(value) => { onReview('plugin_vn4seo_facebook_title', value); }}
                        />
                        <FieldForm
                            component='textarea'
                            config={{
                                title: 'Description'
                            }}
                            post={data}
                            name='plugin_vn4seo_facebook_description'
                            onReview={(value) => { onReview('plugin_vn4seo_facebook_description', value); }}
                        />
                        <FieldForm
                            component='image'
                            config={{
                                title: 'Image'
                            }}
                            post={data}
                            name='plugin_vn4seo_facebook_image'
                            onReview={(value) => { onReview('plugin_vn4seo_facebook_image', value); }}
                        />
                    </Box>
                },
                {
                    title: <Icon icon="Twitter" />,
                    content: () => <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            marginTop: 3,
                        }}
                    >
                        <FieldForm
                            component='text'
                            config={{
                                title: 'Title'
                            }}
                            post={data}
                            name='plugin_vn4seo_twitter_title'
                            onReview={(value) => { onReview('plugin_vn4seo_twitter_title', value); }}
                        />
                        <FieldForm
                            component='textarea'
                            config={{
                                title: 'Description'
                            }}
                            post={data}
                            name='plugin_vn4seo_twitter_description'
                            onReview={(value) => { onReview('plugin_vn4seo_twitter_description', value); }}
                        />
                        <FieldForm
                            component='image'
                            config={{
                                title: 'Image'
                            }}
                            post={data}
                            name='plugin_vn4seo_twitter_image'
                            onReview={(value) => { onReview('plugin_vn4seo_twitter_image', value); }}
                        />
                    </Box>
                }
            ]}
        />
    )
}

export default Social
