import FieldForm from 'components/atoms/fields/FieldForm'
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData'

function QuestionAndAnswer({ data }: CreatePostAddOnProps) {
    return (
        <FieldForm
            component={'relationship_onetomany_show'}
            config={{
                title: 'Question And Answer',
                object: 'vn4_elearning_course_qa',
                field: 'course',
                view: "relationship_onetomany_show",
                paginate: {
                    rowsPerPage: 10
                }
            }}
            post={data.post}
            name={'reviews'}
            onReview={() => {
                //
            }}
        />
    )
}

export default QuestionAndAnswer