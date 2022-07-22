import React from 'react';
import { __p } from 'helpers/i18n';
import FieldForm from 'components/atoms/fields/FieldForm';

function Overview(props: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    if (props.post) {
        return (
            <FieldForm
                component='editor'
                config={{
                    title: __p('Overview', props.PLUGIN_NAME),
                    note: ' ',
                    maxLength: 70
                }}
                post={props.post}
                name='detailed_overview'
                onReview={(value) => props.onReview(value, 'detailed_overview')}
            />
        )
    }

    return <></>;
}

export default Overview
