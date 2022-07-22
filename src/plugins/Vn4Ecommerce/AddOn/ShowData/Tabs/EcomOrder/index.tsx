import { ShowPostTypeAddOnProps } from 'components/pages/PostType/ShowData';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import InProgress from './InProgress';
import Report from './Report';

export default {
    inProgress: {
        title: __p('In Progress', PLUGIN_NAME),
        component: (props: ShowPostTypeAddOnProps) => <InProgress {...props} />,
        priority: 2,
    },
    report: {
        title: __p('Report', PLUGIN_NAME),
        component: (props: ShowPostTypeAddOnProps) => <Report {...props} />,
        priority: 2,
    },
}