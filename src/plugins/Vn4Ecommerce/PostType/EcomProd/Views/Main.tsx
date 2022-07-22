import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import { FieldViewItemProps } from 'components/atoms/fields/type';
import React from 'react';

const AvatarThumbnail = ({ product }: { product: JsonFormat }) => <Avatar variant="square" image={product.featured_image} name={product.title} />;

function Main(props: FieldViewItemProps) {

    if (props.post[props.name + '_moredata']) {
        return (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gridGap: 8
                }}
            >
                <AvatarThumbnail product={props.post[props.name + '_moredata']} />
                <span style={{ opacity: .6 }} >#{props.post[props.name + '_moredata']?.id}: </span>
                {props.post[props.name + '_moredata']?.title}
            </Box>
        )
    }

    return null;
}

export default Main
