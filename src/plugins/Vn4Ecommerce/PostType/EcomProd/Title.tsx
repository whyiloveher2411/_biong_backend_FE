import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import { FieldViewItemProps } from 'components/atoms/fields/type';
import React from 'react';

function Title({ post }: FieldViewItemProps) {

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gridGap: 8
            }}
        >
            <Avatar variant="square" image={post.featured_image} name={post.title} />
            <span style={{ opacity: .6 }} >#{post.id}:</span>
            {post.title}
        </Box>
    )
}

export default Title
