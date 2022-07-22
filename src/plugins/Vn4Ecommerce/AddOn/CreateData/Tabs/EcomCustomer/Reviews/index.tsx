import FieldForm from 'components/atoms/fields/FieldForm';
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import React from 'react';

function Reviews({ data }: CreatePostAddOnProps) {
    return (
        <FieldForm
            component={'relationship_onetomany_show'}
            config={{
                title: 'Reviews',
                object: 'ecom_prod_review',
                field: 'ecom_customer',
                view: "relationship_onetomany_show"
            }}
            post={data.post}
            name={'ecom_customer'}
            onReview={(value) => {
                //
            }}
        />
    )
}

export default Reviews
