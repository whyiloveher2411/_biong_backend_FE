import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { __p } from 'helpers/i18n';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import RemoteConfig from './RemoteConfig';
import Localization from './Localization';
import Database from './Database';
import FileManager from './FileManager';
import PushNotification from './PushNotification';
// import Analytics from './Analytics';
import Modules from './Modules';
import Course from './Course';
import Content from './Content';



export default function (props: CreatePostTypeData) {

    if (props.action === 'EDIT') {
        return {
            database: {
                title: __p('Database', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Database data={props.data} />,
                priority: 3,
            },
            content: {
                title: __p('Content', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Content data={props.data} />,
                priority: 3,
            },
            localization: {
                title: __p('Localization', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Localization data={props.data} />,
                priority: 3,
            },
            courses: {
                title: __p('Courses', PLUGIN_NAME),
                component: (props: CreatePostAddOnProps) => <Course data={props.data} />,
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
            // analytics: {
            //     title: __p('Analytics', PLUGIN_NAME),
            //     component: (props: CreatePostAddOnProps) => <Analytics data={props.data} />,
            //     priority: 3,
            // },

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
