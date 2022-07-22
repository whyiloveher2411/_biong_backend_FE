
import FieldForm from 'components/atoms/fields/FieldForm';
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';

export default {
    products: {
        title: 'Products',
        component: (props: CreatePostAddOnProps) => <FieldForm
            component={'relationship_onetomany_show'}
            config={{
                title: 'Products',
                object: 'ecom_prod',
                field: 'ecom_prod_cate',
                view: "relationship_onetomany_show"
            }}
            post={props.data.post}
            name={'reviews'}
            onReview={(value) => {
                //
            }}
        />
        ,
        priority: 2,
    },
};