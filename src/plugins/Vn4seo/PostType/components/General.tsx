import Alert from 'components/atoms/Alert';
import FieldForm from 'components/atoms/fields/FieldForm';
import { __, __p } from 'helpers/i18n';
import React from 'react';
import { Vn4seoTabsProps } from '../CreateData';
import Box from 'components/atoms/Box';

function General({ data, onReview }: Vn4seoTabsProps) {

    const [render, setRender] = React.useState(0);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3
            }}
        >
            <div>
                <FieldForm
                    component='text'
                    config={{
                        title: __('Title'),
                        note: ' ',
                        maxLength: 70
                    }}
                    post={data}
                    name='plugin_vn4seo_google_title'
                    onReview={(value) => { onReview('plugin_vn4seo_google_title', value); setRender(render + 1); }}
                />
                <Alert icon={false} severity="info">{__p('You can submit titles with up to 150 characters, but because google only display up to 70 characters on Shopping ads and free product listings, we strongly encourage you to submit titles with 70 or less characters whenever possible.', 'vn4seo')}</Alert>

            </div>

            <div>
                <FieldForm
                    component='textarea'
                    config={{
                        title: __('Description'),
                        note: " ",
                        maxLength: '50–160'
                    }}
                    post={data}
                    name='plugin_vn4seo_google_description'
                    onReview={(value) => { onReview('plugin_vn4seo_google_description', value); setRender(render + 1); }}
                />
                <Alert icon={false} severity="info">{__p('Meta descriptions can be any length, but Google generally truncates snippets to ~155–160 characters. It\'s best to keep meta descriptions long enough that they\'re sufficiently descriptive, so we recommend descriptions between 50–160 characters. Keep in mind that the "optimal" length will vary depending on the situation, and your primary goal should be to provide value and drive clicks.', 'vn4seo')}</Alert>
            </div>

            <div>
                <FieldForm
                    component='text'
                    config={{
                        title: __p('Canonical URL', 'vn4seo'),
                        note: "&nbsp;",
                    }}
                    post={data}
                    name='plugin_vn4seo_canonical_url'
                    onReview={(value) => { onReview('plugin_vn4seo_canonical_url', value); setRender(render + 1); }}
                />
                <Alert icon={false} severity="info">{__p('If you have a single page accessible by multiple URLs, or different pages with similar content (for example, a page with both a mobile and a desktop version), Google sees these as duplicate versions of the same page. Google will choose one URL as the canonical version and crawl that, and all other URLs will be considered duplicate URLs and crawled less often.', 'vn4seo')}</Alert>
            </div>

        </Box>
    )
}

export default General
