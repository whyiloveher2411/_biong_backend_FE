import Typography from 'components/atoms/Typography';
import Box from 'components/atoms/Box';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import React from 'react';
import Avatar from 'components/atoms/Avatar';
import FieldForm from 'components/atoms/fields/FieldForm';
import useAjax from 'hook/useApi';

function CustomerTemplate(props: {
    customer: JsonFormat
}) {

    return <Box
        sx={{
            marginTop: 2,
            gridGap: 16,
            display: "flex"
        }}
    >
        <div>
            <Avatar variant="square" style={{ width: 250, height: 250, borderRadius: 4 }} image={props.customer.avatar} name={(props.customer.first_name ?? '') + ' ' + (props.customer.last_name ?? '')} />
        </div>
        <Box
            sx={{
                gridGap: 8,
                display: "flex",
                flexDirection: "column"
            }}
        >
            <Typography variant="h4">{props.customer.first_name ?? ''} {props.customer.last_name ?? ''}</Typography>
            <Typography variant="body1">{props.customer.title}</Typography>
        </Box>
    </Box>
}

function Main(props: FieldFormItemProps) {

    const { post, onReview } = props;

    const [customer, setCustomer] = React.useState(props.config.__Vn4EcomCustomer ?? false);

    const { ajax, Loading, open } = useAjax({ loadingType: 'custom' });

    const handleLoadCustomer = (id: ID) => {

        if (id) {
            ajax({
                url: 'plugin/vn4-ecommerce/customer/get',
                data: {
                    id: id
                },
                success: (result) => {
                    if (result.customer) {
                        props.config.__Vn4EcomCustomer = result.customer;
                        setCustomer(result.customer);
                    }
                }
            });
        } else {
            props.config.__Vn4EcomCustomer = null;
            setCustomer(false);
        }
    }

    React.useEffect(() => {
        if (post[props.name] && !props.config.__Vn4EcomCustomer) {
            handleLoadCustomer(post[props.name]);
        }
    }, [post.id]);

    return (
        <>
            <FieldForm
                component="relationship_onetomany"
                config={{
                    title: props.config.title,
                    object: props.config.object
                }}
                post={post}
                name={props.name}
                onReview={(value, key) => {
                    if (key && typeof key !== 'string') {
                        onReview(value, key);
                        handleLoadCustomer(key[props.name] as ID);
                    }
                }}
            />
            <div style={{ position: 'relative', minHeight: open ? 250 : 0 }}>
                {
                    open &&
                    <Box position="absolute" display="flex" alignItems="center" justifyContent="center" width={1} height={250} >
                        {Loading}
                    </Box>
                }
                {
                    Boolean(customer) &&
                    <CustomerTemplate customer={customer} />
                }
            </div>
        </>
    )
}

export default Main
