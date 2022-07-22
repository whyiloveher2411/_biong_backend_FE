import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import Orders from './Orders';
import Reviews from './Reviews';

export default {
    // insights: {
    //     title: 'Insights',
    //     component: (props: CreatePostAddOnProps) => <Insights {...props} />,
    //     priority: 2,
    // },
    orders: {
        title: 'Orders',
        component: (props: CreatePostAddOnProps) => <Orders {...props} />,
        priority: 3,
    },
    reviews: {
        title: 'Reviews',
        component: (props: CreatePostAddOnProps) => <Reviews {...props} />,
        priority: 4,
    },
}