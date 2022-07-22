import FieldForm from 'components/atoms/fields/FieldForm';
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import React from 'react';

function Orders({ data }: CreatePostAddOnProps) {
    return (
        <FieldForm
            component={'relationship_manytomany_show'}
            config={{
                title: 'Orders',
                object: 'ecom_order',
                field: 'ecom_prod',
                view: "relationship_manytomany_show",
                paginate: {
                    rowsPerPage: 10
                }
                // showFields: {
                //     title: {
                //         title: 'ID',
                //         view: 'text'
                //     },
                //     quantity: {
                //         title: 'Quantity',
                //         view: 'number',
                //     },
                //     created_at: {
                //         title: 'Created At',
                //         view: 'date_picker'
                //     }
                // }
            }}
            post={data.post}
            name={'ecom_prod'}
            onReview={(value) => { }} //eslint-disable-line
        />
    )
}

export default Orders
