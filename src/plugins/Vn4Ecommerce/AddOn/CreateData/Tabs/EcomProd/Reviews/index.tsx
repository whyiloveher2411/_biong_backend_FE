import FieldForm from 'components/atoms/fields/FieldForm'
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData'
import React from 'react'

function Reviews({ data }: CreatePostAddOnProps) {
    return (
        <FieldForm
            component={'relationship_onetomany_show'}
            config={{
                title: 'Reviews',
                object: 'ecom_prod_review',
                field: 'ecom_prod',
                view: "relationship_onetomany_show",
                paginate: {
                    rowsPerPage: 10
                }
            }}
            post={data.post}
            name={'reviews'}
            onReview={() => { }} //eslint-disable-line
        />
    )
}

export default Reviews
