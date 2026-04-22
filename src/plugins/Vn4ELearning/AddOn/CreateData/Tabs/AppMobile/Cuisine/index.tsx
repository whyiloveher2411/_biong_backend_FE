import React from "react";
import { Box } from "@mui/material";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/relationship_onetomany_show/Form";
import LoadingButton from "components/atoms/LoadingButton";
import DrawerCustom from "components/molecules/DrawerCustom";
import ImportRecipesButton from "./ImportRecipesButton";

export default function Cuisine({ data }: { data: CreatePostTypeData }) {
    const [ingredientsTableKey] = React.useState(0);
    const [recipesTableKey, setRecipesTableKey] = React.useState(0);
    const [openIngredientCategoryDrawer, setOpenIngredientCategoryDrawer] =
        React.useState(false);
    const [openRecipeCategoryDrawer, setOpenRecipeCategoryDrawer] =
        React.useState(false);

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
                        <LoadingButton
                            variant="outlined"
                            size="small"
                            onClick={() => setOpenIngredientCategoryDrawer(true)}
                        >
                            Danh mục nguyên liệu
                        </LoadingButton>
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
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <ImportRecipesButton
                                appMobileId={data.post.id}
                                onImported={() => setRecipesTableKey((k) => k + 1)}
                            />
                            <LoadingButton
                                variant="outlined"
                                size="small"
                                onClick={() => setOpenRecipeCategoryDrawer(true)}
                            >
                                Danh mục công thức
                            </LoadingButton>
                        </Box>
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

            <DrawerCustom
                open={openIngredientCategoryDrawer}
                onClose={() => setOpenIngredientCategoryDrawer(false)}
                title="Danh mục nguyên liệu"
                width={1100}
                activeOnClose
            >
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Danh mục nguyên liệu",
                        object: "cuisine_ingredient_category",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"cuisine_ingredient_category"}
                    onReview={() => {}} // eslint-disable-line
                />
            </DrawerCustom>

            <DrawerCustom
                open={openRecipeCategoryDrawer}
                onClose={() => setOpenRecipeCategoryDrawer(false)}
                title="Danh mục công thức"
                width={1100}
                activeOnClose
            >
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Danh mục công thức",
                        object: "cuisine_recipe_category",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"cuisine_recipe_category"}
                    onReview={() => {}} // eslint-disable-line
                />
            </DrawerCustom>
        </Box>
    );
}
