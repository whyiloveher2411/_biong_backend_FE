import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import Config from './Config';
import RemoteConfig from './RemoteConfig';
import Authentication from './Authentication';
import Database from './Database';
import FileManager from './FileManager';
import PushNotification from './PushNotification';
import Analytics from './Analytics';
import Modules from './Modules';

export default function (props: CreatePostTypeData) {
    console.log(props.action);
    if (props.action === 'EDIT') {
        return {
            config: {
                title: __p('Config', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Config data={props.data} />,
                priority: 2,
            },
            authentication: {
                title: __p('Authentication', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Authentication data={props.data} />,
                priority: 3,
            },
            database: {
                title: __p('Database', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Database data={props.data} />,
                priority: 3,
            },
            fileManager: {
                title: __p('File Manager', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <FileManager data={props.data} />,
                priority: 3,
            },
            remoteConfig: {
                title: __p('Remote Config', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <RemoteConfig data={props.data} />,
                priority: 3,
            },
            pushNotification: {
                title: __p('Push Notification', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <PushNotification data={props.data} />,
                priority: 3,
            },
            analytics: {
                title: __p('Analytics', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Analytics data={props.data} />,
                priority: 3,
            },
            modules: {
                title: __p('Modules', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Modules data={props.data} />,
                priority: 3,
            },
            // customers: {
            //     title: 'Customers',
            //     component: (props) => <Customers {...props} />,
            //     priority: 5,
            // },
        }
    }
}
