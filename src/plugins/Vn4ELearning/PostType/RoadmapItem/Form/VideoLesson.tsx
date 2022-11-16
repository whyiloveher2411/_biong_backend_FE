import { Accordion, AccordionDetails, AccordionSummary, Box, Button, FormControlLabel, List, ListItem, ListItemText, Radio, Skeleton, Typography } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import Icon from 'components/atoms/Icon';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { convertHMS } from 'helpers/date';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';

function VideoLesson(props: FieldFormItemProps) {

    // renderOption={(props, option: Option) => (
    //     <li {...props} key={option.id}>
    //         <span dangerouslySetInnerHTML={{ __html: option.optionLabel }} />{option.title}&nbsp;{Boolean(option.new_post) && '(New Option)'}
    //     </li>
    // )}

    const [dataSave, setDataSave] = React.useState<{
        course: ID,
        courseTitle: string,
        chapter: ID,
        chapterTitle: string,
        lesson: ID,
        lessonTitle: string,
    }>({
        course: 0,
        chapter: 0,
        lesson: 0,
        courseTitle: '',
        chapterTitle: '',
        lessonTitle: '',
    });

    const handleOnChangeLesson = (data: {
        course: ID,
        courseTitle: string,
        chapter: ID,
        chapterTitle: string,
        lesson: ID,
        lessonTitle: string,
    }) => {
        setDataSave(data)
    };


    const [openDrawer, setOpenDrawer] = React.useState(false);

    const [data, setData] = React.useState<JsonFormat>({});

    const [content, setContent] = React.useState<CourseContent>([]);

    const useApi = useAjax();

    React.useEffect(() => {

        if (data?.course) {
            useApi.ajax({
                url: 'plugin/vn4-e-learning/roadmap-item/get-lesson',
                data: {
                    id: data?.course,
                },
                method: 'POST',
                success: (result) => {
                    if (result.content) {
                        setContent(result.content);
                    }
                }
            })
        }

    }, [data]);

    React.useEffect(() => {

        if (openDrawer) {

            if (!data.course && props.post.course) {
                setData({
                    course: props.post.course,
                    course_detail: props.post.course_detail
                });

                setDataSave(prev => ({
                    ...prev,
                    lesson: props.post.lesson,
                }))

            }
        }

    }, [openDrawer]);

    return (<>
        <Box>
            <Typography sx={{ mb: 1, }}>Video Liên quan</Typography>
            <Button variant='contained' color="inherit" onClick={() => setOpenDrawer(true)}>Chọn bài học</Button>
            {
                Boolean(props.post.lesson_detail) &&
                (() => {
                    const arrayResult = [];

                    try {
                        let course = props.post.course_detail;
                        if (typeof props.post.course_detail === 'string') {
                            course = JSON.parse(props.post.course_detail);
                        }

                        arrayResult.push(<Typography key={course.id} sx={{ mt: 1, }}>
                            <strong>Course</strong>: {course.title}
                        </Typography>);
                    } catch (error) {
                        //
                    }

                    try {
                        let chapter = props.post.chapter_detail;
                        if (typeof props.post.chapter_detail === 'string') {
                            chapter = JSON.parse(props.post.chapter_detail);
                        }

                        arrayResult.push(<Typography key={chapter.id} sx={{ mt: 1, }}>
                            <strong>Chapter</strong>: {chapter.title}
                        </Typography>);
                    } catch (error) {
                        //
                    }

                    try {
                        let lesson = props.post.lesson_detail;
                        if (typeof props.post.lesson_detail === 'string') {
                            lesson = JSON.parse(props.post.lesson_detail);
                        }

                        arrayResult.push(<Typography key={lesson.id} sx={{ mt: 1, }}>
                            <strong>Lesson</strong>: {lesson.title}
                        </Typography>);
                    } catch (error) {
                        //
                    }
                    return arrayResult;
                })()
            }
        </Box>
        <DrawerCustom
            title={'Choose Roadmap Item'}
            open={openDrawer}
            activeOnClose
            width={1000}
            onClose={() => {
                setOpenDrawer(false);
            }}
            headerAction={<Button variant='contained' color='success'
                onClick={() => {
                    props.onReview(null, {
                        course: dataSave.course,
                        chapter: dataSave.chapter,
                        lesson: dataSave.lesson,
                        course_detail: { title: dataSave.courseTitle },
                        chapter_detail: { title: dataSave.chapterTitle },
                        lesson_detail: { title: dataSave.lessonTitle },
                    });
                    setOpenDrawer(false);
                }}
            >
                {__('Save Changes')}
            </Button>}
        >
            <Box
                sx={{
                    mt: 3
                }}
            >
                <FieldForm
                    component='relationship_onetomany'
                    config={{
                        title: 'Khóa học',
                        object: 'ecom_prod'
                    }}
                    name="course"
                    post={data}
                    onReview={(value: ANY, value2: ANY) => {
                        if (value2?.course) {
                            setData(value2);
                        }
                    }}
                />

                {
                    Boolean(data?.course) &&
                    (
                        useApi.open ?
                            [...Array(10)].map((i, index) => (
                                <Skeleton sx={{ mt: 1, height: 32 }} key={index} />
                            ))
                            :
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography sx={{ mt: 3, fontSize: 16, fontWeight: 400 }}>
                                        {__('{{chapterCount}} chương, {{lessonCount}} bài học', {
                                            chapterCount: content.length ?? 0,
                                            lessonCount: content.reduce((prevValue, chapter) => prevValue + chapter.lessons.length, 0),
                                        })}
                                    </Typography>
                                </Box>
                                <AccordionsChapter
                                    courseContent={content}
                                    handleOnChangeLesson={(dataChild) => handleOnChangeLesson({
                                        ...dataChild,
                                        course: data?.course,
                                        courseTitle: data?.course_detail?.title,
                                    })}
                                    lessonChecked={dataSave}
                                />
                            </Box>
                    )
                }
            </Box>
        </DrawerCustom >
    </>
    )
}

export default VideoLesson



function AccordionsChapter({ courseContent, handleOnChangeLesson, lessonChecked }: {
    courseContent: CourseContent,
    handleOnChangeLesson: (data: {
        chapter: ID,
        lesson: ID,
        chapterTitle: string,
        lessonTitle: string
    }) => void,
    lessonChecked: {
        course: ID;
        chapter: ID;
        lesson: ID;
    },
}) {
    const [expanded, setExpanded] = React.useState<string | false>('panel-1');
    const handleChange =
        (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
            setExpanded(newExpanded ? panel : false);
        };
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
            }}
        >
            {
                courseContent.map((item, index) => (
                    <Accordion
                        key={index}
                        expanded={expanded === ('panel' + index)}
                        onChange={handleChange('panel' + index)}
                        disableGutters
                        sx={{
                            boxShadow: 'none',
                            border: '1px solid',
                            borderColor: 'dividerDark',
                            '&.Mui-expanded .icon-expanded': {
                                transform: 'rotate(90deg)',
                            }
                        }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 72,
                            }}
                        >
                            <Typography sx={{ width: '65%', flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: 16 }}>
                                <Icon className="icon-expanded" sx={{ mr: 2, transition: 'all 300ms', fontSize: 18 }} icon="ArrowForwardIosRounded" /> {item.title}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    width: '35%',
                                    flexShrink: 0,
                                }}
                            >
                                <Typography noWrap sx={{ color: 'text.secondary', fontWeight: 500, }}>{__('{{lectures}} bài học', {
                                    lectures: item.lessons.length
                                })}</Typography>
                                <Typography variant='subtitle2' noWrap sx={{ color: 'text.secondary', fontSize: 14, }}>{convertHMS(item.lessons.reduce((preValue, lesson) => preValue + (parseInt(lesson.time ?? 0) ?? 0), 0))}</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <AccordionsLesson handleOnChangeLesson={(lessonID: ID, lessonTitle: string) => handleOnChangeLesson({
                                chapter: item.id,
                                chapterTitle: item.title,
                                lesson: lessonID,
                                lessonTitle: lessonTitle,
                            })} lessonChecked={lessonChecked} lessions={item.lessons} />
                        </AccordionDetails>
                    </Accordion>
                ))
            }
        </Box>
    );
}



function AccordionsLesson({ lessions, handleOnChangeLesson, lessonChecked }: {
    lessions: CourseChapterProps['lessons'],
    handleOnChangeLesson: (lesson: ID, lessonTitle: string) => void,
    lessonChecked: {
        course: ID;
        chapter: ID;
        lesson: ID;
    },
}) {

    return (
        <>
            <List>
                {
                    lessions.map((item, index) => (
                        <ListItem
                            key={index}
                        >
                            <ListItemText>
                                <FormControlLabel value={item.id} control={<Radio onClick={() => handleOnChangeLesson(item.id, item.title)} checked={(lessonChecked.lesson + '') === (item.id + '')} />} label={item.title} />
                            </ListItemText>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '35%',
                                    flexShrink: 0,
                                }}
                            >
                                <div>
                                    {
                                        Boolean(item.is_public) &&
                                        <Button
                                            color='success'
                                            sx={{ mr: 2 }}
                                        >
                                            {__('Xem trước')}
                                        </Button>
                                    }
                                </div>
                                <Typography noWrap sx={{ color: 'text.secondary' }}>
                                    {convertHMS(item.time)}
                                </Typography>
                            </Box>
                        </ListItem>
                    ))
                }
            </List >
        </>
    );
}

export interface CourseChapterProps {
    id: ID,
    code: string,
    title: string,
    lessons: Array<CourseLessonProps>,
    total_time?: number,
    total_lesson?: number,
    delete: number,
}


export interface CourseLessonProps {
    id: ID,
    code: string,
    title: string,
    time: string,
    type: string,
    is_public: boolean,
    is_compulsory: boolean,
    video?: string | {
        ext: string,
        link: string,
        type_link: string,
    },
    youtube_id?: string,
    stt: number,
    resources?: Array<{
        title: string,
        description: string,
        type: 'download' | 'link',
        file_download?: string,
        link?: string,
    }>,
    delete: number,
}

export type CourseContent = Array<CourseChapterProps>