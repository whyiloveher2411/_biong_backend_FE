import React from 'react';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { Box } from '@mui/material';
import FieldForm from 'components/atoms/fields/relationship_onetomany_show/Form';


function Content({ data }: { data: CreatePostTypeData }) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FieldForm
                component={"relationship_onetomany_show"}
                config={{
                    title: "Page",
                    object: "app_page",
                    field: "app_mobile",
                    view: "relationship_onetomany_show",
                    paginate: {
                        rowsPerPage: 10,
                    },
                }}
                post={data.post}
                name={"app_mobile"}
                onReview={() => { }} //eslint-disable-line
            />
        </Box>
    );
}

export default Content;