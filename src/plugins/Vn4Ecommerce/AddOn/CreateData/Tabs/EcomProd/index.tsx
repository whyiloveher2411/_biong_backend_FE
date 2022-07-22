import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import Inventory from './Inventory';
import Orders from './Order';
import Report from './Report';
import Reviews from './Reviews';

export default function (props: CreatePostTypeData) {

    if (props.action === 'EDIT') {
        return {
            report: {
                title: __p('Report', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Report {...props} />,
                priority: 2,
            },
            inventory: {
                title: __p('Inventory', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Inventory {...props} />,
                priority: 3,
            },
            reviews: {
                title: __p('Reviews', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Reviews {...props} />,
                priority: 4,
            },
            orders: {
                title: __p('Orders', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Orders {...props} />,
                priority: 4,
            },
            // customers: {
            //     title: 'Customers',
            //     component: (props) => <Customers {...props} />,
            //     priority: 5,
            // },
        }
    }
}
