import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import Structure from './Structure';

export default {
    structure: {
        title: __p('Structure', PLUGIN_NAME),
        component: () => <Structure />,
        priority: 2,
    },
}