import { ShowPostTypeAddOnProps } from 'components/pages/PostType/ShowData';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import Insights from './Insights';
import Inventory from './Inventory';

export default {
    inventory: {
        title: __p('Inventory', PLUGIN_NAME),
        component: () => <Inventory />,
        priority: 3,
    },
    insights: {
        title: 'Insights',
        component: (props: ShowPostTypeAddOnProps) => <Insights {...props} />,
        priority: 4,
    },
    topProduct: {
        title: 'Top Products',
        component: (props: ShowPostTypeAddOnProps) => <Insights {...props} />,
        priority: 5,
    },
}