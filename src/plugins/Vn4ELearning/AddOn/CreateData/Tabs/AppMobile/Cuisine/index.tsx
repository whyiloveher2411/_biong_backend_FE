import React from "react";
import { Box } from "@mui/material";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/relationship_onetomany_show/Form";
import LoadingButton from "components/atoms/LoadingButton";
import DrawerCustom from "components/molecules/DrawerCustom";
import QuickInputIngredientsButton from "./QuickInputIngredientsButton";

export default function Cuisine({ data }: { data: CreatePostTypeData }) {
    const [ingredientsTableKey, setIngredientsTableKey] = React.useState(0);
    const [openIngredientCategoryDrawer, setOpenIngredientCategoryDrawer] =
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
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <LoadingButton
                                variant="outlined"
                                size="small"
                                onClick={() => setOpenIngredientCategoryDrawer(true)}
                            >
                                Danh mục nguyên liệu
                            </LoadingButton>
                            <QuickInputIngredientsButton
                                appMobileId={data.post.id}
                                onSuccess={() => setIngredientsTableKey((k) => k + 1)}
                            />
                        </Box>
                    ),
                }}
                post={data.post}
                name={"cuisine_ingredient"}
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
        </Box>
    );
}
