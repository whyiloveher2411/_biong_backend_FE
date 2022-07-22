import FieldForm from 'components/atoms/fields/FieldForm';
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import React from 'react';

function Orders({ data }: CreatePostAddOnProps) {
    return (
        <FieldForm
            component={'relationship_onetomany_show'}
            config={{
                title: 'Orders',
                object: 'ecom_order',
                field: 'ecom_customer',
                view: "relationship_onetomany_show",
                showFields: {
                    title: {
                        title: 'ID',
                        view: 'text'
                    },
                    total_money: {
                        title: 'Total Money',
                        view: 'text',
                    },
                    created_at: {
                        title: 'Created At',
                        view: 'date_picker'
                    }
                }
            }}
            post={data.post}
            name={'ecom_customer'}
            onReview={(value) => {
                //
            }}
        />
    )
}

export default Orders
