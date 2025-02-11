import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type'
import React from 'react'

function Testcase(props: FieldFormItemProps) {

    const [testCase, setTestCase] = React.useState([]);

    React.useEffect(() => {

        let testCase = []
        if (!props.post[props.name + '_before'] || props.post[props.name + '_before'].length === 0) {
            try {

                if (typeof props.post[props.name] === 'string') {
                    testCase = JSON.parse(props.post[props.name]);
                    console.log(testCase);
                } else {
                    testCase = props.post[props.name];
                }

                testCase.forEach((item: ANY, index: number) => {
                    Object.keys(item).forEach((key: string) => {
                        item[key] = typeof item[key] !== 'string' ? JSON.stringify(item[key]) : item[key];
                    });
                });
            } catch {
                testCase = [];
            }

            setTestCase(testCase);
        }
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

        const keys = props.post.testcase.variable_names?.map((item: { name: string }) => item.name) || [];

        keys.push('expected');

        value.forEach((item: ANY) => {
            const itemAfterConfirm: ANY = {};
            Object.keys(item).forEach((key: string) => {
                if ( !keys.includes(key) ) return;
                itemAfterConfirm[key] = typeof item[key] === 'string' ? item[key].replace(/^"|"$/g, '') : item[key]
            });
            valueAfterConfirm.push(itemAfterConfirm);
        });
        
        valueAfterConfirm.forEach(item => {
            Object.keys(item).forEach(key => {
                try {
                    item[key] = JSON.parse(item[key]);
                } catch {
                    // Giữ nguyên giá trị nếu không parse được
                }
            });
        });

         // Sắp xếp lại các thuộc tính theo thứ tự của mảng keys
        const sortedValueAfterConfirm = valueAfterConfirm.map((item : { [key: string]: ANY }) => {
            const sortedItem: ANY = {};
            keys.forEach((key: string) => {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    sortedItem[key] = item[key];
                }
            });
            return sortedItem;
        });
    
        props.onReview(null, {
            [props.name]: sortedValueAfterConfirm,
        });

        setTestCase(value);
    }

    return (
        <FieldForm
            component='repeater'
            config={{
                title: props.config.title || 'Testcase',
                sub_fields: items
            }}
            name={'value'}
            post={{ value: testCase }}
            onReview={onReview}
        />
    )
}

export default Testcase