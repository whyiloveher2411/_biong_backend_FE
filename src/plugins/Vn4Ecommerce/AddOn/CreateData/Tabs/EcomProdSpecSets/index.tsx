import FieldForm from 'components/atoms/fields/FieldForm';
import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';

export default function (props: CreatePostTypeData) {

    if (props.action === 'EDIT') {
        return {
            products: {
                title: 'Products',
                component: (props: CreatePostAddOnProps) => <FieldForm
                    component={'relationship_onetomany_show'}
                    config={{
                        title: 'Products',
                        object: 'ecom_prod',
                        field: 'ecom_prod_spec_sets',
                        view: "relationship_onetomany_show"
                    }}
                    post={props.data.post}
                    name={'reviews'}
                    onReview={() => {
                        //
                    }}
                />
                ,
                priority: 2,
            },
        };
    }

    return {};

}