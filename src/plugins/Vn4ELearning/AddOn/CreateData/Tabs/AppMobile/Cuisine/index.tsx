import React from "react";
import { Box } from "@mui/material";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/relationship_onetomany_show/Form";
import ImportIngredientsButton from "./ImportIngredientsButton";
import ImportRecipesButton from "./ImportRecipesButton";

export default function Cuisine({ data }: { data: CreatePostTypeData }) {
    const [ingredientsTableKey, setIngredientsTableKey] = React.useState(0);
    const [recipesTableKey, setRecipesTableKey] = React.useState(0);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FieldForm
                key={ingredientsTableKey}
                component={"relationship_onetomany_show"}
                config={{
                    title: "Nguyên liệu",
                    object: "cuisine_ingredient",
                    field: "app_mobile",
                    view: "relationship_onetomany_show",
                    paginate: {
                        rowsPerPage: 10,
                    },
                    relationshipHeaderActions: (
                        <ImportIngredientsButton
                            appMobileId={data.post.id}
                            onImported={() => setIngredientsTableKey((k) => k + 1)}
                        />
                    ),
                }}
                post={data.post}
                name={"cuisine_ingredient"}
                onReview={() => {}} // eslint-disable-line
            />

            <FieldForm
                key={recipesTableKey}
                component={"relationship_onetomany_show"}
                config={{
                    title: "Công thức",
                    object: "cuisine_recipe",
                    field: "app_mobile",
                    view: "relationship_onetomany_show",
                    paginate: {
                        rowsPerPage: 10,
                    },
                    relationshipHeaderActions: (
                        <ImportRecipesButton
                            appMobileId={data.post.id}
                            onImported={() => setRecipesTableKey((k) => k + 1)}
                        />
                    ),
                }}
                post={data.post}
                name={"cuisine_recipe"}
                onReview={() => {}} // eslint-disable-line
            />

            <FieldForm
                component={"relationship_onetomany_show"}
                config={{
                    title: "Template",
                    object: "cuisine_meal_template",
                    field: "app_mobile",
                    view: "relationship_onetomany_show",
                    paginate: {
                        rowsPerPage: 10,
                    },
                }}
                post={data.post}
                name={"cuisine_meal_template"}
                onReview={() => {}} // eslint-disable-line
            />
        </Box>
    );
}
