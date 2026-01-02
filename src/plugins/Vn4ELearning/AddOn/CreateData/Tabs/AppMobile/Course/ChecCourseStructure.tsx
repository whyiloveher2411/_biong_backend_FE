import { CircularProgress, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { FieldFormItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";
import React from "react";

function ChecCourseStructure(props: FieldFormItemProps) {

    const ajaxUseApi = useAjax();

    const [courses, setCourses] = React.useState<ANY[]>([]);
    const [loading, setLoading] = React.useState(false);

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
    
    React.useEffect(() => {
        if( props.post.id ) {
            handleCheckDataCraw();
        }
    }, [ props.post.id ]);

    const value = props.post?.[props.name || 'link_data_craw_json'] || '';

    const handleChange = (event: ANY) => {
        props.onReview(event.target.value, props.name || 'link_data_craw_json');
    };

    if (loading && courses.length === 0) {
        return <CircularProgress size={20} />;
    }

    return (
        <FormControl fullWidth size="small">
            <InputLabel shrink id="link-data-craw-select-label">Link Data Craw JSON</InputLabel>
            <Select
                labelId="link-data-craw-select-label"
                value={value}
                label="Link Data Craw JSON"
                onChange={handleChange}
                displayEmpty
            >
                <MenuItem value="">
                    <em>Select Course</em>
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
                            </div>
                        </MenuItem>
                    )
                })}
            </Select>
        </FormControl>
    );
}

export default ChecCourseStructure;