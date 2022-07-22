import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { __p } from 'helpers/i18n';
import EditAccountNotifications from './EditAccountNotifications';
import EditCV from './EditCV';

export default function (props: CreatePostTypeData) {
    if (props.action === 'EDIT') {
        return {
            editCV: {
                title: __p('CV', 'Vn4ELearning'),
                component: (props: CreatePostAddOnProps) => <EditCV {...props} />,
                priority: 1,
            },
            editNotifications: {
                title: __p('Notifications', 'Vn4ELearning'),
                component: (props: CreatePostAddOnProps) => <EditAccountNotifications {...props} />,
                priority: 1,
            },
        }
    }
}
