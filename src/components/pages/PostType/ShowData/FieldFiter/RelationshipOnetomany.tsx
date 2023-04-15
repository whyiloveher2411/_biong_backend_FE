import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldConfigProps } from 'components/atoms/fields/type'
import React from 'react'

function RelationshipOnetomany({ config, onReview, data }: { data: JsonFormat, config: FieldConfigProps, onReview: (value: ANY) => void }) {

    return (
        <FieldForm
            component='relationship_onetomany'
            config={config}
            name='value'
            post={data}
            onReview={(_, valueJson: ANY) => {
                if (valueJson.value) {
                    onReview({
                        value: valueJson.value,
                        value_detail: {
                            id: valueJson.value_detail.id,
                            title: valueJson.value_detail.title,
                        }
                    })
                } else {
                    onReview(0);
                }
            }}
        />
    )
}

export default RelationshipOnetomany