import Grid from 'components/atoms/Grid'
import React from 'react'
import { FieldConfigProps } from 'components/atoms/fields/type';
import FieldForm from 'components/atoms/fields/FieldForm';

function TabContent({ data, onReview }: {
    data: {
        fields: {
            [key: string]: FieldConfigProps
        },
        value: JsonFormat
    }, onReview: (value: JsonFormat) => void
}) {

    const onChange = (value: ANY, key: ANY) => {

        if (typeof key === 'object' && key !== null) {

            data.value = {
                ...data.value,
                ...key
            };

            // data.post[key] = value;
        } else {
            data.value[key] = value;
        }

        onReview({ ...data.value });
    };


    return (<Grid
        container
        spacing={4}>
        {
            data.fields &&
            Object.keys(data.fields).map(key => {

                let view = 'text';

                let config: FieldConfigProps = {
                    title: 'text',
                };

                config = data.fields[key];
                view = data.fields[key].view ?? 'text';

                if (!config.title) {
                    config.title = key.replace(/\b\w/g, l => l.toUpperCase());
                }

                return (
                    <Grid item md={12} xs={12} key={key} >
                        <FieldForm
                            component={view}
                            config={config}
                            post={data.value}
                            name={key}
                            onReview={(value, key2 = key) => { onChange(value, key2) }}
                        />
                    </Grid>
                )
            })
        }
    </Grid>
    )
}

export default TabContent
