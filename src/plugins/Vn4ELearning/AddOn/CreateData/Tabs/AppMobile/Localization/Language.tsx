import React from "react";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/FieldForm";
import Box from "components/atoms/Box";

function Language({ data }: { data: CreatePostTypeData }) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, p: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Languages",
                        object: "sac_language",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"app_mobile"}
                    onReview={() => {}} //eslint-disable-line
                />
            </Box>
        </Box>
    );
}

export default Language;
