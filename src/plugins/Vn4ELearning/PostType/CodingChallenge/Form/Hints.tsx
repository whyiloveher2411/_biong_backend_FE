import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type'
import React from 'react'

function Testcase(props: FieldFormItemProps) {

    const [hints, setHints] = React.useState<{ text: string }[]>([]);

    React.useEffect(() => {

        let hintsAfterConfirm: { text: string }[] = []

        try {
            let hints = []

            if (typeof props.post[props.name] === 'string') {
                hints = JSON.parse(props.post[props.name]);
            } else {
                hints = props.post[props.name];
            }

            hints.forEach((item: ANY, index: number) => {
                hintsAfterConfirm.push({
                    text: item
                });
            });
        } catch {
            hintsAfterConfirm = [];
        }

        setHints(hintsAfterConfirm);
    }, []);

    let items: { [key: string]: ANY } = {};

    if (props.post?.testcase?.variable_names) {
        props.post.testcase.variable_names.forEach((item: { name: string }) => {
            items[item.name] = {
                title: item.name,
                view: 'textarea',
            };
        });
    }

    items['expected'] = {
        title: 'Expected',
        view: 'textarea',
    }

    function onReview(value?: ANY, key?: null | string | JsonFormat | { [key: string]: ANY }) {
        const valueAfterConfirm: ANY[] = [];

        value.forEach((item: ANY) => {
            valueAfterConfirm.push(item.text);
        });
        
        props.onReview(null, {
            [props.name]: valueAfterConfirm,
        });

        setHints(value);
    }

    return (
        <FieldForm
            component='repeater'
            config={{
                title: props.config.title || 'Testcase',
                sub_fields: {
                    text: {
                        title: 'Text',
                        view: 'textarea',
                    }
                }
            }}
            name={'value'}
            post={{ value: hints }}
            onReview={onReview}
        />
    )
}

export default Testcase