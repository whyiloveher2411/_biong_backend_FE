import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldConfigProps } from 'components/atoms/fields/type';

function Editor({ config, onReview, data }: { data: JsonFormat, config: FieldConfigProps, onReview: (value: ANY) => void }) {
    return (
        <FieldForm
            component='textarea'
            config={config}
            name='value'
            post={data}
            onReview={(value) => {
                onReview({
                    value: value
                });
            }}
        />
    )
}

export default Editor