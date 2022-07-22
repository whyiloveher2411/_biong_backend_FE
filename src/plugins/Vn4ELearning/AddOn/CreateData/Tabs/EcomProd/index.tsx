import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { __p } from 'helpers/i18n';
import EditCourse from './EditCourse';
import QuestionAndAnswer from './QuestionAndAnswer';

export default function (props: CreatePostTypeData) {
    if (props.action === 'EDIT') {
        return {
            editCourseDetail: {
                title: __p('Course Detail', 'Vn4ELearning'),
                component: (props: CreatePostAddOnProps) => <EditCourse {...props} />,
                priority: 1,
            },
            questionAndAnswer: {
                title: __p('Question and Answer', 'Vn4ELearning'),
                component: (props: CreatePostAddOnProps) => <QuestionAndAnswer {...props} />,
                priority: 1,
            },
            student: {
                title: __p('Student', 'Vn4ELearning'),
                component: (props: CreatePostAddOnProps) => <QuestionAndAnswer {...props} />,
                priority: 1,
            },
        }
    }
}
