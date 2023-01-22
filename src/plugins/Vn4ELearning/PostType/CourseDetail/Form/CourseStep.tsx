import { Box, Button, useTheme } from '@mui/material'
import Chip from 'components/atoms/Chip';
import Typography from 'components/atoms/Typography';
import { FieldFormItemProps } from 'components/atoms/fields/type'
import DrawerCustom from 'components/molecules/DrawerCustom';
import ShowData from 'components/pages/PostType/ShowData';
import { __ } from 'helpers/i18n';
import React from 'react'

function CourseStep(props: FieldFormItemProps) {

    const [openChooseTest, setOpenChooseTest] = React.useState(false);

    const [valueCurrent, setValueCurrent] = React.useState<JsonFormat>({});

    const theme = useTheme();

    const [postIds, setPostIds] = React.useState<JsonFormat[]>([]);

    React.useEffect(() => {
        if (typeof props.post[props.name] === 'object') {
            setValueCurrent(props.post[props.name]);
        }
    }, []);

    React.useEffect(() => {
        if (valueCurrent.id) {
            props.onReview({ id: valueCurrent.id, title: valueCurrent.title }, props.name);
        } else {
            props.onReview('', props.name);
        }
    }, [valueCurrent]);

    return (<>
        <Button variant='outlined' color='inherit' onClick={() => setOpenChooseTest(true)}>Chọn nội dung step by step</Button>
        {
            valueCurrent.title ?
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 2,
                    }}
                >
                    <Typography variant='h5'>Nội dung bài học:</Typography>
                    <Chip label={valueCurrent.title} onDelete={() => {
                        setValueCurrent({});
                    }} />
                </Box>
                :
                <></>
        }
        <DrawerCustom
            open={openChooseTest}
            onClose={() => setOpenChooseTest(false)}
            title="Bài kiểm tra"
            headerAction={postIds.length ?
                <Button
                    color={theme.palette.mode === 'light' ? 'inherit' : 'primary'}
                    sx={{ color: theme.palette.mode === 'light' ? 'text.primary' : 'primary.contrastText' }}
                    variant='contained'
                    onClick={() => {
                        setOpenChooseTest(false);
                        if (postIds[0]) {
                            setValueCurrent(postIds[0]);
                        }
                    }}
                >{__('Save Changes')}
                </Button>
                : <></>
            }
            activeOnClose
            width={1400}
            restDialogContent={{
                sx: {
                    backgroundColor: 'body.background',
                }
            }}
        >
            <Box>
                <ShowData
                    type={'e_course_content_step'}
                    action={'list'}
                    enableNewInline
                    onSelectPosts={(posts: Array<JsonFormat>) => {
                        setPostIds(posts);
                    }}
                />;
            </Box>

        </DrawerCustom>
    </>);
}

export default CourseStep