import Typography from 'components/atoms/Typography';
import Box from 'components/atoms/Box';
import Avatar from 'components/atoms/Avatar';
import React from 'react';
import { FieldViewItemProps } from 'components/atoms/fields/type';

export function Customer({ customer }: {
    customer: JsonFormat
}) {
    return (
        <Box
            sx={{
                gridGap: 16,
                display: "flex",
                alignItems: "center"
            }}
        >
            <Avatar image={customer.avatar} name={(customer.first_name ?? '') + ' ' + (customer.last_name ?? '')} />
            <Box display="flex" flexDirection="column">
                <Typography variant="body1">{customer.first_name ?? ''} {customer.last_name ?? ''}</Typography>
                <Typography variant="body2">{customer.title}</Typography>
            </Box>
        </Box>
    )
}

function Main(props: FieldViewItemProps) {

    const [customer, setCustomer] = React.useState<JsonFormat | false>(false);

    React.useEffect(() => {
        if (props.post[props.name + '_detail']) {
            try {
                setCustomer(JSON.parse(props.post[props.name + '_detail']));
                //eslint-disable-next-line
            } catch (error) { }

        }
    }, []);

    if (customer) {
        return <Customer customer={customer} />
    }
    return null;
}


export default Main
