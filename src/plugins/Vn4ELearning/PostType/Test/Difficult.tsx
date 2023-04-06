import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'

function Difficult(props: FieldFormItemProps) {
    return (
        <FieldForm
            component='select'
            config={{
                title: 'Độ khó',
                list_option: {
                    1: { title: '1: Intern' },
                    2: { title: '2: Fresher' },
                    3: { title: '3: Junior' },
                    4: { title: '4: Middle' },
                    5: { title: '5: Senior' },
                    6: { title: '6' },
                    7: { title: '7' },
                    8: { title: '8' },
                    9: { title: '9' },
                    10: { title: '10' },
                },
                defaultValue: 1,
            }}
            post={props.post}
            name={props.name}
            onReview={props.onReview}
        />
    )
}

export default Difficult