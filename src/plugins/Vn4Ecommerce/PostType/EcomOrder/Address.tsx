import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import { HookCreateDataTabItemProps } from 'components/pages/PostType/CreateData/Form';
import React from 'react';

function Address(props: HookCreateDataTabItemProps) {
    const { data, dataField, onReview } = props;

    return (
        <Grid container spacing={3}>
            {
                dataField.fields.map((key: string) => (
                    <Grid key={key} item xs={12} md={6}>
                        <FieldForm
                            component={data.config.fields[key].view ?? 'text'}
                            config={data.config.fields[key]}
                            post={data.post}
                            name={key}
                            onReview={(value, key2 = key) => onReview(value, key2)}
                        />
                    </Grid>
                ))
            }
        </Grid>
    )
}

export default Address
