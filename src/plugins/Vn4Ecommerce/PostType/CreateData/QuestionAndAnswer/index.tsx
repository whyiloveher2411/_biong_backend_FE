import React from 'react';
import Skeleton from 'components/atoms/Skeleton'
import FieldForm from 'components/atoms/fields/FieldForm';
import { __p } from 'helpers/i18n';

function QuestionAndAnswer({ PLUGIN_NAME, ...props }: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    if (props.post) {
        return (
            <FieldForm
                component='repeater'
                config={{
                    title: __p('Question And Answer', PLUGIN_NAME),
                    sub_fields: {
                        question: { title: __p('Question', PLUGIN_NAME) },
                        answer: { title: __p('Answer', PLUGIN_NAME), view: 'textarea' },
                    }
                }}
                post={props.post}
                name='question_and_answer'
                onReview={(value) => props.onReview(value, 'question_and_answer')}
            />
        )
    }

    return <>
        {
            [1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton key={item} variant="rectangular" width={'100%'} style={{ marginBottom: 16 }} height={52} />
            ))
        }
    </>
}

export default QuestionAndAnswer

