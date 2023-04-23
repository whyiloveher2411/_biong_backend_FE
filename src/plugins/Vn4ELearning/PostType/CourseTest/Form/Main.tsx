import { Box, Button, Chip, Typography, useTheme } from '@mui/material';
import CodeBlock from 'components/atoms/CodeBlock';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import DrawerCustom from 'components/molecules/DrawerCustom';
import ShowData from 'components/pages/PostType/ShowData';
import { __ } from 'helpers/i18n';
import React from 'react';
import { Link } from 'react-router-dom';

function Main(props: FieldFormItemProps) {

    const [openChooseTest, setOpenChooseTest] = React.useState(false);

    const [valueCurrent, setValueCurrent] = React.useState<JsonFormat[]>([]);

    const theme = useTheme();

    const [postIds, setPostIds] = React.useState<JsonFormat[]>([]);

    React.useEffect(() => {

        if (typeof props.post[props.name] === 'string') {
            try {
                props.post[props.name] = JSON.parse(props.post[props.name]);
            } catch (error) {
                props.post[props.name] = [];
            }
        }

        if (Array.isArray(props.post[props.name])) {

            const valuesTemp: JsonFormat[] = [];

            props.post[props.name].forEach((item: JsonFormat) => {
                if (item.id && item.title) {
                    valuesTemp.push(item);
                }
            });

            setValueCurrent(valuesTemp);
        }

    }, []);

    React.useEffect(() => {
        props.onReview(valueCurrent, props.name);
    }, [valueCurrent]);

    return (
        <>
            <Button variant='outlined' color='inherit' onClick={() => setOpenChooseTest(true)} >Chọn bài kiểm tra</Button>
            {
                valueCurrent.length > 0 &&
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mt: 2,
                    }}
                >
                    <Typography variant='h5' noWrap>Bài kiểm tra:</Typography>
                    {
                        valueCurrent.map(item => (
                            <Chip
                                key={item.id}
                                label={<>
                                    [{item.id}] <CodeBlock component='span' sx={{ '& p': { m: 0 } }} html={item.title as string} />
                                </>

                                }
                                sx={{ height: 'auto', cursor: 'pointer' }}
                                component={Link}
                                target='_blank' to={'/post-type/e_course_test/edit?post_id=' + item.id}
                                onDelete={() => {
                                    const valueTemp = valueCurrent.filter(searchItem => (searchItem.id + '') !== (item.id + ''));
                                    setValueCurrent([...valueTemp]);
                                }} />
                        ))
                    }
                </Box>
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

                            const valueCurrentTemp = valueCurrent;

                            postIds.forEach(item => {
                                if (valueCurrentTemp.findIndex(item2 => (item.id + '') === (item2.id + '')) === -1) {
                                    valueCurrentTemp.push({
                                        id: item.id,
                                        title: item.title,
                                    });
                                }
                            });

                            setValueCurrent([...valueCurrentTemp]);

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
                        type={'e_course_test'}
                        action={'list'}
                        enableNewInline
                        onSelectPosts={(posts: Array<JsonFormat>) => {
                            setPostIds(posts);
                        }}
                    />;
                </Box>

            </DrawerCustom>
            {
                typeof props.post['playerStoryboardSpecRenderer'] === 'object' &&
                <Typography variant='h4' sx={{ mt: 4 }}>Image hover timeline: {props.post['playerStoryboardSpecRenderer'].total} screen</Typography>
            }
        </>
    )
}

export default Main