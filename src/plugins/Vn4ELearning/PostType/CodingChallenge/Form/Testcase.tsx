import { LoadingButton } from '@mui/lab';
import { Box } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import useAjax from 'hook/useApi';
import React from 'react';

function Testcase(props: FieldFormItemProps) {

    const [testCase, setTestCase] = React.useState([]);

    const [variableNames, setVariableNames] = React.useState<{ [key: string]: ANY }>({});

    const [times, setTimes] = React.useState(1);

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

    React.useEffect(() => {
        if (props.post?.testcase?.variable_names) {
            let items: { [key: string]: ANY } = {};

            if (props.post?.testcase?.variable_names) {
                props.post.testcase.variable_names.forEach((item: { name: string }) => {
                    items[item.name] = {
                        title: item.name,
                        view: 'textarea',
                    };
                });
            }

            const orderedItems: { [key: string]: ANY } = {};
            props.post.testcase.variable_names.forEach((item: { name: string }) => {
                orderedItems[item.name] = items[item.name];
            });
            items = orderedItems;

            items['expected'] = {
                title: 'Expected',
                view: 'textarea',
            }

            setVariableNames(items);
            setTimes(prev => prev + 1);
        }
    }, [props.post?.testcase]);



    function onReview(value?: ANY, key?: null | string | JsonFormat | { [key: string]: ANY }) {
        const valueAfterConfirm: ANY[] = [];

        const keys = props.post.testcase.variable_names?.map((item: { name: string }) => item.name) || [];

        keys.push('expected');

        value.forEach((item: ANY) => {
            const itemAfterConfirm: ANY = {};
            Object.keys(item).forEach((key: string) => {
                if (!keys.includes(key)) return;
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
        const sortedValueAfterConfirm = valueAfterConfirm.map((item: { [key: string]: ANY }) => {
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

    if (times % 2 === 0) {
        return <Box> <FormTestcase props={props} variableNames={variableNames} testCase={testCase} onReview={onReview} setTimes={setTimes} /></Box>
    }

    return <FormTestcase props={props} variableNames={variableNames} testCase={testCase} onReview={onReview} setTimes={setTimes} />

}

export default Testcase

function FormTestcase({ props, variableNames, testCase, onReview, setTimes }: { props: FieldFormItemProps, variableNames: { [key: string]: ANY }, testCase: ANY[], onReview: (value?: ANY, key?: null | string | JsonFormat | { [key: string]: ANY }) => void, setTimes: (value: number) => void }) {

    const [isLoading, setIsLoading] = React.useState(false);

    const api = useAjax();

    function handleAddTestcaseByAI() {
        setIsLoading(true);

        api.ajax({
            url: 'plugin/vn4-e-learning/actions/e_learning_coding_challenge/add-testcase-by-ai',
            method: 'POST',
            data: {
                id: props.post.id,
                name: props.name,
            },
            success: (res: ANY) => {
                // setIsLoading(false);
            },
            finally: () => {
                setIsLoading(false);
            }
        });
    }

    return <Box>
        <FieldForm
            component='repeater'
            config={{
                title: props.config.title || 'Testcase',
                sub_fields: variableNames
            }}
            name={'value'}
            post={{ value: testCase }}
            onReview={onReview}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <LoadingButton variant='contained' color='primary' onClick={handleAddTestcaseByAI} loading={isLoading}>Thêm testcase bằng AI</LoadingButton>
        </Box>
    </Box>
}
