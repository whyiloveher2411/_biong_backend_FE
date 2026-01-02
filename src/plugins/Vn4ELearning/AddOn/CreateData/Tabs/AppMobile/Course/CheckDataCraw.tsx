import { CircularProgress, FormControl, InputLabel, ListSubheader, MenuItem, Select } from "@mui/material";
import { FieldFormItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";
import React from "react";

function CheckDataCraw(props: FieldFormItemProps) {

    const ajaxUseApi = useAjax();

    const [chapters, setChapters] = React.useState<ANY[]>([]);
    const [loading, setLoading] = React.useState(false);

    const handleCheckDataCraw = () => {
        setLoading(true);
        ajaxUseApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/check-data-craw",
            method: "POST",
            data: {
                action: "check-data-craw",
                id: props.post.id,
            },
            success: (result) => {
                if (result.success && result.data && result.data.chapters) {
                    setChapters(result.data.chapters);
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

    if (loading && chapters.length === 0) {
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
                <MenuItem value="" disabled>
                    <em>Select Data</em>
                </MenuItem>
                {chapters.map((chapter, index) => {
                    // Calculate max match score to highlight only the best match(es)
                    let maxMatchScore = 0;
                    chapters.forEach(c => c.lessons?.forEach((l: ANY) => {
                        if (l.match_with_title > maxMatchScore) maxMatchScore = l.match_with_title;
                    }));

                    const items = [];
                    items.push(<ListSubheader key={`header-${index}`}>{chapter.title}</ListSubheader>);
                    if (chapter.lessons && Array.isArray(chapter.lessons)) {
                        chapter.lessons.forEach((lesson: ANY, lessonIndex: number) => {
                             if (!lesson.title) return; 
                             items.push(
                                <MenuItem 
                                    key={`lesson-${index}-${lessonIndex}`} 
                                    value={lesson.path || ''} 
                                    disabled={!lesson.has_data}
                                    sx={{ pl: 4 }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>
                                            {lesson.title} {lesson.has_data ? '' : ' (No Data)'}
                                            {lesson.match_with_title === maxMatchScore && maxMatchScore > 0 && <span style={{ color: 'green', fontSize: '0.85em', marginLeft: '5px', fontWeight: 'bold' }}>(Match: {lesson.match_with_title}%)</span>}
                                        </span>
                                        {lesson.used_in_lesson && lesson.used_in_lesson !== props.post.id && (
                                            <span style={{ color: '#ff9800', fontSize: '0.85em', marginLeft: '10px' }}>
                                              (Used)
                                            </span>
                                        )}
                                    </div>
                                </MenuItem>
                            );
                        });
                    }
                    return items;
                })}
            </Select>
        </FormControl>
    );
}

export default CheckDataCraw;