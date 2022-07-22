import Grid from 'components/atoms/Grid';
import React from 'react';
import useAjax from 'hook/useApi';
import { FieldFormItemProps } from '../type';
import { useParams } from 'react-router-dom';
import FieldForm from 'components/atoms/fields/FieldForm';

function RelationshipOneToOneShowForm({ name, onReview, ...props }: FieldFormItemProps) {

    const { ajax } = useAjax();

    let { type } = useParams<{
        type: string,
    }>();

    const [data, setData] = React.useState<JsonFormat | false>(false);

    React.useEffect(() => {

        ajax({
            url: 'post-type/onetoone',
            method: 'POST',
            data: {
                postType: type,
                field: name,
                postId: props.post.id
            },
            success: (result: {
                post: JsonFormat
            }) => {

                onReview(result.post);
                setData(result);

            }
        });

    }, [props.post.id]);

    const onChangePost = (value: ANY, key: null | string | JsonFormat) => {

        if (typeof key === 'object' && key !== null) {

            props.post[name] = {
                ...props.post[name],
                ...key
            };

        } else {
            if (typeof key === 'string') {
                props.post[name] = {
                    ...props.post[name],
                    [key]: value
                };
            }
        }

        console.log('onChangePost', props.post[name]);

        console.log(props.post);

        onReview(props.post[name]);

    };

    if (data !== false) {
        return <Grid
            container
            spacing={4}
        >
            {
                Object.keys(data.config.fields).filter(key => !data.config.fields[key].hidden).map(key => {
                    return (
                        <Grid item md={12} xs={12} key={key} >
                            <FieldForm
                                component={data.config?.fields[key].view ? data.config.fields[key].view : 'text'}
                                config={data.config.fields[key]}
                                post={data.post ?? {}}
                                name={key}
                                onReview={(value, key2 = key) => onChangePost(value, key2)}
                            />
                        </Grid>
                    )
                })
            }
        </Grid>
    }

    return <></>;
}

export default RelationshipOneToOneShowForm
