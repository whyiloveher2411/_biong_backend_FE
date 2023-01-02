import { Box, Button, Chip, Typography, useTheme } from '@mui/material'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import DrawerCustom from 'components/molecules/DrawerCustom';
import ShowData from 'components/pages/PostType/ShowData';
import { __ } from 'helpers/i18n';
import React from 'react'

function Main(props: FieldFormItemProps) {

    const [openChooseTest, setOpenChooseTest] = React.useState(false);

    const [valueCurrent, setValueCurrent] = React.useState<JsonFormat[]>([]);

    const theme = useTheme();

    const [postIds, setPostIds] = React.useState<JsonFormat[]>([]);

    React.useEffect(() => {

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
            <Button variant='contained' onClick={() => setOpenChooseTest(true)} >Chọn bài kiểm tra</Button>
            {
                valueCurrent.length > 0 &&
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 2,
                    }}
                >
                    <Typography variant='h5'>Bài kiểm tra:</Typography>
                    {
                        valueCurrent.map(item => (
                            <Chip key={item.id} label={item.title} onDelete={() => {
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
        </>
    )
}

export default Main