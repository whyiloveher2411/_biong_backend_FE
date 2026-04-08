import React from "react";
import { Box } from "@mui/material";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/relationship_onetomany_show/Form";
import LoadingButton from "components/atoms/LoadingButton";
import DrawerCustom from "components/molecules/DrawerCustom";
import ImportExercisesButton from "./ImportExercisesButton";

export default function Gym({ data }: { data: CreatePostTypeData }) {
    const [exercisesTableKey, setExercisesTableKey] = React.useState(0);
    const [openEquipmentDrawer, setOpenEquipmentDrawer] = React.useState(false);
    const [openMuscleDrawer, setOpenMuscleDrawer] = React.useState(false);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FieldForm
                key={exercisesTableKey}
                component={"relationship_onetomany_show"}
                config={{
                    title: "Bài tập",
                    object: "gym_exercise",
                    field: "app_mobile",
                    view: "relationship_onetomany_show",
                    paginate: {
                        rowsPerPage: 10,
                    },
                    relationshipHeaderActions: (
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <ImportExercisesButton
                                appMobileId={data.post.id}
                                onImported={() => setExercisesTableKey((k) => k + 1)}
                            />
                            <LoadingButton
                                variant="outlined"
                                size="small"
                                onClick={() => setOpenEquipmentDrawer(true)}
                            >
                                Thiết bị
                            </LoadingButton>
                            <LoadingButton
                                variant="outlined"
                                size="small"
                                onClick={() => setOpenMuscleDrawer(true)}
                            >
                                Cơ
                            </LoadingButton>
                        </Box>
                    ),
                }}
                post={data.post}
                name={"gym_exercise"}
                onReview={() => {}} // eslint-disable-line
            />

            <DrawerCustom
                open={openEquipmentDrawer}
                onClose={() => setOpenEquipmentDrawer(false)}
                title="Thiết bị"
                width={1100}
                activeOnClose
            >
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Thiết bị",
                        object: "gym_equipment",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"gym_equipment"}
                    onReview={() => {}} // eslint-disable-line
                />
            </DrawerCustom>

            <DrawerCustom
                open={openMuscleDrawer}
                onClose={() => setOpenMuscleDrawer(false)}
                title="Cơ"
                width={1100}
                activeOnClose
            >
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Cơ",
                        object: "gym_muscle",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"gym_muscle"}
                    onReview={() => {}} // eslint-disable-line
                />
            </DrawerCustom>
        </Box>
    );
}
