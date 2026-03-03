import DrawerCustom from "components/molecules/DrawerCustom";
import { LoadingButton } from "@mui/lab";
import { Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { FieldFormItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";
import React, { useState } from "react";
import SuggestContentAi from "./SuggestContentAi";

function ChecCourseStructure(props: FieldFormItemProps) {

    const ajaxUseApi = useAjax();

    const [courses, setCourses] = React.useState<ANY[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [openSuggestAi, setOpenSuggestAi] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [savingStep, setSavingStep] = useState(false);


    const handleCheckDataCraw = () => {
        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/check-course-structure",
            method: "POST",
            data: {
                action: "check-course-structure",
                id: props.post.id,
            },
            success: (result) => {
                if (result.success && result.data && Array.isArray(result.data)) {
                    setCourses(result.data);
                }
                setLoading(false);
            },
        });
    }

    const handleAddDataFromJson = () => {
        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/add-course-from-json",
            method: "POST",
            data: {
                action: "add-data-from-json",
                id: props.post.id,
            },
            success: (result) => {
                setLoading(false);
            },
        });
    }

    const handleSetStepCurrent = () => {
        setSavingStep(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/ai/set-step-current",
            method: "POST",
            data: {
                id: props.post.id,
                step: currentStep + 1,
                step_temp: currentStep + 1
            },

            success: (result) => {
                setSavingStep(false);
            },
            error: () => {
                setSavingStep(false);
            }
        });
    }





    React.useEffect(() => {
        if (props.post.id) {
            handleCheckDataCraw();
        }
    }, [props.post.id]);

    const value = props.post?.[props.name || 'link_data_craw_json'] || '';

    const handleChange = (event: ANY) => {
        props.onReview(event.target.value, props.name || 'link_data_craw_json');
    };

    const drawerTitleValue = typeof props.post?.title === 'string'
        ? props.post.title
        : (props.post?.title?.vi || props.post?.title?.en || 'Gợi ý nội dung bằng AI');

    if (loading && courses.length === 0) {
        return <CircularProgress size={20} />;
    }

    return (<Box>
        <FormControl fullWidth size="small">
            <InputLabel shrink id="link-data-craw-select-label">Link Data Craw JSON</InputLabel>
            <Select
                labelId="link-data-craw-select-label"
                value={value}
                label="Link Data Craw JSON"
                onChange={handleChange}
                displayEmpty
                title="Link Data Craw JSON"
            >
                <MenuItem value="" disabled>
                    <em>Select Data</em>
                </MenuItem>
                {courses.map((course, index) => {
                    let maxMatchScore = 0;
                    courses.forEach(c => {
                        if (c.match_with_title > maxMatchScore) maxMatchScore = c.match_with_title;
                    });

                    return (
                        <MenuItem
                            key={`course-${index}`}
                            value={course.path || ''}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span>
                                    {course.title}
                                    {course.match_with_title === maxMatchScore && maxMatchScore > 0 && <span style={{ color: 'green', fontSize: '0.85em', marginLeft: '5px', fontWeight: 'bold' }}>(Match: {course.match_with_title}%)</span>}
                                </span>
                                {course.used_in_course && course.used_in_course !== props.post.id && (
                                    <span style={{ color: '#ff9800', fontSize: '0.85em', marginLeft: '10px' }}>
                                        (Used)
                                    </span>
                                )}
                            </div>
                        </MenuItem>
                    )
                })}
            </Select>
        </FormControl>
        <LoadingButton loading={loading} sx={{ mt: 2 }} variant="contained" onClick={handleAddDataFromJson}>Add course from json</LoadingButton>
        <br />
        <Button sx={{ mt: 2 }} variant="contained" color="success" onClick={() => setOpenSuggestAi(true)}>Gợi ý nội dung bằng ai</Button>

        <DrawerCustom
            open={openSuggestAi}
            onClose={() => setOpenSuggestAi(false)}
            title={drawerTitleValue || 'Gợi ý nội dung bằng AI'}
            width={2000}
            restDialogContent={{}}
            headerAction={<LoadingButton loading={savingStep} size="small" sx={{ color: 'text.primary' }} variant="contained" color="inherit" onClick={handleSetStepCurrent}>Đặt ở bước này</LoadingButton>}
        >
            <SuggestContentAi post={props.post} onReview={props.onReview} courses={courses} onStepChange={(step) => {
                setCurrentStep(step);
            }} onFinish={() => setOpenSuggestAi(false)} />
        </DrawerCustom>



    </Box>
    );
}

export default ChecCourseStructure;